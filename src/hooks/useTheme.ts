import { useEffect, useCallback } from "react";

type Theme = "light" | "dark" | "system";

const getStoredTheme = (): Theme => {
  try {
    const settings = JSON.parse(localStorage.getItem("rufayq_settings") || "{}");
    return settings.theme ?? "light";
  } catch {
    return "light";
  }
};

const applyTheme = (theme: Theme) => {
  const root = document.documentElement;
  root.classList.add("theme-transition");
  if (theme === "system") {
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    root.classList.toggle("dark", prefersDark);
  } else {
    root.classList.toggle("dark", theme === "dark");
  }
  // Remove transition class after animation completes to avoid interfering with other transitions
  setTimeout(() => root.classList.remove("theme-transition"), 450);
};

export const useTheme = () => {
  useEffect(() => {
    applyTheme(getStoredTheme());

    // Listen for localStorage changes (from Settings screen)
    const onStorage = () => applyTheme(getStoredTheme());
    window.addEventListener("storage", onStorage);

    // Listen for system theme changes when set to "system"
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onSystemChange = () => {
      if (getStoredTheme() === "system") applyTheme("system");
    };
    mq.addEventListener("change", onSystemChange);

    return () => {
      window.removeEventListener("storage", onStorage);
      mq.removeEventListener("change", onSystemChange);
    };
  }, []);

  const refresh = useCallback(() => applyTheme(getStoredTheme()), []);
  return { refresh };
};
