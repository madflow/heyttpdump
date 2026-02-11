<script lang="ts">
  let {
    page,
    loading,
    hasMore,
    onPrevious,
    onNext
  }: {
    page: number;
    loading: boolean;
    hasMore: boolean;
    onPrevious: () => void;
    onNext: () => void;
  } = $props();
</script>

<div class="mt-6 flex items-center justify-between">
  <button
    onclick={onPrevious}
    disabled={page === 0 || loading}
    class="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
  >
    Previous
  </button>
  <span class="text-sm text-gray-600 dark:text-gray-400">
    Page {page + 1}
  </span>
  <button
    onclick={onNext}
    disabled={!hasMore || loading}
    class="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
  >
    Next
  </button>
</div>
