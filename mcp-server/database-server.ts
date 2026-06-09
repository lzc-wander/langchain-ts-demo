// mcp-servers/database-server.ts

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

// 创建 MCP 服务器实例
const server = new McpServer({
  name: "database-server",
  version: "1.0.0"
});

// 注册工具
server.registerTool(
  "query_users",
  {
    title: "查询用户列表",
    description: "根据条件查询用户列表",
    inputSchema: z.object({
      name: z.string().optional().describe("用户姓名(模糊匹配)"),
      limit: z.number().default(10).describe("返回条数,默认 10"),
    }),
  },
  async ({ name, limit = 10 }) => {
    // 实际场景应该执行数据库查询
    // const users = await db.query(
    //   "SELECT id, name, email FROM users WHERE name LIKE ? LIMIT ?",
    //   [`%${name || ""}%`, limit]
    // );
    // mock数据
    const users = mockDatabase(name, limit);

    // 返回结果
    return {
      content: [{ type: "text", text: JSON.stringify(users) }],
    };
  }
);

// 启动服务器(stdio 模式)
const transport = new StdioServerTransport();
await server.connect(transport);

console.log("Database MCP Server started");


function mockDatabase(name?: string, limit: number = 10) {
    const users = [];
    for(let i = 0; i < limit; i++) {
        users.push({
            id: i,
            name: `${name}-${i}-${Math.random().toString(36).substring(2, 7)}`,
            email: `user${i}@example.com`,
        });
    }
    return users;
}
