import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "#lib/theme.tsx";

const options = [
  { value: "light", icon: Sun, label: "Light" },
  { value: "dark", icon: Moon, label: "Dark" },
  { value: "system", icon: Monitor, label: "System" },
] as const;

export default function ThemeToggle() {
  const context = useTheme();
  if (!context.mounted) return null;
  return (
    <div className="flex items-center gap-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-1">
      {options.map(({ value, icon: Icon, label }) => (
        <button
          key={value}
          onClick={() => context.setTheme(value)}
          className={`flex items-center justify-center rounded p-1.5 transition-colors ${
            context.theme === value
              ? "bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50"
          }`}
          title={label}
          aria-label={`Switch to ${label} theme`}
        >
          <Icon className="w-4 h-4" />
        </button>
      ))}
    </div>
  );
}
