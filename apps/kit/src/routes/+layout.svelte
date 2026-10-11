<script lang="ts">
  import { browser } from "$app/env";
  import favicon from "#lib/assets/favicon.svg";
  import { setupThemeContext } from "#lib/theme.svelte.ts";
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
