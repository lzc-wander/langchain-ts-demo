// 推送代码审查 Prompt 到 LangSmith Hub

import "dotenv/config";
import { Client } from "langsmith";
import { codeReviewPrompt } from "@/4-prompt/index";

const client = new Client();

// 推送代码审查 Prompt 到 Hub
await client.pushPrompt("code-review-prompt:v1", {
  object: codeReviewPrompt,
});

console.log("✓ 已推送 code-review-prompt 到 LangSmith Hub");