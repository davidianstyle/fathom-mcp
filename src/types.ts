import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export interface ServiceContext {
  apiKey: string;
  baseUrl: string;
}

export type RegisterTools = (server: McpServer, ctx: ServiceContext) => void;
