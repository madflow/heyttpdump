import { createApp } from "./app.ts";
import { createD1Repository } from "./d1.ts";

const startedAt = Date.now();

export default {
  fetch(request: Request, env: ApiEnv): Promise<Response> | Response {
    if (!env.DB) throw new Error("Missing Cloudflare DB binding");
    return createApp(createD1Repository(env.DB), startedAt).fetch(request);
  },
};
