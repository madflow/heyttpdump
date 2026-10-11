import { env } from "cloudflare:workers";
import { createClient } from "@repo/orpc";

// Adapter Cloudflare 8 exposes bindings via cloudflare:workers rather than event.platform.
export function getApiClient() {
  const binding = env.API;
  if (!binding) throw new Error("Missing Cloudflare API binding");
  return {
    url: "https://api.internal/rpc",
    client: createClient("https://api.internal/rpc", (request, init) =>
      binding.fetch(request, init),
    ),
  };
}
