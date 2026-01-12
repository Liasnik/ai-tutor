"use client";

import { useEffect } from "react";
import { useSettingsStore } from "@/store/settings";

export default function ThemeProvider() {
  // Hydration handling
  useEffect(() => {
    useSettingsStore.persist.rehydrate();
  }, []);

  const theme = useSettingsStore((s) => s.theme);

  // Also respond to store changes after hydration
  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [theme]);

  return null;
}
