import { setContext, getContext } from 'svelte';

type Theme = 'light' | 'dark' | 'system';

interface ThemeContext {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  resolvedTheme: 'light' | 'dark';
}

const STORAGE_KEY = 'heyttpdump-theme';
const THEME_CONTEXT_KEY = 'theme';

const THEME_CLASS_DARK = 'dark';
const THEME_CLASS_LIGHT = 'light';

function getSystemTheme(): 'light' | 'dark' {
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? THEME_CLASS_DARK
    : THEME_CLASS_LIGHT;
}

function resolveTheme(theme: Theme): 'light' | 'dark' {
  if (theme === 'system') {
    return getSystemTheme();
  }
  return theme;
}

function applyThemeToDocument(isDark: boolean): void {
  const root = document.documentElement;
  root.classList.remove(THEME_CLASS_LIGHT, THEME_CLASS_DARK);
  root.classList.add(isDark ? THEME_CLASS_DARK : THEME_CLASS_LIGHT);
}

export function setupThemeContext() {
  let theme = $state<Theme>(
    (localStorage.getItem(STORAGE_KEY) as Theme) || 'system'
  );
  let resolvedTheme = $state<'light' | 'dark'>(THEME_CLASS_LIGHT);
  
  $effect(() => {
    const resolved = resolveTheme(theme);
    resolvedTheme = resolved;
    applyThemeToDocument(resolved === THEME_CLASS_DARK);
  });
  
  $effect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = () => {
      if (theme === 'system') {
        const resolved = getSystemTheme();
        resolvedTheme = resolved;
        applyThemeToDocument(resolved === THEME_CLASS_DARK);
      }
    };
    
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  });
  
  function setTheme(newTheme: Theme) {
    localStorage.setItem(STORAGE_KEY, newTheme);
    theme = newTheme;
  }
  
  const context: ThemeContext = {
    get theme() { return theme; },
    setTheme,
    get resolvedTheme() { return resolvedTheme; }
  };
  
  setContext(THEME_CONTEXT_KEY, context);
}

export function getThemeContext(): ThemeContext {
  return getContext(THEME_CONTEXT_KEY);
}
