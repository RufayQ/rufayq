import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const upsertCalls: any[] = [];

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
  it("renders First name + Last name and Arabic counterparts visibly", () => {
    renderPage();
    expect(screen.getByText(/^First name$/)).toBeTruthy();
    expect(screen.getByText(/^Last name$/)).toBeTruthy();
    expect(screen.getByText(/First name \(Arabic\)/)).toBeTruthy();
    expect(screen.getByText(/Last name \(Arabic\)/)).toBeTruthy();
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

  it("disables submit when password fails required rules, enables when strong", () => {
    renderPage();
    const submit = screen.getByRole("button", { name: /Create account & continue/i }) as HTMLButtonElement;
    expect(submit.disabled).toBe(true);

    fireEvent.change(screen.getByPlaceholderText(/e\.g\. Mohammed$/), { target: { value: "Mohammed" } });
    fireEvent.change(screen.getByPlaceholderText(/e\.g\. Al-Saud/), { target: { value: "Al-Saud" } });
    fireEvent.change(screen.getByPlaceholderText(/\+966/), { target: { value: "+966569590418" } });
    // Weak: contains name
    fireEvent.change(screen.getByPlaceholderText(/At least 8 characters/), { target: { value: "Mohammed1A" } });
    expect(screen.getByTestId("pw-rule-notIdentity").getAttribute("data-ok")).toBe("0");
    expect(submit.disabled).toBe(true);

    // Strong + accept terms
    fireEvent.change(screen.getByPlaceholderText(/At least 8 characters/), { target: { value: "Str0ng!Pass" } });
    const termsCheckbox = document.querySelector('input[type="checkbox"]') as HTMLInputElement;
    fireEvent.click(termsCheckbox);
    expect(submit.disabled).toBe(false);
  });
});
