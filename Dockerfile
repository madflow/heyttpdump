# Multi-stage Dockerfile for heyttpdump
# Bundles all three apps (api, dump, web) in a single minimal container

# =============================================================================
# Stage 1: Builder - Build web app and cache dependencies
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
COPY apps/web/deno.json ./apps/web/

# Cache dependencies for all apps (without lockfile)
RUN deno install --entrypoint apps/api/deno.json
RUN deno install --entrypoint apps/dump/deno.json
RUN deno install --entrypoint apps/web/deno.json

# Copy all source files
COPY apps/ ./apps/

# Build the web app (Svelte + Vite)
WORKDIR /build/apps/web
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

COPY apps/web/deno.json ./apps/web/
COPY apps/web/server.ts ./apps/web/
COPY --from=builder /build/apps/web/dist ./apps/web/dist

RUN deno install --entrypoint apps/api/deno.json && \
  deno install --entrypoint apps/dump/deno.json && \
  deno install --entrypoint apps/web/deno.json

COPY ./docker/entryoint.sh /
RUN chmod +x /entryoint.sh

ENV API_PORT=3001
ENV DUMP_PORT=3000
ENV WEB_PORT=3002
ENV API_URL=http://localhost:3001/rpc
ENV VITE_API_URL=http://localhost:3001/rpc
ENV DB_PATH=/app/data/db.sqlite

RUN mkdir -p /app/data

EXPOSE 3000 3001 3002

VOLUME ["/app/data"]

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD deno eval "try { await fetch('http://localhost:3001'); Deno.exit(0); } catch { Deno.exit(1); }"

ENTRYPOINT ["/entryoint.sh"]
