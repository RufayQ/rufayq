/**
 * Regression test: when a user manually overrides the currency for their
 * country (via the local↔USD toggle), the chosen currency must remain locked
 * across monthly/annual period flips. Both the displayed prices and the
 * Detected/Manual badge currency context must stay aligned.
 *
 * We model the real behaviour of CurrencyContext: setCurrency persists the
 * choice into a per-country override map, so subsequent reads return that
 * currency even if other state (period) changes.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, cleanup, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Pricing from "@/pages/Pricing";

// --- Mock hooks ---------------------------------------------------------
const defaultDebug = {
  ipCountry: "SA" as string | null,
  localeCountry: null as string | null,
  timezone: null as string | null,
  timezoneCountry: null as string | null,
  storedCountry: "SA" as string | null,
  storedCurrency: "SAR" as string | null,
  manualCountry: null as string | null,
  manualCurrency: null as string | null,
  perCountryOverride: null as string | null,
  languages: ["en-US"] as string[],
};

interface FakeState {
  currency: string;
  country: string | null;
  countryManual: boolean;
  detectionSource: "manual" | "ip" | "locale" | "timezone" | "stored" | "default";
  geoLoading: boolean;
  debug: typeof defaultDebug;
}

let state: FakeState;

// Pricing differs by currency so we can detect a swap on screen.
const PRICE_TABLE: Record<string, Record<"monthly" | "annual", number>> = {
  SAR: { monthly: 99, annual: 990 },
  USD: { monthly: 25, annual: 250 },
};

const setCurrency = vi.fn((c: string) => {
  // Mimic real context: persisting the choice flips countryManual to false
  // (currency override is independent of country override) but the chosen
  // currency stays sticky regardless of unrelated state changes.
  state = { ...state, currency: c };
  state.debug = { ...state.debug, perCountryOverride: c, manualCurrency: c };
});

vi.mock("@/contexts/CurrencyContext", () => ({
  useCurrency: () => ({
    currency: state.currency,
    setCurrency,
    setCountry: vi.fn(),
    getPrice: (_t: string, p: "monthly" | "annual") => PRICE_TABLE[state.currency][p],
    getAddon: () => 50,
    format: (n: number) => `${state.currency} ${n}`,
    isGccPegged: false,
    country: state.country,
    countryManual: state.countryManual,
    detectionSource: state.detectionSource,
    geoLoading: state.geoLoading,
    debug: state.debug,
  }),
  CurrencyProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("@/contexts/LanguageContext", () => ({
  useLanguage: () => ({ mode: "en", setMode: () => {}, showEn: true, showAr: false }),
  BiText: ({ en }: { en: string; ar: string }) => <span>{en}</span>,
  LanguageProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("@/components/CurrencySwitcher", () => ({ default: () => <div data-testid="currency-switcher" /> }));
vi.mock("@/components/LanguageSwitcher", () => ({ default: () => <div data-testid="lang-switcher" /> }));
vi.mock("@/components/CountryPicker", () => ({ default: () => <div data-testid="country-picker" /> }));
vi.mock("@/components/FamilySetupModal", () => ({ default: () => null }));
vi.mock("@/components/RufayQLogo", () => ({ default: () => <div /> }));
vi.mock("@/seo/Seo", () => ({ Seo: () => null }));

const renderPricing = () =>
  render(
    <MemoryRouter>
      <Pricing />
    </MemoryRouter>,
  );

const clickPeriod = (label: RegExp) => {
  const btn = screen.getAllByRole("button").find((b) => label.test(b.textContent ?? ""));
  if (!btn) throw new Error(`No period button matching ${label}`);
  fireEvent.click(btn);
};

const visiblePrices = () =>
  screen.getAllByText(/^(SAR|USD) \d+/i).map((el) => el.textContent ?? "");

beforeEach(() => {
  cleanup();
  setCurrency.mockClear();
  state = {
    currency: "SAR",
    country: "SA",
    countryManual: false,
    detectionSource: "ip",
    geoLoading: false,
    debug: { ...defaultDebug },
  };
});

describe("Manually overridden currency stays locked across monthly/annual toggles", () => {
  it("EN: prices render in USD after override and stay USD when flipping to annual then back", () => {
    const { rerender } = renderPricing();

    // Sanity: starts in SAR.
    expect(visiblePrices().some((t) => t.startsWith("SAR"))).toBe(true);
    expect(visiblePrices().every((t) => !t.startsWith("USD"))).toBe(true);

    // 1) User overrides to USD via the quick toggle.
    fireEvent.click(screen.getByTestId("currency-toggle"));
    expect(setCurrency).toHaveBeenCalledWith("USD");
    rerender(
      <MemoryRouter>
        <Pricing />
      </MemoryRouter>,
    );
    expect(visiblePrices().some((t) => t.startsWith("USD"))).toBe(true);
    expect(visiblePrices().every((t) => !t.startsWith("SAR"))).toBe(true);

    // 2) Flip to annual — prices must remain USD.
    clickPeriod(/Annual/);
    rerender(
      <MemoryRouter>
        <Pricing />
      </MemoryRouter>,
    );
    expect(visiblePrices().every((t) => !t.startsWith("SAR"))).toBe(true);
    const annual = visiblePrices().filter((t) => t.startsWith("USD"));
    expect(annual.length).toBeGreaterThan(0);
    // Annual values come from the USD column of the price table.
    expect(annual.some((t) => t.includes("250"))).toBe(true);

    // 3) Flip back to monthly — still USD, never reverts to SAR.
    clickPeriod(/Monthly/);
    rerender(
      <MemoryRouter>
        <Pricing />
      </MemoryRouter>,
    );
    expect(visiblePrices().every((t) => !t.startsWith("SAR"))).toBe(true);
    const monthly = visiblePrices().filter((t) => t.startsWith("USD"));
    expect(monthly.some((t) => t.includes("25"))).toBe(true);
  });

  it("Detection badge stays anchored to the same country across period flips", () => {
    const { rerender } = renderPricing();
    fireEvent.click(screen.getByTestId("currency-toggle"));
    rerender(
      <MemoryRouter>
        <Pricing />
      </MemoryRouter>,
    );

    expect(within(screen.getByTestId("detection-badge")).getByText(/SA/)).toBeInTheDocument();

    clickPeriod(/Annual/);
    rerender(<MemoryRouter><Pricing /></MemoryRouter>);
    expect(within(screen.getByTestId("detection-badge")).getByText(/SA/)).toBeInTheDocument();

    clickPeriod(/Monthly/);
    rerender(<MemoryRouter><Pricing /></MemoryRouter>);
    expect(within(screen.getByTestId("detection-badge")).getByText(/SA/)).toBeInTheDocument();
  });

  it("setCurrency is NOT re-called on period changes (no auto-revert side effect)", () => {
    renderPricing();
    fireEvent.click(screen.getByTestId("currency-toggle"));
    expect(setCurrency).toHaveBeenCalledTimes(1);
    setCurrency.mockClear();

    clickPeriod(/Annual/);
    clickPeriod(/Monthly/);
    clickPeriod(/Annual/);
    expect(setCurrency).not.toHaveBeenCalled();
  });
});
