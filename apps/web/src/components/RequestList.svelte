<script lang="ts">
  import RequestItem from './RequestItem.svelte';
  import type { Request } from '../lib/types';
  
  let {
    requests,
    expandedId,
    loading,
    onToggleExpand,
    onDelete
  }: {
    requests: Request[];
    expandedId: number | null;
    loading: boolean;
    onToggleExpand: (id: number) => void;
    onDelete: (id: number) => void;
  } = $props();
</script>

<div class="space-y-3">
  {#each requests as request (request.id)}
    <RequestItem
      {request}
      isExpanded={expandedId === request.id}
      {loading}
      onToggleExpand={() => onToggleExpand(request.id)}
      onDelete={() => onDelete(request.id)}
    />
  {/each}
</div>
