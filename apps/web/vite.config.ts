import { fileURLToPath } from "node:url";
import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const isCloudflare = process.env.DEPLOY_TARGET === "cloudflare";

export default defineConfig({
  build: { outDir: isCloudflare ? "dist/cloudflare" : "dist/node" },
  // Keep workspace imports at their package boundary so their runtime dependencies
  // resolve from that package in production-only installations.
  ssr: isCloudflare ? {} : { external: ["@repo/orpc"] },
  resolve: {
    alias: isCloudflare
      ? {
          "#lib/server/api.ts": fileURLToPath(
            new URL("./src/lib/server/api-cloudflare.ts", import.meta.url),
          ),
        }
      : {},
  },
  environments: {
    ssr: {
      build: {
        outDir: isCloudflare ? "dist/cloudflare/server" : "dist/node/server",
        rolldownOptions: { output: { entryFileNames: "server.js" } },
      },
    },
  },
  plugins: [
    ...(isCloudflare
      ? [
          cloudflare({
            configPath: "wrangler.jsonc",
            viteEnvironment: { name: "ssr" },
            remoteBindings: false,
            persistState: {
              path: fileURLToPath(new URL("../../.cloudflare/state", import.meta.url)),
            },
            inspectorPort: 9232,
          }),
        ]
      : []),
    tailwindcss(),
    tanstackStart(),
    react(),
  ],
});
