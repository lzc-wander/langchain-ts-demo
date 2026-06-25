import "dotenv/config";
import { StateGraph, MessagesAnnotation, Annotation } from "@langchain/langgraph";
import { AIMessage, BaseMessage, createAgent, HumanMessage } from "langchain";
import model from '@/agent'

// 定义包含路由信息的状态
const SupervisorState = Annotation.Root({
  // 继承默认的消息历史
  ...MessagesAnnotation.spec,

  // 下一个要执行的 Agent 名称
  nextAgent: Annotation<string>({
    reducer: (_, next) => next,
    default: () => "supervisor",
  }),

  // 任务进度追踪
  taskProgress: Annotation<string>({
    reducer: (_, next) => next,
    default: () => "",
  }),

  // ---- 错误恢复相关字段 ----

  // 各 Agent 的失败次数
  errorCount: Annotation<Record<string, number>>({
    reducer: (current, next) => ({ ...current, ...next }),
    default: () => ({}),
  }),

  // 最后一次错误消息
  lastError: Annotation<string>({
    reducer: (_, next) => next,
    default: () => "",
  }),
});

const MAX_RETRIES = 2; // 每个 Agent 最多重试次数

/** 用 try/catch 包裹 worker 节点，失败时记录错误并返回错误消息 */
function withErrorHandling(
  name: string,
  run: (messages: BaseMessage[]) => Promise<{ messages: BaseMessage[] }>
) {
  return async (state: typeof SupervisorState.State) => {
    const currentFails = state.errorCount?.[name] ?? 0;

    if (currentFails >= MAX_RETRIES) {
      const msg = `[跳过] ${name} 已失败 ${currentFails} 次，超过最大重试次数`;
      console.log(`  ⚠️ ${msg}`);
      return {
        messages: [new AIMessage(`[系统] ${msg}，任务已移交给下一步处理。`)],
        errorCount: { [name]: currentFails },
        lastError: msg,
      };
    }

    console.log(`[${name}] 开始工作...`);
    try {
      const result = await run(state.messages);
      console.log(`[${name}] 工作完成`);
      return {
        messages: result.messages,
        lastError: "",
      };
    } catch (error) {
      const newFails = currentFails + 1;
      const errorMsg = `${name} 执行失败（第 ${newFails} 次）: ${error instanceof Error ? error.message : "未知错误"}`;
      console.error(`  ❌ ${errorMsg}`);

      return {
        messages: [new AIMessage(`[系统] ${errorMsg}，将重试（剩余 ${MAX_RETRIES - newFails} 次）。`)],
        errorCount: { [name]: newFails },
        nextAgent: "supervisor",
        lastError: errorMsg,
      };
    }
  };
}

// 研究员 Agent：负责搜集信息
const researchAgent = createAgent({
  model,
  tools: [],
  systemPrompt: `你是资深研究员，擅长搜集和整理信息。

职责：
1. 根据任务要求搜索相关信息
2. 从多个来源验证信息准确性
3. 输出结构化的研究报告

输出格式：
- 关键发现（3-5 条）
- 数据来源
- 待确认的问题`,
});

// 作家 Agent：负责撰写内容
const writerAgent = createAgent({
  model,
  tools: [],
  systemPrompt: `你是专业作家，擅长将信息整合成易读的文章。

职责：
1. 基于研究员提供的资料撰写文章
2. 确保文章结构清晰、逻辑连贯
3. 语言生动、引人入胜

注意：不要编造事实，所有内容必须基于提供的资料。`,
});

// 编辑 Agent：负责质量把关
const editorAgent = createAgent({
  model,
  tools: [],
  systemPrompt: `你是资深编辑，负责审核和优化文章质量。

审核标准：
1. 事实准确性：是否有错误或遗漏
2. 逻辑连贯性：段落之间是否衔接自然
3. 语言表达：是否简洁、准确、生动
4. 格式规范：标题、段落、标点是否正确

输出：修改后的文章 + 修改说明`,
});


