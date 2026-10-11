# Dependency verification

Verified against npm's published `latest` metadata, Node's release index, Docker Registry
manifests, and GitHub release/tag metadata on **2026-10-11**. Exact direct versions are
pinned in manifests; `pnpm-lock.yaml` records resolved transitive dependencies and integrity.
Documentation search alone was not treated as authoritative for published versions.

## Application stack

| Package / tool                              | Selected version                    |
| ------------------------------------------- | ----------------------------------- |
| Node.js (latest Node 24 LTS patch)          | 24.21.0                             |
| pnpm (latest stable)                        | 12.11.2                             |
| Hono / Node server adapter                  | 4.13.13 / 2.1.4                     |
| oRPC client / contract / server             | 1.15.5 (aligned)                    |
| Valibot                                     | 1.5.0 (stable, replaces beta)       |
| Svelte / SvelteKit                          | 5.57.2 / 3.0.1                      |
| SvelteKit adapter-node / Vite Svelte plugin | 6.0.0 / 7.3.1                       |
| Vite                                        | 8.3.4                               |
| Tailwind CSS / Vite plugin                  | 4.3.3 (aligned)                     |
| Lucide Svelte                               | 1.55.0                              |
| OpenTelemetry API (SvelteKit peer)          | 1.9.1                               |
| TypeScript                                  | 6.0.3 — compatibility exception     |
| Node type declarations                      | 24.19.2 — runtime-aligned exception |
| tsx / concurrently                          | 4.23.15 / 10.0.6                    |
| ESLint / @eslint/js / typescript-eslint     | 10.12.0 / 10.0.1 / 8.71.1           |
| eslint-plugin-svelte / globals              | 3.23.1 / 17.13.0                    |
| Prettier / Svelte plugin                    | 3.9.10 / 4.1.1                      |
| svelte-check                                | 4.7.6                               |

All selected packages were non-deprecated according to npm metadata. The only entries
reported by `pnpm outdated -r` are intentional:

- TypeScript's latest is **7.0.2**, but SvelteKit 3 requires `^6.0.0`, svelte-check
  accepts TS 5/6, and typescript-eslint requires `<6.1.0`. **6.0.3** is the newest
  published stable release satisfying all three; peer constraints are not bypassed.
- `@types/node` latest targets Node 26. **24.19.2** is the latest published Node 24
  type package, matching the explicitly chosen Node 24 LTS runtime.

Node `node:sqlite` replaces the Deno JSR SQLite driver with no external native driver.
Its non-stable API status in Node 24 is an explicit accepted choice; do not assume APIs
shown in Node 25/26 documentation exist in Node 24. Only DatabaseSync, prepare, get,
all, exec and close are used here.

## Optional Cloudflare target

Verified against npm metadata on **2026-10-11**:

- `@sveltejs/adapter-cloudflare` **8.0.0** peers require SvelteKit `^3.0.0-next.0`
  and Wrangler `^4.118.0`; selected SvelteKit **3.0.1** and Wrangler **4.149.0**
  satisfy them without peer overrides. Node 24 satisfies Wrangler's Node `>=22`
  engine. The Cloudflare build was verified with Vite **8.3.4**.
- Miniflare **5.20261006.1-alpha** is pinned to the exact version required by
  Wrangler **4.149.0**, rather than independently upgrading the test runtime.
  This prerelease is an explicit toolchain compatibility exception. Tests use its
  exported `convertV4MiniflareOptions` migration helper.
- `@cloudflare/workers-types` **5.20261006.1** matches the selected runtime release
  and avoids adding a minimum-release-age exception for the newer type package.
  Wrangler generates the checked-in binding declarations without duplicated runtime types.
- `workerd` is the only additional dependency allowed to run an install script;
  its installer validates the platform-specific runtime executable. Existing pnpm
  supply-chain defaults and strict engine/peer checks are retained.
