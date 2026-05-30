// src/index.ts

// 第一步：加载环境变量（必须在最顶部）
import "dotenv/config";

// 第二步：导入 LangChain 核心功能
import { AIMessage, createAgent } from "langchain";
import { ChatOpenAI } from "@langchain/openai";
import { getWeather } from "./weather.js";
import { getTime } from "./time.js";

// 第四步：创建 Agent

// 模型需要先创建一个模型实例
const model = new ChatOpenAI({
  modelName: "deepseek-v4-flash",
  apiKey: process.env.DEEPSEEK_API_KEY, 
  configuration: {
    baseURL: process.env.DEEPSEEK_API_URL,
  }
});

// 创建的模型作为model参数传给createAgent
const agent = createAgent({
  model,
  tools: [getWeather, getTime],
});


// 第五步：调用 Agent 并输出结果
// const result = await agent.invoke({
//   messages: [{ role: "user", content: "介绍一下你自己？" }],
// });
// console.log(result.messages.at(-1)?.content);

// 使用 stream() 替代 invoke()
const stream = await agent.stream(
  { messages: [{ role: "user", content: "广州天气怎么样？" }] },
  { streamMode: "messages" }  //  逐 Token 流式输出
);

// 遍历流式数据
for await (const [message, metadata] of stream) {
  process.stdout.write(message.content as string);
}


