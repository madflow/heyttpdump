import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";

export type Theme = "light" | "dark" | "system";
export interface ThemeContext {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  resolvedTheme: "light" | "dark";
  mounted: boolean;
}
const STORAGE_KEY = "heyttpdump-theme";
const Context = createContext<ThemeContext | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, updateTheme] = useState<Theme>("system");
  const [systemDark, setSystemDark] = useState(false);
  const [mounted, setMounted] = useState(false);
  const resolvedTheme = theme === "system" ? (systemDark ? "dark" : "light") : theme;

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === "light" || saved === "dark" || saved === "system") updateTheme(saved);
    } catch {
      // Themes still work when storage is unavailable.
    }
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => setSystemDark(media.matches);
    handleChange();
    media.addEventListener("change", handleChange);
    setMounted(true);
    return () => media.removeEventListener("change", handleChange);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    document.documentElement.classList.remove("light", "dark");
    document.documentElement.classList.add(resolvedTheme);
  }, [mounted, resolvedTheme]);

  function setTheme(value: Theme) {
    updateTheme(value);
    try {
      localStorage.setItem(STORAGE_KEY, value);
    } catch {
      // Keep the in-memory preference if storage is disabled.
    }
  }

  return (
    <Context.Provider value={{ theme, setTheme, resolvedTheme, mounted }}>
      {children}
    </Context.Provider>
  );
}

export function useTheme(): ThemeContext {
  const context = useContext(Context);
  if (!context) throw new Error("ThemeProvider is required");
  return context;
}
