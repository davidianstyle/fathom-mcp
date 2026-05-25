#!/usr/bin/env node
import { program } from "commander";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { loadAuth } from "./auth.js";
import { createServer } from "./server.js";

program
  .name("fathom-mcp")
  .description("Fathom.video MCP server for Claude Code")
  .parse();

// The parent (Claude Code) terminates stdio MCP servers with SIGINT/SIGTERM
// during session teardown. Without these handlers gVisor (Cloud Run's sandbox)
// reports each as `Uncaught signal: 2` at ERROR severity in Cloud Logging.
const shutdown = (): never => process.exit(0);
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

const ctx = loadAuth();
const server = createServer(ctx);
const transport = new StdioServerTransport();
await server.connect(transport);
