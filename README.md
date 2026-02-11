# heyttpdump

HTTP request capture and viewing tool built with Deno, TypeScript, and Svelte 5.

## Quick Start

### Development

**Prerequisites:**
- [Deno 2.0+](https://deno.land/)

**Run all services:**

```bash
# Initialize database
make init

# Start all services (API + Dump + Web UI)
make dev
```

Services will be available at:
- **Web UI:** http://localhost:3002
- **API:** http://localhost:3001
- **Dump:** http://localhost:3000

### Docker

```bash
# Start with Docker Compose
make docker-up

# View logs
make docker-logs

# Stop services
make docker-down
```

## Architecture

- **apps/api** - Backend API server (port 3001)
- **apps/dump** - HTTP dump service (port 3000)
- **apps/web** - Svelte 5 frontend (port 3002)
- **packages/orpc** - Shared RPC contract

## Tech Stack

Deno 2.0+, TypeScript, Hono, Svelte 5, Vite 7, Tailwind CSS 4, SQLite, oRPC, Valibot
