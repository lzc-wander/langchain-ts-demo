// knowledge-base.ts — 知识库核心
// 功能：读取 docs 下所有 PDF，切割、向量化存储，提供检索接口

import "dotenv/config";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { AlibabaTongyiEmbeddings } from "@langchain/community/embeddings/alibaba_tongyi";
import { MemoryVectorStore } from "@langchain/classic/vectorstores/memory";
import fs from "fs";
import path from "path";

/** 获取 docs 目录下所有 PDF 文件路径 */
function getPdfFiles(docsDir: string): string[] {
  const files = fs.readdirSync(docsDir);
  return files
    .filter((f) => f.toLowerCase().endsWith(".pdf"))
    .map((f) => path.join(docsDir, f));
}

/** 将检索结果格式化为字符串 */
function formatDocs(docs: { pageContent: string; metadata?: Record<string, unknown> }[]): string {
  return docs
    .map((d, i) => {
      const source = d.metadata?.source ? `（来源: ${path.basename(d.metadata.source as string)}）` : "";
      return `[文档 ${i + 1}]${source}\n${d.pageContent}`;
    })
    .join("\n\n---\n\n");
}

// ===== 模块级状态（全局单例，避免重复初始化） =====

let retriever: ReturnType<MemoryVectorStore["asRetriever"]> | null = null;
export let chunkCount = 0;
let initialized = false;

/** 初始化知识库：加载所有 PDF → 切割 → 向量化（只执行一次） */
export async function initializeKnowledgeBase(docsDir = "./src/docs") {
  if (initialized) return;

  const pdfFiles = getPdfFiles(docsDir);

  console.log(`找到 ${pdfFiles.length} 个 PDF 文件`);

  // 1. 加载所有 PDF
  const allDocs: { pageContent: string; metadata: Record<string, unknown> }[] = [];
  for (const file of pdfFiles) {
    const loader = new PDFLoader(file);
    const docs = await loader.load();
    docs.forEach((d) => {
      d.metadata = { ...d.metadata, source: file };
    });
    allDocs.push(...docs);
    console.log(`  ✅ ${path.basename(file)}（${docs.length} 页）`);
  }
  console.log(`\n总计加载 ${allDocs.length} 页文档`);

  // 2. 切割
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1000,
    chunkOverlap: 200,
    separators: ["\n\n", "\n", "。", "，", ",", " ", ""],
  });
  const chunks = await splitter.splitDocuments(allDocs);
  chunkCount = chunks.length;
  console.log(`切割为 ${chunks.length} 个文本块`);

  // 3. 向量化存储
  const embeddings = new AlibabaTongyiEmbeddings({
    modelName: "text-embedding-v1",
    apiKey: process.env.ALIBABA_TONGYI_API_KEY,
    batchSize: 10,
  });

  const store = new MemoryVectorStore(embeddings);
  await store.addDocuments(chunks);
  console.log("✅ 向量存储完成\n");

  // 4. 创建检索器
  retriever = store.asRetriever({ k: 5 });
  initialized = true;
}

/** 检索相关文档 */
export async function retrieveKnowledge(query: string) {
  if (!retriever) {
    throw new Error("知识库未初始化，请先调用 initializeKnowledgeBase()");
  }
  const docs = await retriever.invoke(query);
  
  return {
    docs,
    formatted: formatDocs(docs),
  };
}
