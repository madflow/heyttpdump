import { serve } from "@hono/node-server";
import { createClient } from "@repo/orpc";
import { createDumpApp } from "./app.ts";

const DEFAULT_API_URL = "http://localhost:3001/rpc";
const DEFAULT_PORT = 3000;

const API_URL = process.env.API_URL || DEFAULT_API_URL;
const PORT = Number(process.env.DUMP_PORT) || DEFAULT_PORT;

const app = createDumpApp(createClient(API_URL));

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
