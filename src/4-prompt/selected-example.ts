// 动态示例选择器

import "dotenv/config";
import { SemanticSimilarityExampleSelector } from "@langchain/core/example_selectors";
import { FakeEmbeddings } from "@langchain/core/utils/testing";
import { MemoryVectorStore } from "@langchain/classic/vectorstores/memory";

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

// 测试：根据输入动态选择示例
const selectedExamples = await exampleSelector.selectExamples({
  input: "我想退款，怎么操作？",
});

console.log(selectedExamples);
// 会选出与"退款/退货"最相关的示例，如：
// [
//   { input: "怎么申请退款？", output: "退款相关回答..." },
//   { input: "退货流程是什么？", output: "退货相关回答..." }
// ]

