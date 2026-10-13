import js from "@eslint/js";
import globals from "globals";
import ts from "typescript-eslint";

export default ts.config(
  {
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "**/build/**",
      "**/routeTree.gen.ts",
      "**/.tanstack/**",
      "**/.vite/**",
      ".opencode/**",
      "data/**",
      ".cloudflare/**",
      "**/.wrangler/**",
      "**/worker-configuration.d.ts",
    ],
  },
  js.configs.recommended,
  ...ts.configs.recommended,
  {
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
  },
);
