import assert from "node:assert/strict";
import { test } from "node:test";
import { spawnSync } from "node:child_process";
import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import type { createClient } from "@repo/orpc";
import { createApp } from "../../apps/api/dist/app.js";
import type { RequestRepository } from "../../apps/api/dist/request-repository.js";
import { payload } from "./repository-contract.ts";
import { root } from "./helpers.ts";

function fakeRepository(): RequestRepository {
  return {
    async createRequest(payload) {
      return { id: 1, createdAt: "2025-01-01 00:00:00", payload };
    },
    async getRequest() {
      return null;
    },
    async listRequests() {
      return [];
    },
    async deleteRequest() {
      return null;
    },
    async deleteAllRequests() {
      return 7;
    },
    async checkReady() {},
  };
}

test("injected async repository preserves RPC outputs, NOT_FOUND, CORS and readiness", async () => {
  const repository = fakeRepository();
  const app = createApp(repository);
  const client = createORPCClient<ReturnType<typeof createClient>>(
    new RPCLink({
      url: "http://example.test/rpc",
      fetch: async (request, init) => app.fetch(new Request(request, init)),
    }),
  );
  assert.equal((await client.requests.create({ payload })).id, 1);
  assert.deepEqual(await client.requests.list({ limit: 10, offset: 0 }), []);
  assert.equal(await client.requests.deleteAll(), 7);
  await assert.rejects(client.requests.get({ id: 1 }), { code: "NOT_FOUND" });
  await assert.rejects(client.requests.delete({ id: 1 }), { code: "NOT_FOUND" });
  repository.getRequest = async () => {
    await new Promise((resolve) => setTimeout(resolve, 10));
    return { id: 1, createdAt: "2025-01-01 00:00:00", payload };
  };
  repository.deleteRequest = repository.getRequest;
  assert.equal((await client.requests.get({ id: 1 })).id, 1);
  assert.equal(await client.requests.delete({ id: 1 }), true);
  const health = await app.request("/health");
  assert.equal(health.status, 200);
  assert.equal(health.headers.get("access-control-allow-origin"), "*");
  assert.equal((await app.request("/ready")).status, 200);
  repository.checkReady = async () => {
    throw new Error("database unavailable");
  };
  const ready = await app.request("/ready");
  assert.equal(ready.status, 503);
  assert.equal((await ready.json()).database, "disconnected");
  repository.getRequest = async () => {
    throw new Error("unexpected failure");
  };
  await assert.rejects(client.requests.get({ id: 1 }), { code: "INTERNAL_SERVER_ERROR" });
});

test("app/router import graph has no Node runtime imports or startup side effects", () => {
  const result = spawnSync(
    process.execPath,
    [
      "--input-type=module",
      "-e",
      `
    import { registerHooks } from 'node:module';
    registerHooks({ resolve(specifier, context, next) {
      if (specifier.startsWith('node:')) throw new Error('Runtime import: ' + specifier);
      return next(specifier, context);
    }});
    await import('./apps/api/dist/app.js');
    await import('./apps/api/dist/router.js');
  `,
    ],
    { cwd: root, encoding: "utf8", timeout: 5000 },
  );
  assert.equal(result.status, 0, result.stderr);
});
