import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ServiceContext } from "./types.js";
import { registerMeetingsTools } from "./services/meetings/index.js";
import { registerWebhooksTools } from "./services/webhooks/index.js";
import { registerTeamsTools } from "./services/teams/index.js";

export function createServer(ctx: ServiceContext): McpServer {
  const server = new McpServer({
    name: "fathom-mcp",
    version: "0.1.0",
  });

  registerMeetingsTools(server, ctx);
  registerWebhooksTools(server, ctx);
  registerTeamsTools(server, ctx);

  return server;
}
