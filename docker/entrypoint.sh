#!/bin/sh
set -e

env

echo "Starting heyttpdump services..."

# Ensure database exists and is migrated
echo "Running database migrations..."
deno run --allow-read --allow-write --allow-env --allow-ffi --allow-net \
  apps/api/migrate.ts

# Start API server (port 3001)
echo "Starting API server on port ${API_PORT:-3001}..."
deno run --allow-net --allow-read --allow-write --allow-env --allow-ffi \
  apps/api/main.ts &
API_PID=$!

# Wait for API to be ready with health check
echo "Waiting for API server to be ready..."
MAX_ATTEMPTS=30
ATTEMPT=0
API_READY=false

while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
  if deno eval "try { const r = await fetch('http://localhost:${API_PORT:-3001}/health'); Deno.exit(r.ok ? 0 : 1); } catch { Deno.exit(1); }" 2>/dev/null; then
    echo "API server is ready!"
    API_READY=true
    break
  fi
  ATTEMPT=$((ATTEMPT + 1))
  echo "Waiting for API... (${ATTEMPT}/${MAX_ATTEMPTS})"
  sleep 1
done

if [ "$API_READY" = false ]; then
  echo "ERROR: API server failed to become ready after ${MAX_ATTEMPTS} seconds"
  exit 1
fi

# Start DUMP server (port 3000)
echo "Starting DUMP server on port ${DUMP_PORT:-3000}..."
deno run --allow-env --allow-net \
  apps/dump/main.ts &
DUMP_PID=$!

# Small delay to let DUMP server initialize
sleep 1

# Start WEB server (port 3002) - SvelteKit app
echo "Starting WEB server on port ${WEB_PORT:-3002}..."
PORT=${PORT:-3002} HOST=${HOST:-0.0.0.0} deno run --allow-env --allow-read --allow-net \
  apps/kit/build/index.js &
WEB_PID=$!

echo "All services started successfully!"
echo "  API:  http://localhost:${API_PORT:-3001}"
echo "  DUMP: http://localhost:${DUMP_PORT:-3000}"
echo "  WEB:  http://localhost:${WEB_PORT:-3002}"

# Wait for all background processes
wait $API_PID $DUMP_PID $WEB_PID
EOF
