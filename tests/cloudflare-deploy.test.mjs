import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { deploy } from "../scripts/cloudflare-deploy.mjs";

const uuid = "12345678-1234-1234-1234-123456789abc";
const placeholder = "00000000-0000-0000-0000-000000000000";

async function fixture(t, { id = placeholder, exists = false, fail = "" } = {}) {
  const directory = await mkdtemp(join(tmpdir(), "heyttpdump-deploy-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const config = join(directory, "wrangler.jsonc");
  await writeFile(config, `{// keep comment\n"database_name":"heyttpdump","database_id":"${id}",}`);
  const calls = [];
  let present = exists;
  return {
    calls,
    config,
    options: {
      config,
      args: ["--yes"],
      env: { CLOUDFLARE_ACCOUNT_ID: "test-account" },
      execute(args) {
        const command = args.join(" ");
        calls.push(command);
        if (command === fail) throw new Error("injected failure");
        if (command.includes("d1 create")) present = true;
        if (command.includes("d1 list")) {
          return JSON.stringify(present ? [{ name: "heyttpdump", uuid }] : []);
        }
        return "";
      },
    },
  };
}

test("deploy creates D1, preserves JSONC, migrates, and deploys in order", async (t) => {
  const f = await fixture(t);
  await deploy(f.options);
  assert.deepEqual(f.calls, [
    "cloudflare:build",
    "exec wrangler d1 list --json",
    "exec wrangler d1 create heyttpdump --update-config=false",
    "exec wrangler d1 list --json",
    "cloudflare:migrate:remote",
    "exec wrangler deploy -c apps/api/wrangler.jsonc",
    "exec wrangler deploy -c apps/dump/wrangler.jsonc",
    "exec wrangler deploy -c apps/web/dist/cloudflare/server/wrangler.json",
  ]);
  assert.match(await readFile(f.config, "utf8"), /keep comment/);
  assert.ok((await readFile(f.config, "utf8")).includes(uuid));
});

test("deploy reuses D1 on first setup and subsequent runs", async (t) => {
  const f = await fixture(t, { exists: true });
  await deploy(f.options);
  await deploy(f.options);
  assert.ok(!f.calls.some((call) => call.includes("d1 create")));
});

test("cancelled deploy performs no commands or config writes", async (t) => {
  const f = await fixture(t);
  await deploy({ ...f.options, args: [], ask: async () => false });
  assert.deepEqual(f.calls, []);
  assert.ok((await readFile(f.config, "utf8")).includes(placeholder));
});

test("missing account and unknown flags fail before commands", async (t) => {
  const f = await fixture(t);
  await assert.rejects(deploy({ ...f.options, env: {} }), /CLOUDFLARE_ACCOUNT_ID/);
  await assert.rejects(deploy({ ...f.options, args: ["--force"] }), /Usage/);
  assert.deepEqual(f.calls, []);
});

test("configured D1 mismatch stops without replacing or migrating", async (t) => {
  const f = await fixture(t, { id: uuid });
  await assert.rejects(deploy(f.options), /refusing to replace/);
  assert.deepEqual(f.calls, ["cloudflare:build", "exec wrangler d1 list --json"]);
});

test("build and migration failures stop further deployment", async (t) => {
  for (const fail of ["cloudflare:build", "cloudflare:migrate:remote"]) {
    const f = await fixture(t, { id: uuid, exists: true, fail });
    await assert.rejects(deploy(f.options), /injected failure/);
    assert.equal(f.calls.at(-1), fail);
    assert.ok(!f.calls.some((call) => call.includes("wrangler deploy")));
  }
});

test("interactive auth failure offers login and retries discovery", async (t) => {
  const f = await fixture(t, { exists: true });
  const execute = f.options.execute;
  let first = true;
  await deploy({
    ...f.options,
    args: [],
    ask: async () => true,
    execute(args) {
      if (args.includes("list") && first) {
        first = false;
        throw new Error("not authenticated");
      }
      return execute(args);
    },
  });
  assert.ok(f.calls.includes("exec wrangler login"));
});
