import model from "@/agent/index.js";
import { ChatPromptTemplate } from "@langchain/core/prompts";

// 定义查询改写 Prompt
const queryRewriterPrompt = ChatPromptTemplate.fromMessages([
  [
    "system",
    `你是一个查询优化助手。将用户的问题改写为更适合向量检索的格式：
1. 去除指代词（它、这个、那个）
2. 补充完整语义
3. 提取核心实体
4. 只输出改写后的查询，不要解释`,
  ],
  ["human", "原始问题：{question}"],
]);

const rewriteChain = queryRewriterPrompt.pipe(model);

export const rewriteQuery = async (question: string): Promise<string> => {
  const result = await rewriteChain.invoke({ question });
  return result.content as string;
}




