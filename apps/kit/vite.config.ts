import { fileURLToPath } from "node:url";
import adapter from "@sveltejs/adapter-node";
import cloudflare from "@sveltejs/adapter-cloudflare";
import { sveltekit } from "@sveltejs/kit/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

const isCloudflare = process.env.DEPLOY_TARGET === "cloudflare";

export default defineConfig({
  resolve: {
    alias: isCloudflare
      ? {
          "#lib/server/api.ts": fileURLToPath(
            new URL("./src/lib/server/api-cloudflare.ts", import.meta.url),
          ),
        }
      : {},
  },
  plugins: [
    tailwindcss(),
    sveltekit({
      adapter: isCloudflare
        ? cloudflare({
            config: "wrangler.jsonc",
            platformProxy: {
              remoteBindings: false,
              persist: {
                path: fileURLToPath(new URL("../../.cloudflare/state", import.meta.url)),
              },
            },
          })
        : adapter(),
    }),
  ],
});
