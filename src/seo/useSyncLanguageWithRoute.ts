import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { findRoutePair } from "./routes";

/**
 * Auto-syncs the global LanguageContext mode with the URL.
 *   /ar/*   → mode "ar"
 *   /*      → mode "en"
 * Runs once on mount + on every route change. Does NOT override user's manual
 * "both" choice on bilingual app screens (e.g. /app, /provider/*) because those
 * routes don't appear in the bilingual ROUTES table.
 */
export const useSyncLanguageWithRoute = () => {
  const location = useLocation();
  const { mode, setMode } = useLanguage();

  useEffect(() => {
    const pair = findRoutePair(location.pathname);
    if (!pair) return; // app shell, not a marketing page — leave user's preference intact
    if (pair.lang === "ar" && mode !== "ar") setMode("ar");
    if (pair.lang === "en" && mode === "ar") setMode("en");
    // mode "both" on a marketing page → respect user's explicit toggle, don't force
  }, [location.pathname, mode, setMode]);
};
