<script lang="ts">
  let { method }: { method: string } = $props();

  const METHOD_COLORS: Record<string, string> = {
    "GET":
      "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300",
    "POST":
      "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300",
    "PUT":
      "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300",
    "PATCH":
      "bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300",
    "DELETE":
      "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300",
  };

  const DEFAULT_COLOR =
    "bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300";

  function getMethodColor(method: string): string {
    return METHOD_COLORS[method] || DEFAULT_COLOR;
  }
</script>

<span class={`px-3 py-1 rounded text-sm font-medium ${getMethodColor(method)}`}>
  {method}
</span>
