import { StateGraph, MessagesAnnotation } from "@langchain/langgraph";
import { createAgent } from "langchain";

import model from "@/agent";

// 创建三个专门的 Agent（无工具，纯文本处理，避免网络请求卡顿）
const researcher = createAgent({
  model,
  tools: [],
  systemPrompt: `你是研究员，负责基于自身知识输出结构化的研究报告。
请以 Markdown 格式输出，包含：概述、核心观点、关键数据（如有）、总结。
报告要详实、有深度，不低于 500 字。`,
});

const writer = createAgent({
  model,
  tools: [],
  systemPrompt: `你是写作专家，基于研究员提供的资料撰写一篇完整的文章。
要求：
1. 语言流畅、有吸引力
2. 结构清晰：引言 → 正文（分小节） → 结语
3. 保留所有核心观点和数据
4. 不低于 800 字`,
});

const editor = createAgent({
  model,
  tools: [],
  systemPrompt: `你是编辑，负责润色文章，确保：
1. 语言流畅、逻辑清晰
2. 段落过渡自然
3. 用词精准、专业
4. 修正语病和错别字
5. 保持原文核心内容和结构不变`,
});

// 构建串行工作流
const workflow = new StateGraph(MessagesAnnotation)
  .addNode("research", async (state) => {
    console.log("🔍 [研究员] 开始搜集资料...");
    const result = await researcher.invoke({ messages: state.messages });
    const newMessage = result.messages.at(-1);
    console.log(`✅ [研究员] 完成（${(newMessage?.content as string)?.length ?? 0} 字）\n`);
    return { messages: [newMessage] };
  })
  .addNode("write", async (state) => {
    console.log("✍️  [写作专家] 开始撰写文章...");
    const result = await writer.invoke({ messages: state.messages });
    const newMessage = result.messages.at(-1);
    console.log(`✅ [写作专家] 完成（${(newMessage?.content as string)?.length ?? 0} 字）\n`);
    return { messages: [newMessage] };
  })
  .addNode("edit", async (state) => {
    console.log("📝 [编辑] 开始润色...");
    const result = await editor.invoke({ messages: state.messages });
    const newMessage = result.messages.at(-1);
    console.log(`✅ [编辑] 完成（${(newMessage?.content as string)?.length ?? 0} 字）\n`);
    return { messages: [newMessage] };
  })
  .addEdge("__start__", "research")
  .addEdge("research", "write")
  .addEdge("write", "edit")
  .addEdge("edit", "__end__");

const serialApp = workflow.compile();

console.log("=".repeat(50));
console.log("  串行多 Agent 工作流");
console.log("  流程: 研究员 → 写作专家 → 编辑");
console.log("=".repeat(50) + "\n");

// 执行
const result = await serialApp.invoke({
  messages: [{ role: "user", content: "写一篇关于如何选择合适的第一台车的文章" }],
});

console.log("\n" + "=".repeat(50));
console.log("  最终输出（编辑后）");
console.log("=".repeat(50) + "\n");
console.log(result.messages.at(-1)?.content);
