import { tool, createAgent } from "langchain";
import { interrupt, Command } from "@langchain/langgraph";
import { z } from "zod";
import { MemorySaver } from "@langchain/langgraph";
import model from "@/agent/index.js";
import * as readline from "node:readline/promises";

const deleteData = tool(
  async ({ recordId }) => {
    // 发起中断，等待用户选择操作
    // 第一次执行：无 resume 值，interrupt 抛出 GraphInterrupt → 图暂停
    // 恢复执行：interrupt() 返回用户选择的 resume 值
    const action = await interrupt({
      question: "请选择操作：",
      type: "select",
      options: ["继续", "暂停", "取消"],
    });

    // 处理用户选择
    if (action === "取消") {
      return "操作已取消";
    }
    if (action === "暂停") {
      return "操作已暂停，如需继续请重新发起请求";
    }

    // action === "继续"，执行删除
    console.log(`删除记录 ${recordId}`);
    return `记录 ${recordId} 已删除`;
  },
  {
    name: "delete_data",
    description: "删除指定记录（需要人工选择操作）",
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

// 第2步：用户选择操作
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

console.log("\n可用选项：继续 / 暂停 / 取消");
const answer = await rl.question("请选择操作：");
rl.close();

// 第3步：将用户选择作为 resume 值传入
const result2 = await agent.graph.invoke(
  new Command({ resume: answer }),
  config
);

console.log("\n[最终结果]:", result2.messages.at(-1)?.content);
