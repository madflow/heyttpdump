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

# Wait for API to be ready
sleep 2

# Start DUMP server (port 3000)
echo "Starting DUMP server on port ${DUMP_PORT:-3000}..."
deno run --allow-env --allow-net \
  apps/dump/main.ts &
DUMP_PID=$!

# Start WEB server (port 3002) - serving static files and proxying API
echo "Starting WEB server on port ${WEB_PORT:-3002}..."
deno run --allow-env --allow-read --allow-net \
  apps/web/server.ts &
WEB_PID=$!

echo "All services started successfully!"
echo "  API:  http://localhost:${API_PORT:-3001}"
echo "  DUMP: http://localhost:${DUMP_PORT:-3000}"
echo "  WEB:  http://localhost:${WEB_PORT:-3002}"

# Wait for all background processes
wait $API_PID $DUMP_PID $WEB_PID
EOF
