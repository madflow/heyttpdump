import assert from "node:assert/strict";
import { test } from "node:test";
import { once } from "node:events";
import { createClient } from "@repo/orpc";
import { temporaryDatabase, migrate, freePort, start, stop, waitFor } from "./helpers.ts";

test(
  "compiled API, dump and frontend capture/proxy requests with runtime configuration",
  { timeout: 30_000 },
  async (t) => {
    const database = await temporaryDatabase();
    t.after(database.cleanup);
    migrate(database.path);
    const apiPort = await freePort();
    const dumpPort = await freePort();
    const webPort = await freePort();
    const apiUrl = `http://127.0.0.1:${apiPort}`;
    const dumpUrl = `http://127.0.0.1:${dumpPort}`;
    const webUrl = `http://127.0.0.1:${webPort}`;
    const api = start("apps/api/dist/main.js", {
      DB_PATH: database.path,
      API_PORT: String(apiPort),
    });
    const dump = start("apps/dump/dist/main.js", {
      API_URL: `${apiUrl}/rpc`,
      DUMP_PORT: String(dumpPort),
    });
    const web = start("apps/web/dist/node/main.js", {
      API_URL: `${apiUrl}/rpc`,
      PORT: String(webPort),
      HOST: "127.0.0.1",
    });
    t.after(async () => {
      await Promise.all([stop(web.child), stop(dump.child), stop(api.child)]);
    });
    await waitFor(`${apiUrl}/ready`, api.output);
    await waitFor(webUrl, web.output);
    // A dump readiness request itself becomes a captured request.
    await waitFor(dumpUrl, dump.output);
    const client = createClient(`${apiUrl}/rpc`);
    await client.requests.deleteAll();
    for (const body of ["", "plain text", '{"json":true}']) {
      const response = await fetch(`${dumpUrl}/capture?query=yes`, {
        method: "POST",
        body,
        headers: { "x-capture-test": "hello", "content-type": "application/json" },
      });
      assert.equal(response.status, 200);
      const { request } = await response.json();
      assert.equal(request.payload.url, `${dumpUrl}/capture?query=yes`);
      assert.equal(request.payload.body, body);
      assert.equal(request.payload.headers["x-capture-test"], "hello");
      assert.deepEqual(await client.requests.get({ id: request.id }), request);
    }
    const listed = await (await fetch(`${webUrl}/api/requests?limit=10&offset=0`)).json();
    assert.equal(listed.length, 3);
    // Form-style requests remain protected; JSON API requests match browser helpers.
    assert.equal((await fetch(`${webUrl}/api/requests`, { method: "DELETE" })).status, 403);
    assert.equal(
      (
        await fetch(`${webUrl}/api/requests/nope`, {
          method: "DELETE",
          headers: { origin: webUrl, "content-type": "application/json" },
        })
      ).status,
      400,
    );
    for (const path of ["/api/requests", `/api/requests/${listed[0].id}`]) {
      for (const headers of [
        { "content-type": "text/plain", origin: webUrl },
        { "content-type": "application/json", origin: "https://evil.test" },
      ]) {
        assert.equal((await fetch(`${webUrl}${path}`, { method: "DELETE", headers })).status, 403);
      }
    }
    const removed = await fetch(`${webUrl}/api/requests/${listed[0].id}`, {
      method: "DELETE",
      headers: { origin: webUrl, "content-type": "application/json" },
    });
    assert.deepEqual(await removed.json(), { success: true });
    const missing = await fetch(`${webUrl}/api/requests/${listed[0].id}`, {
      method: "DELETE",
      headers: { "content-type": "application/json" },
    });
    assert.equal(missing.status, 500);
    assert.equal((await missing.json()).details, "Request not found");
    assert.deepEqual(
      await (
        await fetch(`${webUrl}/api/requests`, {
          method: "DELETE",
          headers: { origin: webUrl, "content-type": "application/json" },
        })
      ).json(),
      { deletedCount: 2 },
    );
    const html = await (await fetch(webUrl)).text();
    assert.match(html, /HTTP Requests/);
    const asset = html.match(/(?:href|src)="([^" ]*\/assets\/[^" ]+\.js)"/);
    assert.ok(asset, "SSR HTML references a compiled asset");
    assert.equal((await fetch(new URL(asset[1], webUrl))).status, 200);
    assert.match(html, /Loading\.\.\./);
    for (const match of html.matchAll(/href="([^" ]*\/assets\/[^" ]+\.(?:css|svg))"/g)) {
      assert.equal((await fetch(new URL(match[1], webUrl))).status, 200);
    }
    assert.equal((await fetch(`${webUrl}/robots.txt`)).status, 200);
    await stop(api.child);
    assert.equal(api.child.exitCode, 0);
    assert.equal((await fetch(`${dumpUrl}/unavailable`)).status, 500);
    const unavailable = await fetch(`${webUrl}/api/requests`);
    assert.equal(unavailable.status, 503);
    assert.equal((await unavailable.json()).apiUrl, `${apiUrl}/rpc`);
    for (const path of ["/api/requests", "/api/requests/1"]) {
      assert.equal(
        (
          await fetch(`${webUrl}${path}`, {
            method: "DELETE",
            headers: { "content-type": "application/json" },
          })
        ).status,
        503,
      );
    }
  },
);

