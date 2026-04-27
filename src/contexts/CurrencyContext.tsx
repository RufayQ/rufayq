import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  type CurrencyCode, type TierId, type AddOnId,
  currencyMaster, COUNTRY_CURRENCY, GCC_PEGGED_COUNTRIES,
} from "@/data/currencyMaster";

const STORAGE_KEY = "rufayq_currency";
const COUNTRY_KEY = "rufayq_country";
const COUNTRY_OVERRIDE_KEY = "rufayq_country_manual";
const CURRENCY_OVERRIDE_KEY = "rufayq_currency_manual";
/** Per-country currency override map: { "SA": "USD", "AE": "USD" } so that
 * a manual currency choice survives unrelated state changes (e.g. flipping
 * the monthly/annual billing toggle) without leaking across countries. */
const CURRENCY_OVERRIDE_BY_COUNTRY_KEY = "rufayq_currency_override_by_country";

function readCurrencyOverrideMap(): Record<string, CurrencyCode> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(CURRENCY_OVERRIDE_BY_COUNTRY_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}
function writeCurrencyOverrideMap(map: Record<string, CurrencyCode>) {
  try { localStorage.setItem(CURRENCY_OVERRIDE_BY_COUNTRY_KEY, JSON.stringify(map)); } catch { /* */ }
}

interface Ctx {
  currency: CurrencyCode;
  setCurrency: (c: CurrencyCode) => void;
  /** Override detected country and re-map currency. */
  setCountry: (code: string) => void;
  /** Get raw price for tier+period. */
  getPrice: (tier: TierId, period: "monthly" | "annual") => number;
  /** Get raw price for an add-on. */
  getAddon: (id: AddOnId) => number;
  /** Format a number with the active currency symbol/position. */
  format: (n: number) => string;
  /** True if the user is in a GCC country pegged to SAR (KW/QA/BH/OM). */
  isGccPegged: boolean;
  /** Detected/selected country code (e.g. "SA") if available. */
  country: string | null;
  /** Whether the country was manually overridden by the user. */
  countryManual: boolean;
  /** How the current country was determined. */
  detectionSource: "manual" | "ip" | "locale" | "timezone" | "stored" | "default";
}

export type DetectionSource = Ctx["detectionSource"];

const CurrencyContext = createContext<Ctx | null>(null);

/** Locale + timezone country detection (sync, free, instant). */
function detectCountrySyncWithSource(): { code: string | null; source: DetectionSource } {
  if (typeof window === "undefined") return { code: null, source: "default" };

  const manual = localStorage.getItem(COUNTRY_OVERRIDE_KEY);
  if (manual) return { code: manual, source: "manual" };

  const stored = localStorage.getItem(COUNTRY_KEY);
  if (stored) return { code: stored, source: "stored" };

  const langs = navigator.languages?.length ? navigator.languages : [navigator.language];
  for (const lang of langs) {
    const m = lang?.match(/-([A-Z]{2})$/i);
    if (m) return { code: m[1].toUpperCase(), source: "locale" };
  }

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
    if (tzMap[tz]) return { code: tzMap[tz], source: "timezone" };
  } catch { /* ignore */ }
  return { code: null, source: "default" };
}

function detectCountrySync(): string | null {
  return detectCountrySyncWithSource().code;
}

/** Async IP-based country detection. Free, no key. ~50–150ms. */
async function detectCountryFromIp(): Promise<string | null> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 2500);
    // ipwho.is is a free, no-key, CORS-enabled service. Fallback chain.
    const tryEndpoint = async (url: string, field: string) => {
      const r = await fetch(url, { signal: ctrl.signal });
      if (!r.ok) throw new Error(String(r.status));
      const j = await r.json();
      const code = (j?.[field] || "").toString().toUpperCase();
      return code && /^[A-Z]{2}$/.test(code) ? code : null;
    };
    let code: string | null = null;
    try { code = await tryEndpoint("https://ipwho.is/?fields=country_code", "country_code"); } catch { /* */ }
    if (!code) {
      try { code = await tryEndpoint("https://ipapi.co/json/", "country_code"); } catch { /* */ }
    }
    clearTimeout(t);
    return code;
  } catch { return null; }
}

function currencyForCountry(country: string | null): CurrencyCode {
  if (country && COUNTRY_CURRENCY[country]) return COUNTRY_CURRENCY[country];
  return "USD";
}

