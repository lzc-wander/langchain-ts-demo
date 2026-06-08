import { ToolMessage } from "@langchain/core/messages";
import { createMiddleware } from "langchain";
// 创建统一的工具错误处理中间件
const toolErrorHandler = createMiddleware({
  name: "ToolErrorHandler",
  
  // 拦截工具调用
  wrapToolCall: async (request, handler) => {
    try {
      // 正常执行工具
      return await handler(request);
    } catch (error) {
      // 统一返回友好的错误消息
      console.error(`工具 ${request.toolCall.name} 调用失败:`, error);
      return new ToolMessage({
        content: `工具调用失败：${error instanceof Error ? error.message : "未知错误"}。请尝试其他方式或告知用户无法完成该操作。`,
        tool_call_id: request.toolCall.id!,
      });
    }
  },
});

export default toolErrorHandler;