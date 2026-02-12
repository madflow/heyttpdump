# Migration Plan: apps/web to apps/kit

## Overview
Migrate all functionality from `@apps/web/` (Vite + Svelte 5) to `@apps/kit/` (SvelteKit) while preserving SvelteKit patterns. API access to oRPC server will be through SvelteKit API routes.

## Current State Analysis

### apps/web/ Structure
- **Main App**: `App.svelte` - Contains request list logic, polling, pagination
- **Components** (9 files in `src/components/`):
  - Header.svelte - Page header with theme toggle and delete all
  - RequestList.svelte - Renders list of requests
  - RequestItem.svelte - Individual request card with expand/collapse
  - RequestDetails.svelte - Expanded view showing headers/body
  - MethodBadge.svelte - HTTP method colored badges
  - Pagination.svelte - Previous/Next page controls
  - EmptyState.svelte - Shows when no requests
  - LoadingState.svelte - Loading indicator
  - ThemeToggle.svelte - Light/Dark/System theme switcher
- **Lib Utilities** (`src/lib/`):
  - api.ts - Creates oRPC client (direct browser access)
  - types.ts - TypeScript interfaces
  - utils.ts - Utility functions (getPathFromUrl)
  - theme.svelte.ts - Theme context with Svelte 5 runes
- **Styles**: `src/styles.css` - Tailwind CSS import

### apps/kit/ Current State
- Basic SvelteKit setup with adapter-auto
- Empty routes (+page.svelte, +layout.svelte)
- Missing all components and utilities

## Migration Plan

### 1. Components Migration
**Location**: `apps/kit/src/lib/components/`

All 9 components will be copied with minimal path changes:
- Update imports from `../lib/types` → `$lib/types`
- Update imports from `../lib/utils` → `$lib/utils`
- Update imports from `../lib/theme.svelte` → `$lib/theme.svelte`
- Update relative imports between components

**Components to create**:
1. EmptyState.svelte (simple, no changes needed)
2. LoadingState.svelte (simple, no changes needed)
3. MethodBadge.svelte (simple, no changes needed)
4. Pagination.svelte (simple, no changes needed)
5. RequestDetails.svelte (simple, no changes needed)
6. ThemeToggle.svelte (needs @lucide/svelte import)
7. RequestItem.svelte (imports MethodBadge, RequestDetails, utils, types)
8. RequestList.svelte (imports RequestItem, types)
9. Header.svelte (imports ThemeToggle)

### 2. Lib Utilities Migration
**Location**: `apps/kit/src/lib/`

**types.ts** - Copy directly, no changes needed:
```typescript
export interface RequestPayload {
  method: string;
  url: string;
  headers: Record<string, string>;
  body?: string;
}

export interface Request {
  id: number;
  createdAt: string;
  payload: RequestPayload;
}
```

**utils.ts** - Copy directly, no changes needed:
```typescript
export function getPathFromUrl(url: string) {
  try {
    const urlObj = new URL(url);
    return urlObj.pathname + urlObj.search;
  } catch {
    return url;
  }
}
```

**theme.svelte.ts** - Copy with one change:
- Keep all Svelte 5 runes ($state, $effect)
- This is client-side only, works in SvelteKit

### 3. API Routes Creation
**Location**: `apps/kit/src/routes/api/`

Instead of direct browser-to-oRPC communication, create SvelteKit API routes that proxy to the oRPC server:

**File Structure**:
```
src/routes/api/
├── requests/
│   ├── +server.ts        (GET, DELETE)
│   └── [id]/
│       └── +server.ts    (DELETE)
```

**apps/kit/src/routes/api/requests/+server.ts**:
```typescript
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createClient } from '@repo/orpc';

const client = createClient(process.env.API_URL || 'http://localhost:3001');

export const GET: RequestHandler = async ({ url }) => {
  const limit = parseInt(url.searchParams.get('limit') || '10');
  const offset = parseInt(url.searchParams.get('offset') || '0');
  
  const requests = await client.requests.list({ limit, offset });
  return json(requests);
};

export const DELETE: RequestHandler = async () => {
  const deletedCount = await client.requests.deleteAll();
  return json({ deletedCount });
};
```

