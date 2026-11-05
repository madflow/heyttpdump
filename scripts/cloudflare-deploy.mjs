import { spawnSync } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import { createInterface } from "node:readline/promises";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const configPath = new URL("../apps/api/wrangler.jsonc", import.meta.url);
const placeholder = "00000000-0000-0000-0000-000000000000";

function run(args, capture = false) {
  const result = spawnSync("pnpm", args, {
    cwd: root,
    env: process.env,
    encoding: "utf8",
    stdio: capture ? ["ignore", "pipe", "inherit"] : "inherit",
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`pnpm ${args.join(" ")} failed; deployment stopped.`);
  }
  return result.stdout ?? "";
}

async function confirm(message) {
  if (!process.stdin.isTTY) {
    throw new Error("Noninteractive deployment requires --yes.");
  }
  const prompt = createInterface({ input: process.stdin, output: process.stdout });
  try {
    return (await prompt.question(`${message} [y/N] `)).trim().toLowerCase() === "y";
  } finally {
    prompt.close();
  }
}

export async function deploy({
  args = process.argv.slice(2),
  env = process.env,
  execute = run,
  ask = confirm,
  config = configPath,
} = {}) {
  if (args.some((arg) => !["--yes", "--help"].includes(arg))) {
    throw new Error("Usage: pnpm cloudflare:deploy [--yes]");
  }
  if (args.includes("--help")) {
    console.log("Usage: pnpm cloudflare:deploy [--yes]\nSet CLOUDFLARE_ACCOUNT_ID first.");
    return;
  }
  if (!env.CLOUDFLARE_ACCOUNT_ID?.trim()) {
    throw new Error("Set CLOUDFLARE_ACCOUNT_ID to explicitly select the deployment account.");
  }
  console.log(`Deploying to Cloudflare account ${env.CLOUDFLARE_ACCOUNT_ID}.`);
  console.log(
    "This may create D1, apply remote migrations, and publish the capture and web Workers.\n" +
      "The UI is unauthenticated: anyone with access can view and delete all captures.\n" +
      "Cloudflare usage may incur charges. Existing local SQLite data is not migrated.",
  );
  if (!args.includes("--yes") && !(await ask("Continue with remote deployment?"))) {
    console.log("Deployment cancelled; no changes made.");
    return;
  }

  // Build before provisioning or migrating anything remotely.
  execute(["cloudflare:build"]);
  const wrangler = (...command) => execute(["exec", "wrangler", ...command]);
  const list = () => JSON.parse(execute(["exec", "wrangler", "d1", "list", "--json"], true));
  let databases;
  try {
    databases = list();
  } catch (error) {
    if (env.CLOUDFLARE_API_TOKEN || args.includes("--yes")) throw error;
    if (!(await ask("Unable to list D1 databases. Log in with Wrangler and retry?"))) throw error;
    wrangler("login");
    databases = list();
  }

  const source = await readFile(config, "utf8");
  // Match only the DB ID/name fields; preserve JSONC comments and formatting.
  const id = source.match(/"database_id"\s*:\s*"([^"]+)"/)?.[1];
  const name = source.match(/"database_name"\s*:\s*"([^"]+)"/)?.[1];
  if (!id || !name) throw new Error("Missing D1 database_id or database_name in API config.");
  function findDatabase() {
    if (!Array.isArray(databases)) throw new Error("Unexpected Wrangler D1 list response.");
    return databases.find((db) => db.name === name);
  }
  if (id === placeholder) {
    let database = findDatabase();
    if (!database) {
      wrangler("d1", "create", name, "--update-config=false");
      databases = list();
      database = findDatabase();
    }
    if (!database || typeof database.uuid !== "string") {
      throw new Error("Cannot resolve D1 database ID; rerun to retry without recreating it.");
    }
    if (!/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(database.uuid)) {
      throw new Error("Invalid D1 database UUID returned by Wrangler.");
    }
    await writeFile(config, source.replace(placeholder, database.uuid));
    console.log("Saved D1 database ID in apps/api/wrangler.jsonc (not a secret).");
  } else {
    const database = findDatabase();
    if (database?.uuid !== id) {
      throw new Error("Configured D1 name/ID not found in this account; refusing to replace it.");
    }
  }

  execute(["cloudflare:migrate:remote"]);
  wrangler("deploy", "-c", "apps/api/wrangler.jsonc");
  wrangler("deploy", "-c", "apps/dump/wrangler.jsonc");
  wrangler("deploy", "-c", "apps/web/dist/cloudflare/server/wrangler.json");
  console.log("Deployment complete. Use the web and capture URLs printed by Wrangler.");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    await deploy();
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}
