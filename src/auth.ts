import { ServiceContext } from "./types.js";

const FATHOM_BASE_URL = "https://api.fathom.ai/external/v1";

export function loadAuth(): ServiceContext {
  const apiKey = process.env.FATHOM_API_KEY;

  if (!apiKey) {
    throw new Error(
      "Environment variable FATHOM_API_KEY not set.\nSet it in ~/.config/openbrain/.env or export it before running."
    );
  }

  return { apiKey, baseUrl: FATHOM_BASE_URL };
}
