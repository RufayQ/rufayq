import { useState } from "react";
import { Check, X, ChevronDown } from "lucide-react";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { currencyMaster, type CurrencyCode } from "@/data/currencyMaster";

const GOLD = "#C5965A", BG2 = "#0B1A28", BORDER = "rgba(197,150,90,0.25)", TEXT = "#E8ECF0", MUTED = "rgba(232,236,240,0.6)";

interface Props {
  variant?: "pill" | "inline";
  className?: string;
}

const CurrencySwitcher = ({ variant = "pill", className = "" }: Props) => {
  const { currency, setCurrency, isGccPegged } = useCurrency();
  const { mode } = useLanguage();
  const [open, setOpen] = useState(false);
  const showAr = mode === "ar";

  const codes: CurrencyCode[] = ["SAR", "AED", "EGP", "USD", "EUR"];

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={`inline-flex items-center gap-1.5 text-xs font-mono font-semibold transition-all ${
          variant === "pill" ? "px-3 py-1.5 rounded-full" : "underline"
        } ${className}`}
        style={variant === "pill" ? { background: BG2, border: `1px solid ${BORDER}`, color: TEXT } : { color: GOLD }}
        aria-label="Change currency"
      >
        {currencyMaster[currency].flag} {currency}
        {variant === "pill" && <ChevronDown size={12} />}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4"
          style={{ background: "rgba(6,16,26,0.85)", backdropFilter: "blur(8px)" }}
          onClick={() => setOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-3xl p-6"
            style={{ background: BG2, border: `1px solid ${BORDER}` }}
          >
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="font-display text-xl mb-0.5" style={{ color: TEXT }}>
                  {showAr ? "اختر العملة" : "Choose your currency"}
                </h3>
                <p className="text-[11px]" style={{ color: MUTED }}>
                  {showAr ? "ينطبق على جميع الأسعار" : "Applies to all prices on the site"}
                </p>
              </div>
              <button onClick={() => setOpen(false)} aria-label="Close">
                <X size={18} color={MUTED} />
              </button>
            </div>

            <div className="space-y-2">
              {codes.map((code) => {
                const c = currencyMaster[code];
                const sample = c.tiers.companion.monthly;
                const samplePrice = c.symbolPosition === "before"
                  ? `${c.symbol} ${sample.toLocaleString("en-US")}`
                  : `${sample.toLocaleString("en-US")} ${c.symbol}`;
                const active = currency === code;
                return (
                  <button
                    key={code}
                    onClick={() => { setCurrency(code); setOpen(false); }}
                    className="w-full flex items-center gap-3 p-3 rounded-2xl text-left transition-all hover:scale-[1.01]"
                    style={{
                      background: active ? `${GOLD}14` : "transparent",
                      border: `1px solid ${active ? GOLD : BORDER}`,
                    }}
                  >
                    <span className="text-2xl">{c.flag}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2">
                        <span className="font-mono font-bold text-sm" style={{ color: TEXT }}>{c.code}</span>
                        <span className="text-xs truncate" style={{ color: MUTED }}>
                          {showAr ? c.nameAr : c.nameEn}
                        </span>
                      </div>
                      <p className="text-[11px] mt-0.5" style={{ color: MUTED }}>
                        {showAr ? "كومبانيون" : "Companion"}: <span style={{ color: GOLD }}>{samplePrice}/{showAr ? "شهر" : "mo"}</span>
                      </p>
                    </div>
                    {active && <Check size={16} color={GOLD} />}
                  </button>
                );
              })}
            </div>

            {isGccPegged && (
              <p className="text-[11px] mt-4 p-3 rounded-xl" style={{ color: MUTED, background: `${GOLD}10`, border: `1px solid ${BORDER}` }}>
                {showAr
                  ? "أسعار ر.س تعادل عملتك الخليجية المحلية (مرتبطة بالدولار)."
                  : "SAR prices are equivalent to your local GCC currency (USD-pegged)."}
              </p>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default CurrencySwitcher;
