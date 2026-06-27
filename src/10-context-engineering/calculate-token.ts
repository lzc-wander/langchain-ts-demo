import { estimateTokens } from "@/helper/estimate-message-tokens";
import model from "@/agent";
import { createAgent, HumanMessage } from "langchain";
import tokenBudgetMiddleware from "@/middleware/token-budget";

const agent = createAgent({
  model,
  tools: [],
  middleware: [tokenBudgetMiddleware],
});

const response = await agent.invoke({
  messages: [new HumanMessage("写一篇长沙一日游攻略")],
});

const lastMsg = response.messages[response.messages.length - 1];
const content = typeof lastMsg.content === "string" ? lastMsg.content : "";
console.log(`\n响应内容：${content.slice(0, 100)}...\n`);
console.log(`响应 token 数：${estimateTokens(content)}`);
