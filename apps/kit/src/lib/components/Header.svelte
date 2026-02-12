<script lang="ts">
  import ThemeToggle from "./ThemeToggle.svelte";

  let {
    requestsCount,
    loading,
    onDeleteAll,
  }: {
    requestsCount: number;
    loading: boolean;
    onDeleteAll: () => void;
  } = $props();
</script>

<div class="mb-6 flex items-center justify-between">
  <h1 class="text-2xl font-bold text-gray-900 dark:text-gray-100">
    HTTP Requests
  </h1>
  <div class="flex items-center gap-4">
    <ThemeToggle />
    <button
      onclick={onDeleteAll}
      disabled={loading || requestsCount === 0}
      class="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      Delete All
    </button>
  </div>
</div>
