import { useMemo, useState } from "react";
import { Globe, Check, X, ChevronDown } from "lucide-react";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { COUNTRY_CURRENCY } from "@/data/currencyMaster";

const GOLD = "#C5965A", BG2 = "#0B1A28", BORDER = "rgba(197,150,90,0.25)", TEXT = "#E8ECF0", MUTED = "rgba(232,236,240,0.6)";

const COUNTRY_NAMES: Record<string, { en: string; ar: string; flag: string }> = {
  SA: { en: "Saudi Arabia", ar: "السعودية", flag: "🇸🇦" },
  AE: { en: "United Arab Emirates", ar: "الإمارات", flag: "🇦🇪" },
  KW: { en: "Kuwait", ar: "الكويت", flag: "🇰🇼" },
  QA: { en: "Qatar", ar: "قطر", flag: "🇶🇦" },
  BH: { en: "Bahrain", ar: "البحرين", flag: "🇧🇭" },
  OM: { en: "Oman", ar: "عُمان", flag: "🇴🇲" },
  EG: { en: "Egypt", ar: "مصر", flag: "🇪🇬" },
  DE: { en: "Germany", ar: "ألمانيا", flag: "🇩🇪" },
  FR: { en: "France", ar: "فرنسا", flag: "🇫🇷" },
  IT: { en: "Italy", ar: "إيطاليا", flag: "🇮🇹" },
  ES: { en: "Spain", ar: "إسبانيا", flag: "🇪🇸" },
  NL: { en: "Netherlands", ar: "هولندا", flag: "🇳🇱" },
  US: { en: "United States", ar: "الولايات المتحدة", flag: "🇺🇸" },
  GB: { en: "United Kingdom", ar: "المملكة المتحدة", flag: "🇬🇧" },
};

const CountryPicker = ({ className = "" }: { className?: string }) => {
  const { country, setCountry } = useCurrency();
  const { mode } = useLanguage();
  const [open, setOpen] = useState(false);
  const showAr = mode === "ar";
  const current = country && COUNTRY_NAMES[country];

  const list = useMemo(() => {
    const codes = Object.keys(COUNTRY_NAMES);
    // Put currency-mapped countries first
    return codes.sort((a, b) => {
      const aMapped = !!COUNTRY_CURRENCY[a];
      const bMapped = !!COUNTRY_CURRENCY[b];
      if (aMapped !== bMapped) return aMapped ? -1 : 1;
      return COUNTRY_NAMES[a].en.localeCompare(COUNTRY_NAMES[b].en);
    });
  }, []);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-mono font-semibold transition-all ${className}`}
        style={{ background: BG2, border: `1px solid ${BORDER}`, color: TEXT }}
        aria-label={showAr ? "تغيير الدولة" : "Change country"}
      >
        <Globe size={11} />
        {current ? `${current.flag} ${country}` : (showAr ? "اختر دولتك" : "Pick country")}
        <ChevronDown size={11} />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4"
          style={{ background: "rgba(6,16,26,0.85)", backdropFilter: "blur(8px)" }}
          onClick={() => setOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-3xl p-6 max-h-[80vh] flex flex-col"
            style={{ background: BG2, border: `1px solid ${BORDER}` }}
          >
            <div className="flex items-center justify-between mb-4 flex-shrink-0">
              <div>
                <h3 className="font-display text-xl mb-0.5" style={{ color: TEXT }}>
                  {showAr ? "اختر دولتك" : "Choose your country"}
                </h3>
                <p className="text-[11px]" style={{ color: MUTED }}>
                  {showAr ? "تُحدَّث العملة تلقائياً" : "Currency will update automatically"}
                </p>
              </div>
              <button onClick={() => setOpen(false)} aria-label="Close"><X size={18} color={MUTED} /></button>
            </div>

            <div className="space-y-1.5 overflow-y-auto pr-1">
              {list.map((code) => {
                const c = COUNTRY_NAMES[code];
                const cur = COUNTRY_CURRENCY[code] || "USD";
                const active = country === code;
                return (
                  <button
                    key={code}
                    onClick={() => { setCountry(code); setOpen(false); }}
                    className="w-full flex items-center gap-3 p-2.5 rounded-xl text-left transition-all hover:scale-[1.01]"
                    style={{
                      background: active ? `${GOLD}14` : "transparent",
                      border: `1px solid ${active ? GOLD : BORDER}`,
                    }}
                  >
                    <span className="text-xl">{c.flag}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm" style={{ color: TEXT }}>{showAr ? c.ar : c.en}</div>
                      <div className="text-[10px]" style={{ color: MUTED }}>{code} · {cur}</div>
                    </div>
                    {active && <Check size={14} color={GOLD} />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default CountryPicker;
