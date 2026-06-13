// src/6-summary.ts — 集成 Agent 对话与摘要记忆
import model from "@/agent/index.js";
import { ConversationSummaryMemory } from "@langchain/classic/memory";
import { createAgent } from "langchain";

// 创建摘要记忆
const memory = new ConversationSummaryMemory({
  llm: model,
  memoryKey: "chat_history",
  returnMessages: true,
});

// 创建一个简单的 Agent（无工具，纯对话）
const agent = createAgent({ model });

// 封装一个带摘要的对话函数
async function chat(input: string) {
  // 1. 调用 Agent
  const result = await agent.invoke({
    messages: [{ role: "user", content: input }],
  });
  const reply = result.messages.at(-1)?.content as string;

  // 2. 写入摘要记忆（自动调用 LLM 生成/更新摘要）
  await memory.saveContext({ input }, { output: reply });

  // 3. 打印本轮摘要
  const summaryMsg = (await memory.loadMemoryVariables({})).chat_history;
  console.log(`\n[问题]: ${input}`);
  console.log(`[回答]: ${reply.slice(0, 80)}...`);
  console.log(`[摘要]: ${summaryMsg[0]?.content?.slice?.(0, 120) ?? summaryMsg[0]?.content}`);
  return reply;
}

// 多轮对话，每轮的上下文都会被摘要记忆自动压缩
await chat("你好，我叫张三");
await chat("我喜欢吃川菜");
await chat("你还记得我叫什么名字吗？和我的饮食偏好？");

