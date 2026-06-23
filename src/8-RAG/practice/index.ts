// index.ts — AI 知识库问答入口
// 功能：初始化知识库，演示多轮问答

import { ask } from "./rag-query.js";

async function runKnowledgeBaseQA() {
  console.log("=".repeat(50));
  console.log("  AI 知识库问答系统");
  console.log("  文档来源: src/docs/");
  console.log("=".repeat(50));
  console.log();

  // 第1问
  const r1 = await ask("提示词技巧有哪些");
  console.log("Q1: 提示词技巧有哪些\n");
  console.log(`[改写后]: ${r1.rewrite}\n`);
  console.log(`[回答]: ${r1.answer.slice(0, 300)}...`);
  console.log(`[来源]: ${[...new Set(r1.sourceDocs)].join(", ")}`);
  console.log("\n" + "-".repeat(50) + "\n");

  // // 第2问
  // const r2 = await ask("如何用 DeepSeek 搭建个人知识库？");
  // console.log("Q2: 如何用 DeepSeek 搭建个人知识库？\n");
  // console.log(`[改写后]: ${r2.rewrite}\n`);
  // console.log(`[回答]: ${r2.answer.slice(0, 300)}...`);
  // console.log(`[来源]: ${[...new Set(r2.sourceDocs)].join(", ")}`);
  // console.log("\n" + "-".repeat(50) + "\n");

  // // 第3问
  // const r3 = await ask("AI 在高校教学和科研中有哪些应用？");
  // console.log("Q3: AI 在高校教学和科研中有哪些应用？\n");
  // console.log(`[改写后]: ${r3.rewrite}\n`);
  // console.log(`[回答]: ${r3.answer.slice(0, 300)}...`);
  // console.log(`[来源]: ${[...new Set(r3.sourceDocs)].join(", ")}`);
  // console.log("\n" + "-".repeat(50) + "\n");

  // // 第4问
  // const r4 = await ask("2026年个人如何打造 AI 秘书？");
  // console.log("Q4: 2026年个人如何打造 AI 秘书？\n");
  // console.log(`[改写后]: ${r4.rewrite}\n`);
  // console.log(`[回答]: ${r4.answer.slice(0, 300)}...`);
  // console.log(`[来源]: ${[...new Set(r4.sourceDocs)].join(", ")}`);
}

runKnowledgeBaseQA().catch(console.error);
