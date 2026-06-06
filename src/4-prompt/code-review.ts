// 代码审查示例，使用集中定义的 Prompt
import { codeReviewPrompt } from "@/4-prompt/index";
import model from "@/agent/index.js";

const chain = codeReviewPrompt.pipe(model);

const result = await chain.invoke({
  language: "TypeScript",
  code: "function add(a, b) { return a + b; }"
});

console.log(result.content);