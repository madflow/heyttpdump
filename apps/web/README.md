# Frontend

TanStack Start React **1.169.1**, Vite 8, Tailwind CSS 4, and file-based TanStack Router.
The former `apps/kit` / `heyttpdump-kit` workspace is now `apps/web` / `heyttpdump-web`.

```sh
# From the repository root
pnpm dev:web
pnpm build
pnpm --filter heyttpdump-web preview
pnpm --filter heyttpdump-web check
pnpm --filter heyttpdump-web test
```

Development and production default to port 3002. Node production uses
`HOST=0.0.0.0 PORT=3002 node apps/web/dist/node/main.js`; `pnpm start` supervises
all three services. `API_URL` is server-only and read at runtime, defaulting to
`http://localhost:3001/rpc`. Browser requests use the unchanged `/api/requests` proxies.
Deletion requires JSON and rejects mismatched supplied origins.

Node output is `dist/node`, including its production entry, server bundle, and
client assets. Explicit `DEPLOY_TARGET=cloudflare` builds write `dist/cloudflare`.
The Cloudflare Vite plugin generates `dist/cloudflare/server/wrangler.json`; use
that configuration for production Worker preview/deployment. Worker backend calls
use the private `API` service binding, never a public backend URL.

`#lib/*` imports are declared in `package.json`. Components use typed React state,
effects, and context. Polling is client-side, cancels obsolete requests, and cleans
up timers. Theme selection retains the `heyttpdump-theme` storage key.
Generated `src/routeTree.gen.ts` is ignored and recreated by development, build,
and check commands. Vitest/React Testing Library tests use jsdom and fake timers.

See the root README and `docs/cloudflare.md` for deployment commands and safety.
