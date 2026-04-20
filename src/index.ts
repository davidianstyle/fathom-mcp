#!/usr/bin/env node
import { program } from "commander";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { loadAuth } from "./auth.js";
import { createServer } from "./server.js";

program
  .name("fathom-mcp")
  .description("Fathom.video MCP server for Claude Code")
  .parse();

const ctx = loadAuth();
const server = createServer(ctx);
const transport = new StdioServerTransport();
await server.connect(transport);
