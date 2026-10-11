import { Hono } from "hono";
import { cors } from "hono/cors";
import { onError } from "@orpc/server";
import { RPCHandler } from "@orpc/server/fetch";
import { router } from "./router.ts";
import type { RequestRepository } from "./request-repository.ts";

export function createApp(repository: RequestRepository) {
  const startedAt = Date.now();
  const handler = new RPCHandler(router, {
    interceptors: [onError((error) => console.error("RPC Error:", error))],
  });
  const app = new Hono();
  app.use("*", cors());
  app.get("/health", (c) =>
    c.json({
      status: "ok",
      service: "api",
      timestamp: new Date().toISOString(),
    }),
  );
  app.get("/ready", async (c) => {
    try {
      await repository.checkReady();
      return c.json({
        status: "ready",
        service: "api",
        timestamp: new Date().toISOString(),
        uptime: `${Math.floor((Date.now() - startedAt) / 1000)}s`,
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
        503,
      );
    }
  });
  app.use("/rpc/*", async (c, next) => {
    const { matched, response } = await handler.handle(c.req.raw, {
      prefix: "/rpc",
      context: { repository },
    });
    if (matched) return c.newResponse(response.body, response);
    await next();
  });
  return app;
}
