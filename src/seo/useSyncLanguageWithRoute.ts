import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { findRoutePair } from "./routes";

/**
 * Auto-syncs the global LanguageContext mode with the URL on marketing routes.
 * Marketing pages must render in a single language on first paint (no "both")
 * so initial HTML matches the hydrated React tree — see LanguageContext for
 * the matching synchronous initial mode.
 *
 * App-shell paths (/app, /provider/*, /admin, /auth) are NOT in the bilingual
 * ROUTES table and keep the user's explicit "both"/"en"/"ar" preference.
 */
export const useSyncLanguageWithRoute = () => {
  const location = useLocation();
  const { mode, setMode } = useLanguage();

  useEffect(() => {
    const pair = findRoutePair(location.pathname);
    if (!pair) return; // app shell — leave user's preference intact
    // Marketing route: lock to that route's language unless the user has manually
    // toggled to "both" *on this same route* via the switcher (setMode persists it).
    // We accept "both" only if it was already set by the user explicitly; otherwise
    // we hard-set to the route's language to avoid layout-shift on hydration.
    if (pair.lang === "ar" && mode === "en") setMode("ar");
    if (pair.lang === "en" && mode === "ar") setMode("en");
  }, [location.pathname, mode, setMode]);
};
