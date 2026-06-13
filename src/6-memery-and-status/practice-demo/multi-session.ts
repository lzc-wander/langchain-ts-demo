// src/6-multi-session.ts — 多用户会话管理
//
// 演示：
// 1. 每个用户有独立的 thread_id
// 2. 使用 MemorySaver 管理短期记忆
// 3. 用户 A 和用户 B 的对话不会互相干扰

import "dotenv/config";
import { createAgent } from "langchain";
import { MemorySaver } from "@langchain/langgraph";
import model from "@/agent/index.js";

// 创建一个共享的 checkpointer（所有用户的短期记忆都存这里，靠 thread_id 隔离）
const checkpointer = new MemorySaver();

const agent = createAgent({
  model,
  tools: [],
  checkpointer,
});

// 根据用户 ID 生成配置
function sessionConfig(userId: string) {
  return {
    configurable: { thread_id: `user-${userId}` },
  };
}

// 带日志的对话函数
async function chat(userId: string, message: string) {
  const config = sessionConfig(userId);
  const result = await agent.invoke(
    { messages: [{ role: "user", content: message }] },
    config
  );
  const reply = result.messages.at(-1)?.content as string;
  console.log(`[用户 ${userId}] 问: ${message}`);
  console.log(`[用户 ${userId}] 答: ${reply}\n`);
  return reply;
}

console.log("========== 第1轮：各自自我介绍 ==========\n");
await chat("A", "你好，我叫小明，喜欢打篮球。");
await chat("B", "你好，我叫小红，喜欢画画。");

console.log("========== 第2轮：互相询问对方信息 ==========\n");
await chat("A", "你还记得我叫什么名字吗？我喜欢什么运动？");
await chat("B", "你还记得我叫什么名字吗？我喜欢什么？");

console.log("========== 第3轮：继续深入对话 ==========\n");
await chat("A", "帮我推荐一款适合打篮球的球鞋吧！记得我喜欢的球员是科比。");
await chat("B", "我想学水彩画，有什么入门建议吗？");

// 验证两个用户的记忆没有互相污染
console.log("========== 验证：再次询问完整个人信息 ==========\n");
const resultA = await chat("A", "总结一下我的所有个人信息（名字、爱好、喜欢的球员）");
const resultB = await chat("B", "总结一下我的所有个人信息（名字、爱好、想学的东西）");

// 用断言验证结果不混淆
if (resultA.includes("小明") || resultA.includes("篮球") || resultA.includes("科比")) {
  console.log("✅ 用户 A 的记忆正确");
} else {
  console.log("❌ 用户 A 的记忆异常");
}

if (resultB.includes("小红") || resultB.includes("画画") || resultB.includes("水彩")) {
  console.log("✅ 用户 B 的记忆正确");
} else {
  console.log("❌ 用户 B 的记忆异常");
}