export const CurrencyProvider = ({ children }: { children: ReactNode }) => {
  const initial = (typeof window !== "undefined")
    ? detectCountrySyncWithSource()
    : { code: null as string | null, source: "default" as DetectionSource };
  const [country, setCountryState] = useState<string | null>(initial.code);
  const [detectionSource, setDetectionSource] = useState<DetectionSource>(initial.source);
  const [countryManual, setCountryManual] = useState<boolean>(() =>
    typeof window !== "undefined" && !!localStorage.getItem(COUNTRY_OVERRIDE_KEY),
  );

  const [currency, setCurrencyState] = useState<CurrencyCode>(() => {
    if (typeof window === "undefined") return "SAR";
    // Per-country override wins so flipping monthly/annual (or any unrelated
    // state) doesn't snap us back to geo-detected pricing.
    if (initial.code) {
      const map = readCurrencyOverrideMap();
      const perCountry = map[initial.code];
      if (perCountry && currencyMaster[perCountry]) return perCountry;
    }
    const manualCur = localStorage.getItem(CURRENCY_OVERRIDE_KEY) as CurrencyCode | null;
    if (manualCur && currencyMaster[manualCur]) return manualCur;
    const stored = localStorage.getItem(STORAGE_KEY) as CurrencyCode | null;
    if (stored && currencyMaster[stored]) return stored;
    return currencyForCountry(detectCountrySync());
  });

  // Async geo-IP refinement on first load (only if user hasn't manually overridden).
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (localStorage.getItem(COUNTRY_OVERRIDE_KEY)) return;
    let alive = true;
    detectCountryFromIp().then((ipCountry) => {
      if (!alive || !ipCountry) return;
      // Only update if it differs from what we have.
      if (ipCountry !== country) {
        setCountryState(ipCountry);
        setDetectionSource("ip");
        try { localStorage.setItem(COUNTRY_KEY, ipCountry); } catch { /* */ }
        // If user hasn't manually picked a currency for this country, snap.
        const map = readCurrencyOverrideMap();
        const perCountry = map[ipCountry];
        if (perCountry && currencyMaster[perCountry]) {
          setCurrencyState(perCountry);
          try { localStorage.setItem(STORAGE_KEY, perCountry); } catch { /* */ }
        } else if (!localStorage.getItem(CURRENCY_OVERRIDE_KEY)) {
          const cur = currencyForCountry(ipCountry);
          setCurrencyState(cur);
          try { localStorage.setItem(STORAGE_KEY, cur); } catch { /* */ }
        }
      } else {
        // Same country — promote source to ip for clarity.
        setDetectionSource((s) => (s === "manual" ? s : "ip"));
      }
    });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setCurrency = useCallback((c: CurrencyCode) => {
    setCurrencyState(c);
    try {
      localStorage.setItem(STORAGE_KEY, c);
      localStorage.setItem(CURRENCY_OVERRIDE_KEY, c);
      // Remember this choice for the current country so unrelated state
      // changes (period toggles, navigations) don't revert it.
      const currentCountry = (typeof window !== "undefined" && localStorage.getItem(COUNTRY_KEY)) || null;
      if (currentCountry) {
        const map = readCurrencyOverrideMap();
        map[currentCountry] = c;
        writeCurrencyOverrideMap(map);
      }
      window.dispatchEvent(new CustomEvent("currencyChanged", { detail: { currency: c } }));
    } catch { /* ignore */ }
  }, []);

  const setCountry = useCallback((code: string) => {
    const upper = code.toUpperCase();
    setCountryState(upper);
    setCountryManual(true);
    setDetectionSource("manual");
    try {
      localStorage.setItem(COUNTRY_KEY, upper);
      localStorage.setItem(COUNTRY_OVERRIDE_KEY, upper);
    } catch { /* */ }
    // Restore per-country currency override if present, else snap to country default.
    const map = readCurrencyOverrideMap();
    const cur = (map[upper] && currencyMaster[map[upper]]) ? map[upper] : currencyForCountry(upper);
    setCurrencyState(cur);
    try {
      localStorage.setItem(STORAGE_KEY, cur);
      localStorage.removeItem(CURRENCY_OVERRIDE_KEY);
    } catch { /* */ }
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
    () => ({ currency, setCurrency, setCountry, getPrice, getAddon, format, isGccPegged, country, countryManual, detectionSource }),
    [currency, setCurrency, setCountry, getPrice, getAddon, format, isGccPegged, country, countryManual, detectionSource],
  );

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
};

export const useCurrency = (): Ctx => {
  const ctx = useContext(CurrencyContext);
  if (!ctx) {
    return {
      currency: "SAR",
      setCurrency: () => {},
      setCountry: () => {},
      getPrice: (t, p) => currencyMaster.SAR.tiers[t][p],
      getAddon: (a) => currencyMaster.SAR.addons[a],
      format: (n) => `SAR ${Math.round(n).toLocaleString("en-US")}`,
      isGccPegged: false,
      country: null,
      countryManual: false,
      detectionSource: "default",
    };
  }
  return ctx;
};
