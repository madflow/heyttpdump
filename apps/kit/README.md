# heyttpdump frontend

SvelteKit 3 / Svelte 5 with Vite 8, Tailwind CSS 4 and adapter-node.

Run commands from the repository root:

```sh
pnpm install --frozen-lockfile
pnpm dev:kit
pnpm build
pnpm --filter heyttpdump-kit preview
pnpm --filter heyttpdump-kit check
```

Development and preview use port 3002. The API must be running separately, or use
`pnpm dev` to start the complete stack.

Production: `PORT=3002 node apps/kit/build/index.js`, or `pnpm start` for all services.
`API_URL` is private server-side runtime configuration, defaulting to
`http://localhost:3001/rpc`.

SvelteKit configuration is in `vite.config.ts`; `#lib/*` imports are declared in
`package.json`. Components use Svelte 5 runes. See the root README for deployment,
database, and environment details.
