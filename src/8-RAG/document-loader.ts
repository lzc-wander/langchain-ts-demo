// 使用通义的嵌入模型
import "dotenv/config";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { AlibabaTongyiEmbeddings } from "@langchain/community/embeddings/alibaba_tongyi"; 
import { MemoryVectorStore } from "@langchain/classic/vectorstores/memory"; // 内存向量存储， 临时使用内存存储向量数据， 线上环境需要使用数据库存储
import { rewriteQuery } from "@/8-RAG/query-rewrite";

const pdfLoader = new PDFLoader("./src/docs/1.pdf");
const pdfDocs = await pdfLoader.load();

// console.log(pdfDocs);

const splitter = new RecursiveCharacterTextSplitter({
  chunkSize: 1000,       // 每个 chunk 的最大字符数
  chunkOverlap: 200,     // 相邻 chunk 的重叠字符数
  separators: [
    "\n\n",   // 优先在段落之间切割
    "\n",     // 其次在换行处切割
    "。",      // 中文句号
    "，",      // 中文逗号
    ',',      // 英文逗号
    " ",       // 空格
    ""         // 最后才按字符切割
  ],
});

const chunks = await splitter.splitDocuments(pdfDocs);

// 初始化向量存储（作为长期记忆库）------------
const embeddings = new AlibabaTongyiEmbeddings({
  modelName: "text-embedding-v3",
  apiKey: process.env.ALIBABA_TONGYI_API_KEY,
  batchSize: 10,  // 通义 API 单次最多 10 条
});

const vectorStore = new MemoryVectorStore(embeddings);
await vectorStore.addDocuments(chunks);

// 从向量存储创建检索器
const retriever = vectorStore.asRetriever({
  k: 5,  // 返回最相似的 5 个文档
});



// 执行检索
const docs = await retriever.invoke(await rewriteQuery("申请注意事项是什么"));

console.log(docs.length);  // 5
console.log(docs[0].pageContent);  // 最相关的文档内容
console.log(docs[0].metadata);     // 元数据（来源、页码等）

