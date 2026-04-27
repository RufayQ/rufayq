import { forwardRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useLanguage, type LangMode } from "@/contexts/LanguageContext";
import { findRoutePair } from "@/seo/routes";

interface Props {
  compact?: boolean;
  bg?: string;
  border?: string;
  active?: string;
  inactive?: string;
  activeText?: string;
}

/**
 * forwardRef wrapper silences "Function components cannot be given refs"
 * warnings emitted when a parent (e.g. lazy boundary, animation lib) tries
 * to attach a ref to the switcher root.
 */
const LanguageSwitcher = forwardRef<HTMLDivElement, Props>(({
  compact,
  bg = "rgba(11,26,40,0.6)",
  border = "rgba(197,150,90,0.18)",
  active = "#C5965A",
  inactive = "rgba(232,236,240,0.55)",
  activeText = "#06101A",
}, ref) => {
  const { mode, setMode } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();
  const opts: { v: LangMode; label: string }[] = [
    { v: "en", label: "EN" },
    { v: "ar", label: "AR" },
    { v: "both", label: "EN/AR" },
  ];

  const handleClick = (target: LangMode) => {
    // Snapshot scroll so we can restore after route swap (RTL flip can otherwise jump us to top)
    const y = typeof window !== "undefined" ? window.scrollY : 0;
    const hash = typeof window !== "undefined" ? window.location.hash : "";
    const restore = () => {
      // If we have a hash anchor, prefer scrolling to that element (handles late-mounting sections).
      // Otherwise restore the snapshot Y. We poll a couple of frames to let layout settle.
      const anchorId = hash && hash.startsWith("#") ? hash.slice(1) : "";
      let attempts = 0;
      const tick = () => {
        attempts += 1;
        if (anchorId) {
          const el = document.getElementById(anchorId);
          if (el) { el.scrollIntoView({ behavior: "auto", block: "start" }); return; }
          if (attempts < 8) { requestAnimationFrame(tick); return; }
        }
        try { window.scrollTo({ top: y, behavior: "auto" }); } catch { /* noop */ }
      };
      requestAnimationFrame(() => requestAnimationFrame(tick));
    };

    if (target === "both") { setMode("both"); restore(); return; }
    const path = location.pathname;
    const search = location.search || "";
    // hash already captured above for scroll restore
    // Dynamic news pair (not in ROUTES table)
    const isArNews = path === "/ar/news" || path.startsWith("/ar/news/");
    const isEnNews = path === "/news" || path.startsWith("/news/");
    if (isArNews || isEnNews) {
      const pairPath = target === "ar"
        ? (isArNews ? path : "/ar" + path)
        : (isEnNews ? path : path.replace(/^\/ar/, "") || "/");
      if (pairPath !== path) { navigate(pairPath + search + hash); restore(); return; }
    } else {
      const pair = findRoutePair(path);
      if (pair) {
        const targetUrl = target === "ar" ? pair.ar : pair.en;
        if (targetUrl !== path) { navigate(targetUrl + search + hash); restore(); return; }
      }
    }
    setMode(target);
    restore();
  };

  return (
    <div ref={ref} className="flex rounded-full p-0.5" style={{ background: bg, border: `1px solid ${border}` }}>
      {opts.map(o => (
        <button
          key={o.v}
          onClick={() => handleClick(o.v)}
          className={`${compact ? "px-2 py-0.5 text-[9px]" : "px-2.5 py-1 text-[10px]"} rounded-full font-semibold uppercase tracking-wider transition-all`}
          style={{
            background: mode === o.v ? active : "transparent",
            color: mode === o.v ? activeText : inactive,
          }}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
});

LanguageSwitcher.displayName = "LanguageSwitcher";

export default LanguageSwitcher;
