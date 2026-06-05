import { ChatPromptTemplate } from "@langchain/core/prompts";
import model from "@/agent/index.js";

// 定义包含多个角色的模板
const template = ChatPromptTemplate.fromMessages([
  // system 消息：设定角色和规则
  ["system", "你是一位专业的 {language} 开发顾问，回答要专业且简洁。"],
  
  // human 消息：用户的输入（支持变量）
  ["human", "{question}"],
]);

// 将模板与模型组合成链
const chain = template.pipe(model);

// 调用时填充变量
const result = await chain.invoke({
  language: "TypeScript",
  question: "async/await 和 Promise 有什么区别？",
});

console.log(result.content);
