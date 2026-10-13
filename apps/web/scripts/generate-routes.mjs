import { Generator, getConfig } from "@tanstack/router-generator";

const config = getConfig({
  quoteStyle: "double",
  semicolons: true,
  addExtensions: true,
  routeTreeFileFooter: [
    'import type { getRouter } from "./router.tsx";',
    'import type {} from "@tanstack/react-start";',
    'declare module "@tanstack/react-start" {',
    "  interface Register { ssr: true; router: Awaited<ReturnType<typeof getRouter>>; }",
    "}",
  ],
});
await new Generator({ config, root: process.cwd() }).run();
