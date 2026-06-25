import "dotenv/config";
import { StateGraph, Annotation } from "@langchain/langgraph";
import { AIMessage, BaseMessage, HumanMessage, createAgent } from "langchain";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";

import model from "@/agent";

// 用 LLM 从用户输入中提取城市名
const cityExtractPrompt = ChatPromptTemplate.fromMessages([
  ["system", "你是一个城市提取助手。从用户的问题中提取出目的地城市名称，只输出城市名，不要输出任何其他内容。如果未提及城市，输出'北京'。"],
  ["human", "{input}"],
]);
const cityExtractor = cityExtractPrompt.pipe(model).pipe(new StringOutputParser());

// 定义包含多个子任务结果的状态
const ParallelState = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: (current, next) => [...current, ...next], // 每次节点返回新消息时， 追加 到现有消息列表尾部
    default: () => [],
  }),
  taskResults: Annotation<Record<string, string>>({
    reducer: (current, next) => ({ ...current, ...next }), // 每次节点返回新结果时， 合并 到现有结果对象中
    default: () => ({}),
  }),
});

// 创建专门的 Agent（无工具，纯知识回答）
const attractionAgent = createAgent({
  model,
  tools: [],
  name: "attraction_agent",
  systemPrompt: `你是景点推荐专家，请根据自身知识推荐目的地景点信息。
回答需包含：
1. 必去景点及特点
2. 最佳游览时间
3. 门票价格参考
4. 游玩时长建议
回答要具体、有细节。`,
});

const foodAgent = createAgent({
  model,
  tools: [],
  name: "food_agent",
  systemPrompt: `你是美食推荐专家，请根据自身知识推荐目的地美食。
回答需包含：
1. 特色餐厅推荐（含菜系和招牌菜）
2. 当地小吃和夜市推荐
3. 人均消费参考
4. 适合的用餐时段`,
});

const routeAgent = createAgent({
  model,
  tools: [],
  name: "route_agent",
  systemPrompt: `你是行程规划专家，请根据自身知识规划出行路线。
回答需包含：
1. 推荐的游玩路线（按天/半天规划）
2. 交通方式建议（地铁/公交/打车）
3. 景点之间的衔接时间
4. 注意事项和实用贴士`,
});

// 并行执行多个 Agent
async function parallelNode(state: typeof ParallelState.State) {
  const userQuery = state.messages.at(-1)?.content as string;

  // 用 LLM 从用户输入中提取城市名
  const city = await cityExtractor.invoke({ input: userQuery });

  console.log(`🔍 正在并行查询 ${city} 的景点、美食、路线...`);

  const [attractionResult, foodResult, routeResult] = await Promise.all([
    attractionAgent.invoke({
      messages: [{ role: "user", content: `推荐${city}的景点：${userQuery}` }],
    }),
    foodAgent.invoke({
      messages: [{ role: "user", content: `推荐${city}的美食：${userQuery}` }],
    }),
    routeAgent.invoke({
      messages: [{ role: "user", content: `规划${city}的路线：${userQuery}` }],
    }),
  ]);

  console.log(`✅ ${city} 并行查询完成\n`);

  return {
    taskResults: {
      attractions: attractionResult.messages.at(-1)?.content as string,
      food: foodResult.messages.at(-1)?.content as string,
      route: routeResult.messages.at(-1)?.content as string,
    },
  };
}

// 汇总节点
async function mergeNode(state: typeof ParallelState.State) {
  const { attractions, food, route } = state.taskResults;

  console.log("📝 正在整合生成出行攻略...");

  const summaryPrompt = `请整合以下信息，给用户一份完整的出行攻略：

景点推荐：
${attractions}

美食推荐：
${food}

路线规划：
${route}

请整合成一份结构清晰、实用的一日游攻略，包含：上午行程、午餐推荐、下午行程、晚餐推荐、实用贴士。`;

  const response = await model.invoke([
    { role: "system", content: "你是一个专业旅行规划师，整合景点、美食和路线信息给出一份实用的出行攻略。" },
    { role: "user", content: summaryPrompt },
  ]);

  console.log("✅ 攻略生成完成\n");

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
console.log("  并行多 Agent — 出行路由攻略");
console.log("  流程: [景点 + 美食 + 路线] → 整合攻略");
console.log("=".repeat(50) + "\n");

const result = await parallelApp.invoke({
  messages: [new HumanMessage("给我一份重庆一日游攻略")],
});

console.log("\n" + "=".repeat(50));
console.log("  出行攻略");
console.log("=".repeat(50) + "\n");
console.log(result.messages.at(-1)?.content);