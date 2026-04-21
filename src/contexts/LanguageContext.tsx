import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type LangMode = "en" | "ar" | "both";
const KEY = "rufayq_lang_mode";
/** Persisted only when user explicitly toggles via the switcher. */
const KEY_EXPLICIT = "rufayq_lang_mode_explicit";

interface Ctx {
  mode: LangMode;
  setMode: (m: LangMode) => void;
  showEn: boolean;
  showAr: boolean;
}

const LanguageContext = createContext<Ctx | null>(null);

/**
 * Marketing-page-stable initial mode:
 *   - /ar* paths → "ar"
 *   - everything else → "en"
 *   - app-shell paths (/app, /provider, /admin, /auth) honor the user's *explicit*
 *     prior toggle so bilingual mode survives in the patient app.
 *
 * This stops the hero from rendering in "both" mode by default and then re-rendering
 * once the URL-sync effect runs — which was the source of the post-hydration layout
 * shift hurting LCP.
 */
const isAppShell = (p: string) =>
  p === "/app" || p.startsWith("/app/") ||
  p === "/ar/app" || p.startsWith("/ar/app/") ||
  p.startsWith("/provider") || p.startsWith("/admin") || p === "/auth";

const computeInitialMode = (): LangMode => {
  if (typeof window === "undefined") return "en";
  const path = window.location.pathname;
  const isAr = path === "/ar" || path.startsWith("/ar/");
  // App shell: honor explicit user choice if present, else default by route language.
  if (isAppShell(path)) {
    const explicit = localStorage.getItem(KEY_EXPLICIT);
    if (explicit === "1") {
      const stored = localStorage.getItem(KEY) as LangMode | null;
      if (stored === "en" || stored === "ar" || stored === "both") return stored;
    }
    return isAr ? "ar" : "en";
  }
  // Marketing pages: ALWAYS render the route's language on first paint to avoid
  // post-hydration text/layout swap. User can still toggle to "both" after load.
  return isAr ? "ar" : "en";
};

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [mode, setModeState] = useState<LangMode>(computeInitialMode);

  const apply = (m: LangMode) => {
    const el = document.documentElement;
    el.dir = "ltr";
    el.lang = m === "ar" ? "ar" : "en";
    el.setAttribute("data-lang", m);
  };

  const setMode = (m: LangMode) => {
    setModeState(m);
    try {
      localStorage.setItem(KEY, m);
      localStorage.setItem(KEY_EXPLICIT, "1"); // user-driven choice
    } catch { /* ignore quota / private mode */ }
    apply(m);
  };

  useEffect(() => { apply(mode); }, [mode]);

  return (
    <LanguageContext.Provider value={{ mode, setMode, showEn: mode !== "ar", showAr: mode !== "en" }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const ctx = useContext(LanguageContext);
  if (!ctx) return { mode: "both" as LangMode, setMode: () => {}, showEn: true, showAr: true };
  return ctx;
};

interface BiTextProps {
  en: string;
  ar: string;
  separator?: string;
  className?: string;
  arClassName?: string;
}

export const BiText = ({ en, ar, separator = " · ", className, arClassName }: BiTextProps) => {
  const { showEn, showAr } = useLanguage();
  if (showEn && showAr) {
    return (
      <span className={className}>
        {en}
        <span style={{ opacity: 0.6 }}>{separator}</span>
        <span dir="rtl" className={arClassName}>{ar}</span>
      </span>
    );
  }
  if (showAr) return <span dir="rtl" className={arClassName ?? className}>{ar}</span>;
  return <span className={className}>{en}</span>;
};
