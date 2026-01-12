"use client";

import { useSettingsStore } from "@/store/settings";
import { Moon, Sun } from "lucide-react";

export default function ThemeToggle() {
  const theme = useSettingsStore((s) => s.theme);
  const toggleTheme = useSettingsStore((s) => s.toggleTheme);

  return (
    <button
      onClick={toggleTheme}
      className="flex gap-2 h-10 items-center justify-start px-3 rounded-lg transition-colors text-color-sidebar-foreground hover:text-white hover:bg-[rgba(0,0,0,0.06)] dark:hover:bg-slate-900 cursor-pointer"
      title={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
    >
      {theme === "dark" ? (
        <Moon className="w-4 h-4" />
      ) : (
        <Sun className="w-4 h-4" />
      )}
      <span className="text-sm">Theme</span>
    </button>
  );
}
