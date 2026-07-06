import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ServiceContext } from "../src/types.js";
import { fathomFetch } from "../src/utils/api.js";

function jsonResponse(status: number, body: unknown, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...headers },
  });
}

function textResponse(status: number, body: string, headers: Record<string, string> = {}): Response {
  return new Response(body, {
    status,
    headers: { "content-type": "text/plain", ...headers },
  });
}

function timeoutError(): Error {
  return new DOMException("The operation was aborted due to timeout", "TimeoutError");
}

const ctx: ServiceContext = { apiKey: "test-key", baseUrl: "https://api.fathom.ai/external/v1" };

describe("fathomFetch", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("passes an AbortSignal timeout to fetch", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { ok: true }));

    await fathomFetch(ctx, "/meetings");

    const [, init] = fetchMock.mock.calls[0];
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  it("retries once on 429, honoring the Retry-After header (seconds)", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(429, { message: "rate limited" }, { "retry-after": "3" }))
      .mockResolvedValueOnce(jsonResponse(200, { ok: true }));

    const promise = fathomFetch(ctx, "/meetings");
    await vi.advanceTimersByTimeAsync(3000);
    const result = await promise;

    expect(result).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("falls back to ~2s delay on 429 when Retry-After is missing", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(429, { message: "rate limited" }))
      .mockResolvedValueOnce(jsonResponse(200, { ok: true }));

    const promise = fathomFetch(ctx, "/meetings");
    await vi.advanceTimersByTimeAsync(2000);
    const result = await promise;

    expect(result).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("caps the Retry-After delay at 15s even if the header requests longer", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(429, { message: "rate limited" }, { "retry-after": "120" }))
      .mockResolvedValueOnce(jsonResponse(200, { ok: true }));

    const promise = fathomFetch(ctx, "/meetings");
    // Advancing by exactly the cap should be enough; advancing less should not be.
    await vi.advanceTimersByTimeAsync(15000);
    const result = await promise;

    expect(result).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("retries once on a 5xx with a short backoff, then succeeds", async () => {
    fetchMock
      .mockResolvedValueOnce(textResponse(500, "internal error"))
      .mockResolvedValueOnce(jsonResponse(200, { ok: true }));

    const promise = fathomFetch(ctx, "/meetings");
    await vi.advanceTimersByTimeAsync(1000);
    const result = await promise;

    expect(result).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("does not retry a second time after the retry also fails", async () => {
    fetchMock
      .mockResolvedValueOnce(textResponse(500, "internal error"))
      .mockResolvedValueOnce(textResponse(500, "internal error again"));

    const promise = fathomFetch(ctx, "/meetings");
    const assertion = expect(promise).rejects.toThrow(/Fathom API 500/);
    // flush any pending retry backoff timers
    await vi.runAllTimersAsync();
    await assertion;
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("throws a clear message when the request times out", async () => {
    fetchMock.mockRejectedValueOnce(timeoutError());

    await expect(fathomFetch(ctx, "/meetings")).rejects.toThrow("Fathom API request timed out");
  });

  it("includes the parsed JSON `message` field and status code in non-2xx errors", async () => {
    fetchMock.mockImplementation(async () => jsonResponse(400, { message: "Invalid cursor" }));

    await expect(fathomFetch(ctx, "/meetings")).rejects.toThrow(/400/);
    await expect(fathomFetch(ctx, "/meetings")).rejects.toThrow(/Invalid cursor/);
  });

  it("falls back to the parsed JSON `error` field when `message` is absent", async () => {
    fetchMock.mockImplementation(async () => jsonResponse(403, { error: "Forbidden resource" }));

    await expect(fathomFetch(ctx, "/meetings")).rejects.toThrow(/Forbidden resource/);
  });

  it("falls back to the raw body text when it isn't JSON", async () => {
    fetchMock.mockImplementation(async () => textResponse(404, "Not Found"));

    await expect(fathomFetch(ctx, "/meetings")).rejects.toThrow(/Not Found/);
  });
});
