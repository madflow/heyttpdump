import assert from "node:assert/strict";
import { test } from "node:test";
import { createClient } from "@repo/orpc";
import { createApp } from "../../apps/api/dist/app.js";
import { createD1Repository } from "../../apps/api/dist/d1.js";
import { createDumpApp } from "../../apps/dump/dist/app.js";

function captureClient() {
  const recorded = [];
  return {
    recorded,
    requests: {
      async create({ payload }) {
        recorded.push(payload);
        return { id: recorded.length, createdAt: "2026-04-01 00:00:00", payload };
      },
    },
  };
}

test("declared oversized capture is rejected without reading its stream or calling RPC", async () => {
  const client = captureClient();
  let reads = 0;
  const body = new ReadableStream(
    {
      pull() {
        reads++;
      },
    },
    { highWaterMark: 0 },
  );
  const request = new Request("https://capture.test/", {
    method: "POST",
    headers: { "content-length": "262145" },
    body,
    duplex: "half",
  });
  assert.equal((await createDumpApp(client, 262_144).fetch(request)).status, 413);
  assert.equal(reads, 0);
  assert.equal(client.recorded.length, 0);
});

test("streamed byte cap and multibyte decoding across chunk boundaries", async () => {
  const client = captureClient();
  const app = createDumpApp(client, 4);
  for (const [chunks, status] of [
    [[new Uint8Array([0xc3]), new Uint8Array([0xa9, 0xc3, 0xa9])], 200],
    [[new Uint8Array(3), new Uint8Array(2)], 413],
  ]) {
    const body = new ReadableStream({
      start(controller) {
        for (const chunk of chunks) controller.enqueue(chunk);
        controller.close();
      },
    });
    assert.equal(
      (
        await app.fetch(
          new Request("https://capture.test/", { method: "POST", body, duplex: "half" }),
        )
      ).status,
      status,
    );
  }
  assert.equal(client.recorded.length, 1);
  assert.equal(client.recorded[0].body, "éé");
});

test("Node capture retains uncapped bodies and request method parity", async () => {
  const client = captureClient();
  const app = createDumpApp(client);
  for (const method of ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]) {
    const body = ["GET", "HEAD"].includes(method) ? undefined : "x".repeat(262_145);
    assert.equal(
      (await app.fetch(new Request("https://capture.test/", { method, body }))).status,
      200,
    );
    assert.equal(client.recorded.at(-1).method, method);
    assert.equal(client.recorded.at(-1).body, body ?? "");
  }
});

test("D1 readiness failure is exposed as 503 and body guard runs before SQL", async () => {
  let calls = 0;
  const repository = createD1Repository({
    prepare() {
      calls++;
      throw new Error("Database unavailable");
    },
  });
  const app = createApp(repository);
  assert.equal((await app.fetch(new Request("https://api.internal/ready"))).status, 503);
  const payload = { method: "POST", url: "https://test/", headers: {}, body: "é".repeat(131_073) };
  await assert.rejects(repository.createRequest(payload), { code: "PAYLOAD_TOO_LARGE" });
  assert.equal(calls, 1);
});

test("oRPC transport receives redirect options and preserves NOT_FOUND", async () => {
  const repository = {
    async getRequest() {
      return null;
    },
  };
  const app = createApp(repository);
  let called = false;
  const client = createClient("https://api.internal/rpc", async (request, init) => {
    called = true;
    assert.equal(init.redirect, "manual");
    return app.fetch(request);
  });
  await assert.rejects(client.requests.get({ id: 999 }), { code: "NOT_FOUND" });
  assert.equal(called, true);
});
