import model from "@/agent";
import { ChatPromptTemplate } from "@langchain/core/prompts";

interface TaskStage {
  stage: "research" | "planning" | "execution" | "review";
  context: Record<string, any>;
}

const STAGE_PROMPTS = {
  research: `你是研究员。当前阶段：信息搜集。

研究主题：{task}

任务：
- 搜索相关文档和资料
- 整理关键发现
- 标记信息来源

不要急于给出结论，先充分搜集信息。`,

  planning: `你是规划师。当前阶段：方案设计。

基于已搜集的信息：
{researchFindings}

任务：
- 设计实施步骤
- 评估风险和备选方案
- 估算时间和资源`,

  execution: `你是执行者。当前阶段：具体实施。

按照以下计划执行：
{plan}

任务：
- 逐步执行每个步骤
- 记录执行结果
- 遇到问题及时反馈`,

  review: `你是审核员。当前阶段：质量审查。

检查以下内容：
{executionResults}

审核标准：
- 是否符合需求
- 是否有遗漏或错误
- 是否需要优化`,
};

// 根据阶段动态注入上下文
async function executeWithStageContext(stage: TaskStage) {
  const promptTemplate = ChatPromptTemplate.fromMessages([
    ["system", STAGE_PROMPTS[stage.stage]],
    ["human", "请执行当前阶段的任务"],
  ]);

  const messages = await promptTemplate.formatMessages(stage.context);
  return await model.invoke(messages);
}

// ===== 运行示例：用 ChatTemplate 实现多阶段任务 =====

console.log("=".repeat(50));
console.log("  多阶段任务执行演示");
console.log("  流程: 研究 → 规划 → 执行 → 审核");
console.log("=".repeat(50) + "\n");

// 阶段 1：研究
console.log("【阶段 1/4】研究员 - 信息搜集\n");
const researchResult = await executeWithStageContext({
  stage: "research",
  context: { task: "学习如何制作拿铁咖啡" },
});
console.log(`${researchResult.content}\n`);
console.log("-".repeat(50) + "\n");

// 阶段 2：规划（基于研究结果）
console.log("【阶段 2/4】规划师 - 方案设计\n");
const planResult = await executeWithStageContext({
  stage: "planning",
  context: { researchFindings: researchResult.content as string },
});
console.log(`${planResult.content}\n`);
console.log("-".repeat(50) + "\n");

// 阶段 3：执行（基于规划）
console.log("【阶段 3/4】执行者 - 具体实施\n");
const execResult = await executeWithStageContext({
  stage: "execution",
  context: { plan: planResult.content as string },
});
console.log(`${execResult.content}\n`);
console.log("-".repeat(50) + "\n");

// 阶段 4：审核（基于执行结果）
console.log("【阶段 4/4】审核员 - 质量审查\n");
const reviewResult = await executeWithStageContext({
  stage: "review",
  context: { executionResults: execResult.content as string },
});
console.log(`${reviewResult.content}\n`);

console.log("=".repeat(50));
console.log("  所有阶段执行完毕");
console.log("=".repeat(50));

