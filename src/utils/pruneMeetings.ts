export interface PruneMeetingListFlags {
  includeActionItems?: boolean;
  includeTranscript?: boolean;
  includeSummary?: boolean;
}

/**
 * Prunes a `/meetings` list response down to the essentials for each item —
 * title, recording id, created_at, url, meeting type, and invitee
 * names/emails — including action items, transcript, and the AI summary
 * only when their corresponding include flag was requested.
 *
 * Any input that doesn't look like a meeting list response (missing/invalid
 * `items`) is returned untouched.
 */
export function pruneMeetingListResponse(response: unknown, flags: PruneMeetingListFlags): unknown {
  if (!isRecord(response) || !Array.isArray(response.items)) {
    return response;
  }

  return {
    ...response,
    items: response.items.map((item) => pruneMeetingItem(item, flags)),
  };
}

function pruneMeetingItem(item: unknown, flags: PruneMeetingListFlags): unknown {
  if (!isRecord(item)) {
    return item;
  }

  const pruned: Record<string, unknown> = {
    title: item.title,
    recording_id: item.recording_id,
    created_at: item.created_at,
    url: item.url,
    meeting_type: item.meeting_type,
    calendar_invitees: pruneInvitees(item.calendar_invitees),
  };

  if (flags.includeActionItems) pruned.action_items = item.action_items;
  if (flags.includeTranscript) pruned.transcript = item.transcript;
  if (flags.includeSummary) pruned.default_summary = item.default_summary;

  return pruned;
}

function pruneInvitees(invitees: unknown): unknown {
  if (!Array.isArray(invitees)) {
    return invitees;
  }
  return invitees.map((invitee) =>
    isRecord(invitee) ? { name: invitee.name, email: invitee.email } : invitee
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
