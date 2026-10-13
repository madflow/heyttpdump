import { fileURLToPath } from "node:url";
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { Hono } from "hono";

const entryUrl = new URL("./server/server.js", import.meta.url);
/** @type {{ default: { fetch: (request: Request) => Promise<Response> } }} */
const { default: start } = await import(entryUrl.href);
const app = new Hono();
app.use("*", serveStatic({ root: fileURLToPath(new URL("./client", import.meta.url)) }));
app.all("*", (context) => start.fetch(context.req.raw));

const port = Number(process.env.PORT || "3002");
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("Invalid PORT");
const server = serve({ fetch: app.fetch, port, hostname: process.env.HOST || "0.0.0.0" });
let stopping = false;
function shutdown() {
  if (stopping) return;
  stopping = true;
  server.close((error) => {
    clearTimeout(timeout);
    if (error) {
      console.error("Frontend shutdown failed:", error);
      process.exitCode = 1;
    }
  });
  const timeout = setTimeout(() => {
    if ("closeAllConnections" in server) server.closeAllConnections();
    process.exitCode = 1;
  }, 10_000);
  timeout.unref();
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
