import { createMiddleware } from "langchain";

/**
 * 检测常见的提示词注入模式
 */
function containsPromptInjection(text: string): boolean {
  const injectionPatterns = [
    /ignore\s+(?:previous|above|all)\s+.*?(?:instructions|prompts|rules)/i,
    / disregard\s+(the\s+)?(previous|above)/i,
    / forget\s+(everything|all\s+instructions)/i,
    / you\s+are\s+now\s+/i,
    / system\s*:/i,
    / \[INST\]/i,
    / <\|im_start\|>/i,
  ];

  return injectionPatterns.some(pattern => pattern.test(text));
}

const inputGuardrail = createMiddleware({
  name: "InputGuardrail",
  
  beforeModel: async (request) => {
    const userMessages = request.messages.filter(m => m._getType() === "human");
    const lastInput = userMessages.at(-1)?.content as string;
    
    if (!lastInput) {
      return request;
    }
    // 检测提示词注入
    if (containsPromptInjection(lastInput)) {
      console.warn("[Guardrail] 检测到潜在的提示词注入攻击");
      
      // todo:  线上可以记录安全事件
      
      // 拒绝请求
      throw new Error("检测到不安全的内容，请重新输入。");
    }
    
    return request;
  },
});


export default inputGuardrail;