**apps/kit/src/routes/api/requests/[id]/+server.ts**:
```typescript
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createClient } from '@repo/orpc';

const client = createClient(process.env.API_URL || 'http://localhost:3001');

export const DELETE: RequestHandler = async ({ params }) => {
  const id = parseInt(params.id);
  await client.requests.delete({ id });
  return json({ success: true });
};
```

**Client-side API helper** (`apps/kit/src/lib/api.ts`):
```typescript
import type { Request } from './types';

export async function fetchRequests(limit: number, offset: number): Promise<Request[]> {
  const response = await fetch(`/api/requests?limit=${limit}&offset=${offset}`);
  if (!response.ok) throw new Error('Failed to fetch requests');
  return response.json();
}

export async function deleteRequest(id: number): Promise<void> {
  const response = await fetch(`/api/requests/${id}`, { method: 'DELETE' });
  if (!response.ok) throw new Error('Failed to delete request');
}

export async function deleteAllRequests(): Promise<void> {
  const response = await fetch('/api/requests', { method: 'DELETE' });
  if (!response.ok) throw new Error('Failed to delete all requests');
}
```

### 4. Main Page Creation
**Location**: `apps/kit/src/routes/+page.svelte`

Replace the simple placeholder with full App.svelte functionality:
- Import all components
- Setup theme context
- Manage state with $state
- Implement polling with $effect
- Handle pagination
- Handle delete operations
- Handle expand/collapse

**Key differences from App.svelte**:
- Remove `onMount` - use `browser` check instead
- Use new `api.ts` functions instead of oRPC client
- SvelteKit doesn't need mount pattern, use `browser` from `$app/environment`

### 5. Layout Update
**Location**: `apps/kit/src/routes/+layout.svelte`

Update to include:
- Theme setup
- Global styles import
- Keep favicon

**apps/kit/src/routes/+layout.svelte**:
```svelte
<script lang="ts">
  import { browser } from '$app/environment';
  import favicon from '$lib/assets/favicon.svg';
  import { setupThemeContext } from '$lib/theme.svelte';
  import '../app.css';
  
  let { children } = $props();
  
  if (browser) {
    setupThemeContext();
  }
</script>

<svelte:head>
  <link rel="icon" href={favicon} />
</svelte:head>

{@render children()}
```

### 6. Styles Setup
**Location**: `apps/kit/src/app.css`

Create with Tailwind CSS import:
```css
@import "tailwindcss";

@custom-variant dark (&:where(.dark, .dark *));
```

### 7. Configuration Updates
**apps/kit/deno.json**:

Add missing dependencies:
```json
{
  "imports": {
    "@sveltejs/adapter-auto": "npm:@sveltejs/adapter-auto@^7.0.0",
    "@sveltejs/kit": "npm:@sveltejs/kit@^2.50.2",
    "@sveltejs/vite-plugin-svelte": "npm:@sveltejs/vite-plugin-svelte@^6.2.4",
    "svelte": "npm:svelte@^5.49.2",
    "vite": "npm:vite@^7.3.1",
    "@repo/orpc": "../../packages/orpc/mod.ts",
    "@orpc/client": "npm:@orpc/client@^1.13.4",
    "@orpc/contract": "npm:@orpc/contract@^1.13.4",
    "@valibot/valibot": "jsr:@valibot/valibot@^1.2.0",
    "@lucide/svelte": "npm:@lucide/svelte@^0.563.1",
    "tailwindcss": "npm:tailwindcss@^4.1.18",
    "@tailwindcss/vite": "npm:@tailwindcss/vite@^4.1.18"
  }
}
```

**apps/kit/vite.config.ts**:

