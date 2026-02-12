# Agent Guidelines for heyttpdump

This document provides coding guidelines and commands for AI agents working on this codebase.

## Project Overview

**heyttpdump** is a TypeScript/Deno monorepo for capturing and viewing HTTP requests. It consists of:
- **apps/api** - Backend API server (port 3001) with oRPC handlers and SQLite database
- **apps/dump** - HTTP dump service (port 3000) that captures incoming requests
- **apps/kit** - SvelteKit frontend (port 3002) for viewing captured requests
- **packages/orpc** - Shared RPC contract and type-safe client

**Tech Stack:** Deno 2.0+, TypeScript, Hono, SvelteKit, Svelte 5, Vite 7, Tailwind CSS 4, SQLite, oRPC, Valibot

## Build, Lint, and Test Commands

### Development
```bash
# Start all services in development mode
deno task dev           # or: make dev

# Start individual services
deno task dev:api       # API server only
deno task dev:dump      # Dump server only
deno task dev:kit       # SvelteKit UI only

# Initialize project (run migrations)
make init
```

### Build
```bash
# Build frontend for production
deno task --cwd=apps/kit build

# Preview production build
deno task --cwd=apps/kit preview
```

### Linting and Formatting
```bash
# Run linter
deno lint               # or: make check

# Format code
deno fmt                # Formats TS, JS, JSON, MD files
```

### Database
```bash
# Run migrations
deno task migrate

# Database location: data/db.sqlite (or DB_PATH env var)
```

### Testing
**Note:** No test framework is currently configured. Consider adding tests using Deno's built-in test framework.

### Docker
```bash
make docker-up          # Start with Docker
make docker-down        # Stop containers
make docker-logs        # View logs
```

## Code Style Guidelines

### Imports

**Order:** External dependencies → workspace packages → relative imports
```typescript
// External dependencies
import { Hono } from "hono";
import { cors } from "hono/cors";

// Workspace packages
import { appContract } from "@repo/orpc";

// Relative imports
import * as db from "./db.ts";
```

**Import aliases:**
- `@repo/orpc` - Shared oRPC package
- Use `.ts` extensions for all relative imports

### Formatting

- **Indentation:** 2 spaces (no tabs)
- **Line length:** No strict limit, but keep reasonable (~100-120 chars)
- **Quotes:** Double quotes for strings
- **Semicolons:** Required (Deno default)
- **Trailing commas:** Use in multiline objects/arrays
- Run `deno fmt` before committing

### TypeScript and Types

**Type definitions:**
- Export types for public APIs
- Define interfaces for data structures
- Use `type` for union types, `interface` for objects

```typescript
// Database types
export interface PayloadInput {
  method: string;
  url: string;
  headers: Record<string, string>;
  body: string;
}

// Export router type for type inference
export type AppRouter = typeof router;
```

**Type safety:**
- Enable `checkJs: true` for JavaScript files
- Use type annotations for function parameters and return types
- Avoid `any` - use `unknown` when type is uncertain
- Use Valibot schemas for runtime validation

### Naming Conventions

**Files:**
- `kebab-case.ts` for utilities
- `PascalCase.svelte` for components
- `lowercase.ts` for main entry points (main.ts, router.ts, db.ts)

**Variables and functions:**
```typescript
// camelCase for variables and functions
const DEFAULT_PORT = 3001;
let expandedId = $state<number | null>(null);

function ensureRequestExists<T>(result: T | null): T { }

// PascalCase for components and types
type AppContract = typeof appContract;
```

**Constants:**
- SCREAMING_SNAKE_CASE for top-level constants
```typescript
const REQUESTS_PER_PAGE = 10;
const POLLING_INTERVAL_MS = 1000;
```

### Svelte 5 Patterns

**Use Svelte 5 runes (NOT stores):**
```typescript
// State management with runes
let requests = $state<Request[]>([]);
let page = $state(0);
let loading = $state(false);

// Effects
$effect(() => {
  if (!mounted) return;
  fetchRequests();
  return () => clearInterval(interval);
});

// Derived state (when needed)
let totalCount = $derived(requests.length);
```

