import { useEffect, useState, useCallback } from "react";

/** Theme + font-scale preferences for the admin portal. Persists to localStorage. */
export type AdminTheme = "dark" | "light";
export type AdminFontScale = "sm" | "md" | "lg";

const LS_THEME = "admin.theme";
const LS_FONT = "admin.fontScale";

const FONT_PX: Record<AdminFontScale, string> = { sm: "14px", md: "16px", lg: "18px" };

const apply = (theme: AdminTheme, font: AdminFontScale) => {
  const root = document.documentElement;
  root.classList.toggle("admin-light", theme === "light");
  root.dataset.adminFont = font;
  root.style.setProperty("--admin-font-size", FONT_PX[font]);
};

export const useAdminPrefs = () => {
  const [theme, setThemeState] = useState<AdminTheme>(
    () => (localStorage.getItem(LS_THEME) as AdminTheme) || "dark",
  );
  const [fontScale, setFontScaleState] = useState<AdminFontScale>(
    () => (localStorage.getItem(LS_FONT) as AdminFontScale) || "md",
  );

  useEffect(() => { apply(theme, fontScale); }, [theme, fontScale]);

  const setTheme = useCallback((t: AdminTheme) => {
    localStorage.setItem(LS_THEME, t);
    setThemeState(t);
  }, []);
  const toggleTheme = useCallback(() => setTheme(theme === "dark" ? "light" : "dark"), [theme, setTheme]);

  const setFontScale = useCallback((f: AdminFontScale) => {
    localStorage.setItem(LS_FONT, f);
    setFontScaleState(f);
  }, []);

  return { theme, toggleTheme, setTheme, fontScale, setFontScale };
};
