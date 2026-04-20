import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type LangMode = "en" | "ar" | "both";
const KEY = "rufayq_lang_mode";

interface Ctx {
  mode: LangMode;
  setMode: (m: LangMode) => void;
  showEn: boolean;
  showAr: boolean;
}

const LanguageContext = createContext<Ctx | null>(null);

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [mode, setModeState] = useState<LangMode>(() => {
    if (typeof window === "undefined") return "both";
    return (localStorage.getItem(KEY) as LangMode) || "both";
  });

  const apply = (m: LangMode) => {
    const el = document.documentElement;
    // Keep page direction LTR for app shell; we use data-lang to hide off-language content.
    el.dir = "ltr";
    el.lang = m === "ar" ? "ar" : "en";
    el.setAttribute("data-lang", m);
  };

  const setMode = (m: LangMode) => {
    setModeState(m);
    localStorage.setItem(KEY, m);
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
