import { createMiddleware } from "langchain";


const loggingMiddleware = createMiddleware({
  name: "Logger",

  // 钩子 1：在 LLM 调用之前执行
  beforeModel: async (request) => {
    console.log(`[LLM] 调用模型，消息数量：${request.messages.length}`);
    
    // 可以修改请求
    // request.messages.push(new SystemMessage("额外提示"));
    
    return request;  // 返回（可修改的）request
  },

  // 钩子 2：在 LLM 调用之后执行
  afterModel: async (response) => {
    const lastMsg = response.messages?.at?.(-1);
    const usage = lastMsg?.usage_metadata;
    console.log(`[LLM] 模型响应，Token 用量：${usage?.total_tokens ?? "未知"}`);
    
    // 可以修改响应
    // response.message.content += "\n\n[由助手生成]";
    
    return response;
  },

  // 钩子 3：包装工具调用
  wrapToolCall: async (request, handler) => {
    const start = Date.now();
    console.log(`[Tool] 调用工具：${request.toolCall.name}`);
    
    try {
      // 执行原始的工具调用
      const result = await handler(request);
      
      const duration = Date.now() - start;
      console.log(`[Tool] 工具执行耗时：${duration}ms`);
      
      return result;
    } catch (error) {
      console.error(`[Tool] 工具调用失败：`, error);
      throw error;
    }
  },

  // 钩子 4：包装完整的模型调用
  wrapModelCall: async (request, handler) => {
    console.log("[Model] 开始模型调用");
    
    try {
      const result = await handler(request);
      console.log("[Model] 模型调用成功");
      return result;
    } catch (error) {
      console.error("[Model] 模型调用失败:", error);
      throw error;
    }
  },
});

export default loggingMiddleware;