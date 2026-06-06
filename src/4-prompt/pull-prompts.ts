import "dotenv/config";
import { Client } from "langsmith";
import { load } from "langchain/load";
import type { ChatPromptTemplate } from "@langchain/core/prompts";
import model from "@/agent/index.js";

const client = new Client();

// 从 Hub 拉取 Prompt 并反序列化为 ChatPromptTemplate
const commit = await client.pullPromptCommit("code-review-prompt");
const codeReviewPrompt = (await load(JSON.stringify(commit.manifest))) as ChatPromptTemplate;

const chain = codeReviewPrompt.pipe(model);

const result = await chain.invoke({
  language: "TypeScript",
  code: "function add(a, b) { return a + b; }"
});

console.log(result.content);