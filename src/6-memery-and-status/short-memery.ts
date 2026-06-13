import "dotenv/config";
import { createAgent } from "langchain";
import { MemorySaver } from "@langchain/langgraph";
import model from "@/agent/index.js";

// 创建内存中的状态存储
// 适合开发测试，生产环境用数据库存储
const checkpointer = new MemorySaver();

const agent = createAgent({
  model,
  tools: [],
  checkpointer,  // 传入状态持久化器
});

// 配置 thread_id，同一 thread_id 下的对话会自动保存和恢复
const config = { 
  configurable: { 
    thread_id: "user-zhangsan-session-001" 
  } 
};

// 第一次对话
await agent.invoke(
  { messages: [{ role: "user", content: "我叫张三，喜欢 TypeScript。" }] },
  config  // 传入 thread_id
);

// 第二次对话（历史自动从 checkpointer 恢复）
const result = await agent.invoke(
  { messages: [{ role: "user", content: "我叫什么名字，喜欢什么编程语言？" }] },
  config  // 同一个 thread_id
);

console.log(result.messages.at(-1)?.content);
