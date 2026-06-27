
import { estimateTokens } from "@/helper/estimate-message-tokens";
import model from "@/agent";

 const response = await model.invoke("写一篇长沙一日游攻略");
 console.log(`响应内容：${response.content}\n`);
 console.log(`响应 token 数：${estimateTokens(response.content as string)}`);

