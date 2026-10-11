# heyttpdump

HTTP request capture and viewing tool built with Node.js, TypeScript, Hono, and Svelte.

## Quick start

Install **Node.js 24 LTS** (the tested patch is in `.node-version`) and **pnpm 12.11.2**:

```sh
npm install --global pnpm@12.11.2
pnpm install --frozen-lockfile
pnpm migrate
pnpm dev
```

Or use `make init` followed by `make dev`.

- Web UI: http://localhost:3002
- API: http://localhost:3001 (`/rpc`, `/health`, `/ready`)
- Dump: http://localhost:3000 — send any HTTP request here to capture it.

```sh
curl -X POST 'http://localhost:3000/example?hello=world' \
  -H 'Content-Type: application/json' -d '{"message":"hello"}'
```

### Commands

| Command                                         | Purpose                                                                   |
| ----------------------------------------------- | ------------------------------------------------------------------------- |
| `pnpm dev`                                      | Shared package watcher and all three services; Ctrl+C stops them together |
| `pnpm dev:api`, `pnpm dev:dump`, `pnpm dev:kit` | Individual service plus shared package watcher                            |
| `pnpm migrate`                                  | Idempotently initialize the existing SQLite schema                        |
| `pnpm build`                                    | Compile shared RPC/backend TypeScript and build adapter-node frontend     |
| `pnpm start`                                    | Migrate and supervise all compiled services (build first)                 |
| `pnpm check`                                    | TypeScript and Svelte checks, including generated route types             |
| `pnpm lint`                                     | ESLint                                                                    |
| `pnpm format`, `pnpm format:check`              | Prettier formatting / validation                                          |
| `pnpm test`                                     | Production build and isolated Node test suite                             |
| `pnpm --filter heyttpdump-kit preview`          | Preview frontend on port 3002                                             |

Source `.ts` imports compile to `.js`; `@repo/orpc` resolves through workspace exports.
Shared code is built before consumers and watched during development. Production needs
only Node and production dependencies, not a TypeScript runner.

## Database and environment

Workspace migration/API commands and `pnpm start` default to **`apps/api/db.sqlite`**.
The underlying Node entry points default to `db.sqlite` relative to their working directory.
Existing databases are not moved or converted. Back up the database before upgrading.

| Variable    | Default / purpose                                                                                        |
| ----------- | -------------------------------------------------------------------------------------------------------- |
| `API_PORT`  | `3001`                                                                                                   |
| `DUMP_PORT` | `3000`                                                                                                   |
| `API_URL`   | `http://localhost:3001/rpc` for standalone dump/frontend; supervisor derives the default from `API_PORT` |
| `DB_PATH`   | `db.sqlite` relative to the API working directory; parent directory must exist                           |
| `PORT`      | Frontend production port; supervisor defaults to `WEB_PORT` then `3002`                                  |
| `WEB_PORT`  | Supervisor fallback only; explicit `PORT` takes precedence                                               |
| `HOST`      | Frontend production host, default `0.0.0.0` under the supervisor                                         |

API and dump bind to `0.0.0.0`. Frontend `API_URL` is server-only and read at runtime,
so changing it does not require rebuilding. These services are unauthenticated; do not
expose captures to an untrusted network without an access-control layer.

### Cloudflare preparation

`apps/api/request-repository.ts` defines the asynchronous database interface injected
into the oRPC context. `apps/api/db.ts` implements it using `node:sqlite`.
The Hono app factory and router do not depend on Node startup or SQLite imports.
SQLite operations remain synchronous internally despite the Promise interface.
Node 24's built-in SQLite API is accepted with its documented non-stable status.

This is **not a Cloudflare deployment**. A future D1 adapter, migrations, bindings,
and Worker entry points are separate work. Local SQLite and D1 would be separate
databases without automatic synchronization. No ORM is required.

## Docker

```sh
make docker-up
make docker-logs
make docker-down
```

The pinned Node 24 **Debian Trixie slim** image runs all three compiled services in
one container. Compose maps dump/API/UI to ports **8081 / 8082 / 8083** by default
(`HOST_DUMP_PORT`, `HOST_API_PORT`, `HOST_WEB_PORT` override these).
`./data` is mounted at `/app/data`; the database is `/app/data/db.sqlite`.

Startup migrates the database, waits for API readiness, then launches dump and UI.
Signals drain requests and stop children; an unexpected service exit stops the container.
Compose grants 20 seconds for graceful shutdown.

```sh
docker build -t heyttpdump:test .
sh scripts/test-container.sh heyttpdump:test
```

The smoke test uses a disposable Docker volume and verifies persistence across container
recreation. CI also scans the image and audits dependencies before publishing/signing.

## Architecture

- `apps/api`: Hono/oRPC API, injected request repository, Node SQLite adapter.
- `apps/dump`: Hono capture service forwarding requests through oRPC.
- `apps/kit`: SvelteKit 3, Svelte 5, Vite 8, Tailwind 4, adapter-node frontend.
- `packages/orpc`: runtime-neutral contracts and type-safe client.
- `tests`: reusable repository contract tests, compatibility, injection, HTTP integration,
  and process lifecycle tests using temporary databases.

See [the dependency audit](docs/dependency-audit.md) for verified versions,
compatibility constraints, security results, and remaining verification limits.
