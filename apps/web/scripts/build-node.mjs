import { copyFile } from "node:fs/promises";

if (process.env.DEPLOY_TARGET !== "cloudflare") {
  await copyFile(
    new URL("../node/main.mjs", import.meta.url),
    new URL("../dist/node/main.js", import.meta.url),
  );
}
