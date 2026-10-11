import { serve } from "@hono/node-server";
import { createApp } from "./app.ts";
import { createSqliteRepository } from "./db.ts";

const PORT = Number(process.env.API_PORT) || 3001;
const { repository, close } = createSqliteRepository(process.env.DB_PATH || "db.sqlite");
const app = createApp(repository);
const server = serve({ port: PORT, hostname: "0.0.0.0", fetch: app.fetch }, () => {
  console.log(`API server listening on port ${PORT}`);
  console.log(`RPC endpoint: http://localhost:${PORT}/rpc`);
});

let stopping = false;
function shutdown() {
  if (stopping) return;
  stopping = true;
  const timeout = setTimeout(() => process.exit(1), 10_000);
  timeout.unref();
  server.close((error) => {
    close();
    clearTimeout(timeout);
    process.exitCode = error ? 1 : 0;
  });
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
server.on("error", (error) => {
  console.error("API server failed:", error);
  close();
  process.exitCode = 1;
});
