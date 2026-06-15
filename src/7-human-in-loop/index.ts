import { tool, createAgent } from "langchain";
import { interrupt, Command } from "@langchain/langgraph";
import { z } from "zod";
import { MemorySaver } from "@langchain/langgraph";
import model from "@/agent/index.js";
import * as readline from "node:readline/promises";

const deleteData = tool(
  async ({ recordId }) => {
    // 发起中断，等待人工确认
    // 第一次执行：无 resume 值，interrupt 抛出 GraphInterrupt → 图暂停
    // 恢复执行：interrupt() 返回 resume 值
    const confirmed = await interrupt({
      question: `确认删除记录 ${recordId}？此操作不可撤销。`,
      type: "confirm",
    });

    if (confirmed !== "confirmed") {
      return "操作已取消";
    }

    console.log(`删除记录 ${recordId}`);
    return `记录 ${recordId} 已删除`;
  },
  {
    name: "delete_data",
    description: "删除指定记录（需要人工确认）",
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

// 第2步：人工确认
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const answer = await rl.question("\n确认删除？输入 y 确认，其他任意键取消: ");
rl.close();

// 第3步：用字符串 resume 值恢复
const resumeValue = answer.toLowerCase() === "y" ? "confirmed" : "cancelled";

const result2 = await agent.invoke(
  new Command({ resume: resumeValue }),
  config
);

console.log("\n[最终结果]:", result2.messages.at(-1)?.content);
