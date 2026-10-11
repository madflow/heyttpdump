import { createClient } from "@repo/orpc";
import { createDumpApp } from "./app.ts";

export default {
  fetch(request: Request, env: DumpEnv): Promise<Response> | Response {
    if (!env.API) throw new Error("Missing Cloudflare API binding");
    const client = createClient("https://api.internal/rpc", (request, init) =>
      env.API.fetch(request, init),
    );
    return createDumpApp(client, 262_144).fetch(request);
  },
};
