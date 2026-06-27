import { get_encoding } from "tiktoken";
import { BaseMessage } from "@langchain/core/messages";
// 初始化编码器
const encoder = get_encoding("cl100k_base"); 

// 估算文本的 Token 数量
function estimateTokens(text: string): number {
  return encoder.encode(text).length;
}

function estimateMessageTokens(messages: BaseMessage[]): number {
  let totalTokens = 0;
  
  for (const msg of messages) {
    // 基础开销：每条消息约 4 tokens
    totalTokens += 4;
    
    // 角色类型开销（通过 _getType() 获取，BaseMessage 没有 role 属性）
    const msgType = msg._getType();
    totalTokens += estimateTokens(msgType);
    
    // 内容开销
    if (typeof msg.content === "string") {
      totalTokens += estimateTokens(msg.content);
    } else if (Array.isArray(msg.content)) {
      // 多模态内容
      for (const part of msg.content) {
        if (part.type === "text") {
          totalTokens += estimateTokens(part.text as string);
        } else if (part.type === "image_url") {
          totalTokens += 85;  // 图片固定开销
        }
      }
    }
  }
  
  // 完成 token（回复结束标记）
  totalTokens += 3;
  
  return totalTokens;
}


export { estimateMessageTokens, estimateTokens };