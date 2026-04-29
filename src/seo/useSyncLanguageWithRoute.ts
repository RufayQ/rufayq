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
    // Dynamic news routes (/news/:slug, /ar/news/:slug) aren't in the static
    // ROUTES table — detect them by prefix so language follows the URL when the
    // user clicks the EN↔AR pair link inside an article.
    let lang: "en" | "ar" | null = pair?.lang ?? null;
    if (!lang) {
      if (location.pathname === "/ar/news" || location.pathname.startsWith("/ar/news/")) lang = "ar";
      else if (location.pathname === "/news" || location.pathname.startsWith("/news/")) lang = "en";
    }
    if (!lang) return; // app shell — leave user's preference intact
    if (mode !== lang) setMode(lang);
  }, [location.pathname, mode, setMode]);
};
