import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ServiceContext } from "../../types.js";
import { textResult } from "../../utils/formatting.js";
import { fathomFetch } from "../../utils/api.js";

export function registerMeetingsTools(
  server: McpServer,
  ctx: ServiceContext
): void {
  server.tool(
    "fathom_list_meetings",
    "List meetings with optional filters",
    {
      created_after: z.string().optional().describe("ISO 8601 datetime — only meetings created after this"),
      created_before: z.string().optional().describe("ISO 8601 datetime — only meetings created before this"),
      recorded_by: z.array(z.string()).optional().describe("Filter by recorder email addresses"),
      teams: z.array(z.string()).optional().describe("Filter by team IDs"),
      calendar_invitees_domains: z.array(z.string()).optional().describe("Filter by invitee email domains"),
      calendar_invitees_domains_type: z.enum(["include", "exclude"]).optional().describe("Whether to include or exclude the specified domains"),
      include_summary: z.boolean().optional().describe("Include AI summary in response"),
      include_transcript: z.boolean().optional().describe("Include transcript in response"),
      include_action_items: z.boolean().optional().describe("Include action items in response"),
      include_crm_matches: z.boolean().optional().describe("Include CRM matches in response"),
      cursor: z.string().optional().describe("Pagination cursor"),
    },
    async (params) => {
      const queryParams: Record<string, string | string[] | undefined> = {};
      if (params.created_after) queryParams.created_after = params.created_after;
      if (params.created_before) queryParams.created_before = params.created_before;
      if (params.recorded_by) queryParams["recorded_by[]"] = params.recorded_by;
      if (params.teams) queryParams["teams[]"] = params.teams;
      if (params.calendar_invitees_domains) queryParams["calendar_invitees_domains[]"] = params.calendar_invitees_domains;
      if (params.calendar_invitees_domains_type) queryParams.calendar_invitees_domains_type = params.calendar_invitees_domains_type;
      if (params.include_summary) queryParams.include_summary = "true";
      if (params.include_transcript) queryParams.include_transcript = "true";
      if (params.include_action_items) queryParams.include_action_items = "true";
      if (params.include_crm_matches) queryParams.include_crm_matches = "true";
      if (params.cursor) queryParams.cursor = params.cursor;

      const res = await fathomFetch(ctx, "/recordings", { params: queryParams });
      return textResult(res);
    }
  );

  server.tool(
    "fathom_search_meetings",
    "Search meeting titles, transcripts, and summaries",
    {
      query: z.string().describe("Search query"),
      created_after: z.string().optional().describe("ISO 8601 datetime"),
      created_before: z.string().optional().describe("ISO 8601 datetime"),
      teams: z.array(z.string()).optional().describe("Filter by team IDs"),
      limit: z.number().optional().describe("Max results to return"),
    },
    async ({ query, created_after, created_before, teams, limit }) => {
      const params: Record<string, string | string[] | undefined> = { query };
      if (created_after) params.created_after = created_after;
      if (created_before) params.created_before = created_before;
      if (teams) params["teams[]"] = teams;
      if (limit) params.limit = String(limit);

      const res = await fathomFetch(ctx, "/recordings/search", { params });
      return textResult(res);
    }
  );

  server.tool(
    "fathom_get_summary",
    "Get AI-generated meeting summary",
    {
      recording_id: z.string().describe("Recording ID"),
    },
    async ({ recording_id }) => {
      const res = await fathomFetch(ctx, `/recordings/${recording_id}/summary`);
      return textResult(res);
    }
  );

  server.tool(
    "fathom_get_transcript",
    "Get full timestamped transcript of a meeting",
    {
      recording_id: z.string().describe("Recording ID"),
    },
    async ({ recording_id }) => {
      const res = await fathomFetch(ctx, `/recordings/${recording_id}/transcript`);
      return textResult(res);
    }
  );

  server.tool(
    "fathom_meeting_stats",
    "Get meeting analytics and statistics",
    {
      created_after: z.string().optional().describe("ISO 8601 datetime"),
      created_before: z.string().optional().describe("ISO 8601 datetime"),
      teams: z.array(z.string()).optional().describe("Filter by team IDs"),
    },
    async ({ created_after, created_before, teams }) => {
      const params: Record<string, string | string[] | undefined> = {};
      if (created_after) params.created_after = created_after;
      if (created_before) params.created_before = created_before;
      if (teams) params["teams[]"] = teams;

      const res = await fathomFetch(ctx, "/recordings/stats", { params });
      return textResult(res);
    }
  );

  server.tool(
    "fathom_participant_stats",
    "Get analytics about meeting participants and recorders",
    {
      created_after: z.string().optional().describe("ISO 8601 datetime"),
      created_before: z.string().optional().describe("ISO 8601 datetime"),
      limit: z.number().optional().describe("Max results"),
    },
    async ({ created_after, created_before, limit }) => {
      const params: Record<string, string | string[] | undefined> = {};
      if (created_after) params.created_after = created_after;
      if (created_before) params.created_before = created_before;
      if (limit) params.limit = String(limit);

      const res = await fathomFetch(ctx, "/recordings/stats/participants", { params });
      return textResult(res);
    }
  );
}
