// src/5-mcp.ts

import { MultiServerMCPClient } from "@langchain/mcp-adapters";
import { createAgent } from "langchain";
import model from "@/agent/index.js";

const client = new MultiServerMCPClient({
  database: {
    transport: "stdio",
    command: "pnpm",
    args: ["tsx", "./mcp-server/database-server.ts"],
  },
});

const mcpTools = await client.getTools();

// 创建的模型作为model参数传给createAgent
const agent = createAgent({
  model,
  tools: mcpTools,
 });


const result = await agent.invoke({
  messages: [{ role: "user", content: "查找15个包含贾维斯的用户，使用表格输出" }]
});

console.log(result.messages.at(-1)?.content);

