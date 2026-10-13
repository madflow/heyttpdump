# Node 26 on Debian Trixie; pinned patch and multi-platform manifest.
FROM node:26.11.1-trixie-slim@sha256:193fe51b64e77981119c98c2002c9e32a70e2f006fb4d25068ce0558998917f0 AS builder
WORKDIR /app
RUN npm install --global pnpm@12.11.2
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/package.json
COPY apps/dump/package.json ./apps/dump/package.json
COPY apps/web/package.json ./apps/web/package.json
COPY packages/orpc/package.json ./packages/orpc/package.json
RUN pnpm install --frozen-lockfile
COPY tsconfig.base.json ./
COPY apps/ ./apps/
COPY packages/ ./packages/
RUN pnpm build

FROM node:26.11.1-trixie-slim@sha256:193fe51b64e77981119c98c2002c9e32a70e2f006fb4d25068ce0558998917f0 AS runtime
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/package.json
COPY apps/dump/package.json ./apps/dump/package.json
COPY apps/web/package.json ./apps/web/package.json
COPY packages/orpc/package.json ./packages/orpc/package.json
# Install all production workspace links in-place; no copied host node_modules.
RUN npm install --global pnpm@12.11.2 \
  && pnpm install --prod --frozen-lockfile \
  && npm uninstall --global pnpm \
  && npm cache clean --force
COPY --from=builder /app/packages/orpc/dist ./packages/orpc/dist
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/dump/dist ./apps/dump/dist
COPY --from=builder /app/apps/web/dist/node ./apps/web/dist/node
COPY scripts/ ./scripts/
COPY docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh && mkdir -p /app/data
ENV NODE_ENV=production \
  API_PORT=3001 \
  DUMP_PORT=3000 \
  WEB_PORT=3002 \
  HOST=0.0.0.0 \
  API_URL=http://localhost:3001/rpc \
  DB_PATH=/app/data/db.sqlite
EXPOSE 3000 3001 3002
VOLUME ["/app/data"]
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD ["node", "/app/scripts/healthcheck.mjs"]
ENTRYPOINT ["/entrypoint.sh"]
