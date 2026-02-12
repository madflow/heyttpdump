<script lang="ts">
  import MethodBadge from "./MethodBadge.svelte";
  import RequestDetails from "./RequestDetails.svelte";
  import { getPathFromUrl } from "$lib/utils";
  import type { Request } from "$lib/types";

  let {
    request,
    isExpanded,
    loading,
    onToggleExpand,
    onDelete,
  }: {
    request: Request;
    isExpanded: boolean;
    loading: boolean;
    onToggleExpand: () => void;
    onDelete: () => void;
  } = $props();
</script>

<div
  class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded p-4"
>
  <div class="flex items-center justify-between">
    <div class="flex items-center gap-4 flex-1">
      <MethodBadge method={request.payload.method} />
      <code class="text-sm text-gray-700 dark:text-gray-300 flex-1">
        {getPathFromUrl(request.payload.url)}
      </code>
      <span class="text-xs text-gray-500 dark:text-gray-400 mr-4">
        {new Date(request.createdAt).toLocaleString()}
      </span>
    </div>
    <div class="flex items-center gap-2">
      <button
        onclick={onToggleExpand}
        class="px-3 py-1 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
      >
        {isExpanded ? "Collapse" : "Expand"}
      </button>
      <button
        onclick={onDelete}
        disabled={loading}
        class="px-3 py-1 text-sm text-red-600 hover:text-red-800 border border-red-300 dark:border-red-700 rounded hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50"
      >
        Delete
      </button>
    </div>
  </div>

  {#if isExpanded}
    <RequestDetails
      headers={request.payload.headers}
      body={request.payload.body}
    />
  {/if}
</div>
