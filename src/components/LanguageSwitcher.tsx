import { forwardRef } from "react";
import { useLanguage, type LangMode } from "@/contexts/LanguageContext";

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
  const opts: { v: LangMode; label: string }[] = [
    { v: "en", label: "EN" },
    { v: "ar", label: "AR" },
    { v: "both", label: "EN/AR" },
  ];
  return (
    <div ref={ref} className="flex rounded-full p-0.5" style={{ background: bg, border: `1px solid ${border}` }}>
      {opts.map(o => (
        <button
          key={o.v}
          onClick={() => setMode(o.v)}
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
