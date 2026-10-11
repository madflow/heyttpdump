import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { Miniflare, convertV4MiniflareOptions } from "miniflare";
import { unstable_readConfig } from "wrangler";
import { createClient } from "@repo/orpc";
import { createD1Repository } from "../../apps/api/dist/d1.js";
import { repositoryContract } from "../dist/repository-contract.js";

const deleteHeaders = { "content-type": "application/json" };
const common = { modules: true, compatibilityDate: "2026-04-01" };
const migration = await readFile(
  new URL("../../apps/api/migrations/0001_requests.sql", import.meta.url),
  "utf8",
);

function workers() {
  return new Miniflare(
    convertV4MiniflareOptions({
      workers: [
        {
          ...common,
          name: "api",
          scriptPath: ".cloudflare/api/worker.js",
          d1Databases: { DB: "test-captures" },
        },
        {
          ...common,
          name: "dump",
          scriptPath: ".cloudflare/dump/worker.js",
          serviceBindings: { API: "api" },
        },
        {
          ...common,
          name: "kit",
          scriptPath: ".cloudflare/kit/_worker.js",
          compatibilityFlags: ["nodejs_compat"],
          serviceBindings: { API: "api" },
          assets: { directory: "apps/kit/.svelte-kit/cloudflare", binding: "ASSETS" },
        },
      ],
    }),
  );
}

repositoryContract("Cloudflare D1", async () => {
  const mf = workers();
  try {
    const db = await mf.getD1Database("DB", "api");
    await db.exec(migration.replaceAll("\n", " "));
    return { repository: createD1Repository(db), cleanup: () => mf.dispose() };
  } catch (error) {
    await mf.dispose();
    throw error;
  }
});

test("Worker service bindings: capture → D1 → frontend → deletion", async (t) => {
  const mf = workers();
  t.after(() => mf.dispose());
  const db = await mf.getD1Database("DB", "api");
  await db.exec(migration.replaceAll("\n", " "));
  await db.exec(migration.replaceAll("\n", " "));
  const api = await mf.getWorker("api");
  const dump = await mf.getWorker("dump");
  const kit = await mf.getWorker("kit");
  const rpc = createClient("https://api.internal/rpc", (request) => api.fetch(request));
  assert.equal((await api.fetch("https://api.internal/ready")).status, 200);
  assert.equal((await kit.fetch("https://kit.test/")).status, 200);

  const response = await dump.fetch("https://capture.test/path?q=1", {
    method: "PATCH",
    headers: { "x-example": "test" },
    body: "héllo 🌍",
  });
  assert.equal(response.status, 200);
  const { request } = await response.json();
  assert.equal(request.payload.method, "PATCH");
  assert.equal(request.payload.url, "https://capture.test/path?q=1");
  assert.equal(request.payload.headers["x-example"], "test");
  assert.equal(request.payload.body, "héllo 🌍");
  const list = await kit.fetch("https://kit.test/api/requests?limit=1&offset=0");
  assert.equal(list.status, 200);
  assert.deepEqual(await list.json(), [request]);
  const invalid = await kit.fetch("https://kit.test/api/requests/not-a-number", {
    method: "DELETE",
    headers: deleteHeaders,
  });
  assert.equal(invalid.status, 400, await invalid.text());
  assert.equal(
    (
      await kit.fetch(`https://kit.test/api/requests/${request.id}`, {
        method: "DELETE",
        headers: deleteHeaders,
      })
    ).status,
    200,
  );
  assert.equal(await createD1Repository(db).getRequest(request.id), null);
  // Existing proxy maps oRPC NOT_FOUND to 500; retain that behavior.
  assert.equal(
    (
      await kit.fetch(`https://kit.test/api/requests/${request.id}`, {
        method: "DELETE",
        headers: deleteHeaders,
      })
    ).status,
    500,
  );

  for (const body of ["", "x".repeat(262_144), "é".repeat(131_072)]) {
    assert.equal((await dump.fetch("https://capture.test/", { method: "POST", body })).status, 200);
  }
  const before = (await rpc.requests.list({ limit: 100, offset: 0 })).length;
  for (const body of ["x".repeat(262_145), "é".repeat(131_073)]) {
    assert.equal((await dump.fetch("https://capture.test/", { method: "POST", body })).status, 413);
  }
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(new Uint8Array(131_072));
      controller.enqueue(new Uint8Array(131_073));
      controller.close();
    },
  });
  assert.equal(
    (await dump.fetch("https://capture.test/", { method: "POST", body: stream, duplex: "half" }))
      .status,
    413,
  );
  assert.equal((await rpc.requests.list({ limit: 100, offset: 0 })).length, before);
  await assert.rejects(
    rpc.requests.create({
      payload: { method: "POST", url: "https://test/", headers: {}, body: "x".repeat(262_145) },
    }),
    { code: "PAYLOAD_TOO_LARGE" },
  );
  const deleted = await kit.fetch("https://kit.test/api/requests", {
    method: "DELETE",
    headers: deleteHeaders,
  });
  assert.deepEqual(await deleted.json(), { deletedCount: before });
  assert.deepEqual(await rpc.requests.list({ limit: 10, offset: 0 }), []);
});