Add Tailwind plugin:
```typescript
import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [tailwindcss(), sveltekit()],
  server: {
    fs: {
      allow: ["../../"],
    },
  },
});
```

### 8. App HTML Update
**apps/kit/src/app.html**:

Add class to html for dark mode support:
```html
<!doctype html>
<html lang="en" class="light">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    %sveltekit.head%
  </head>
  <body data-sveltekit-preload-data="hover">
    <div style="display: contents">%sveltekit.body%</div>
  </body>
</html>
```

## File Mapping

| Source (apps/web) | Destination (apps/kit) | Changes |
|-------------------|------------------------|---------|
| src/components/*.svelte | src/lib/components/*.svelte | Update imports |
| src/lib/types.ts | src/lib/types.ts | None |
| src/lib/utils.ts | src/lib/utils.ts | None |
| src/lib/theme.svelte.ts | src/lib/theme.svelte.ts | None |
| src/lib/api.ts | src/lib/api.ts | New implementation (HTTP client) |
| src/App.svelte | src/routes/+page.svelte | Adapt for SvelteKit |
| src/styles.css | src/app.css | Rename |
| index.html | src/app.html | SvelteKit structure |

## New Files to Create

1. `apps/kit/src/routes/api/requests/+server.ts` - List and delete all
2. `apps/kit/src/routes/api/requests/[id]/+server.ts` - Delete single
3. `apps/kit/src/lib/components/` directory with 9 component files
4. `apps/kit/src/lib/types.ts`
5. `apps/kit/src/lib/utils.ts`
6. `apps/kit/src/lib/theme.svelte.ts`
7. `apps/kit/src/lib/api.ts` (client-side HTTP client)
8. `apps/kit/src/app.css`

## Files to Modify

1. `apps/kit/deno.json` - Add @lucide/svelte, tailwindcss, @tailwindcss/vite
2. `apps/kit/vite.config.ts` - Add tailwindcss plugin
3. `apps/kit/src/routes/+layout.svelte` - Add styles and theme setup
4. `apps/kit/src/routes/+page.svelte` - Replace with full implementation
5. `apps/kit/src/app.html` - Add class to html element

## Testing Checklist

- [ ] All components render correctly
- [ ] Theme toggle works (light/dark/system)
- [ ] Requests list loads via API route
- [ ] Polling updates the list every second
- [ ] Pagination works (previous/next)
- [ ] Expand/collapse shows request details
- [ ] Delete single request works
- [ ] Delete all requests works
- [ ] Loading states display correctly
- [ ] Empty state shows when no requests
- [ ] Dark mode persists across reloads

## Dependencies to Add

```bash
# Already have:
# - @sveltejs/kit
# - svelte
# - @repo/orpc

# Need to add:
# - @lucide/svelte
# - tailwindcss
# - @tailwindcss/vite
```

## Port Configuration

Current ports:
- apps/api: 3001
- apps/dump: 3000
- apps/web: 3002
- apps/kit: 3003 (already configured)

The API_URL should point to http://localhost:3001 for the oRPC server.

## Notes

1. **SvelteKit API Routes**: These run server-side, so they can directly call the oRPC server. This is more secure than exposing the oRPC URL to the browser.

2. **Theme Management**: The theme.svelte.ts uses Svelte 5 runes which work perfectly in SvelteKit. The localStorage access is guarded by browser checks.

3. **Polling**: The $effect with setInterval will work the same way in SvelteKit, just need to guard with browser check.

4. **Type Safety**: All types are preserved from the original app.

5. **Tailwind CSS**: Using v4 with the @import syntax and @tailwindcss/vite plugin.

## Implementation Order

1. Update deno.json with dependencies
2. Update vite.config.ts
3. Create lib/types.ts, lib/utils.ts
4. Create lib/theme.svelte.ts
5. Create app.css
6. Update +layout.svelte
7. Create all components
8. Create API routes
9. Create lib/api.ts (client-side)
10. Update +page.svelte
11. Update app.html
12. Test the application
