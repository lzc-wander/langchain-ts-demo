// rag-query.ts — RAG 查询链
// 功能：查询改写 → 知识库检索 → Prompt 组装 → LLM 回答

import model from "@/agent/index.js";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { RunnableSequence, RunnablePassthrough } from "@langchain/core/runnables";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { initializeKnowledgeBase, retrieveKnowledge } from "./knowledge-base.js";

// ===== 1. 查询改写 =====

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

const rewriteChain = queryRewriterPrompt.pipe(model).pipe(new StringOutputParser());

/** 改写查询：输入原始问题，返回优化后的检索关键词 */
export async function rewriteQuery(rawQuestion: string): Promise<string> {
  return await rewriteChain.invoke({ question: rawQuestion });
}

// ===== 2. RAG 问答 Prompt =====

const ragPrompt = ChatPromptTemplate.fromMessages([
  [
    "system",
    `你是一个专业的知识库问答助手。请根据以下上下文信息回答用户的问题。

重要规则：
1. 只基于提供的上下文回答问题
2. 如果上下文中没有相关信息，请明确告知"根据现有文档，我无法回答这个问题"
3. 不要编造答案
4. 在回答末尾标注参考了哪些文档

上下文：
{context}`,
  ],
  ["human", "{input}"],
]);

// ===== 3. 构建完整的 RAG 查询链 =====

export async function ask(query: string): Promise<{ answer: string; sourceDocs: string[]; rewrite: string }> {
  // 3a. 改写查询
  const optimizedQuery = await rewriteQuery(query);

  // 3b. 确保知识库已初始化，然后检索
  await initializeKnowledgeBase();
  const { docs, formatted } = await retrieveKnowledge(optimizedQuery);

  // 3c. 构建 RAG chain（每次动态构建以传入最新的 context）
  const chain = RunnableSequence.from([
    {
      context: async () => formatted,
      input: new RunnablePassthrough(),
    },
    ragPrompt,
    model,
    new StringOutputParser(),
  ]);

  // 3d. 执行
  const answer = await chain.invoke(query);

  return {
    answer,
    sourceDocs: docs.map((d: any) => d.metadata?.source ?? "未知").filter(Boolean),
    rewrite: optimizedQuery,
  };
}
