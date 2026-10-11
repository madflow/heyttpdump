# Agent Guidelines for heyttpdump

## Project

TypeScript/Node.js 24 LTS monorepo with pnpm workspaces:

- `apps/api`: Hono/oRPC API on port 3001, Node SQLite repository.
- `apps/dump`: Hono HTTP capture service on port 3000.
- `apps/kit`: SvelteKit 3 / Svelte 5 frontend on port 3002.
- `packages/orpc`: shared contracts and type-safe client (`@repo/orpc`).

Other tools: Vite 8, Tailwind CSS 4, Valibot, TypeScript 6, ESLint, Prettier.
Exact versions and exceptions are recorded in `docs/dependency-audit.md`.
Use `.node-version` and the `packageManager` pin in `package.json`.
Do not include unrelated `.opencode` tooling in the application workspace.

## Commands (repository root)

```sh
pnpm install --frozen-lockfile
pnpm migrate                 # or make init (also installs)
pnpm dev                     # or make dev
pnpm dev:api
pnpm dev:dump
pnpm dev:kit
pnpm build
pnpm start                   # compiled production stack, build first
pnpm --filter heyttpdump-kit preview
pnpm lint
pnpm format:check
pnpm format
pnpm check                   # TS + svelte-check
pnpm test                    # build + Node test runner
pnpm cloudflare:test         # Node build + Worker builds/dry runs + isolated D1 tests
pnpm cloudflare:dev          # local Workers/D1 + frontend HMR + shared watch
pnpm cloudflare:preview      # built frontend on local Workers/D1, no remote deployment
pnpm cloudflare:types        # regenerate checked-in binding types
make docker-up
make docker-down
make docker-logs
```

Workspace migrations/API commands default to `apps/api/db.sqlite`; Docker uses
`/app/data/db.sqlite` via `DB_PATH`. Never test against the user's database.
Tests use temporary databases and isolated ports. Docker smoke tests use disposable volumes.

## Code conventions

- Two-space indentation, double quotes, semicolons, trailing commas; Prettier governs formatting.
- External imports, then workspace imports, then relative imports.
- Retain `.ts` extensions in relative TypeScript source imports; NodeNext builds rewrite to `.js`.
- API/dump/shared production output goes in `dist/`; shared package exports target compiled output.
- Frontend imports use `#lib/*` (with file extensions), not the removed SvelteKit `$lib` alias.
- Use `interface` for object shapes and `type` for unions; export public types.
- Avoid `any`; use `unknown` and narrowing. Enable strict TS and `checkJs`.
- camelCase variables/functions, PascalCase types/components, SCREAMING_SNAKE_CASE constants.
- Utilities use kebab-case filenames; Svelte components use PascalCase.
- Keep helpers small and modules focused. Prefer existing files over unnecessary new abstractions.

## Svelte 5 and frontend

- Use `$state`, `$derived`, `$effect`, and typed `$props`, not legacy stores.
- Effects performing polling must clear intervals on teardown.
- Use try/catch for async operations; log failures and preserve user-facing behavior.
- Components live in `apps/kit/src/lib/components/`.
- Keep browser helpers in `lib/utils.ts`, HTTP proxy helpers in `lib/api.ts`, and theme logic
  in `lib/theme.svelte.ts`.
- SvelteKit 3 configuration belongs in `vite.config.ts`. Use `$app/env` for browser detection.
- Keep `API_URL` server-only and runtime-configurable; never expose it through public Vite defines.
- Preserve existing frontend proxy endpoints. Their backend communication is through oRPC.

## API and database

Use a contract-first workflow:

1. Define Valibot schemas and oRPC contracts in `packages/orpc/contract/index.ts`.
2. Implement handlers in `apps/api/router.ts`.
3. Consume the type-safe client (`client.requests.*`).

Preserve public contract shapes and NOT_FOUND behavior. Use `ORPCError` for API errors.
Business operations go through oRPC, not new direct HTTP routes. Health/readiness routes,
existing frontend proxy routes, and the dump capture service are intentional exceptions.

`apps/api/request-repository.ts` is the async, runtime-neutral repository interface.
Handlers access `context.repository` and await get/delete results before testing for null.
`apps/api/app.ts` constructs the Hono app with an injected repository; neither app nor router
may import Node-specific startup, SQLite, filesystem APIs, or environment configuration.

`apps/api/db.ts` owns Node SQLite operations, parameterized SQL, and row conversion.
Its explicit factory returns a repository and a separate close function. No import-time
connection is allowed. Readiness delegates to `repository.checkReady()`.
The Promise interface does not make synchronous SQLite operations nonblocking.
Migrations remain idempotent and close their explicitly opened database in `finally`.

An explicitly requested optional Cloudflare target now uses three Workers and D1.
`apps/api/d1.ts` implements the same repository boundary; Node `db.ts` stays separate.
Worker entry points own bindings; app/router remain runtime-neutral. Keep API Workers
private and use service bindings for oRPC. D1 and local SQLite are separate databases,
without synchronization or an ORM. Never provision, migrate remotely, or deploy without
explicit authorization. See `docs/cloudflare.md` for commands and runtime differences.
Keep default Node/Docker behavior unchanged when maintaining the Cloudflare target.

## Runtime and delivery

Node entry points own environment parsing, `@hono/node-server`, and shutdown.
Drain requests before closing the API database. `scripts/start.mjs` supervises production
services, migrates, awaits readiness, forwards shutdown, and exits on child failure.
Explicit frontend `PORT` takes precedence over `WEB_PORT`.

Use Node 24 Debian Trixie-slim containers pinned by patch and manifest digest.
Pin exact direct dependencies and pnpm; use frozen lockfiles in CI/Docker.
Verify published versions, engine/peer compatibility, and security before upgrades.
Keep pnpm supply-chain defaults; allow only necessary dependency build scripts.
Never suppress peer conflicts or silently downgrade the container distribution.

Run lint, formatting validation, type checks, tests, and production builds before delivery.
Document checks that could not run. CI audits dependencies and scans images before publishing.
