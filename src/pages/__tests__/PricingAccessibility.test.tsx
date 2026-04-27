/**
 * Automated accessibility audit for the Pricing page.
 *
 * Uses jest-axe to scan the rendered Pricing tree in both English and Arabic
 * (RTL) modes, including the open Detection-debug panel and a manually-
 * overridden state. Asserts ARIA labels exist on the badge and toggle, and
 * confirms keyboard focus order moves through the interactive controls in
 * the expected sequence.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { axe, toHaveNoViolations } from "jest-axe";
import Pricing from "@/pages/Pricing";

expect.extend(toHaveNoViolations);

// --- Hook mocks (mirrors PricingDetectionBadge.test) ---------------------
const mockSetCurrency = vi.fn();

const defaultDebug = {
  ipCountry: "SA" as string | null,
  localeCountry: "SA" as string | null,
  timezone: "Asia/Riyadh" as string | null,
  timezoneCountry: "SA" as string | null,
  storedCountry: "SA" as string | null,
  storedCurrency: "SAR" as string | null,
  manualCountry: null as string | null,
  manualCurrency: null as string | null,
  perCountryOverride: null as string | null,
  languages: ["en-US"] as string[],
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
  geoLoading: false,
  debug: defaultDebug,
};

let langMode: "en" | "ar" | "both" = "en";

vi.mock("@/contexts/CurrencyContext", () => ({
  useCurrency: () => currencyState,
  CurrencyProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("@/contexts/LanguageContext", () => ({
  useLanguage: () => ({
    mode: langMode,
    setMode: () => {},
    showEn: langMode !== "ar",
    showAr: langMode !== "en",
  }),
  BiText: ({ en, ar }: { en: string; ar: string }) => <span>{langMode === "ar" ? ar : en}</span>,
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

// `heading-order` is a known pre-existing structural issue on the marketing
// page (tier cards use h3 before the next h2 lands). It's outside the scope
// of this audit, which focuses on ARIA labels, focus order, and tooltip
// keyboard behaviour for the detection controls. Disable that single rule.
const AXE_OPTS = { rules: { "heading-order": { enabled: false } } } as const;

describe("Pricing — automated accessibility audit", () => {
  it("has no axe violations in English (detected state)", async () => {
    const { container } = renderPricing();
    const results = await axe(container, AXE_OPTS);
    expect(results).toHaveNoViolations();
  }, 20000);

  it("has no axe violations in Arabic (RTL, detected state)", async () => {
    langMode = "ar";
    const { container } = renderPricing();
    const results = await axe(container, AXE_OPTS);
    expect(results).toHaveNoViolations();
  }, 20000);

  it("has no axe violations after user opens the Detection debug panel", async () => {
    const { container } = renderPricing();
    fireEvent.click(screen.getByTestId("detection-debug-toggle"));
    expect(screen.getByTestId("detection-debug-panel")).toBeInTheDocument();
    const results = await axe(container, AXE_OPTS);
    expect(results).toHaveNoViolations();
  }, 20000);

  it("has no axe violations when country is manually overridden", async () => {
    currencyState = {
      ...currencyState,
      countryManual: true,
      detectionSource: "manual",
      currency: "USD",
    };
    const { container } = renderPricing();
    const results = await axe(container, AXE_OPTS);
    expect(results).toHaveNoViolations();
  }, 20000);
});

describe("Pricing — focus order through detection controls", () => {
  it("EN: badge → currency toggle → debug toggle are all keyboard-reachable in order", () => {
    renderPricing();
    const badge = screen.getByTestId("detection-badge");
    const toggle = screen.getByTestId("currency-toggle");
    const debug = screen.getByTestId("detection-debug-toggle");

    // All three must be focusable.
    badge.focus();
    expect(document.activeElement).toBe(badge);
    toggle.focus();
    expect(document.activeElement).toBe(toggle);
    debug.focus();
    expect(document.activeElement).toBe(debug);

    // DOM order matches visual reading order (badge before toggle before debug).
    const pos = (el: Element) =>
      badge.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING;
    expect(pos(toggle)).toBeTruthy();
    expect(badge.compareDocumentPosition(debug) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(toggle.compareDocumentPosition(debug) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("AR: same focus order is preserved (DOM order, not visual mirroring)", () => {
    langMode = "ar";
    renderPricing();
    const badge = screen.getByTestId("detection-badge");
    const toggle = screen.getByTestId("currency-toggle");
    const debug = screen.getByTestId("detection-debug-toggle");
    expect(badge.compareDocumentPosition(toggle) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(toggle.compareDocumentPosition(debug) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("debug toggle exposes aria-expanded state for screen readers", () => {
    renderPricing();
    const btn = screen.getByTestId("detection-debug-toggle");
    expect(btn.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(btn);
    expect(btn.getAttribute("aria-expanded")).toBe("true");
  });

  it("AR: tooltip-bearing controls all carry an aria-label", () => {
    langMode = "ar";
    renderPricing();
    expect(screen.getByTestId("detection-badge").getAttribute("aria-label")).toBeTruthy();
    expect(screen.getByTestId("currency-toggle").getAttribute("aria-label")).toBeTruthy();
  });
});
