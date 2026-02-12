<script lang="ts">
  import { browser } from "$app/environment";
  import { Monitor, Moon, Sun } from "@lucide/svelte";
  import { getThemeContext } from "$lib/theme.svelte";

  const themeContext = browser ? getThemeContext() : null;

  const options = [
    { value: "light" as const, icon: Sun, label: "Light" },
    { value: "dark" as const, icon: Moon, label: "Dark" },
    { value: "system" as const, icon: Monitor, label: "System" },
  ];
</script>

{#if themeContext}
  <div
    class="flex items-center gap-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-1"
  >
    {#each options as option}
      {@const Icon = option.icon}
      <button
        onclick={() => themeContext.setTheme(option.value)}
        class={`
          flex items-center justify-center rounded p-1.5 transition-colors
          ${
          themeContext.theme === option.value
            ? "bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50"
        }
        `}
        title={option.label}
        aria-label={`Switch to ${option.label} theme`}
      >
        <Icon class="w-4 h-4" />
      </button>
    {/each}
  </div>
{/if}
