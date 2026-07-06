import { describe, expect, it } from "vitest";
import { pruneMeetingListResponse } from "../src/utils/pruneMeetings.js";

function rawMeeting(overrides: Record<string, unknown> = {}) {
  return {
    title: "Quarterly Business Review",
    recording_id: 12345,
    url: "https://fathom.video/share/abc123",
    share_url: "https://fathom.video/share/abc123",
    created_at: "2026-06-01T10:00:00Z",
    meeting_type: "External",
    scheduled_start_time: "2026-06-01T10:00:00Z",
    scheduled_end_time: "2026-06-01T10:30:00Z",
    recording_start_time: "2026-06-01T10:00:05Z",
    recording_end_time: "2026-06-01T10:29:55Z",
    calendar_invitees: [
      { name: "Ada Lovelace", email: "ada@example.com", is_external: false, email_domain: "example.com" },
      { name: "Grace Hopper", email: "grace@example.com", is_external: true, email_domain: "example.com" },
    ],
    action_items: [{ description: "Follow up with legal", completed: false }],
    transcript: [{ speaker: "Ada Lovelace", text: "Let's get started.", timestamp: "00:00:01" }],
    default_summary: { markdown_formatted: "## Summary\n- Discussed roadmap" },
    crm_matches: { contacts: [{ name: "Ada Lovelace", crm_id: "003xx0001" }] },
    ...overrides,
  };
}

const baseResponse = {
  limit: 10,
  next_cursor: "cursor-2",
};

describe("pruneMeetingListResponse", () => {
  it("prunes items to essential fields by default", () => {
    const response = { ...baseResponse, items: [rawMeeting()] };

    const pruned = pruneMeetingListResponse(response, {}) as {
      items: Array<Record<string, unknown>>;
    };

    expect(pruned.items).toHaveLength(1);
    const item = pruned.items[0];

    expect(item.title).toBe("Quarterly Business Review");
    expect(item.recording_id).toBe(12345);
    expect(item.created_at).toBe("2026-06-01T10:00:00Z");
    expect(item.url).toBe("https://fathom.video/share/abc123");
    expect(item.meeting_type).toBe("External");
    expect(item.calendar_invitees).toEqual([
      { name: "Ada Lovelace", email: "ada@example.com" },
      { name: "Grace Hopper", email: "grace@example.com" },
    ]);

    // Bulky / unrequested fields are dropped.
    expect(item.action_items).toBeUndefined();
    expect(item.transcript).toBeUndefined();
    expect(item.default_summary).toBeUndefined();
    expect(item.crm_matches).toBeUndefined();
    expect(item.scheduled_start_time).toBeUndefined();
    expect(item.recording_start_time).toBeUndefined();
  });

  it("preserves top-level pagination fields", () => {
    const response = { ...baseResponse, items: [rawMeeting()] };

    const pruned = pruneMeetingListResponse(response, {}) as Record<string, unknown>;

    expect(pruned.limit).toBe(10);
    expect(pruned.next_cursor).toBe("cursor-2");
  });

  it("includes action_items only when includeActionItems is requested", () => {
    const response = { ...baseResponse, items: [rawMeeting()] };

    const pruned = pruneMeetingListResponse(response, { includeActionItems: true }) as {
      items: Array<Record<string, unknown>>;
    };

    expect(pruned.items[0].action_items).toEqual([{ description: "Follow up with legal", completed: false }]);
    expect(pruned.items[0].transcript).toBeUndefined();
    expect(pruned.items[0].default_summary).toBeUndefined();
  });

  it("includes transcript only when includeTranscript is requested", () => {
    const response = { ...baseResponse, items: [rawMeeting()] };

    const pruned = pruneMeetingListResponse(response, { includeTranscript: true }) as {
      items: Array<Record<string, unknown>>;
    };

    expect(pruned.items[0].transcript).toEqual([
      { speaker: "Ada Lovelace", text: "Let's get started.", timestamp: "00:00:01" },
    ]);
    expect(pruned.items[0].action_items).toBeUndefined();
    expect(pruned.items[0].default_summary).toBeUndefined();
  });

  it("includes default_summary only when includeSummary is requested", () => {
    const response = { ...baseResponse, items: [rawMeeting()] };

    const pruned = pruneMeetingListResponse(response, { includeSummary: true }) as {
      items: Array<Record<string, unknown>>;
    };

    expect(pruned.items[0].default_summary).toEqual({ markdown_formatted: "## Summary\n- Discussed roadmap" });
    expect(pruned.items[0].action_items).toBeUndefined();
    expect(pruned.items[0].transcript).toBeUndefined();
  });

  it("includes crm_matches only when includeCrmMatches is requested", () => {
    const response = { ...baseResponse, items: [rawMeeting()] };

    const pruned = pruneMeetingListResponse(response, { includeCrmMatches: true }) as {
      items: Array<Record<string, unknown>>;
    };

    expect(pruned.items[0].crm_matches).toEqual({
      contacts: [{ name: "Ada Lovelace", crm_id: "003xx0001" }],
    });
    expect(pruned.items[0].action_items).toBeUndefined();
    expect(pruned.items[0].transcript).toBeUndefined();
    expect(pruned.items[0].default_summary).toBeUndefined();
  });

  it("includes all four when all four flags are requested", () => {
    const response = { ...baseResponse, items: [rawMeeting()] };

    const pruned = pruneMeetingListResponse(response, {
      includeActionItems: true,
      includeTranscript: true,
      includeSummary: true,
      includeCrmMatches: true,
    }) as { items: Array<Record<string, unknown>> };

    expect(pruned.items[0].action_items).toBeDefined();
    expect(pruned.items[0].transcript).toBeDefined();
    expect(pruned.items[0].default_summary).toBeDefined();
    expect(pruned.items[0].crm_matches).toBeDefined();
  });

  it("returns the response untouched when items is missing or malformed", () => {
    const malformed = { limit: 10, next_cursor: null };

    expect(pruneMeetingListResponse(malformed, {})).toEqual(malformed);
    expect(pruneMeetingListResponse(null, {})).toBeNull();
    expect(pruneMeetingListResponse("not an object", {})).toBe("not an object");
  });

  it("handles meetings with no calendar invitees gracefully", () => {
    const response = { ...baseResponse, items: [rawMeeting({ calendar_invitees: undefined })] };

    const pruned = pruneMeetingListResponse(response, {}) as { items: Array<Record<string, unknown>> };

    expect(pruned.items[0].calendar_invitees).toBeUndefined();
  });
});
