import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  type CurrencyCode, type TierId, type AddOnId,
  currencyMaster, COUNTRY_CURRENCY, GCC_PEGGED_COUNTRIES,
} from "@/data/currencyMaster";

const STORAGE_KEY = "rufayq_currency";
const COUNTRY_KEY = "rufayq_country";

interface Ctx {
  currency: CurrencyCode;
  setCurrency: (c: CurrencyCode) => void;
  /** Get raw price for tier+period. */
  getPrice: (tier: TierId, period: "monthly" | "annual") => number;
  /** Get raw price for an add-on. */
  getAddon: (id: AddOnId) => number;
  /** Format a number with the active currency symbol/position. */
  format: (n: number) => string;
  /** True if the user is in a GCC country pegged to SAR (KW/QA/BH/OM). */
  isGccPegged: boolean;
  /** Detected country code (e.g. "SA") if available. */
  country: string | null;
}

const CurrencyContext = createContext<Ctx | null>(null);

/**
 * Browser-locale + timezone-based currency detection (no API, instant, free).
 * Returns ISO-3166 country code or null. Order:
 *   1. Stored country (manual override)
 *   2. Intl.Locale region from navigator.language (e.g. "ar-SA" → "SA")
 *   3. Timezone heuristic (e.g. "Asia/Riyadh" → "SA")
 */
function detectCountry(): string | null {
  if (typeof window === "undefined") return null;

  const stored = localStorage.getItem(COUNTRY_KEY);
  if (stored) return stored;

  // navigator.language → "ar-SA", "en-US", etc.
  const langs = navigator.languages?.length ? navigator.languages : [navigator.language];
  for (const lang of langs) {
    const m = lang?.match(/-([A-Z]{2})$/i);
    if (m) return m[1].toUpperCase();
  }

  // Timezone fallback
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const tzMap: Record<string, string> = {
      "Asia/Riyadh": "SA", "Asia/Mecca": "SA",
      "Asia/Dubai": "AE", "Asia/Muscat": "OM",
      "Asia/Kuwait": "KW", "Asia/Qatar": "QA", "Asia/Bahrain": "BH",
      "Africa/Cairo": "EG",
      "Europe/Berlin": "DE", "Europe/Paris": "FR", "Europe/Rome": "IT",
      "Europe/Madrid": "ES", "Europe/Amsterdam": "NL", "Europe/Vienna": "AT",
      "Europe/Brussels": "BE", "Europe/Dublin": "IE", "Europe/Lisbon": "PT",
    };
    if (tzMap[tz]) return tzMap[tz];
  } catch {
    // ignore
  }
  return null;
}

function detectCurrency(country: string | null): CurrencyCode {
  if (country && COUNTRY_CURRENCY[country]) return COUNTRY_CURRENCY[country];
  return "USD";
}

export const CurrencyProvider = ({ children }: { children: ReactNode }) => {
  const [country] = useState<string | null>(() => detectCountry());

  const [currency, setCurrencyState] = useState<CurrencyCode>(() => {
    if (typeof window === "undefined") return "SAR";
    const stored = localStorage.getItem(STORAGE_KEY) as CurrencyCode | null;
    if (stored && currencyMaster[stored]) return stored;
    return detectCurrency(country);
  });

  const setCurrency = useCallback((c: CurrencyCode) => {
    setCurrencyState(c);
    try {
      localStorage.setItem(STORAGE_KEY, c);
      // Track manual choice (analytics hook point)
      window.dispatchEvent(new CustomEvent("currencyChanged", { detail: { currency: c } }));
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (country) {
      try { localStorage.setItem(COUNTRY_KEY, country); } catch { /* noop */ }
    }
  }, [country]);

  const getPrice = useCallback(
    (tier: TierId, period: "monthly" | "annual") =>
      currencyMaster[currency].tiers[tier][period],
    [currency],
  );

  const getAddon = useCallback(
    (id: AddOnId) => currencyMaster[currency].addons[id],
    [currency],
  );

  const format = useCallback(
    (n: number) => {
      const c = currencyMaster[currency];
      const num = c.decimalPlaces === 0
        ? Math.round(n).toLocaleString("en-US")
        : n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      return c.symbolPosition === "before" ? `${c.symbol} ${num}` : `${num} ${c.symbol}`;
    },
    [currency],
  );

  const isGccPegged = country ? GCC_PEGGED_COUNTRIES.has(country) : false;

  const value = useMemo<Ctx>(
    () => ({ currency, setCurrency, getPrice, getAddon, format, isGccPegged, country }),
    [currency, setCurrency, getPrice, getAddon, format, isGccPegged, country],
  );

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
};

export const useCurrency = (): Ctx => {
  const ctx = useContext(CurrencyContext);
  if (!ctx) {
    // SSR / outside-provider fallback — read-only SAR.
    return {
      currency: "SAR",
      setCurrency: () => {},
      getPrice: (t, p) => currencyMaster.SAR.tiers[t][p],
      getAddon: (a) => currencyMaster.SAR.addons[a],
      format: (n) => `SAR ${Math.round(n).toLocaleString("en-US")}`,
      isGccPegged: false,
      country: null,
    };
  }
  return ctx;
};
