// src/index.ts

import { AIMessage, createAgent } from "langchain";
import { getWeather } from "./tools/weather.js";
import { getTime } from "./tools/time.js";
import model from "@/agent/index.js";


// 创建的模型作为model参数传给createAgent
const agent = createAgent({
  model,
  tools: [getWeather, getTime],
});


// 使用 stream() 替代 invoke()
const stream = await agent.stream(
  { messages: [{ role: "user", content: "广州天气怎么样？" }] },
  { streamMode: "messages" }  //  逐 Token 流式输出 ，并返回消息
);

// 遍历流式数据
for await (const [message, metadata] of stream) {
  process.stdout.write(message.content as string);
}


