import { readFile, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";

for (const [app, env, output] of [
  ["api", "ApiEnv", "apps/api/worker-configuration.d.ts"],
  ["dump", "DumpEnv", "apps/dump/worker-configuration.d.ts"],
  ["kit", "KitEnv", "apps/kit/src/worker-configuration.d.ts"],
]) {
  const result = spawnSync(
    process.execPath,
    [
      "node_modules/wrangler/bin/wrangler.js",
      "types",
      "-c",
      `apps/${app}/wrangler.jsonc`,
      "--env-interface",
      env,
      "--include-runtime=false",
      output,
    ],
    { stdio: "inherit" },
  );
  if (result.status !== 0) process.exit(result.status ?? 1);
  if (app === "kit") {
    // Wrangler conditionally imports the adapter's generated JS when it exists.
    // Exclude only that import so generation is deterministic on clean checkouts
    // and checkJs never follows the generated frontend bundle into type checking.
    const source = await readFile(output, "utf8");
    await writeFile(
      output,
      source.replace(/\tinterface GlobalProps \{\n\t\tmainModule:[^\n]*\n\t\}\n/, ""),
    );
  }
}
