import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { test } from "node:test";

interface Manifest {
  version?: string;
  dependencies: Record<string, string>;
}

test("frontend manifest, installed package, and lockfile retain Start 1.169.1", async () => {
  const manifest: Manifest = JSON.parse(await readFile("apps/web/package.json", "utf8"));
  const installed: Manifest = JSON.parse(
    await readFile("apps/web/node_modules/@tanstack/react-start/package.json", "utf8"),
  );
  const lockfile = await readFile("pnpm-lock.yaml", "utf8");
  assert.equal(manifest.dependencies["@tanstack/react-start"], "1.169.1");
  assert.equal(installed.version, "1.169.1");
  assert.match(lockfile, /'@tanstack\/react-start':\s+specifier: 1\.169\.1\s+version: 1\.169\.1/);
  assert.equal(
    manifest.dependencies["@tanstack/react-router"],
    installed.dependencies["@tanstack/react-router"],
  );
});

test("compiled browser bundles exclude backend configuration and bindings", async () => {
  for (const file of await readdir("apps/web/dist/node/client/assets")) {
    if (!file.endsWith(".js")) continue;
    const code = await readFile(`apps/web/dist/node/client/assets/${file}`, "utf8");
    for (const forbidden of [
      "API_URL",
      "localhost:3001",
      "api.internal",
      "cloudflare:workers",
      "getApiClient",
      "Failed to connect to backend API",
    ]) {
      assert.ok(!code.includes(forbidden), `${file} excludes ${forbidden}`);
    }
  }
});
