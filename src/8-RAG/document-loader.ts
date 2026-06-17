import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";

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

console.log(chunks);
