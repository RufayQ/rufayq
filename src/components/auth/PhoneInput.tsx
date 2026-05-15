/**
 * PhoneInput — flag/dial-code chip + national-number field.
 *
 * Auto-detects country on mount via `detectDialCountry()` (locale -> timezone -> SA),
 * but the user can manually override at any time via the chip popover.
 * The selected country is persisted to localStorage so subsequent visits remember it.
 *
 * Composition only — the parent owns both `country` and `national` state and
 * calls `composeE164(country, national)` from `@/lib/auth/phoneEmail` when needed.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Search } from "lucide-react";
import {
  DIAL_COUNTRIES,
  findDialCountry,
  setStoredDialCountry,
} from "@/lib/auth/phoneCountries";

interface Props {
  country: string;
  onCountryChange: (code: string, meta: { manual: boolean }) => void;
  national: string;
  onNationalChange: (value: string) => void;
  isAr?: boolean;
  inputStyle?: React.CSSProperties;
  chipStyle?: React.CSSProperties;
  className?: string;
  placeholder?: string;
  /** Hide the helper text under the field. Defaults to false. */
  hideHelper?: boolean;
  /** True once detection has resolved without a manual override yet. */
  autoDetected?: boolean;
}

const PhoneInput = ({
  country,
  onCountryChange,
  national,
  onNationalChange,
  isAr = false,
  inputStyle,
  chipStyle,
  className,
  placeholder = "5X XXX XXXX",
  hideHelper = false,
  autoDetected = false,
}: Props) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement | null>(null);
  const current = findDialCountry(country);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return DIAL_COUNTRIES;
    return DIAL_COUNTRIES.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.nameAr.includes(q) ||
        c.dial.includes(q) ||
        c.code.toLowerCase().includes(q),
    );
  }, [query]);

  const pick = (code: string) => {
    setStoredDialCountry(code);
    onCountryChange(code, { manual: true });
    setOpen(false);
    setQuery("");
  };

  return (
    <div className={className}>
      <div className="flex gap-2 mt-1" dir={isAr ? "rtl" : "ltr"}>
        <div ref={ref} className="relative">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="h-full px-3 py-3 rounded-xl flex items-center gap-1.5 text-sm whitespace-nowrap"
            style={chipStyle ?? inputStyle}
            aria-label={isAr ? "اختر رمز الدولة" : "Select country code"}
          >
            <span className="text-base leading-none">{current.flag}</span>
            <span className="font-mono">{current.dial}</span>
            <ChevronDown size={14} className="opacity-60" />
          </button>
          {open && (
            <div
              className="absolute z-50 mt-1 w-72 max-h-80 overflow-auto rounded-xl shadow-2xl"
              style={{
                background: "#0B1A28",
                border: "1px solid rgba(197,150,90,0.25)",
                color: "#E8ECF0",
                ...(isAr ? { right: 0 } : { left: 0 }),
              }}
            >
              <div className="sticky top-0 p-2" style={{ background: "#0B1A28", borderBottom: "1px solid rgba(197,150,90,0.18)" }}>
                <div className="flex items-center gap-2 px-2 py-1.5 rounded-md" style={{ background: "rgba(255,255,255,0.04)" }}>
                  <Search size={13} className="opacity-60" />
                  <input
                    autoFocus
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={isAr ? "ابحث…" : "Search…"}
                    className="flex-1 bg-transparent text-xs outline-none"
                  />
                </div>
              </div>
              <ul className="py-1">
                {filtered.map((c) => (
                  <li key={c.code}>
                    <button
                      type="button"
                      onClick={() => pick(c.code)}
                      className={`w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-white/5 ${c.code === country ? "bg-white/5" : ""}`}
                    >
                      <span className="text-base">{c.flag}</span>
                      <span className="flex-1 text-left rtl:text-right">{isAr ? c.nameAr : c.name}</span>
                      <span className="font-mono opacity-70">{c.dial}</span>
                    </button>
                  </li>
                ))}
                {filtered.length === 0 && (
                  <li className="px-3 py-3 text-xs opacity-60">{isAr ? "لا نتائج" : "No results"}</li>
                )}
              </ul>
            </div>
          )}
        </div>
        <input
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          value={national}
          onChange={(e) => onNationalChange(e.target.value.replace(/[^\d\s]/g, ""))}
          placeholder={placeholder}
          className="flex-1 px-4 py-3 rounded-xl outline-none"
          style={inputStyle}
          required
        />
      </div>
      {!hideHelper && autoDetected && (
        <p className="text-[11px] mt-1.5" style={{ color: "rgba(232,236,240,0.5)" }}>
          {isAr ? "تم اكتشافه من منطقتك · يمكنك تغييره" : "Detected from your region · change anytime"}
        </p>
      )}
    </div>
  );
};

export default PhoneInput;
