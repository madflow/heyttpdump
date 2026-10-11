import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import { once } from "node:events";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createServer } from "node:net";
import { fileURLToPath } from "node:url";
import { setTimeout as delay } from "node:timers/promises";

export const root = fileURLToPath(new URL("../../", import.meta.url));
export async function temporaryDatabase() {
  const directory = await mkdtemp(join(tmpdir(), "heyttpdump-test-"));
  return {
    path: join(directory, "db.sqlite"),
    cleanup: () => rm(directory, { recursive: true, force: true }),
  };
}
export function migrate(path: string) {
  const result = spawnSync(process.execPath, ["apps/api/dist/migrate.js"], {
    cwd: root,
    env: { ...process.env, DB_PATH: path },
    encoding: "utf8",
  });
  if (result.status !== 0) throw new Error(result.stderr || String(result.error));
}
export async function freePort(): Promise<number> {
  const server = createServer();
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("No port allocated");
  await new Promise<void>((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  );
  return address.port;
}
export function start(entry: string, env: Record<string, string>) {
  const child = spawn(process.execPath, [entry], {
    cwd: root,
    env: { ...process.env, ...env },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let output = "";
  child.stdout.on("data", (chunk) => {
    output += chunk;
  });
  child.stderr.on("data", (chunk) => {
    output += chunk;
  });
  return { child, output: () => output };
}
export async function stop(child: ChildProcess) {
  if (child.exitCode !== null || child.signalCode !== null) return;
  const done = once(child, "exit");
  child.kill("SIGTERM");
  const timeout = setTimeout(() => child.kill("SIGKILL"), 15_000);
  try {
    await done;
  } finally {
    clearTimeout(timeout);
  }
}
export async function waitFor(url: string, output: () => string = () => "") {
  for (let attempt = 0; attempt < 100; attempt++) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(500) });
      await response.body?.cancel();
      if (response.ok) return;
    } catch {
      /* The service may not have bound its port yet. */
    }
    await delay(100);
  }
  throw new Error(`Service did not become ready: ${url}\n${output()}`);
}
