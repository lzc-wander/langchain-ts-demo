// 在 Agent 中使用系统提示

import model from "@/agent/index.js";
import { ChatPromptTemplate } from "@langchain/core/prompts";

// 定义客服机器人的系统提示
const customerServicePrompt = ChatPromptTemplate.fromMessages([
  [
    "system",
    `你是 字节跳动 公司的智能客服助手。

公司信息：
- 主营产品：字节跳动的视频分享平台
- 服务时间：7×24 小时
- 联系方式：support@tedance.com 或 13800000000

你的职责：
1. 解答产品相关问题
2. 协助处理技术问题
3. 收集用户反馈

回答要求：
- 语气友好、专业
- 如果不确定，引导用户联系人工客服
- 不要承诺具体的解决时间
- 涉及价格问题时，引导查看官网`,
  ],
  ["human", "{user_question}"],
]);

const chain = customerServicePrompt.pipe(model);
const result = await chain.invoke({
  user_question: "你们的视频分享平台有什么功能？？",
});

console.log(result.content);