- On Node **24.21.0**, frozen installation, lint, formatting, type checks, eight
  Node tests, eleven Cloudflare tests, both production build targets, and Wrangler
  deployment dry runs passed. Local Wrangler capture-to-UI smoke checks and repeat
  migrations passed. A post-install audit reported no known vulnerabilities.
  The pinned Docker image build and isolated container persistence/restart smoke
  test also passed after the local daemon became available. Cloudflare dev mode
  was verified without a prebuilt frontend: Vite HMR client, page render, capture,
  listing, and deletion all worked through local bindings. Remote provisioning,
  migrations, and deployment were intentionally not performed.

## Compatibility changes

- SvelteKit 3 configuration moved into the Vite plugin; `svelte.config.ts` was removed.
- `$lib` imports became package-defined `#lib` imports with extensions;
  `$app/environment` became `$app/env`; `json()` became `Response.json()`.
- Frontend tsconfig now extends `$app/tsconfig` and type-checks without emitting.
- DELETE helpers identify themselves as JSON API requests rather than form-style
  requests with no content type. SvelteKit 3 keeps CSRF protection enabled. Browser
  cross-origin JSON requests require CORS preflight; no trusted-origin wildcard was added.
- Adapter-node 6 assumes HTTPS when reconstructing origins without a protocol header.
  Behind a trusted reverse proxy, configure `PROTOCOL_HEADER`, `HOST_HEADER`, and
  `PORT_HEADER` as appropriate and ensure the proxy replaces untrusted forwarded headers.
  SvelteKit 3 removed runtime `ORIGIN`; an explicit canonical origin belongs in
  `sveltekit({ paths: { origin: ... } })` configuration.
- pnpm 12 workspace settings use `allowBuilds`; only esbuild (used by tsx) is allowed
  to execute installation scripts. No blanket build-script approval or peer-ignore flag.

## Containers and CI

Both stages use **Debian Trixie**, not Bookworm or an ambiguous Debian alias:

```text
node:24.21.0-trixie-slim
sha256:173f125896c3b47ddf056734c7ea789d04595a6a08769a8f78e0df642781fb66
```

The tag exists and the digest is its multi-platform manifest digest. Node 24 is retained
as the selected LTS deployment target even though newer non-24 releases exist.

GitHub Actions are updated to current release commits, not stale major tags:
checkout 7.0.1, setup-node 7.1.0, pnpm/action-setup 6.1.0,
setup-buildx-action 4.4.1, login-action 4.6.0, metadata-action 6.2.0,
build-push-action 7.4.0, cosign-installer 4.1.2, and trivy-action 0.36.0.
Cosign is 3.1.3 and Trivy is 0.75.0. Dependabot checks npm, Actions and Docker weekly;
Node major upgrades remain excluded to preserve the chosen runtime line.

## Security and verification

- `pnpm audit --json`: **zero reported vulnerabilities** at all severity levels in
  application and development dependencies. This is an advisory-database result,
  not proof that no vulnerabilities exist.
- Installation uses strict engines, strict peer compatibility, exact pins, and frozen
  lockfiles in CI/Docker. pnpm's default supply-chain policies remain enabled.
- On Node **24.21.0**: frozen installation, production build, type checks, lint,
  formatting checks, and **all eight automated tests passed**. The downloaded Node
  archive's SHA-256 matched Node's published checksum.
- Manual smoke checks passed for `pnpm dev` (capture, frontend proxy, Ctrl+C shutdown)
  and an isolated production-only installation (compiled services, capture/proxy,
  shutdown, no TypeScript compiler or runner installed). Installing the exact pnpm
  pin through npm in an isolated prefix also succeeded.
- Docker Compose configuration and entrypoint/smoke-test shell syntax can be checked
  locally without a daemon.
- Local Docker build and container smoke testing were **not run**: Docker's Colima
  daemon is stopped. A remote Trivy base-image scan was attempted twice but timed out;
  **no clean container scan is claimed**. CI builds, smoke-tests, and scans the final
  image, blocking publication for HIGH/CRITICAL findings without suppressions.
- Updating an image pin must verify the tag/digest and run a fresh final-image scan.
  Distribution currency by itself does not establish vulnerability status.

Historical `.opencode` plans and its separate tooling package are outside application
scope and were not rewritten, installed, or represented as audited dependencies.
