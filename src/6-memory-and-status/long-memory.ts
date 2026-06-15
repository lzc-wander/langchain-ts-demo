// src/6-long-memory.ts

// 使用通义的嵌入模型
import "dotenv/config";
import { AlibabaTongyiEmbeddings } from "@langchain/community/embeddings/alibaba_tongyi"; 
import { MemoryVectorStore } from "@langchain/classic/vectorstores/memory";
import { Document } from "@langchain/core/documents";

// -------1. 初始化向量存储（作为长期记忆库）------------
const embeddings = new AlibabaTongyiEmbeddings({
  modelName: "text-embedding-v3",
  apiKey: process.env.ALIBABA_TONGYI_API_KEY,
});

const memoryStore = new MemoryVectorStore(embeddings);


// 2. 准备要存储的文本数据（可以带有元数据 metadata）
const docs = [
  new Document({
    id: "doc-1",
    pageContent: "LangChain 是一个用于开发大语言模型应用的框架。",
    metadata: { category: "技术", source: "官方文档" },
  }),
  new Document({
    id: "doc-2",
    pageContent: "深圳是中国超一线城市，科技行业发展领先。",
    metadata: { category: "地理", source: "百科" },
  }),
  new Document({
    id: "doc-3",
    pageContent: "向量数据库专门用于存储和检索高维向量数据。",
    metadata: { category: "技术", source: "维基百科" },
  }),
  new Document({
    id: "doc-4",
    pageContent: "深圳是中国广东省的一个副省级城市，也是著名的科技中心。",
    metadata: { category: "地理", source: "百科" },
  }),
];

// 3. 将文档添加到内存向量存储中
// addDocuments 会自动调用嵌入模型将文本转换为向量并存入内存
await memoryStore.addDocuments(docs);
console.log("成功添加文档，分配的 ID 为:", docs.map(d => d.id));


// 4. 执行向量相似性检索
const query = "介绍一下深圳";
console.log(`\n正在检索问题: "${query}"`);
// similaritySearch 返回最相似的 k 个文档（这里 k=2）
const results = await memoryStore.similaritySearch(query, 2);

 // 5. 打印检索结果
console.log("\n检索到的最相关文档：");
results.forEach((doc, index) => {
  console.log(`[${index + 1}] 内容: ${doc.pageContent}`);
  console.log(`    元数据:`, doc.metadata);
});

