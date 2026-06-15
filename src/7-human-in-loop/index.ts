import { tool, createAgent } from "langchain";
import { interrupt, Command } from "@langchain/langgraph";
import { z } from "zod";
import { MemorySaver } from "@langchain/langgraph";
import model from "@/agent/index.js";
import * as readline from "node:readline/promises";

const deleteData = tool(
  async ({ recordId }) => {
    // 发起中断，等待人工输入验证码
    // 第一次执行：无 resume 值，interrupt 抛出 GraphInterrupt → 图暂停
    // 恢复执行：interrupt() 返回用户输入的 resume 值
    const code = await interrupt({
      question: "请输入验证码：",
      type: "input",
    });

    // 验证码校验（演示用固定值，生产环境应动态生成）
    const expectedCode = "123456";
    if (code !== expectedCode) {
      return `验证码错误，操作已取消（输入: ${code}，期望: ${expectedCode}）`;
    }

    console.log(`删除记录 ${recordId}`);
    return `记录 ${recordId} 已删除`;
  },
  {
    name: "delete_data",
    description: "删除指定记录（需要人工输入验证码确认）",
    schema: z.object({ 
      recordId: z.string().describe("要删除的记录 ID") 
    }),
  }
);

const agent = createAgent({
  model,
  tools: [deleteData],
  checkpointer: new MemorySaver(),
});

const config = { 
  configurable: { thread_id: "session-001" } 
};

// 第1步：用户发出请求，Agent 调用工具，interrupt() 暂停
const result1 = await agent.invoke(
  { messages: [{ role: "user", content: "删除 ID 为 123 的记录" }] },
  config
);

console.log("[Agent 回复]:", result1.messages.at(-1)?.content);

// 第2步：人工输入验证码
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const answer = await rl.question("\n请输入验证码（正确验证码为 123456）: ");
rl.close();

// 第3步：将用户输入的验证码作为 resume 值传入
const result2 = await agent.graph.invoke(
  new Command({ resume: answer }),
  config
);

console.log("\n[最终结果]:", result2.messages.at(-1)?.content);
