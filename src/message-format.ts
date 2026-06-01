// 消息格式：理解多角色对话， 详见：https://juejin.cn/post/7634002571020271635#heading-0

import { z } from "zod";
import model from "@/agent/index.js";

// 定义期望的输出结构
const ArticleSchema = z.object({
  title: z.string().describe("文章标题"),
  summary: z.string().describe("文章摘要，不超过 100 字"),
  tags: z.array(z.string()).describe("文章标签列表，3-5 个"),
  difficulty: z.enum(["入门", "中级", "高级"]).describe("文章难度"),
});

// 绑定结构化输出 Schema
const structuredModel = model.withStructuredOutput(ArticleSchema, {
  method: "jsonMode",
});


// 直接调用模型（不经过 Agent）
const response = await structuredModel.invoke([
   {
    role: "user",
    content: `分析这篇文章并提取信息，以 json 格式返回，字段名必须使用英文：title（文章标题）、summary（摘要）、tags（标签列表）、difficulty（难度，可选值为"入门"/"中级"/"高级"）：
    "本文介绍了如何使用 React Hooks 优化组件性能，包括 useMemo、useCallback 和 memo 的使用场景与最佳实践，适合有 React 基础的开发者。"`,
  },
]);

console.log(response.title, '文章标题');
console.log(response.summary, '文章摘要');
console.log(response.tags, '文章标签列表');
console.log(response.difficulty, '文章难度');
