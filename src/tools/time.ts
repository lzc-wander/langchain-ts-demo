import { tool } from "langchain";
import { z } from "zod";

function getCurrentTime({ format }: { format?: string }): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const day = now.getDate();
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const seconds = String(now.getSeconds()).padStart(2, "0");

  switch (format) {
    case "iso":
      return now.toISOString();
    case "date":
      return `${year}年${month}月${day}日`;
    case "time":
      return `${hours}:${minutes}:${seconds}`;
    default:
      return `${year}年${month}月${day}日 ${hours}:${minutes}:${seconds}`;
  }
}

export const getTime = tool(getCurrentTime, {
  name: "get_time",
  description: "获取当前的日期和时间，支持多种格式返回",
  schema: z.object({
    format: z
      .enum(["full", "date", "time", "iso"])
      .optional()
      .describe("返回格式：full（完整日期时间）、date（仅日期）、time（仅时间）、iso（ISO 格式）"),
  }),
});
