/**
 * E2E-style tests for ProfileEditSheet name validation:
 * - English name accepts Latin only; rejects Arabic input
 * - Arabic name accepts Arabic only; rejects Latin input
 * - Identity tab shows an error indicator dot when invalid
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ProfileEditSheet from "@/components/profile/ProfileEditSheet";

// Mock supabase client used by the sheet
vi.mock("@/integrations/supabase/client", () => {
  const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
  const eq = vi.fn(() => ({ maybeSingle }));
  const select = vi.fn(() => ({ eq }));
  const upsert = vi.fn().mockResolvedValue({ error: null });
  const from = vi.fn(() => ({ select, upsert }));
  const getSession = vi.fn().mockResolvedValue({ data: { session: null } });
  return { supabase: { from, auth: { getSession } } };
});

vi.mock("@/hooks/useDeviceId", () => ({
  getDeviceId: () => "test-device",
  useDeviceId: () => "test-device",
}));

vi.mock("@/components/profile/AvatarUploader", () => ({
  default: () => <div data-testid="avatar-uploader" />,
}));

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const renderSheet = () =>
  render(<ProfileEditSheet onClose={() => {}} initialTab="identity" />);

const waitForLoaded = async () => {
  await waitFor(() => {
    expect(screen.getByPlaceholderText("Your full name")).toBeInTheDocument();
  });
};

describe("ProfileEditSheet · name validation", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects Arabic characters in the English name field", async () => {
    renderSheet();
    await waitForLoaded();
    const en = screen.getByPlaceholderText("Your full name") as HTMLInputElement;
    fireEvent.change(en, { target: { value: "محمد" } });
    fireEvent.blur(en);
    await waitFor(() => {
      expect(screen.getByText(/English letters only/i)).toBeInTheDocument();
    });
  });

  it("rejects Latin characters in the Arabic name field", async () => {
    renderSheet();
    await waitForLoaded();
    const ar = screen.getByPlaceholderText("اسمك الكامل") as HTMLInputElement;
    fireEvent.change(ar, { target: { value: "Mohammed" } });
    fireEvent.blur(ar);
    await waitFor(() => {
      // error message contains both EN + AR halves separated by ·
      expect(screen.getByText(/Use Arabic letters only/i)).toBeInTheDocument();
    });
  });

  it("requires both names and shows error indicator on Identity tab on save", async () => {
    const { container } = renderSheet();
    await waitForLoaded();
    // Click Save with empty fields
    const save = screen.getByRole("button", { name: /Save changes/i });
    fireEvent.click(save);
    await waitFor(() => {
      expect(screen.getByText(/Full name is required/i)).toBeInTheDocument();
      expect(screen.getByText(/Arabic name is required/i)).toBeInTheDocument();
    });
    // The Identity tab button should render the red error dot
    const identityTab = screen.getByRole("button", { name: /Identity/i });
    const dot = identityTab.querySelector("span.absolute");
    expect(dot).toBeTruthy();
  });

  it("accepts valid Arabic + English names without error", async () => {
    renderSheet();
    await waitForLoaded();
    const en = screen.getByPlaceholderText("Your full name") as HTMLInputElement;
    const ar = screen.getByPlaceholderText("اسمك الكامل") as HTMLInputElement;
    fireEvent.change(en, { target: { value: "Mohammed Al-Rashidi" } });
    fireEvent.blur(en);
    fireEvent.change(ar, { target: { value: "محمد الراشدي" } });
    fireEvent.blur(ar);
    await waitFor(() => {
      // No validation error messages — hint text is fine to remain
      expect(screen.queryByText(/Full name is required/i)).toBeNull();
      expect(screen.queryByText(/Arabic name is required/i)).toBeNull();
      expect(screen.queryByText(/Use Arabic letters only/i)).toBeNull();
    });
  });
});
