import { Hono } from "hono";
import { cors } from "hono/cors";
import { onError } from "@orpc/server";
import { RPCHandler } from "@orpc/server/fetch";
import { router } from "./router.ts";
import { db } from "./db.ts";

const DEFAULT_PORT = 3001;
const RPC_PREFIX = "/rpc";
const START_TIME = new Date();

const handler = new RPCHandler(router, {
  interceptors: [
    onError((error) => {
      console.error("RPC Error:", error);
    }),
  ],
});

const app = new Hono();

app.use("*", cors());

// Health check endpoint - basic liveness check
app.get("/health", (c) => {
  return c.json({
    status: "ok",
    service: "api",
    timestamp: new Date().toISOString(),
  });
});

// Ready check endpoint - includes database connectivity
app.get("/ready", (c) => {
  try {
    // Test database connectivity
    db.prepare("SELECT 1").get();
    
    const uptime = Date.now() - START_TIME.getTime();
    
    return c.json({
      status: "ready",
      service: "api",
      timestamp: new Date().toISOString(),
      uptime: `${Math.floor(uptime / 1000)}s`,
      database: "connected",
      version: "1.0.0",
    });
  } catch (error) {
    console.error("Ready check failed:", error);
    return c.json(
      {
        status: "not_ready",
        service: "api",
        timestamp: new Date().toISOString(),
        database: "disconnected",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 503 }
    );
  }
});

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
