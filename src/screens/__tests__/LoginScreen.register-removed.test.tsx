import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getSession: async () => ({ data: { session: null } }),
      signInWithPassword: async () => ({ data: {}, error: null }),
    },
    from: () => ({ insert: async () => ({ error: null }) }),
    functions: { invoke: async () => ({ data: null, error: null }) },
  },
}));

vi.mock("@/lib/native/biometric", () => ({
  biometric: {
    isAvailable: async () => false,
    isEnrolled: async () => false,
    enroll: async () => false,
    verify: async () => false,
  },
}));

import LoginScreen from "@/screens/LoginScreen";

const renderScreen = () =>
  render(
    <MemoryRouter>
      <LoginScreen onLogin={() => {}} />
    </MemoryRouter>,
  );

describe("LoginScreen — legacy register retired", () => {
  it("Create account CTA links to /quick-signup, not the legacy register view", () => {
    renderScreen();
    const link = screen.getByText(/Create your account/i).closest("a");
    expect(link).not.toBeNull();
    expect(link!.getAttribute("href")).toMatch(/\/quick-signup$/);
  });

  it("does not render WhatsApp/SMS/Email channel picker copy on welcome", () => {
    renderScreen();
    expect(screen.queryByText(/VERIFICATION/)).toBeNull();
    expect(screen.queryByText(/How should we send your one-time code/i)).toBeNull();
    expect(screen.queryByText(/Confirm password/i)).toBeNull();
  });
});
