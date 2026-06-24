import "dotenv/config";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { AlibabaTongyiEmbeddings } from "@langchain/community/embeddings/alibaba_tongyi";
import { MemoryVectorStore } from "@langchain/classic/vectorstores/memory";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { RunnableSequence, RunnablePassthrough } from "@langchain/core/runnables";
import { StringOutputParser } from "@langchain/core/output_parsers";
import model from "@/agent/index.js";

// ===== 1. 加载文档 =====
const pdfLoader = new PDFLoader("./src/docs/1.pdf");
const pdfDocs = await pdfLoader.load();
console.log(`加载了 ${pdfDocs.length} 个页面`);

// ===== 2. 文本切割 =====
const splitter = new RecursiveCharacterTextSplitter({
  chunkSize: 1000,
  chunkOverlap: 200,
  separators: ["\n\n", "\n", "。", "，", ",", " ", ""],
});
const chunks = await splitter.splitDocuments(pdfDocs);
console.log(`切割为 ${chunks.length} 个 chunks`);

// ===== 3. 向量化存储 =====
const embeddings = new AlibabaTongyiEmbeddings({
  modelName: "text-embedding-v1",
  apiKey: process.env.ALIBABA_TONGYI_API_KEY,
  batchSize: 10,
});
const vectorStore = new MemoryVectorStore(embeddings);
await vectorStore.addDocuments(chunks);

const retriever = vectorStore.asRetriever({ k: 5 });

// ===== 4. 构建 RAG 链 =====

// 4a. 将检索到的文档合并为上下文字符串
const formatDocs = (docs: { pageContent: string }[]) =>
  docs.map((d, i) => `[文档 ${i + 1}] ${d.pageContent}`).join("\n\n");

// 4b. Prompt 模板
const ragPrompt = ChatPromptTemplate.fromMessages([
  [
    "system",
    `你是一个专业的知识库问答助手。请根据以下上下文信息回答用户的问题。

重要规则：
1. 只基于提供的上下文回答问题
2. 如果上下文中没有相关信息，请明确告知"根据现有文档，我无法回答这个问题"
3. 不要编造答案

上下文：
{context}`,
  ],
  ["human", "{input}"],
]);

// 4c. 组装链：输入 → 检索 → 格式化 → Prompt → LLM → 输出
const ragChain = RunnableSequence.from([
  {
    context: retriever.pipe(formatDocs),
    input: new RunnablePassthrough(),
  },
  ragPrompt,
  model,
  new StringOutputParser(),
]);

// ===== 5. 执行 =====
const result = await ragChain.invoke("申请公租房需要什么条件？");

console.log("\n=== 回答 ===\n");
console.log(result);