**Component props:**
```typescript
// Props with types
let { requests, expandedId, loading, onDelete } = $props<{
  requests: Request[];
  expandedId: number | null;
  loading: boolean;
  onDelete: (id: number) => void;
}>();
```

### Error Handling

**Backend (oRPC):**
- Use `ORPCError` for API errors with appropriate error codes
```typescript
import { ORPCError } from "@orpc/server";

function ensureRequestExists<T>(result: T | null, errorMessage = "Request not found"): T {
  if (!result) {
    throw new ORPCError("NOT_FOUND", { message: errorMessage });
  }
  return result;
}
```

**Frontend:**
- Use try-catch for async operations
- Log errors to console
- Show user-friendly messages (consider adding toast notifications)
```typescript
try {
  await client.requests.delete({ id });
  await fetchRequests();
} catch (error) {
  console.error('Failed to delete request:', error);
}
```

**Database:**
- Return `null` for not found, throw for unexpected errors
- Use `RETURNING *` for INSERT/DELETE operations

### RPC and API Design

**Contract-first approach:**
1. Define schemas in `packages/orpc/contract/index.ts` using Valibot
2. Implement handlers in `apps/api/router.ts`
3. Use type-safe client in frontend via `client.requests.*`

```typescript
// 1. Define contract
const getRequestContract = oc
  .input(idInputSchema)
  .output(requestSchema);

// 2. Implement handler
const getRequest = impl.requests.get.handler(({ input }) => 
  ensureRequestExists(db.getRequest(input.id))
);

// 3. Use in frontend
const data = await client.requests.get({ id: 123 });
```

**All API operations go through oRPC** - no direct HTTP endpoints except RPC

### Database Operations

- All database operations in `apps/api/db.ts`
- Use prepared statements with parameterized queries
- Transform database rows to application types
```typescript
function rowToOutput(row: RequestRow): RequestOutput {
  return {
    id: row.id,
    createdAt: row.created_at,
    payload: { /* ... */ },
  };
}
```

### Component Structure

**Svelte components:**
```svelte
<script lang="ts">
  // Imports
  import Component from './Component.svelte';
  
  // Props
  let { prop1, prop2 } = $props<{ prop1: string; prop2: number }>();
  
  // State
  let localState = $state(0);
  
  // Effects
  $effect(() => { /* ... */ });
  
  // Functions
  function handleAction() { /* ... */ }
</script>

<!-- Template -->
<div class="tailwind-classes">
  {#if condition}
    <!-- content -->
  {:else}
    <!-- fallback -->
  {/if}
</div>
```

**Component organization:** `apps/kit/src/lib/components/` - one component per file

## Common Patterns

### Environment Variables
```typescript
const PORT = Number(Deno.env.get("API_PORT")) || DEFAULT_PORT;
const dbPath = Deno.env.get("DB_PATH") || DEFAULT_DB_PATH;
```

### Polling Pattern
```typescript
$effect(() => {
  if (!mounted) return;
  
  fetchData();
  const interval = setInterval(fetchData, INTERVAL_MS);
  
  return () => clearInterval(interval);
});
```

### Helper Functions
- Keep pure utility functions in `lib/utils.ts`
- Keep API client in `lib/api.ts`
- Keep theme logic in `lib/theme.svelte.ts`

## Key Principles

1. **Type Safety:** Leverage end-to-end type safety through oRPC contracts
2. **Svelte 5 First:** Use runes (`$state`, `$effect`) instead of legacy stores
3. **Single Responsibility:** Each module has a clear, focused purpose
4. **Contract-First:** Define RPC contracts before implementation
5. **Error Boundaries:** Handle errors gracefully at appropriate levels
6. **Consistent Formatting:** Run `deno fmt` and `deno lint` before commits
7. **No Direct HTTP:** All backend communication through oRPC (except dump service)

## File References

When making changes, prefer editing existing files:
- Backend routes: `apps/api/router.ts`
- Database operations: `apps/api/db.ts`
- RPC contracts: `packages/orpc/contract/index.ts`
- Frontend page: `apps/kit/src/routes/+page.svelte`
- Components: `apps/kit/src/lib/components/*.svelte`
