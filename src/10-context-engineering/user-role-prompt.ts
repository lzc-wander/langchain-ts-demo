import { ChatPromptTemplate } from "@langchain/core/prompts";
import model from "@/agent";

// 定义不同角色的 System Prompt 模板
const ROLE_PROMPTS = {
  beginner: `你是耐心的编程导师，专门帮助初学者学习 TypeScript。

教学原则：
1. 用简单的类比解释复杂概念
2. 每次只介绍一个知识点
3. 提供可运行的代码示例
4. 鼓励用户动手实践`,

  intermediate: `你是资深前端工程师，协助中级开发者解决技术问题。

交流风格：
1. 直接给出技术方案，不过多解释基础
2. 提供最佳实践和性能优化建议
3. 引用官方文档和社区资源`,

  expert: `你是技术架构师，与高级开发者讨论系统设计。

讨论重点：
1. 架构设计和权衡取舍
2. 可扩展性和维护性
3. 行业趋势和技术选型`,
};

// 动态选择 Prompt
async function createDynamicPrompt(userLevel: string, query: string) {
  const promptTemplate = ChatPromptTemplate.fromMessages([
    ["system", ROLE_PROMPTS[userLevel as keyof typeof ROLE_PROMPTS]],
    ["human", "{query}"],
  ]);
  
  return promptTemplate.formatMessages({ query });
}

// 使用示例
const messages = await createDynamicPrompt("expert", "如何设计一个可扩展的系统？");
const response = await model.invoke(messages);
console.log(`响应内容：${response.content}\n`);
