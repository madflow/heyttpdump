<script lang="ts">
  import { onMount } from 'svelte';
  import { setupThemeContext } from './lib/theme.svelte';
  import { client } from './lib/api';
  import type { Request } from './lib/types';
  import Header from './components/Header.svelte';
  import RequestList from './components/RequestList.svelte';
  import Pagination from './components/Pagination.svelte';
  import LoadingState from './components/LoadingState.svelte';
  import EmptyState from './components/EmptyState.svelte';
  
  const REQUESTS_PER_PAGE = 10;
  const POLLING_INTERVAL_MS = 1000;
  
  // Setup theme context
  setupThemeContext();
  
  let requests = $state<Request[]>([]);
  let page = $state(0);
  let loading = $state(false);
  let expandedId = $state<number | null>(null);
  let mounted = $state(false);
  
  onMount(() => {
    mounted = true;
  });
  
  async function fetchRequests() {
    try {
      const data = await client.requests.list({
        limit: REQUESTS_PER_PAGE,
        offset: page * REQUESTS_PER_PAGE
      });
      requests = data;
    } catch (error) {
      console.error('Failed to fetch requests:', error);
    }
  }
  
  $effect(() => {
    if (!mounted) return;
    
    fetchRequests();
    const interval = setInterval(fetchRequests, POLLING_INTERVAL_MS);
    
    return () => clearInterval(interval);
  });
  
  async function handleDelete(id: number) {
    try {
      loading = true;
      await client.requests.delete({ id });
      await fetchRequests();
    } catch (error) {
      console.error('Failed to delete request:', error);
    } finally {
      loading = false;
    }
  }
  
  async function handleDeleteAll() {
    const confirmed = confirm('Are you sure you want to delete all requests?');
    if (!confirmed) return;
    
    try {
      loading = true;
      await client.requests.deleteAll();
      await fetchRequests();
    } catch (error) {
      console.error('Failed to delete all requests:', error);
    } finally {
      loading = false;
    }
  }
  
  function toggleExpand(id: number) {
    expandedId = expandedId === id ? null : id;
  }
  
  function handlePreviousPage() {
    page = Math.max(0, page - 1);
  }
  
  function handleNextPage() {
    page = page + 1;
  }

</script>

<div class="min-h-screen bg-gray-50 dark:bg-gray-900">
  <div class="max-w-6xl mx-auto p-6">
    <Header
      requestsCount={requests.length}
      {loading}
      onDeleteAll={handleDeleteAll}
    />
    
    {#if !mounted}
      <LoadingState />
    {:else if requests.length === 0}
      <EmptyState />
    {:else}
      <RequestList
        {requests}
        {expandedId}
        {loading}
        onToggleExpand={toggleExpand}
        onDelete={handleDelete}
      />
      
      <Pagination
        {page}
        {loading}
        hasMore={requests.length >= REQUESTS_PER_PAGE}
        onPrevious={handlePreviousPage}
        onNext={handleNextPage}
      />
    {/if}
  </div>
</div>
