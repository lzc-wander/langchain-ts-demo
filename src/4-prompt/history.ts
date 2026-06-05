// 动态插入历史消息

import { ChatPromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts";
import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, AIMessage } from "@langchain/core/messages";
import model from "@/agent/index.js";

// 定义模板，使用占位符
const template = ChatPromptTemplate.fromMessages([
  ["system", "你是一个有帮助的助手，记住我们的对话历史。"],
  
  // 在这里动态插入历史消息
  new MessagesPlaceholder("chat_history"),
  
  ["human", "{input}"],
]);


const chatHistory = [
    new HumanMessage({ content: "你好" }),
    new AIMessage({ content: "你好，张三！有什么我可以帮你的吗？" }),
    new HumanMessage({ content: "我喜欢吃川菜。" }),
    new AIMessage({ content: "好的，我记住了你喜欢川菜。" }),
]

const chain = template.pipe(model);

// 调用时传入历史和新问题
const result = await chain.invoke({
  chat_history: chatHistory,  // 动态插入历史
  input: "我叫什么名字？",     // 当前问题
});

console.log(result.content);


