import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getSession: async () => ({ data: { session: null } }),
      signUp: async () => ({ data: { user: { id: "u1" } }, error: null }),
      signInWithPassword: async () => ({ data: { user: { id: "u1" } }, error: null }),
    },
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }),
      upsert: async () => ({ error: null }),
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

import QuickSignup from "@/pages/QuickSignup";

const renderPage = () =>
  render(
    <MemoryRouter>
      <QuickSignup />
    </MemoryRouter>,
  );

describe("QuickSignup", () => {
  it("shows the Arabic name input directly (not behind Add optional details)", () => {
    renderPage();
    expect(screen.getByText(/Arabic name \(optional\)/i)).toBeTruthy();
  });

  it("does not render WhatsApp / SMS / Email verification picker", () => {
    renderPage();
    expect(screen.queryByText(/WhatsApp/i)).toBeNull();
    expect(screen.queryByText(/^SMS$/i)).toBeNull();
    expect(screen.queryByText(/Email OTP/i)).toBeNull();
    expect(screen.queryByText(/verification method/i)).toBeNull();
    expect(screen.queryByText(/VERIFICATION ·/i)).toBeNull();
  });
});
