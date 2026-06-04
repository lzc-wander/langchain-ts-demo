
import { PromptTemplate } from "@langchain/core/prompts";
import model from "@/agent/index.js";
import { StringOutputParser } from "@langchain/core/output_parsers";

// 第一步：定义模板
const prompt = PromptTemplate.fromTemplate(
  "请用 {language} 语言写一个函数，功能是：{description}"
);

// 第二步：创建模型, 已从外部导入 model

// 第三步：创建输出解析器
const parser = new StringOutputParser();

// 第四步：构建链：prompt → model → parser
const chain = prompt.pipe(model).pipe(parser);

// 第五步：调用链
const result = await chain.invoke({
  language: "TypeScript",
  description: "写一个防抖函数",
});

console.log(result);
