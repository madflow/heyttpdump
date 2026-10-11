# Cloudflare Workers deployment

## Architecture and safety

The optional Cloudflare target consists of `heyttpdump-api`, `heyttpdump-dump`, and
`heyttpdump-kit`. Only the latter two have public workers.dev URLs. The API disables
workers.dev, previews, and routes; callers use their `API` service binding and oRPC.
The API's `DB` binding points to a new D1 database. Existing local SQLite captures
are neither imported nor synchronized. Node development, production supervision,
and Docker continue to work unchanged.

**The frontend and capture endpoint are public and unauthenticated. Anyone with
frontend access can view and delete all captures. Use only non-sensitive data.**
A private backend is not frontend authorization. Authentication, tenant isolation,
retention, binary fidelity, R2, and historical-data migration are out of scope.
Public capture traffic consumes your Cloudflare quotas; monitor usage before exposing it.

Capture bodies are limited to **262,144 bytes** on Cloudflare. Declared oversized
lengths and oversized streamed bodies return 413 before RPC/storage. Accepted bodies
are decoded as UTF-8 text. D1 independently enforces the same UTF-8 body cap with an
oRPC `PAYLOAD_TOO_LARGE` error. D1 row/SQL/platform quotas still apply to headers,
URLs, and RPC requests. Node capture remains uncapped.

## Local development (no credentials)

Use the repository's pinned Node 24 and pnpm, then:

```sh
pnpm install --frozen-lockfile
pnpm cloudflare:types
pnpm cloudflare:dev
```

`pnpm cloudflare:dev` (or `make dev-cloudflare`) applies local migrations and starts:

- API Worker with Wrangler source reload: `http://localhost:8787`.
- Capture Worker with Wrangler source reload: `http://localhost:8788`.
- SvelteKit/Vite frontend with hot module reload: `http://localhost:8789`.
- Shared oRPC package compiler in watch mode.

No frontend production build or credentials are needed. The Cloudflare adapter's
local platform proxy connects frontend oRPC calls to the API Worker via the same
`API` binding used in production. Remote bindings are disabled in the Vite proxy.
Wrangler connects local service bindings automatically; allow the API to start
before making requests. Changes to migrations still require rerunning
`pnpm cloudflare:migrate:local` and restarting the dev stack.

For production-like local execution, use `pnpm cloudflare:preview` (or
`make preview-cloudflare`). It builds the frontend first and runs all three services
on local Workers using the same ports and data. It does not provide frontend HMR.
Do not run dev and preview simultaneously; they use the same ports.

Local storage is under `.cloudflare/state`, never `apps/api/db.sqlite`. Delete that
ignored directory to reset local captures. Use the frontend and capture URLs, not
the API URL; local API access is available only for debugging. The API's public
Cloudflare endpoints remain disabled.

For explicit checks:

```sh
pnpm cloudflare:migrate:local
pnpm cloudflare:build
pnpm cloudflare:dry-run
pnpm cloudflare:test
pnpm check
```

Tests use temporary or in-memory D1 state, run the shared repository contract, and
exercise capture → D1 → frontend → deletion through real local service bindings.
Wrangler migration tracking and repeat application are also checked. Generated
binding declarations are checked in; rerun `cloudflare:types` after changing configs.
The type-generation script omits Wrangler's conditional import of the generated
frontend entry point so clean and built checkouts produce identical declarations
and `checkJs` does not follow compiled adapter output. Wrangler state and bundle
artifacts are ignored.

The default `pnpm build` still selects adapter-node and writes `apps/kit/build`.
An explicit `DEPLOY_TARGET=cloudflare` selects adapter-cloudflare and writes
`apps/kit/.svelte-kit/cloudflare`. Intermediate SvelteKit files are shared: do not
run both frontend builds concurrently. Final Node and Worker outputs are separate.

SvelteKit 3 / adapter-cloudflare 8 exposes bindings via `cloudflare:workers`, not
`event.platform`. Vite selects a server-only Cloudflare client helper for that build;
Node uses the runtime, private `API_URL` declared in `src/env.ts`. Neither helper nor
backend configuration is included in browser code. Missing Worker bindings never
fall back to localhost. `nodejs_compat` is enabled only for the frontend; it does not
provide persistent SQLite. All Workers use compatibility date `2026-04-01`.

## Provision and deploy (explicit authorization required)

These commands affect your Cloudflare account. Run them only when authorized:

```sh
pnpm exec wrangler login
pnpm exec wrangler d1 create heyttpdump
```

Replace the all-zero `database_id` placeholder in `apps/api/wrangler.jsonc` with the
created database's ID. Configure the intended account via `CLOUDFLARE_ACCOUNT_ID`
(or Wrangler account configuration). For noninteractive deployment, supply
`CLOUDFLARE_API_TOKEN` with the necessary Workers and D1 permissions through your
secret manager; never commit tokens. Keep service names consistent across configs.

```sh
pnpm cloudflare:migrate:remote
pnpm cloudflare:deploy
```

Remote migrations are explicit and separate from deployment. The deploy command
builds the frontend, then deploys API first, capture second, frontend last. No
remote commands run in checks CI. Optional custom domains can be added to the
frontend/capture configurations; do not add public API routes or reenable previews.

## Verify the deployed target

1. POST a non-sensitive request to the capture Worker's printed public URL.
2. Open the frontend's printed URL, confirm method/URL/headers/body, then delete it.
3. Confirm a body larger than 256 KiB returns 413 and creates no record.
4. Confirm the API has no public workers.dev, preview, or route in the dashboard.
5. Probe `/ready` through the API binding if troubleshooting D1 access. Its uptime
   describes the current Worker isolate, not a persistent server process.

The existing frontend proxy error mapping remains unchanged (including mapping
backend NOT_FOUND errors to 500); public oRPC contract shapes are unchanged.
Deploying Workers does not invoke Node's supervisor, Docker, or Node migrations.
