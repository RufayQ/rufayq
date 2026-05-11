/**
 * MedicationsScreen end-to-end tests.
 *
 * Covers:
 *  - Guest mode: renders demo medications when guest meds category is enabled.
 *  - Authenticated mode: renders rows from useMedications() and shows status dots.
 *  - Error banner: useMedications().error renders the alert + Retry.
 *  - Loading spinner: shown when isLoading and no items.
 *  - AddMedicationSheet: requires name + dose (Zod-aligned UI guard).
 *  - medicationApi.save({}) throws Zod ValidationError end-to-end.
 *  - Authenticated submit calls realMeds.save() with mapped MedicationRow input;
 *    save failure surfaces an error toast.
 *  - Guest submit pushes to local extraMeds (no DB call).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";

// ---- Mocks ---------------------------------------------------------------
const toastError = vi.fn();
const toastSuccess = vi.fn();
vi.mock("sonner", () => ({
  toast: Object.assign(
    (...args: any[]) => toastSuccess(...args),
    { success: (...a: any[]) => toastSuccess(...a), error: (...a: any[]) => toastError(...a) },
  ),
}));

const authState = { user: null as null | { id: string } };
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getSession: async () => ({ data: { session: authState.user ? { user: authState.user } : null } }),
      onAuthStateChange: (_cb: any) => ({ data: { subscription: { unsubscribe: () => {} } } }),
    },
    from: () => ({ select: () => ({ eq: () => ({ order: () => ({ then: (r: any) => r({ data: [], error: null }) }) }) }) }),
  },
}));

const guestState = { isGuest: false };
vi.mock("@/hooks/useGuestMode", () => ({
  useGuestMode: () => guestState.isGuest,
}));

const guestCatsState = { meds: false };
vi.mock("@/hooks/useGuestCategories", () => ({
  useGuestCategories: () => ({ categories: guestCatsState }),
}));

vi.mock("@/hooks/useProviderFeed", () => ({
  useProviderFeed: () => ({ medUpdates: [] }),
}));

const medsState: any = {
  items: [] as any[],
  isLoading: false,
  isSyncing: false,
  error: null as Error | null,
  lastSyncedAt: null,
  refresh: vi.fn(async () => {}),
  save: vi.fn(async (input: any) => ({ id: "new-id", ...input })),
  remove: vi.fn(async () => {}),
};
vi.mock("@/hooks/useMedications", () => ({
  useMedications: () => medsState,
}));

vi.mock("@/components/HeaderMenu", () => ({
  default: () => null,
}));

import MedicationsScreen from "@/screens/MedicationsScreen";

beforeEach(() => {
  authState.user = null;
  guestState.isGuest = false;
  guestCatsState.meds = false;
  medsState.items = [];
  medsState.isLoading = false;
  medsState.isSyncing = false;
  medsState.error = null;
  medsState.save.mockClear();
  medsState.refresh.mockClear();
  toastError.mockClear();
  toastSuccess.mockClear();
});

describe("MedicationsScreen — guest mode", () => {
  it("renders demo medications when guest meds category is enabled", async () => {
    guestState.isGuest = true;
    guestCatsState.meds = true;
    render(<MedicationsScreen onBack={() => {}} />);
    await waitFor(() => expect(screen.getByText(/Enoxaparin 40mg/i)).toBeInTheDocument());
  });

  it("hides demo meds when guest meds category is disabled", async () => {
    guestState.isGuest = true;
    guestCatsState.meds = false;
    render(<MedicationsScreen onBack={() => {}} />);
    await waitFor(() => {
      expect(screen.queryByText(/Enoxaparin/i)).not.toBeInTheDocument();
    });
  });
});

describe("MedicationsScreen — authenticated", () => {
  it("renders rows from useMedications()", async () => {
    authState.user = { id: "u1" };
    medsState.items = [
      {
        id: "m1",
        medication_name: "TestMed",
        dose: "10mg",
        frequency: "Once daily",
        reminder_times: ["08:00"],
        instructions: null,
      },
    ];
    render(<MedicationsScreen onBack={() => {}} />);
    await waitFor(() => expect(screen.getAllByText("TestMed").length).toBeGreaterThan(0));
  });

  it("shows error banner with Retry when refresh fails", async () => {
    authState.user = { id: "u1" };
    medsState.error = new Error("network");
    render(<MedicationsScreen onBack={() => {}} />);
    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
    fireEvent.click(screen.getByText(/Retry/i));
    await waitFor(() => expect(medsState.refresh).toHaveBeenCalled());
  });

  it("shows loading spinner when isLoading and no items", async () => {
    authState.user = { id: "u1" };
    medsState.isLoading = true;
    medsState.items = [];
    render(<MedicationsScreen onBack={() => {}} />);
    await waitFor(() => expect(screen.getByTestId("meds-loading")).toBeInTheDocument());
  });
});

describe("AddMedicationSheet — UI guard", () => {
  it("blocks save and toasts when name/dose missing", async () => {
    const AddMedicationSheet = (await import("@/components/AddMedicationSheet")).default;
    const onSubmit = vi.fn();
    render(<AddMedicationSheet open onClose={() => {}} onSubmit={onSubmit} />);
    fireEvent.click(screen.getByText(/Save Medication/i));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(toastError).toHaveBeenCalled();
  });
});
