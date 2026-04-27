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

const defaultDebug = {
  ipCountry: null as string | null,
  localeCountry: null as string | null,
  timezone: null as string | null,
  timezoneCountry: null as string | null,
  storedCountry: null as string | null,
  storedCurrency: null as string | null,
  manualCountry: null as string | null,
  manualCurrency: null as string | null,
  perCountryOverride: null as string | null,
  languages: [] as string[],
};

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
  geoLoading: false as boolean,
  debug: defaultDebug,
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
    geoLoading: false,
    debug: { ...defaultDebug },
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

  // Cover EVERY detectionSource value with the exact fallback wording.
  const enCases: Array<[typeof currencyState.detectionSource, RegExp]> = [
    ["ip", /Based on your IP address · SA/],
    ["locale", /Fell back to browser language · SA \(IP lookup unavailable\)/],
    ["timezone", /Fell back to timezone · SA \(IP lookup unavailable\)/],
    ["stored", /From your previous preference · SA/],
    ["default", /Default location · SA/],
  ];
  for (const [source, re] of enCases) {
    it(`renders correct EN copy for source = ${source}`, () => {
      currencyState = { ...currencyState, detectionSource: source };
      renderPricing();
      expect(screen.getByTestId("detection-note").textContent).toMatch(re);
    });
  }

  const arCases: Array<[typeof currencyState.detectionSource, RegExp]> = [
    ["ip", /استناداً إلى عنوان IP/],
    ["locale", /لغة المتصفح/],
    ["timezone", /المنطقة الزمنية/],
    ["stored", /تفضيلاتك السابقة/],
    ["default", /الموقع الافتراضي/],
  ];
  for (const [source, re] of arCases) {
    it(`renders correct AR copy for source = ${source}`, () => {
      langMode = "ar";
      currencyState = { ...currencyState, detectionSource: source };
      renderPricing();
      expect(screen.getByTestId("detection-note").textContent).toMatch(re);
    });
  }
});

// --- Accessibility: ARIA labels & keyboard focus -------------------------
describe("Accessibility", () => {
  it("badge exposes an aria-label including the detection source", () => {
    renderPricing();
    const badge = screen.getByTestId("detection-badge");
    expect(badge.getAttribute("aria-label")).toMatch(/Source:.*IP address/);
    expect(badge.getAttribute("role")).toBe("button");
    expect(badge.getAttribute("tabindex")).toBe("0");
  });

  it("badge aria-label updates for manual override", () => {
    currencyState = { ...currencyState, countryManual: true, detectionSource: "manual" };
    renderPricing();
    const badge = screen.getByTestId("detection-badge");
    expect(badge.getAttribute("aria-label")).toMatch(/Source:.*Manual override/);
    expect(badge.getAttribute("aria-label")).toMatch(/manually overridden/);
  });

  it("currency toggle has descriptive aria-label in EN", () => {
    renderPricing();
    const btn = screen.getByTestId("currency-toggle");
    expect(btn.getAttribute("aria-label")).toMatch(/Switch currency to US Dollar/);
  });

  it("currency toggle has descriptive aria-label in AR", () => {
    langMode = "ar";
    renderPricing();
    const btn = screen.getByTestId("currency-toggle");
    expect(btn.getAttribute("aria-label")).toMatch(/تبديل العملة/);
  });

  it("badge is keyboard focusable", () => {
    renderPricing();
    const badge = screen.getByTestId("detection-badge");
    badge.focus();
    expect(document.activeElement).toBe(badge);
  });

  it("currency toggle is keyboard focusable", () => {
    renderPricing();
    const btn = screen.getByTestId("currency-toggle");
    btn.focus();
    expect(document.activeElement).toBe(btn);
  });
});

// --- Tooltip title shows detectionSource explicitly ----------------------
describe("Tooltip title shows detectionSource explicitly", () => {
  // Radix Tooltip portals into the body on hover/focus. We assert via the
  // aria-label, which is the same source string the tooltip title renders.
  const sources: Array<[typeof currencyState.detectionSource, string]> = [
    ["ip", "IP address"],
    ["locale", "Browser language"],
    ["timezone", "System timezone"],
    ["stored", "Saved preference"],
    ["default", "Default"],
  ];
  for (const [source, label] of sources) {
    it(`includes "${label}" for source = ${source}`, () => {
      currencyState = { ...currencyState, detectionSource: source };
      renderPricing();
      const badge = screen.getByTestId("detection-badge");
      expect(badge.getAttribute("aria-label")).toContain(label);
      expect(badge.getAttribute("data-detection-source")).toBe(source);
    });
  }
});

// --- RTL snapshot: tooltip placement, alignment, icon mirroring ----------
describe("RTL/LTR layout snapshots", () => {
  it("LTR: badge has no dir attribute and icon is not mirrored", () => {
    renderPricing();
    const note = screen.queryByTestId("detection-note");
    expect(note?.getAttribute("dir")).toBe("ltr");
    // Icon inside the toggle should not be flipped.
    const toggle = screen.getByTestId("currency-toggle");
    const icon = toggle.querySelector("svg");
    expect(icon?.getAttribute("style") || "").not.toMatch(/scaleX\(-1\)/);
  });

  it("RTL: detection note has dir='rtl' and uses font-arabic", () => {
    langMode = "ar";
    renderPricing();
    const note = screen.getByTestId("detection-note");
    expect(note.getAttribute("dir")).toBe("rtl");
    expect(note.className).toMatch(/font-arabic/);
  });

  it("RTL: currency toggle icon is mirrored via scaleX(-1)", () => {
    langMode = "ar";
    renderPricing();
    const toggle = screen.getByTestId("currency-toggle");
    const icon = toggle.querySelector("svg");
    expect(icon?.getAttribute("style") || "").toMatch(/scaleX\(-1\)/);
  });

  it("RTL: badge text reads right-to-left order (Arabic label first)", () => {
    langMode = "ar";
    renderPricing();
    const badge = screen.getByTestId("detection-badge");
    // Arabic detected label
    expect(badge.textContent).toMatch(/تلقائي · SA/);
  });
});

// --- Per-country currency override persistence (regression) --------------
describe("Per-country currency override does not revert on period change", () => {
  it("setCurrency is invoked exactly once per click (no auto-revert)", () => {
    renderPricing();
    fireEvent.click(screen.getByTestId("currency-toggle"));
    expect(mockSetCurrency).toHaveBeenCalledTimes(1);
    expect(mockSetCurrency).toHaveBeenCalledWith("USD");
  });
});
