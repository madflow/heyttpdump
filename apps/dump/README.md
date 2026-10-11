# HTTP dump service

From the repository root, install dependencies with `pnpm install --frozen-lockfile`,
initialize the API database with `pnpm migrate`, and start all services with `pnpm dev`.

For this service alone, use `pnpm dev:dump`. The API must already be running.
`DUMP_PORT` defaults to 3000 and `API_URL` to `http://localhost:3001/rpc`.

After `pnpm build`, `pnpm --filter @repo/dump start` runs compiled JavaScript on Node 24.
Every incoming request is captured through the shared oRPC client.
