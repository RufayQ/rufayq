/**
 * Tests for the loading skeletons (shown while async geo-detection is in
 * flight) and the Detection-debug panel (raw signals exposed for triage).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Pricing from "@/pages/Pricing";

const defaultDebug = {
  ipCountry: "SA" as string | null,
  localeCountry: "US" as string | null,
  timezone: "Asia/Riyadh" as string | null,
  timezoneCountry: "SA" as string | null,
  storedCountry: "SA" as string | null,
  storedCurrency: "SAR" as string | null,
  manualCountry: null as string | null,
  manualCurrency: null as string | null,
  perCountryOverride: null as string | null,
  languages: ["en-US", "ar-SA"] as string[],
};

let state = {
  currency: "SAR" as string,
  country: "SA" as string | null,
  countryManual: false,
  detectionSource: "ip" as "manual" | "ip" | "locale" | "timezone" | "stored" | "default",
  geoLoading: false,
  debug: defaultDebug,
};

vi.mock("@/contexts/CurrencyContext", () => ({
  useCurrency: () => ({
    currency: state.currency,
    setCurrency: vi.fn(),
    setCountry: vi.fn(),
    getPrice: () => 100,
    getAddon: () => 50,
    format: (n: number) => `SAR ${n}`,
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

vi.mock("@/components/CurrencySwitcher", () => ({ default: () => <div /> }));
vi.mock("@/components/LanguageSwitcher", () => ({ default: () => <div /> }));
vi.mock("@/components/CountryPicker", () => ({ default: () => <div /> }));
vi.mock("@/components/FamilySetupModal", () => ({ default: () => null }));
vi.mock("@/components/RufayQLogo", () => ({ default: () => <div /> }));
vi.mock("@/seo/Seo", () => ({ Seo: () => null }));

const renderPricing = () =>
  render(<MemoryRouter><Pricing /></MemoryRouter>);

beforeEach(() => {
  cleanup();
  state = {
    currency: "SAR",
    country: "SA",
    countryManual: false,
    detectionSource: "ip",
    geoLoading: false,
    debug: { ...defaultDebug },
  };
});

describe("Loading skeletons", () => {
  it("shows price skeletons for paid tiers while geo is resolving", () => {
    state = { ...state, geoLoading: true, country: null };
    renderPricing();
    expect(screen.getByTestId("price-skeleton-starter")).toBeInTheDocument();
    expect(screen.getByTestId("price-skeleton-companion")).toBeInTheDocument();
    expect(screen.getByTestId("price-skeleton-family")).toBeInTheDocument();
    // Free tier shows real text — never a skeleton.
    expect(screen.queryByTestId("price-skeleton-free")).toBeNull();
  });

  it("shows the detection-note skeleton while geo is resolving and no country known yet", () => {
    state = { ...state, geoLoading: true, country: null };
    renderPricing();
    expect(screen.getByTestId("detection-note-skeleton")).toBeInTheDocument();
    expect(screen.queryByTestId("detection-note")).toBeNull();
  });

  it("hides skeletons once geo resolves (geoLoading=false)", () => {
    renderPricing();
    expect(screen.queryByTestId("price-skeleton-starter")).toBeNull();
    expect(screen.queryByTestId("detection-note-skeleton")).toBeNull();
    expect(screen.getByTestId("detection-note")).toBeInTheDocument();
  });

  it("does NOT show skeletons when the user has manually overridden (no fetch happens)", () => {
    state = { ...state, geoLoading: true, countryManual: true };
    renderPricing();
    expect(screen.queryByTestId("price-skeleton-starter")).toBeNull();
    expect(screen.queryByTestId("detection-note-skeleton")).toBeNull();
  });
});

describe("Detection debug panel", () => {
  it("is collapsed by default and shows a Detection debug toggle", () => {
    renderPricing();
    expect(screen.queryByTestId("detection-debug-panel")).toBeNull();
    const toggle = screen.getByTestId("detection-debug-toggle");
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    expect(toggle.textContent).toMatch(/Detection debug/);
  });

  it("opens the panel and shows every raw signal", () => {
    renderPricing();
    fireEvent.click(screen.getByTestId("detection-debug-toggle"));
    const panel = screen.getByTestId("detection-debug-panel");
    expect(panel).toBeInTheDocument();
    // Spot-check a few keys.
    expect(panel.textContent).toMatch(/source/);
    expect(panel.textContent).toMatch(/country/);
    expect(panel.textContent).toMatch(/debug\.ipCountry/);
    expect(panel.textContent).toMatch(/debug\.timezone/);
    expect(panel.textContent).toMatch(/debug\.languages/);
    expect(panel.textContent).toMatch(/Asia\/Riyadh/);
    expect(panel.textContent).toMatch(/en-US, ar-SA/);
  });

  it("toggles closed on second click", () => {
    renderPricing();
    const toggle = screen.getByTestId("detection-debug-toggle");
    fireEvent.click(toggle);
    expect(screen.getByTestId("detection-debug-panel")).toBeInTheDocument();
    fireEvent.click(toggle);
    expect(screen.queryByTestId("detection-debug-panel")).toBeNull();
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
  });

  it("reflects detectionSource and current country in the panel rows", () => {
    state = { ...state, detectionSource: "timezone", currency: "AED", country: "AE" };
    state.debug = { ...state.debug, ipCountry: null, timezoneCountry: "AE" };
    renderPricing();
    fireEvent.click(screen.getByTestId("detection-debug-toggle"));
    const panel = screen.getByTestId("detection-debug-panel");
    expect(panel.querySelector('[data-debug-key="source"]')?.textContent).toBe("timezone");
    expect(panel.querySelector('[data-debug-key="country"]')?.textContent).toBe("AE");
    expect(panel.querySelector('[data-debug-key="currency"]')?.textContent).toBe("AED");
    expect(panel.querySelector('[data-debug-key="debug.timezoneCountry"]')?.textContent).toBe("AE");
    expect(panel.querySelector('[data-debug-key="debug.ipCountry"]')?.textContent).toBe("—");
  });
});
