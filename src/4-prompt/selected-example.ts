// 动态示例选择器

import "dotenv/config";
import { SemanticSimilarityExampleSelector } from "@langchain/core/example_selectors";
import { FakeEmbeddings } from "@langchain/core/utils/testing"; // 测试用的向量嵌入器， 生成环境应该使用 OpenAIEmbeddings 等实际的向量嵌入器
import { MemoryVectorStore } from "@langchain/classic/vectorstores/memory";
import { ChatPromptTemplate, FewShotChatMessagePromptTemplate } from "@langchain/core/prompts";
import model from "@/agent/index";

// 准备大量示例
const allExamples = [
  { input: "退货流程是什么？", output: "退货相关回答..." },
  { input: "如何修改订单？", output: "订单修改相关回答..." },
  { input: "配送时间多久？", output: "配送时间相关回答..." },
  { input: "怎么申请退款？", output: "退款相关回答..." },
  { input: "发票怎么开？", output: "发票相关回答..." },
  // ... 可能有几十甚至上百个示例
];

// 创建基于语义相似度的选择器
const exampleSelector = await SemanticSimilarityExampleSelector.fromExamples(
  allExamples,
  new FakeEmbeddings(),
  MemoryVectorStore,        // 官方 MemoryVectorStore
  { k: 2 }                  // 选择最相似的 2 个示例
);

// 定义示例的格式
const examplePrompt = ChatPromptTemplate.fromMessages([
  ["human", "{input}"],
  ["ai", "{output}"],
]);


const fewShotPrompt = new FewShotChatMessagePromptTemplate({
  examplePrompt,
  exampleSelector,  // 使用选择器替代固定示例
  inputVariables: ["input"],
});

const finalPrompt = ChatPromptTemplate.fromMessages([
  ["system", "你是客服助手，参考以下示例回答问题。"],
  ...await fewShotPrompt.formatMessages({}),  // 动态插入最相关的示例
  ["human", "{input}"],
]);

const chain = finalPrompt.pipe(model);

const result = await chain.invoke({
  input: "需要几天送达",
});

console.log(result.content);


