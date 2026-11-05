# Dependency verification

## Docker installation fix

Both Docker stages now install pnpm `12.16.1`, matching `package.json` instead of
the stale `12.11.2` pin. Package-provided TanStack skills are explicitly declined
with `permissions["@tanstack/react-start"].skills: false`; these are development
agent content, not application dependencies. Approving them caused clean container
installs to fail with `ERR_PNPM_NO_AGENT_SKILLS_DIR` because Docker has no agent
skills directory. No agent directories need to be copied into the image.

## Miniflare beta / Undici security fix

CI's dependency audit reported eight Undici advisories (four high, four moderate)
through Miniflare's exact `7.29.1` dependency. Miniflare is now pinned to
`5.20261104.0-beta`, which includes patched Undici `7.30.1` and workerd
`1.20261104.1`. Published npm metadata confirms Node `>=22.0.0` compatibility
and no peer dependencies, compatible with Node 26.

The direct dependency uses the beta; pinned Wrangler `4.149.0` and Cloudflare
Vite plugin `1.63.1` retain their required `5.20261006.1-alpha`. Forcing the beta
into those tools breaks the Vite build because the beta no longer exports
`getNodeCompat`. A scoped `miniflare>undici` override selects patched `7.30.1`
for their alpha copies too. Remove the override when those tools select a patched
Miniflare themselves. pnpm recorded an exact-version minimum-release-age exclusion
for the explicitly requested beta.

Frozen installation and `pnpm audit --audit-level=high` pass with **no known
vulnerabilities**. Strict peer checking and existing build approvals remain enabled;
no advisory suppression was added.

## Oxlint / Oxfmt migration

The root tooling now pins Oxlint `1.91.0` and Oxfmt `0.76.0`, verified against
published npm metadata. Both require Node `^20.19.0 || >=22.12.0`, compatible with
the repository's Node 26 runtime. Their peers are optional; no extra peer packages,
build approvals, or supply-chain policy exceptions were needed.

`pnpm lint` uses Oxlint with errors for correctness rules and explicitly configured
ESLint/TypeScript recommended equivalents, including the ban on explicit `any`.
TypeScript files leave undefined-name checks to `pnpm check`. Syntax-level checks
such as duplicate parameters and legacy octal literals are handled by the parser
rather than standalone Oxlint rules. This is not a type-aware lint configuration.

`pnpm format` and `pnpm format:check` use Oxfmt. The former Prettier options and
generated-file exclusions are in `.oxfmtrc.json`; package sorting remains disabled
to avoid unrelated changes. ESLint, typescript-eslint, globals, and Prettier and
their old configuration files were removed. CI keeps the same script names.

The migration audit reports **18 existing transitive advisories (8 high,
10 moderate)** in Undici and Seroval, not in the new tools. These unrelated runtime
dependency updates are outside this tooling migration. The historical clean audit
below describes the earlier migration, not the current dependency tree.

## TanStack Start migration (2026-10-13)

Frontend versions were verified against npm's published metadata, engines, and peers.
**`@tanstack/react-start` is pinned to exactly `1.169.1` as requested**, not the
latest available Start release. Its published dependencies select React Router
`1.170.44`; that matching version is pinned directly. The installed package and
lockfile must retain Start 1.169.1. No peer overrides or ignored conflicts are used.

