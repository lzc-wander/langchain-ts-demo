import { createMiddleware } from "langchain";
import { estimateMessageTokens } from "@/helper/estimate-message-tokens";
import { compressHistorySmart } from "@/helper/compress-history-smart";

const tokenBudgetMiddleware = createMiddleware({
  name: "TokenBudget",
  
  beforeModel: async (request) => {
    const estimatedTokens = estimateMessageTokens(request.messages);
    const BUDGET_LIMIT = 1000;  // 100K tokens
    
    console.log(`[Token Budget] 当前: ${estimatedTokens} / ${BUDGET_LIMIT}`);
    
    if (estimatedTokens > BUDGET_LIMIT) {
      console.warn(`[Token Budget] ⚠️ 超出预算！${estimatedTokens} > ${BUDGET_LIMIT}`);
      
    //  自动压缩历史（推荐）
      request.messages = await compressHistorySmart(request.messages, BUDGET_LIMIT);
    }
    
    return request;
  },
})

export default tokenBudgetMiddleware;