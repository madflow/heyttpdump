import { Hono } from "hono";
import { cors } from "hono/cors";
import { onError } from "@orpc/server";
import { RPCHandler } from "@orpc/server/fetch";
import { router } from "./router.ts";

const DEFAULT_PORT = 3001;
const RPC_PREFIX = "/rpc";

const handler = new RPCHandler(router, {
  interceptors: [
    onError((error) => {
      console.error("RPC Error:", error);
    }),
  ],
});

const app = new Hono();

app.use("*", cors());

app.use("/rpc/*", async (c, next) => {
  const { matched, response } = await handler.handle(c.req.raw, {
    prefix: RPC_PREFIX,
    context: {},
  });

  if (matched) {
    return c.newResponse(response.body, response);
  }

  await next();
});

const PORT = Number(Deno.env.get("API_PORT")) || DEFAULT_PORT;

console.log(`API server listening on port ${PORT}`);
console.log(`RPC endpoint: http://localhost:${PORT}${RPC_PREFIX}`);

Deno.serve({ port: PORT }, app.fetch);
