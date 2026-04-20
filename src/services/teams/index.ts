import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ServiceContext } from "../../types.js";
import { textResult } from "../../utils/formatting.js";
import { fathomFetch } from "../../utils/api.js";

export function registerTeamsTools(
  server: McpServer,
  ctx: ServiceContext
): void {
  server.tool(
    "fathom_list_teams",
    "List all accessible teams",
    {
      cursor: z.string().optional().describe("Pagination cursor"),
    },
    async ({ cursor }) => {
      const params: Record<string, string | undefined> = {};
      if (cursor) params.cursor = cursor;

      const res = await fathomFetch(ctx, "/teams", { params });
      return textResult(res);
    }
  );

  server.tool(
    "fathom_list_team_members",
    "List members of a team",
    {
      team: z.string().describe("Team ID"),
      cursor: z.string().optional().describe("Pagination cursor"),
    },
    async ({ team, cursor }) => {
      const params: Record<string, string | undefined> = { team };
      if (cursor) params.cursor = cursor;

      const res = await fathomFetch(ctx, "/team_members", { params });
      return textResult(res);
    }
  );
}
