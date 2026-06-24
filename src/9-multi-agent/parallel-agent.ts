import "dotenv/config";
import { StateGraph, Annotation } from "@langchain/langgraph";
import { AIMessage, BaseMessage, HumanMessage, createAgent } from "langchain";

import model from "@/agent";

// 定义包含多个子任务结果的状态
const ParallelState = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: (current, next) => [...current, ...next],
    default: () => [],
  }),
  taskResults: Annotation<Record<string, string>>({
    reducer: (current, next) => ({ ...current, ...next }),
    default: () => ({}),
  }),
});

// 创建专门的 Agent（无工具，纯知识回答）
const weatherAgent = createAgent({
  model,
  tools: [],
  name: "weather_agent",
  systemPrompt: "你是天气专家，请根据自身知识回答天气相关问题。回答要具体、包含季节特点和出行建议。",
});

const trafficAgent = createAgent({
  model,
  tools: [],
  name: "traffic_agent",
  systemPrompt: "你是交通专家，请根据自身知识回答路况和交通信息。包含高峰时段、拥堵路段和出行建议。",
});

const eventsAgent = createAgent({
  model,
  tools: [],
  name: "events_agent",
  systemPrompt: "你是活动专家，请根据自身知识回答当地活动信息。包含适合的户外/室内活动推荐。",
});

// 并行执行多个 Agent
async function parallelNode(state: typeof ParallelState.State) {
  const userQuery = state.messages.at(-1)?.content as string;
  
  console.log("🔍 正在并行查询：天气、路况、活动...");
  
  const [weatherResult, trafficResult, eventsResult] = await Promise.all([
    weatherAgent.invoke({
      messages: [{ role: "user", content: `查询北京的天气：${userQuery}` }],
    }),
    trafficAgent.invoke({
      messages: [{ role: "user", content: `查询北京的路况：${userQuery}` }],
    }),
    eventsAgent.invoke({
      messages: [{ role: "user", content: `查询北京的活动：${userQuery}` }],
    }),
  ]);
  
  console.log("✅ 并行查询完成\n");

  return {
    taskResults: {
      weather: weatherResult.messages.at(-1)?.content as string,
      traffic: trafficResult.messages.at(-1)?.content as string,
      events: eventsResult.messages.at(-1)?.content as string,
    },
  };
}

// 汇总节点
async function mergeNode(state: typeof ParallelState.State) {

  const { weather, traffic, events } = state.taskResults;

  console.log("📝 正在整合信息生成综合建议...");
  
  const summaryPrompt = `请整合以下信息，给用户一个综合建议：

天气情况：
${weather}

路况信息：
${traffic}

当地活动：
${events}

请给出出行建议。`;

  const response = await model.invoke([
    { role: "system", content: "你是一个综合出行顾问，整合天气、路况和活动信息给出实用建议。" },
    { role: "user", content: summaryPrompt },
  ]);

  console.log("✅ 整合完成\n");

  return {
    messages: [new AIMessage(response.content as string)],
  };
}

// 构建并行工作流
const workflow = new StateGraph(ParallelState)
  .addNode("parallel", parallelNode)
  .addNode("merge", mergeNode)
  .addEdge("__start__", "parallel")
  .addEdge("parallel", "merge")
  .addEdge("merge", "__end__");

const parallelApp = workflow.compile();

console.log("=".repeat(50));
console.log("  并行多 Agent 工作流");
console.log("  流程: [天气 + 路况 + 活动] → 汇总");
console.log("=".repeat(50) + "\n");

const result = await parallelApp.invoke({
  messages: [new HumanMessage("明天适合出门吗？有什么建议？")],
});

console.log("\n" + "=".repeat(50));
console.log("  综合建议");
console.log("=".repeat(50) + "\n");
console.log(result.messages.at(-1)?.content);