| Package / tool                              | Selected version                                                       |
| ------------------------------------------- | ---------------------------------------------------------------------- |
| Node.js / pnpm                              | 26.11.1 / 12.11.2 (unchanged)                                          |
| TanStack React Start / Router               | 1.169.1 / 1.170.44                                                     |
| TanStack Router generator                   | 1.167.43 (matches Start's plugin dependency)                           |
| React / React DOM / corresponding types     | 19.3.0 (aligned)                                                       |
| React Vite plugin                           | 6.1.2                                                                  |
| Cloudflare Vite plugin                      | 1.63.1                                                                 |
| Vite / Tailwind CSS and plugin              | 8.3.4 / 4.3.3 (unchanged)                                              |
| Lucide React                                | 1.56.0                                                                 |
| Vitest / jsdom                              | 5.0.4 / 30.1.2                                                         |
| React Testing Library / DOM Testing Library | 16.3.3 / 10.4.2                                                        |
| TypeScript / Node declarations              | 6.0.3 / 24.19.2 (unchanged)                                            |
| Hono / Node server adapter                  | 4.13.13 / 2.1.4 (unchanged)                                            |
| oRPC / Valibot                              | 1.15.5 / 1.5.0 (unchanged)                                             |
| ESLint / typescript-eslint / Prettier       | 10.12.0 / 8.71.1 / 3.9.10 (unchanged)                                  |
| Wrangler / Miniflare / Workers types        | 4.149.0 / 5.20261006.1-alpha / 5.20261011.1 (upstream update retained) |

Start 1.169.1 requires Node >=22.12.0 and Vite >=8.0.0; the repository's Node 26
and Vite 8 satisfy those constraints. React plugin 6 peers with Vite 8. Cloudflare
plugin 1.63.1 accepts Vite 8 and Wrangler 4.149.0. React Testing Library accepts
React 19; Vitest and jsdom support Node 26. TypeScript 6 remains pinned to satisfy
typescript-eslint's supported range. The existing Node 24 declaration package is
retained conservatively; it does **not** mean the runtime is Node 24.

Svelte, its adapters, icons, checker, and ESLint/Prettier plugins were removed.
Node runtime imports are production dependencies. Node production uses Hono's
fetch bridge instead of introducing Nitro. Cloudflare production uses Start's
fetch entry with the Cloudflare Vite plugin and its generated Wrangler configuration.

## Supply chain and security

Exact direct pins, strict engines/peers, frozen CI/Docker installation, and pnpm's
supply-chain defaults remain enabled. No blanket build approvals were added.
The existing `allowBuilds` policy permits esbuild and workerd only. pnpm 12 records
version-specific minimum-release-age exclusions for the selected newly published
Start/Router, Vitest, and Lucide packages; these are not wildcard policy bypasses.
Package-provided agent skills were not approved or installed.

`pnpm audit` and `pnpm audit --prod` reported **no known vulnerabilities** after
installation. This is an advisory-database result, not proof of absence of defects.
Miniflare's pinned alpha version remains an explicit compatibility exception
matching Wrangler. Tests use its exported v4-to-v5 conversion helper with an
explicit module list for the multi-module frontend Worker.

## Runtime and containers

The repository already used Node 26 at migration time. The upstream exact engine
pin to 26.11.1 and Workers types update to 5.20261011.1 were retained when rebasing.
The runtime, package-manager pin, and Docker base image were not upgraded or downgraded:

```text
node:26.11.1-trixie-slim
sha256:193fe51b64e77981119c98c2002c9e32a70e2f006fb4d25068ce0558998917f0
```

Both stages remain Debian Trixie slim. CI continues dependency auditing, image
building, and disposable-volume smoke tests before publishing. No new container
vulnerability scan result is claimed by this migration.

## Compatibility and verification

- `apps/web`, `heyttpdump-web`, and `dev:web` replace the old frontend names.
- Start 1.169.1 file-based server routes preserve the existing proxy URLs and
  response/error shapes, including proxy HTTP 500 for backend `NOT_FOUND`.
- Destructive requests explicitly require JSON and reject mismatched supplied
  origins. Runtime `API_URL` and Worker bindings remain server-only.
- Separate `dist/node` and `dist/cloudflare` outputs prevent cross-target overwrites.
  Generated route types are recreated for clean-checkout type checks.
- Tests cover Node integration and supervisor lifecycle, isolated Worker/D1 calls,
  React polling/cleanup/races/deletion/body rendering, and theme/storage behavior.
- Remote provisioning, migrations, deployments, and old-Worker removal are not
  performed. Database tests use isolated data, not the user's database.

### Migration check results

On Node 26.11.1 with pnpm 12.11.2, frozen installation, lint, formatting validation,
strict type checks (including regenerating a deleted route tree), production builds,
and all **10 React + 10 Node + 11 Cloudflare tests** passed. Cloudflare checks include
both Worker builds and deployment dry runs; Node output remains available afterward.
Binding type regeneration left API/dump declarations unchanged.

The pinned Docker image built successfully and its disposable-volume smoke test
passed capture/proxy, production-only dependency resolution, shutdown, and
persistence across recreation. Node development and production preview, plus
Cloudflare Vite HMR and built Worker preview, passed isolated capture/proxy smoke
checks. Headless Chrome verified hydration without console errors and light/dark
rendering on all four workflows; Node preview screenshots were visually inspected.
SQLite/D1 data for these checks lived only in temporary directories or disposable
volumes. No remote Cloudflare action or old-Worker deletion was performed.

Historical `.opencode` tooling remains outside the application workspace and audit.
