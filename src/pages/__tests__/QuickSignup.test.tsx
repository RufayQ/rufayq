import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const upsertCalls: any[] = [];

beforeEach(() => { upsertCalls.length = 0; });

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getSession: async () => ({ data: { session: { user: { id: "u1" } } } }),
      signUp: async () => ({ data: { user: { id: "u1" } }, error: null }),
      signInWithPassword: async () => ({ data: { user: { id: "u1" } }, error: null }),
    },
    from: (table: string) => ({
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }),
      upsert: async (row: any) => { upsertCalls.push({ table, row }); return { error: null }; },
    }),
  },
}));

vi.mock("@/contexts/LanguageContext", () => ({
  useLanguage: () => ({ mode: "en" }),
}));

vi.mock("@/components/RufayQLogo", () => ({ default: () => <div /> }));
vi.mock("@/components/LanguageSwitcher", () => ({ default: () => <div /> }));
vi.mock("@/seo/Seo", () => ({ Seo: () => null }));
vi.mock("@/screens/RoleSelectorScreen", () => ({ setStoredRole: () => {} }));
vi.mock("@/hooks/useFreshStart", () => ({ markUserFresh: () => {} }));

import QuickSignup from "@/pages/QuickSignup";

const renderPage = () =>
  render(
    <MemoryRouter>
      <QuickSignup />
    </MemoryRouter>,
  );

describe("QuickSignup", () => {
  it("renders First/Last name inline and hides Arabic counterparts + Nationality + DOB behind 'Add optional details' in EN mode", () => {
    renderPage();
    expect(screen.getByText(/^First name$/)).toBeTruthy();
    expect(screen.getByText(/^Last name$/)).toBeTruthy();
    // Optional fields hidden by default in English mode
    expect(screen.queryByText(/First name \(Arabic\)/)).toBeNull();
    expect(screen.queryByText(/Last name \(Arabic\)/)).toBeNull();
    expect(screen.queryByText(/^Nationality$/)).toBeNull();
    // Toggle reveals them
    fireEvent.click(screen.getByText(/Add optional details/i));
    expect(screen.getByText(/First name \(Arabic\)/)).toBeTruthy();
    expect(screen.getByText(/Last name \(Arabic\)/)).toBeTruthy();
    expect(screen.getByText(/^Nationality$/)).toBeTruthy();
  });

  it("does not silently default nationality to Saudi Arabia when optional details untouched", () => {
    renderPage();
    fireEvent.click(screen.getByText(/Add optional details/i));
    // Nationality combobox button should show the placeholder, not 'Saudi Arabia'
    expect(screen.queryByText(/^Saudi Arabia$/)).toBeNull();
    expect(screen.getByText(/Select nationality/i)).toBeTruthy();
  });

  it("does not render WhatsApp / SMS / Email verification picker", () => {
    renderPage();
    expect(screen.queryByText(/WhatsApp/i)).toBeNull();
    expect(screen.queryByText(/Email OTP/i)).toBeNull();
    expect(screen.queryByText(/verification method/i)).toBeNull();
  });

  it("hides strength meter until typing then shows checklist", () => {
    renderPage();
    expect(screen.queryByTestId("password-strength")).toBeNull();
    const pw = screen.getByPlaceholderText(/At least 8 characters/);
    fireEvent.change(pw, { target: { value: "a" } });
    expect(screen.getByTestId("password-strength")).toBeTruthy();
    expect(screen.getByTestId("pw-rule-length").getAttribute("data-ok")).toBe("0");
  });

  it("disables submit when password is below Fair, enables at Fair-or-better with terms", () => {
    renderPage();
    const submit = screen.getByRole("button", { name: /Create account & continue/i }) as HTMLButtonElement;
    expect(submit.disabled).toBe(true);

    fireEvent.change(screen.getByPlaceholderText(/e\.g\. Mohammed$/), { target: { value: "Mohammed" } });
    fireEvent.change(screen.getByPlaceholderText(/e\.g\. Al-Saud/), { target: { value: "Al-Saud" } });
    fireEvent.change(screen.getByPlaceholderText(/5X XXX XXXX/), { target: { value: "569590418" } });

    // Below Fair: only 2/5 rules pass (lower + notIdentity, fails length/upper/number)
    fireEvent.change(screen.getByPlaceholderText(/At least 8 characters/), { target: { value: "ab" } });
    expect(submit.disabled).toBe(true);

    // Fair (3/5): length + lower + notIdentity, still no upper/number — accept terms
    fireEvent.change(screen.getByPlaceholderText(/At least 8 characters/), { target: { value: "abcdefgh" } });
    const termsCheckbox = document.querySelector('input[type="checkbox"]') as HTMLInputElement;
    fireEvent.click(termsCheckbox);
    expect(submit.disabled).toBe(false);
  });
});
