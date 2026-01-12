"use client";

import { useEffect } from "react";
import { useSettingsStore } from "@/store/settings";

export default function ThemeProvider() {
  const theme = useSettingsStore((s) => s.theme);

  // On mount, try to read persisted theme to avoid hydration races
  useEffect(() => {
    try {
      if (typeof window === "undefined") return;
      const raw = localStorage.getItem("ai-tutor-settings");
      if (raw) {
        const parsed = JSON.parse(raw);
        const persistedTheme = parsed?.state?.theme ?? parsed?.theme;
        const root = document.documentElement;
        if (persistedTheme === "dark") root.classList.add("dark");
        else root.classList.remove("dark");
      }
    } catch (e) {
      // ignore parse errors
    }
  }, []);

  // Also respond to store changes after hydration
  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") root.classList.add("dark");
    else root.classList.remove("dark");
  }, [theme]);

  return null;
}