// Supervisor 决定下一步交给谁
async function supervisorNode(state: typeof SupervisorState.State) {
  // 构建决策 Prompt
  const decisionPrompt = `你是任务协调员。根据当前进展，决定下一步应该交给谁处理。

可用选项：
- research：研究员（需要搜集更多信息时）
- writer：作家（需要撰写或修改文章时）
- editor：编辑（需要审核和优化质量时）
- finish：任务完成（用户对结果满意时）

当前任务进度：
${state.taskProgress || "尚未开始"}

${state.lastError ? `最近错误：${state.lastError}\n` : ""}

最近对话：
${state.messages.slice(-3).map(m => {
    const role = m._getType?.() ?? "unknown";
    const content = typeof m.content === "string" ? m.content.slice(0, 200) : "";
    return `[${role}]: ${content}`;
  }).join("\n")}

请只回复一个单词（research/writer/editor/finish），不要解释。`;

  const response = await model.invoke([
    { role: "system", content: decisionPrompt },
  ]);

  const raw = response.content?.toString().trim().toLowerCase() || "finish";
  // 只取第一行/第一个单词
  const nextAgent = raw.split("\n")[0].trim().replace(/[^a-z]/g, "");

  console.log(`[Supervisor] 下一步 → ${nextAgent}`);

  return { 
    nextAgent,
    taskProgress: `[${new Date().toLocaleTimeString()}] Supervisor 决策 → ${nextAgent}`,
  };
}

// ------------------------实现worker节点（带错误恢复）------------------------

const researchNode = withErrorHandling("研究员", (msgs) => researchAgent.invoke({ messages: msgs }));
const writerNode = withErrorHandling("作家", (msgs) => writerAgent.invoke({ messages: msgs }));
const editorNode = withErrorHandling("编辑", (msgs) => editorAgent.invoke({ messages: msgs }));


// ------------------------构建工作流------------------------

// 条件路由函数
function routeFromSupervisor(state: typeof SupervisorState.State) {
  const next = state.nextAgent;

  if (next === "finish" || next === "end" || next === "__end__") {
    return "__end__";
  }

  // 映射到有效的节点名
  const validNodes: Record<string, string> = {
    research: "research",
    writer: "writer",
    editor: "editor",
  };

  return validNodes[next] || "research"; // 默认走 research
}

// 构建多 Agent 图
const workflow = new StateGraph(SupervisorState)
  // 添加节点
  .addNode("supervisor", supervisorNode)
  .addNode("research", researchNode)
  .addNode("writer", writerNode)
  .addNode("editor", editorNode)
  
  // 定义边
  .addEdge("__start__", "supervisor")  // 入口 → Supervisor
  
  // Supervisor 的条件路由
  .addConditionalEdges("supervisor", routeFromSupervisor, {
    research: "research",
    writer: "writer",
    editor: "editor",
    __end__: "__end__",
  })
  
  // Worker 完成后返回 Supervisor（静态边确保永远回到协调者）
  .addEdge("research", "supervisor")
  .addEdge("writer", "supervisor")
  .addEdge("editor", "supervisor");

// 编译为可执行应用
const multiAgentApp = workflow.compile();


console.log("=".repeat(50));
console.log("  Supervisor 多 Agent 协调系统");
console.log("  Supervisor → [研究员 → 作家 → 编辑]");
console.log("=".repeat(50) + "\n");

// 执行多 Agent 系统
const result = await multiAgentApp.invoke({
  messages: [new HumanMessage("写一篇长沙一日游攻略文章")],
});

console.log("\n" + "=".repeat(50));
console.log("  最终结果");
console.log("=".repeat(50) + "\n");
console.log(result.messages.at(-1)?.content);

console.log("\n" + "=".repeat(50));
console.log("  任务进度");
console.log("=".repeat(50));
console.log(result.taskProgress);