test(
  "production supervisor migrates, honors PORT, shuts down children and preserves data",
  { timeout: 30_000 },
  async (t) => {
    const database = await temporaryDatabase();
    t.after(database.cleanup);
    const apiPort = await freePort();
    const dumpPort = await freePort();
    const webPort = await freePort();
    const env = {
      DB_PATH: database.path,
      API_PORT: String(apiPort),
      DUMP_PORT: String(dumpPort),
      PORT: String(webPort),
      WEB_PORT: "1",
    };
    const supervisor = start("scripts/start.mjs", env);
    t.after(() => stop(supervisor.child));
    const apiUrl = `http://127.0.0.1:${apiPort}`;
    await waitFor(`${apiUrl}/ready`, supervisor.output);
    await waitFor(`http://127.0.0.1:${webPort}`, supervisor.output);
    await waitFor(`http://127.0.0.1:${dumpPort}`, supervisor.output);
    const client = createClient(`${apiUrl}/rpc`);
    const count = (await client.requests.list({ limit: 100, offset: 0 })).length;
    await stop(supervisor.child);
    assert.equal(supervisor.child.exitCode, 0, supervisor.output());
    await assert.rejects(fetch(`${apiUrl}/ready`));
    await assert.rejects(fetch(`http://127.0.0.1:${dumpPort}`));
    await assert.rejects(fetch(`http://127.0.0.1:${webPort}`));
    const restart = start("scripts/start.mjs", env);
    t.after(() => stop(restart.child));
    await waitFor(`${apiUrl}/ready`, restart.output);
    assert.equal((await client.requests.list({ limit: 100, offset: 0 })).length, count);
  },
);

test(
  "supervisor fails on migration failure and cleans up after a child startup failure",
  { timeout: 30_000 },
  async (t) => {
    const database = await temporaryDatabase();
    t.after(database.cleanup);
    const badMigration = start("scripts/start.mjs", {
      DB_PATH: `${database.path}/missing/db.sqlite`,
    });
    t.after(() => stop(badMigration.child));
    const [migrationCode] = await once(badMigration.child, "exit");
    assert.equal(migrationCode, 1);
    const apiPort = await freePort();
    // Dump will fail to bind because the API already owns this port.
    const supervisor = start("scripts/start.mjs", {
      DB_PATH: database.path,
      API_PORT: String(apiPort),
      DUMP_PORT: String(apiPort),
      PORT: String(await freePort()),
    });
    t.after(() => stop(supervisor.child));
    const [code] = await once(supervisor.child, "exit");
    assert.equal(code, 1, supervisor.output());
    await assert.rejects(fetch(`http://127.0.0.1:${apiPort}/ready`));
  },
);
