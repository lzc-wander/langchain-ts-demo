import { ChatPromptTemplate, FewShotChatMessagePromptTemplate } from "@langchain/core/prompts";
import model from "@/agent/index";

// 定义示例（这些会插入到 Prompt 中作为参考）
const examples = [
  {
    input: "这个产品真的太棒了！质量超出预期。",
    output: JSON.stringify({ sentiment: "positive", score: 0.95 }),
  },
  {
    input: "配送太慢了，等了一周还没到。",
    output: JSON.stringify({ sentiment: "negative", score: 0.15 }),
  },
  {
    input: "产品一般，没什么特别的地方。",
    output: JSON.stringify({ sentiment: "neutral", score: 0.5 }),
  },
];


// 定义单个示例的格式
const examplePrompt = ChatPromptTemplate.fromMessages([
  ["human", "分析这条评论的情感：{input}"],
  ["ai", "{output}"],
]);


// 构建 Few-shot 提示模板
const fewShotPrompt = new FewShotChatMessagePromptTemplate({
  examplePrompt,      // 示例格式
  examples,           // 示例数据
  inputVariables: ["input"],  // 输入变量
});


// 最终模板：系统提示 + Few-shot 示例 + 实际问题
const finalPrompt = ChatPromptTemplate.fromMessages([
  ["system", "你是一个情感分析助手，输出 JSON 格式的结果。"],
  
  // 插入 Few-shot 示例
  ...await fewShotPrompt.formatMessages({}),
  
  // 实际问题
  ["human", "分析这条评论的情感：{input}"],
]);

const chain = finalPrompt.pipe(model);

const result = await chain.invoke({
  input: "这个产品中规中矩",
});

console.log(result.content);
// 输出：{"sentiment": "neutral", "score": 0.6}