test("Worker missing bindings and backend failures are explicit", async (t) => {
  const mf = new Miniflare(
    convertV4MiniflareOptions({
      workers: [
        { ...common, name: "api", scriptPath: ".cloudflare/api/worker.js" },
        {
          ...common,
          name: "dump",
          scriptPath: ".cloudflare/dump/worker.js",
          serviceBindings: { API: () => new Response("Unavailable", { status: 503 }) },
        },
        { ...common, name: "missing-dump", scriptPath: ".cloudflare/dump/worker.js" },
        {
          ...common,
          name: "broken-kit",
          scriptPath: ".cloudflare/kit/_worker.js",
          compatibilityFlags: ["nodejs_compat"],
          serviceBindings: { API: () => new Response("Unavailable", { status: 503 }) },
          assets: { directory: "apps/kit/.svelte-kit/cloudflare", binding: "ASSETS" },
        },
        {
          ...common,
          name: "missing-kit",
          scriptPath: ".cloudflare/kit/_worker.js",
          compatibilityFlags: ["nodejs_compat"],
          assets: { directory: "apps/kit/.svelte-kit/cloudflare", binding: "ASSETS" },
        },
      ],
    }),
  );
  t.after(() => mf.dispose());
  await assert.rejects(
    (await mf.getWorker("api")).fetch("https://api.internal/ready"),
    /Missing Cloudflare DB binding/,
  );
  await assert.rejects(
    (await mf.getWorker("missing-dump")).fetch("https://capture.test/"),
    /Missing Cloudflare API binding/,
  );
  const response = await (await mf.getWorker("dump")).fetch("https://capture.test/");
  assert.equal(response.status, 500);
  assert.deepEqual(await response.json(), { error: "Failed to record request" });
  const missingKit = await mf.getWorker("missing-kit");
  const failed = await missingKit.fetch("https://kit.test/api/requests");
  assert.equal(failed.status, 500);
  assert.match((await failed.json()).details, /Missing Cloudflare API binding/);
  const brokenKit = await mf.getWorker("broken-kit");
  for (const [path, method] of [
    ["/api/requests", "GET"],
    ["/api/requests", "DELETE"],
    ["/api/requests/1", "DELETE"],
  ]) {
    const failed = await brokenKit.fetch(`https://kit.test${path}`, {
      method,
      headers: deleteHeaders,
    });
    assert.equal(failed.status, 500);
    assert.match((await failed.json()).details, /Service Unavailable/);
  }
});

test("D1 conversion preserves timestamps, ordering, malformed-header fallback, and IDs", async (t) => {
  const mf = workers();
  t.after(() => mf.dispose());
  const db = await mf.getD1Database("DB", "api");
  await db.exec(migration.replaceAll("\n", " "));
  for (const [id, headers, timestamp] of [
    [41, "{invalid", "2024-01-01 00:00:00"],
    [42, '{"x-test":"value"}', "2025-01-01 00:00:00"],
  ]) {
    await db
      .prepare("INSERT INTO requests VALUES (?, ?, ?, ?, ?, ?)")
      .bind(id, "GET", "https://test/", headers, "", timestamp)
      .run();
  }
  const repository = createD1Repository(db);
  const rows = await repository.listRequests(10, 0);
  assert.deepEqual(
    rows.map((row) => row.id),
    [42, 41],
  );
  assert.equal(rows[0].createdAt, "2025-01-01 00:00:00");
  assert.deepEqual(rows[0].payload.headers, { "x-test": "value" });
  assert.deepEqual(rows[1].payload.headers, {});
  assert.equal((await repository.createRequest(rows[0].payload)).id, 43);
});

test("API has no public routes or preview URLs", async () => {
  const config = unstable_readConfig({ config: "apps/api/wrangler.jsonc" });
  assert.equal(config.workers_dev, false);
  assert.equal(config.preview_urls, false);
  assert.deepEqual(config.routes, []);
});
