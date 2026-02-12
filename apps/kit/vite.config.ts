import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import deno from "@deno/vite-plugin";
import path from "node:path";

export default defineConfig({
  plugins: [deno(), tailwindcss(), sveltekit()],
  resolve: {
    alias: {
      "@repo/orpc": path.resolve("../../packages/orpc/mod.ts"),
    },
  },
  server: {
    fs: {
      allow: [
        // Allow access to the entire project root
        "../../",
      ],
    },
  },
  optimizeDeps: {
    include: ["@lucide/svelte"],
  },
  ssr: {
    noExternal: ["@lucide/svelte", "@repo/orpc"],
  },
});
