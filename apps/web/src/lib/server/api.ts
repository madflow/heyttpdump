import "@tanstack/react-start/server-only";
import { createClient } from "@repo/orpc";

export function getApiClient() {
  const url = process.env.API_URL || "http://localhost:3001/rpc";
  return { url, client: createClient(url) };
}
