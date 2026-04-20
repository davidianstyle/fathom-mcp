import { ServiceContext } from "../types.js";

export async function fathomFetch(
  ctx: ServiceContext,
  path: string,
  opts: { method?: string; body?: unknown; params?: Record<string, string | string[] | undefined> } = {}
): Promise<unknown> {
  const base = ctx.baseUrl.endsWith("/") ? ctx.baseUrl : ctx.baseUrl + "/";
  const url = new URL(path.startsWith("/") ? path.slice(1) : path, base);

  if (opts.params) {
    for (const [key, val] of Object.entries(opts.params)) {
      if (val === undefined) continue;
      if (Array.isArray(val)) {
        for (const v of val) url.searchParams.append(key, v);
      } else {
        url.searchParams.set(key, val);
      }
    }
  }

  const headers: Record<string, string> = {
    "X-Api-Key": ctx.apiKey,
    Accept: "application/json",
  };

  if (opts.body) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(url.toString(), {
    method: opts.method || "GET",
    headers,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Fathom API ${res.status}: ${text}`);
  }

  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return res.json();
  }
  return res.text();
}
