<script lang="ts">
  let { headers, body }: {
    headers: Record<string, string>;
    body?: string;
  } = $props();

  function isJsonContentType(headers: Record<string, string>): boolean {
    const contentType = Object.entries(headers).find(
      ([key]) => key.toLowerCase() === "content-type",
    )?.[1];
    return contentType?.includes("application/json") ?? false;
  }

  function formatBody(body: string | undefined): string {
    if (!body) return "";

    if (isJsonContentType(headers)) {
      try {
        const parsed = JSON.parse(body);
        return JSON.stringify(parsed, null, 2);
      } catch {
        return body;
      }
    }

    return body;
  }

  let formattedBody = $derived(formatBody(body));
</script>

<div class="mt-4 space-y-3 border-t border-gray-100 dark:border-gray-700 pt-3">
  <div>
    <h4 class="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
      Headers
    </h4>
    <pre
      class="text-xs bg-gray-50 dark:bg-gray-900 p-3 rounded overflow-x-auto text-gray-600 dark:text-gray-400"
    >{JSON.stringify(headers, null, 2)}</pre>
  </div>
  {#if body}
    <div>
      <h4 class="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
        Body
      </h4>
      <pre
        class="text-xs bg-gray-50 dark:bg-gray-900 p-3 rounded overflow-x-auto text-gray-600 dark:text-gray-400"
      >{formattedBody}</pre>
    </div>
  {/if}
</div>
