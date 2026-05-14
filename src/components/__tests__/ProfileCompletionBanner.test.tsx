import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

// --- Supabase mock with per-test profile/medical data ---
let mockProfile: any = null;
let mockMedical: any = null;

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: { getUser: async () => ({ data: { user: null }, error: null }) },
    from: (table: string) => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () =>
            table === "profiles"
              ? { data: mockProfile, error: null }
              : { data: mockMedical, error: null },
        }),
      }),
    }),
  },
}));

vi.mock("@/contexts/LanguageContext", () => ({
  useLanguage: () => ({ mode: "en" }),
}));

import ProfileCompletionBanner from "@/components/ProfileCompletionBanner";

beforeEach(() => {
  mockProfile = null;
  mockMedical = null;
  localStorage.clear();
  sessionStorage.clear();
  localStorage.setItem("rufayq_device_id", "device-x");
});

describe("ProfileCompletionBanner", () => {
  it("renders with score and contact-not-verified row for partial profile", async () => {
    mockProfile = {
      full_name_en: "Mo", date_of_birth: null, gender: null, nationality: null,
      saudi_id: null, passport_number: null, contact_verified: false,
    };
    mockMedical = { blood_type: null, emergency_contact_name: null };
    const onOpen = vi.fn();
    render(<ProfileCompletionBanner onOpenProfile={onOpen} />);
    await screen.findByText(/Complete your profile/i);
    expect(screen.getByText(/%/)).toBeTruthy();
    expect(screen.getByText(/Contact not verified/i)).toBeTruthy();
  });

  it("renders nothing when profile is complete and contact is verified", async () => {
    mockProfile = {
      full_name_en: "Mo", full_name_ar: "م", date_of_birth: "1990-01-01",
      gender: "male", nationality: "SA", saudi_id: "1234567890",
      passport_number: null, contact_verified: true,
    };
    mockMedical = { blood_type: "O+", emergency_contact_name: "Dad" };
    const { container } = render(<ProfileCompletionBanner onOpenProfile={() => {}} />);
    await waitFor(() => {
      expect(container.querySelector("[aria-label='Complete your profile']")).toBeNull();
    });
  });

  it("dismiss writes per-device key to sessionStorage", async () => {
    mockProfile = { full_name_en: null, contact_verified: false } as any;
    mockMedical = {};
    render(<ProfileCompletionBanner onOpenProfile={() => {}} />);
    const dismissBtn = await screen.findByLabelText("Dismiss");
    fireEvent.click(dismissBtn);
    expect(sessionStorage.getItem("rufayq_profile_banner_dismissed_v1:device-x")).toBe("1");
  });

  it("main button calls onOpenProfile", async () => {
    mockProfile = { full_name_en: null, contact_verified: false } as any;
    mockMedical = {};
    const onOpen = vi.fn();
    render(<ProfileCompletionBanner onOpenProfile={onOpen} />);
    const cta = await screen.findByLabelText("Complete your profile");
    fireEvent.click(cta);
    expect(onOpen).toHaveBeenCalledTimes(1);
  });
});
