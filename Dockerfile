# Multi-stage Dockerfile for heyttpdump
# Bundles all three apps (api, dump, kit) in a single minimal container

# =============================================================================
# Stage 1: Builder - Build SvelteKit app and cache dependencies
# Use Debian for builder to ensure compatibility with native dependencies
# =============================================================================
FROM denoland/deno:debian AS builder

WORKDIR /build

# Copy workspace configuration (without lockfile to avoid version issues)
COPY deno.json ./

# Copy package definitions for dependency caching
COPY packages/ ./packages/
COPY apps/api/deno.json ./apps/api/
COPY apps/dump/deno.json ./apps/dump/
COPY apps/kit/deno.json ./apps/kit/
COPY apps/kit/package.json ./apps/kit/

# Cache dependencies for all apps (without lockfile)
RUN deno install --entrypoint apps/api/deno.json
RUN deno install --entrypoint apps/dump/deno.json
RUN deno install --entrypoint apps/kit/deno.json

# Copy all source files
COPY apps/ ./apps/

# Build the SvelteKit app
WORKDIR /build/apps/kit
RUN deno task build

# =============================================================================
# Stage 2: Runtime - Final image
# Note: Using Debian (not Alpine) because SQLite FFI requires GLIBC 2.38+
# =============================================================================
FROM denoland/deno:debian

WORKDIR /app

COPY deno.json ./

COPY packages/ ./packages/

COPY apps/api/deno.json ./apps/api/
COPY apps/api/*.ts ./apps/api/

COPY apps/dump/deno.json ./apps/dump/
COPY apps/dump/*.ts ./apps/dump/

COPY apps/kit/deno.json ./apps/kit/
COPY --from=builder /build/apps/kit/.svelte-kit ./apps/kit/.svelte-kit
COPY --from=builder /build/apps/kit/build ./apps/kit/build

RUN deno install --entrypoint apps/api/deno.json && \
  deno install --entrypoint apps/dump/deno.json && \
  deno install --entrypoint apps/kit/deno.json

COPY ./docker/entrypoint.sh /
RUN chmod +x /entrypoint.sh

ENV API_PORT=3001
ENV DUMP_PORT=3000
ENV WEB_PORT=3002
ENV PORT=3002
ENV HOST=0.0.0.0
ENV API_URL=http://localhost:3001/rpc
ENV DB_PATH=/app/data/db.sqlite

RUN mkdir -p /app/data

EXPOSE 3000 3001 3002

VOLUME ["/app/data"]

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD deno eval "try { await fetch('http://localhost:3001'); Deno.exit(0); } catch { Deno.exit(1); }"

ENTRYPOINT ["/entrypoint.sh"]
