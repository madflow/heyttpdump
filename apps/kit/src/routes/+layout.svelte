<script lang="ts">
  import { browser } from "$app/environment";
  import favicon from "$lib/assets/favicon.svg";
  import { setupThemeContext } from "$lib/theme.svelte";
  import "../app.css";

  let { children } = $props();

  if (browser) {
    setupThemeContext();
  }
</script>

<svelte:head>
  <link rel="icon" href={favicon} />
</svelte:head>

{@render children()}
