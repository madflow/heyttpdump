import assert from "node:assert/strict";
import { mkdtemp, stat, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { test } from "node:test";

test("Wrangler migrations are tracked and leave the local application database untouched", async (t) => {
  const state = await mkdtemp(join(tmpdir(), "heyttpdump-d1-migrations-"));
  t.after(() => rm(state, { recursive: true, force: true }));
  const sqlitePath = "apps/api/db.sqlite";
  const before = await stat(sqlitePath).catch(() => null);
  const args = [
    "node_modules/wrangler/bin/wrangler.js",
    "d1",
    "migrations",
    "apply",
    "DB",
    "-c",
    "apps/api/wrangler.jsonc",
    "--local",
    "--persist-to",
    state,
  ];
  const first = spawnSync(process.execPath, args, {
    encoding: "utf8",
    env: { ...process.env, CI: "true", WRANGLER_SEND_METRICS: "false" },
  });
  assert.equal(first.status, 0, first.stdout + first.stderr);
  assert.match(first.stdout, /0001_requests.sql/);
  const second = spawnSync(process.execPath, args, {
    encoding: "utf8",
    env: { ...process.env, CI: "true", WRANGLER_SEND_METRICS: "false" },
  });
  assert.equal(second.status, 0, second.stdout + second.stderr);
  assert.match(second.stdout, /No migrations to apply/);
  const after = await stat(sqlitePath).catch(() => null);
  assert.equal(after?.mtimeMs, before?.mtimeMs);
  assert.equal(after?.size, before?.size);
});
