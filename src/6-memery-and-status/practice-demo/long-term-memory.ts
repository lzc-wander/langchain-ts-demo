// src/6-memery-and-status/practice-demo/long-term-memory.ts
//
// 长期记忆系统：
// 1. save_memory — 将用户信息存入向量数据库（长期记忆）
// 2. recall_memory — 根据问题检索相关记忆
// 3. Agent 自主决定何时调用这两个工具

import "dotenv/config";
import { tool, createAgent } from "langchain";
import { MemoryVectorStore } from "@langchain/classic/vectorstores/memory";
import { AlibabaTongyiEmbeddings } from "@langchain/community/embeddings/alibaba_tongyi";
import { Document } from "@langchain/core/documents";
import { z } from "zod";
import model from "@/agent/index.js";

// ===== 1. 初始化长期记忆存储 =====

const embeddings = new AlibabaTongyiEmbeddings({
  modelName: "text-embedding-v3",
  apiKey: process.env.ALIBABA_TONGYI_API_KEY,
});
const memoryStore = new MemoryVectorStore(embeddings);

// ===== 2. 定义长期记忆工具 =====

/** 保存记忆：将用户信息存入向量数据库 */
const saveMemory = tool(
  async ({ userId, key, value }) => {
    const doc = new Document({
      pageContent: `用户 ${userId} 的 ${key}：${value}`,
      metadata: { userId, key, timestamp: Date.now() },
    });
    await memoryStore.addDocuments([doc]);
    return `已保存：用户 ${userId} 的 ${key} 信息。`;
  },
  {
    name: "save_memory",
    description: "保存用户的长期记忆信息，如姓名、喜好、职业、习惯等。每个信息片段单独存储。",
    schema: z.object({
      userId: z.string().describe("用户唯一标识"),
      key: z.string().describe("信息类别，如 '姓名'、'职业'、'喜欢的编程语言'、'爱好' 等"),
      value: z.string().describe("具体的记忆内容"),
    }),
  }
);

/** 召回记忆：根据 userId 和关键词检索相关记忆 */
const recallMemory = tool(
  async ({ userId, query }) => {
    const results = await memoryStore.similaritySearch(
      `用户 ${userId} 的 ${query}`,
      3
    );
    if (results.length === 0) {
      return `未找到用户 ${userId} 相关的记忆。`;
    }
    return results.map((d, i) => `[${i + 1}] ${d.pageContent}`).join("\n");
  },
  {
    name: "recall_memory",
    description: "检索用户的长期记忆。当用户询问关于自己的信息或 Agent 需要了解用户背景时调用。",
    schema: z.object({
      userId: z.string().describe("用户唯一标识"),
      query: z.string().describe("要检索的关键词或问题，如 '姓名'、'职业'、'喜欢的语言'"),
    }),
  }
);

// ===== 3. 创建 Agent =====

const agent = createAgent({
  model,
  tools: [saveMemory, recallMemory],
});

// ===== 4. 测试：用户 A 和 B 填写并检索个人信息 =====

async function chat(userId: string, message: string) {
  const result = await agent.invoke({
    messages: [
      {
        role: "system",
        content: `你是长期记忆助手。你有两个工具：
1. save_memory — 当用户告诉你个人信息时，立即调用此工具保存。userId 参数使用括号中的标识（如 zhangsan、lisi）。
2. recall_memory — 当用户询问自己的信息时，立即用用户的 userId 调用此工具检索。

请主动使用这些工具来帮用户记住和回忆信息。`,
      },
      { role: "user", content: `[用户 ${userId}] ${message}` },
    ],
  });
  return result.messages.at(-1)?.content as string;
}

console.log("========== 第1轮：zhangsan（用户 A）自我介绍并保存信息 ==========\n");
const r1 = await chat("zhangsan", "我的用户 ID 是 zhangsan。我叫张三，是一名全栈工程师，平时喜欢打篮球和看科幻小说。请帮我记住这些信息。");
console.log(`[AI]: ${r1}\n`);

console.log("========== 第2轮：lisi（用户 B）自我介绍并保存信息 ==========\n");
const r2 = await chat("lisi", "我的用户 ID 是 lisi。我叫李四，是一名 UI 设计师，喜欢画画和听古典音乐。请记住我的信息。");
console.log(`[AI]: ${r2}\n`);

console.log("========== 第3轮：zhangsan 在新会话中检索自己的记忆 ==========\n");
const r3 = await chat("zhangsan", "帮我回忆一下我的个人信息，包括姓名、职业和爱好。");
console.log(`[AI]: ${r3}\n`);

console.log("========== 第4轮：lisi 在新会话中检索自己的记忆 ==========\n");
const r4 = await chat("lisi", "我不记得之前说过什么了，我的用户 ID 是 lisi，能帮我查一下我的信息吗？");
console.log(`[AI]: ${r4}\n`);

// ===== 5. 验证记忆隔离 =====
console.log("========== 验证：zhangsan 看不到 lisi 的信息 ==========\n");
const v1 = await chat("zhangsan", "我的用户 ID 是 zhangsan。查询用户 lisi（李四）的信息是什么？");
console.log(`[AI]: ${v1}\n`);
const v2 = await chat("lisi", "我的用户 ID 是 lisi。查询用户 zhangsan（张三）的信息是什么？");
console.log(`[AI]: ${v2}\n`);

// ===== 6. 直接查询向量库验证 =====
console.log("========== 向量库数据验证 ==========\n");
const allMemories = await memoryStore.similaritySearch("用户", 10);
allMemories.forEach((d) => console.log(`  ${d.pageContent}`));
