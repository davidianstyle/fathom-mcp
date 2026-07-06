import { ServiceContext } from "../types.js";

const REQUEST_TIMEOUT_MS = 30_000;
const RETRY_AFTER_FALLBACK_MS = 2_000;
const RETRY_AFTER_MAX_MS = 15_000;
const SERVER_ERROR_RETRY_DELAY_MS = 500;

export interface FathomFetchOptions {
  method?: string;
  body?: unknown;
  params?: Record<string, string | string[] | undefined>;
}

export async function fathomFetch(
  ctx: ServiceContext,
  path: string,
  opts: FathomFetchOptions = {}
): Promise<unknown> {
  const url = buildUrl(ctx, path, opts.params);

  const headers: Record<string, string> = {
    "X-Api-Key": ctx.apiKey,
    Accept: "application/json",
  };
  if (opts.body) {
    headers["Content-Type"] = "application/json";
  }

  let retried = false;

  for (;;) {
    let res: Response;
    try {
      res = await fetch(url, {
        method: opts.method || "GET",
        headers,
        body: opts.body ? JSON.stringify(opts.body) : undefined,
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch (err) {
      if (isTimeoutError(err)) {
        throw new Error("Fathom API request timed out");
      }
      throw err;
    }

    if (!retried && res.status === 429) {
      retried = true;
      await sleep(getRetryAfterDelayMs(res.headers.get("retry-after")));
      continue;
    }

    if (!retried && res.status >= 500 && res.status < 600) {
      retried = true;
      await sleep(SERVER_ERROR_RETRY_DELAY_MS);
      continue;
    }

    if (!res.ok) {
      throw new Error(await buildErrorMessage(res));
    }

    const contentType = res.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      return res.json();
    }
    return res.text();
  }
}

function buildUrl(
  ctx: ServiceContext,
  path: string,
  params?: Record<string, string | string[] | undefined>
): string {
  const base = ctx.baseUrl.endsWith("/") ? ctx.baseUrl : ctx.baseUrl + "/";
  const url = new URL(path.startsWith("/") ? path.slice(1) : path, base);

  if (params) {
    for (const [key, val] of Object.entries(params)) {
      if (val === undefined) continue;
      if (Array.isArray(val)) {
        for (const v of val) url.searchParams.append(key, v);
      } else {
        url.searchParams.set(key, val);
      }
    }
  }

  return url.toString();
}

function getRetryAfterDelayMs(headerValue: string | null): number {
  if (!headerValue) return RETRY_AFTER_FALLBACK_MS;
  const seconds = Number(headerValue);
  if (!Number.isFinite(seconds) || seconds < 0) return RETRY_AFTER_FALLBACK_MS;
  return Math.min(seconds * 1000, RETRY_AFTER_MAX_MS);
}

async function buildErrorMessage(res: Response): Promise<string> {
  const text = await res.text();
  const detail = extractDetailMessage(text);
  return detail ? `Fathom API ${res.status}: ${detail}` : `Fathom API ${res.status}`;
}

function extractDetailMessage(text: string): string {
  if (!text) return "";
  try {
    const parsed: unknown = JSON.parse(text);
    if (parsed && typeof parsed === "object") {
      const { message, error } = parsed as Record<string, unknown>;
      if (typeof message === "string" && message) return message;
      if (typeof error === "string" && error) return error;
    }
  } catch {
    // Body isn't JSON — fall through to the raw text.
  }
  return text;
}

function isTimeoutError(err: unknown): boolean {
  return err instanceof Error && (err.name === "TimeoutError" || err.name === "AbortError");
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
