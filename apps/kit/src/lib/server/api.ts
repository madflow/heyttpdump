import { API_URL } from "$app/env/private";
import { createClient } from "@repo/orpc";

export function getApiClient() {
  const url = API_URL || "http://localhost:3001/rpc";
  return { url, client: createClient(url) };
}
