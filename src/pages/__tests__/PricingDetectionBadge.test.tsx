/**
 * Tests for the Pricing page Detected/Manual badge, the local↔USD quick toggle,
 * and the inline detection-source note. We mount only a small slice of the
 * Pricing UI by mocking the useCurrency / useLanguage hooks so we can drive
 * different states (manual vs detected, AR vs EN, IP fallback, etc.) without
 * pulling in the full page tree.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Pricing from "@/pages/Pricing";

// --- Hook mocks ----------------------------------------------------------
const mockSetCurrency = vi.fn();

let currencyState = {
  currency: "SAR" as string,
  setCurrency: mockSetCurrency,
  setCountry: vi.fn(),
  getPrice: () => 100,
  getAddon: () => 50,
  format: (n: number) => `SAR ${n}`,
  isGccPegged: false,
  country: "SA" as string | null,
  countryManual: false,
  detectionSource: "ip" as "manual" | "ip" | "locale" | "timezone" | "stored" | "default",
};

let langMode: "en" | "ar" | "both" = "en";

vi.mock("@/contexts/CurrencyContext", () => ({
  useCurrency: () => currencyState,
  CurrencyProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("@/contexts/LanguageContext", () => ({
  useLanguage: () => ({ mode: langMode, setMode: () => {}, showEn: langMode !== "ar", showAr: langMode !== "en" }),
  BiText: ({ en, ar }: { en: string; ar: string }) => <span>{langMode === "ar" ? ar : en}</span>,
  LanguageProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Lightweight stubs for heavy children we don't care about here.
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

beforeEach(() => {
  cleanup();
  mockSetCurrency.mockReset();
  langMode = "en";
  currencyState = {
    ...currencyState,
    currency: "SAR",
    country: "SA",
    countryManual: false,
    detectionSource: "ip",
  };
});

// --- Detected/Manual badge -----------------------------------------------
describe("Detected/Manual badge", () => {
  it("shows 'Detected · SA' when geo-detected (EN)", () => {
    renderPricing();
    const badge = screen.getByTestId("detection-badge");
    expect(badge.textContent).toMatch(/Detected · SA/);
  });

  it("shows 'Manual · SA' when user overrode the country (EN)", () => {
    currencyState = { ...currencyState, countryManual: true };
    renderPricing();
    expect(screen.getByTestId("detection-badge").textContent).toMatch(/Manual · SA/);
  });

  it("renders Arabic label when language switches to AR", () => {
    langMode = "ar";
    renderPricing();
    const badge = screen.getByTestId("detection-badge");
    expect(badge.textContent).toMatch(/تلقائي · SA/);
  });

  it("hides the badge when no country is known", () => {
    currencyState = { ...currencyState, country: null };
    renderPricing();
    expect(screen.queryByTestId("detection-badge")).toBeNull();
  });
});

// --- Local ↔ USD toggle --------------------------------------------------
describe("Local ↔ USD currency toggle", () => {
  it("shows 'Show in USD' when currency is local (SAR)", () => {
    renderPricing();
    expect(screen.getByTestId("currency-toggle").textContent).toMatch(/Show in USD/);
  });

  it("shows 'Show in SAR' when currency is USD", () => {
    currencyState = { ...currencyState, currency: "USD" };
    renderPricing();
    expect(screen.getByTestId("currency-toggle").textContent).toMatch(/Show in SAR/);
  });

  it("calls setCurrency('USD') when toggling from local", () => {
    renderPricing();
    fireEvent.click(screen.getByTestId("currency-toggle"));
    expect(mockSetCurrency).toHaveBeenCalledWith("USD");
  });

  it("calls setCurrency with local currency when toggling from USD", () => {
    currencyState = { ...currencyState, currency: "USD" };
    renderPricing();
    fireEvent.click(screen.getByTestId("currency-toggle"));
    expect(mockSetCurrency).toHaveBeenCalledWith("SAR");
  });

  it("renders Arabic label when AR is active", () => {
    langMode = "ar";
    renderPricing();
    expect(screen.getByTestId("currency-toggle").textContent).toMatch(/عرض بالدولار|عرض بـ SAR/);
  });

  it("is hidden when country currency is USD (no swap needed)", () => {
    currencyState = { ...currencyState, country: "US" };
    renderPricing();
    expect(screen.queryByTestId("currency-toggle")).toBeNull();
  });
});

// --- Inline detection-source note ---------------------------------------
describe("Inline detection note", () => {
  it("shows the IP-based message when source = 'ip' (EN)", () => {
    renderPricing();
    expect(screen.getByTestId("detection-note").textContent).toMatch(/Based on your IP address · SA/);
  });

  it("shows the locale fallback message when source = 'locale'", () => {
    currencyState = { ...currencyState, detectionSource: "locale" };
    renderPricing();
    expect(screen.getByTestId("detection-note").textContent).toMatch(/browser language · SA \(IP lookup unavailable\)/);
  });

  it("shows the timezone fallback message when source = 'timezone'", () => {
    currencyState = { ...currencyState, detectionSource: "timezone" };
    renderPricing();
    expect(screen.getByTestId("detection-note").textContent).toMatch(/timezone · SA \(IP lookup unavailable\)/);
  });

  it("renders Arabic note when AR is active", () => {
    langMode = "ar";
    currencyState = { ...currencyState, detectionSource: "locale" };
    renderPricing();
    const note = screen.getByTestId("detection-note");
    expect(note.textContent).toMatch(/لغة المتصفح/);
    expect(note.getAttribute("dir")).toBe("rtl");
  });

  it("is hidden when the user has manually overridden the country", () => {
    currencyState = { ...currencyState, countryManual: true };
    renderPricing();
    expect(screen.queryByTestId("detection-note")).toBeNull();
  });
});
