import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ServiceContext } from "../../types.js";
import { textResult } from "../../utils/formatting.js";
import { fathomFetch } from "../../utils/api.js";

export function registerWebhooksTools(
  server: McpServer,
  ctx: ServiceContext
): void {
  server.tool(
    "fathom_create_webhook",
    "Create a webhook subscription for meeting notifications",
    {
      destination_url: z.string().describe("URL to receive webhook POST requests"),
      triggered_for: z.array(z.string()).optional().describe("Recording types to trigger for"),
      include_summary: z.boolean().optional().describe("Include summary in webhook payload"),
      include_transcript: z.boolean().optional().describe("Include transcript in webhook payload"),
      include_action_items: z.boolean().optional().describe("Include action items in webhook payload"),
      include_crm_matches: z.boolean().optional().describe("Include CRM matches in webhook payload"),
    },
    async ({ destination_url, triggered_for, include_summary, include_transcript, include_action_items, include_crm_matches }) => {
      const body: Record<string, unknown> = { destination_url };
      if (triggered_for) body.triggered_for = triggered_for;
      if (include_summary !== undefined) body.include_summary = include_summary;
      if (include_transcript !== undefined) body.include_transcript = include_transcript;
      if (include_action_items !== undefined) body.include_action_items = include_action_items;
      if (include_crm_matches !== undefined) body.include_crm_matches = include_crm_matches;

      const res = await fathomFetch(ctx, "/webhooks", { method: "POST", body });
      return textResult(res);
    }
  );

  server.tool(
    "fathom_delete_webhook",
    "Delete a webhook subscription",
    {
      id: z.string().describe("Webhook ID to delete"),
    },
    async ({ id }) => {
      await fathomFetch(ctx, `/webhooks/${id}`, { method: "DELETE" });
      return textResult({ ok: true, deleted: id });
    }
  );
}
