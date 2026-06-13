import { tool } from "@langchain/core/tools";
import { z } from "zod";

export const fetchWebpage = tool(
  async ({ url }) => {
    try {
      // 设置超时和用户代理
      const response = await fetch(url, {
        headers: { 
          "User-Agent": "Mozilla/5.0 (compatible; LangChain Agent)" 
        },
        signal: AbortSignal.timeout(10000), // 10 秒超时
      });

      if (!response.ok) {
        return `请求失败：HTTP ${response.status}`;
      }

      const html = await response.text();
      
      // 简单提取纯文本
      // 生产环境建议用 cheerio 或 unfluff
      const text = html
        .replace(/<script[\s\S]*?<\/script>/gi, "")
        .replace(/<style[\s\S]*?<\/style>/gi, "")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 5000); // 限制返回长度，避免 Token 浪费

      return text;
    } catch (error) {
      return `抓取失败：${error instanceof Error ? error.message : "网络错误"}`;
    }
  },
  {
    name: "fetch_webpage",
    description: "获取指定 URL 的网页内容（纯文本），适合阅读文章、博客、新闻等内容。不支持 JavaScript 渲染的页面。",
    schema: z.object({
      url: z.string().url().describe("要访问的完整 URL，必须以 http:// 或 https:// 开头"),
    }),
  }
);
