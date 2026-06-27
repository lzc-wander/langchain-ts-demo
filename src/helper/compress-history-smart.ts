import { BaseMessage, SystemMessage } from "@langchain/core/messages";
import { estimateMessageTokens } from "@/helper/estimate-message-tokens";
import model from "@/agent";

/**
 * 智能压缩历史消息
 */
async function compressHistorySmart(
  messages: BaseMessage[],
  targetTokens: number
): Promise<BaseMessage[]> {
  // 策略 1：保留系统消息（永远不删除）
  const systemMessages = messages.filter(m => m._getType() === "system");
  
  // 策略 2：保留最近 N 条对话
  const recentMessages = messages.slice(-10);  // 最近 10 条
  
  // 策略 3：对早期消息进行摘要
  const earlyMessages = messages.slice(0, -10);
  
  if (earlyMessages.length === 0) {
    return [...systemMessages, ...recentMessages];
  }
  
  const summaryPrompt = `请简要总结以下对话的核心内容（200字以内）：

${earlyMessages.map(m => `${m._getType()}: ${typeof m.content === "string" ? m.content : "[多模态内容]"}`).join("\n")}

摘要：`;
  
  const summaryResponse = await model.invoke(summaryPrompt);
  const summary = summaryResponse.content as string;
  
  // 构建压缩后的消息列表
  const compressedMessages = [
    ...systemMessages,
    new SystemMessage(`之前的对话摘要：\n${summary}`),
    ...recentMessages,
  ];
  
  // 检查是否满足预算
  const finalTokens = estimateMessageTokens(compressedMessages);
  if (finalTokens > targetTokens) {
    // 如果还超，进一步减少最近消息数量
    return compressHistorySmart(
      [...systemMessages, ...messages.slice(-5)],
      targetTokens
    );
  }
  
  return compressedMessages;
}

export {
    compressHistorySmart
}