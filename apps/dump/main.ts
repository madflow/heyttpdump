import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { createClient } from "@repo/orpc";

const DEFAULT_API_URL = "http://localhost:3001/rpc";
const DEFAULT_PORT = 3000;

const API_URL = process.env.API_URL || DEFAULT_API_URL;
const PORT = Number(process.env.DUMP_PORT) || DEFAULT_PORT;

const app = new Hono();
const apiClient = createClient(API_URL);

app.all("*", async (c) => {
  try {
    const requestPayload = {
      method: c.req.method,
      url: c.req.url,
      headers: Object.fromEntries(c.req.raw.headers.entries()),
      body: await c.req.text(),
    };

    const createdRequest = await apiClient.requests.create({
      payload: requestPayload,
    });

    return c.json({ request: createdRequest });
  } catch (error) {
    console.error("Failed to create request:", error);
    return c.json({ error: "Failed to record request" }, { status: 500 });
  }
});

const server = serve({ port: PORT, hostname: "0.0.0.0", fetch: app.fetch }, () => {
  console.log(`HTTP dump service listening on port ${PORT}`);
});
let stopping = false;
function shutdown() {
  if (stopping) return;
  stopping = true;
  const timeout = setTimeout(() => process.exit(1), 10_000);
  timeout.unref();
  server.close((error) => {
    clearTimeout(timeout);
    process.exitCode = error ? 1 : 0;
  });
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
server.on("error", (error) => {
  console.error("Dump server failed:", error);
  process.exitCode = 1;
});
