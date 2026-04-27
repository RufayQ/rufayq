/**
 * useLocalizedPath — prefixes /ar to a route path when the active language
 * mode is Arabic. Use for any internal Link/href so the user stays on the
 * Arabic mirror after navigation.
 *
 *   const lp = useLocalizedPath();
 *   <Link to={lp("/pricing")}>...</Link>     // → /pricing or /ar/pricing
 *
 * Routes already prefixed with /ar are passed through unchanged.
 */
import { useCallback } from "react";
import { useLanguage } from "@/contexts/LanguageContext";

export const useLocalizedPath = () => {
  const { mode } = useLanguage();
  return useCallback((enPath: string) => {
    if (mode !== "ar") return enPath;
    if (enPath === "/") return "/ar";
    if (enPath.startsWith("/ar/") || enPath === "/ar") return enPath;
    return `/ar${enPath}`;
  }, [mode]);
};
