import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { setTimeout as delay } from "node:timers/promises";

const root = new URL("../", import.meta.url);
const children = new Set();
const apiPort = process.env.API_PORT || "3001";
const env = {
  ...process.env,
  API_URL: process.env.API_URL || `http://localhost:${apiPort}/rpc`,
  HOST: process.env.HOST || "0.0.0.0",
  PORT: process.env.PORT || process.env.WEB_PORT || "3002",
};
let stopping = false;

function stop(code) {
  if (stopping) return;
  stopping = true;
  process.exitCode = code;
  for (const child of children) child.kill("SIGTERM");
  const timeout = setTimeout(() => {
    for (const child of children) child.kill("SIGKILL");
  }, 12_000);
  timeout.unref();
}
process.on("SIGTERM", () => stop(0));
process.on("SIGINT", () => stop(0));

function launch(name, cwd, entry, once = false) {
  if (stopping) throw new Error("Startup interrupted");
  console.log(`Starting ${name}...`);
  const child = spawn(process.execPath, [entry], {
    cwd: fileURLToPath(new URL(cwd, root)),
    env,
    stdio: "inherit",
  });
  children.add(child);
  const done = new Promise((resolve, reject) => {
    child.once("error", (error) => {
      children.delete(child);
      reject(error);
    });
    child.once("exit", (code, signal) => {
      children.delete(child);
      if (stopping) return resolve();
      if (once && code === 0) return resolve();
      reject(new Error(`${name} exited unexpectedly (code ${code}, signal ${signal})`));
    });
  });
  if (!once) void done.catch(fail);
  return done;
}

function fail(error) {
  if (!stopping) {
    console.error(error);
    stop(1);
  }
}

try {
  await launch("migration", "apps/api/", "dist/migrate.js", true);
  if (!stopping) {
    launch("API", "apps/api/", "dist/main.js");
    let ready = false;
    for (let attempt = 0; attempt < 30 && !stopping; attempt++) {
      try {
        const response = await fetch(`http://127.0.0.1:${apiPort}/ready`, {
          signal: AbortSignal.timeout(1000),
        });
        ready = response.ok;
        await response.body?.cancel();
        if (ready) break;
      } catch {
        // API is still starting; retry with a bounded timeout.
      }
      await delay(1000);
    }
    if (!stopping) {
      if (!ready) throw new Error("API failed to become ready");
      launch("dump", "apps/dump/", "dist/main.js");
      launch("frontend", "apps/web/", "dist/node/main.js");
    }
  }
} catch (error) {
  fail(error);
}
