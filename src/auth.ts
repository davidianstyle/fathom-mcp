import { ServiceContext } from "./types.js";

const FATHOM_BASE_URL = "https://api.fathom.ai/external/v1";

export function loadAuth(): ServiceContext {
  const apiKey = process.env.FATHOM_API_KEY;

  if (!apiKey) {
    throw new Error(
      "FATHOM_API_KEY environment variable is not set. Set it in the environment before running fathom-mcp."
    );
  }

  return { apiKey, baseUrl: FATHOM_BASE_URL };
}
