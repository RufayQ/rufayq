import React from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import HomeScreen from "@/screens/HomeScreen";

const useJourneysMock = vi.fn();
const useAppointmentsMock = vi.fn();

vi.mock("@/hooks/useJourneys", () => ({
  useJourneys: (...args: unknown[]) => useJourneysMock(...args),
}));

vi.mock("@/hooks/useAppointments", () => ({
  useAppointments: (...args: unknown[]) => useAppointmentsMock(...args),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: { getSession: async () => ({ data: { session: null } }) },
    from: () => ({
      select: () => ({
        eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }),
      }),
    }),
  },
}));

vi.mock("@/hooks/useDeviceId", () => ({ getDeviceId: () => "device-1" }));
vi.mock("@/components/NotificationBell", () => ({ default: () => <button aria-label="Notifications" /> }));
vi.mock("@/components/HeaderMenu", () => ({
  default: () => <button aria-label="Menu" />,
  Copy: () => null,
  Share2: () => null,
  RefreshCw: () => null,
  Bell: () => null,
  Settings: () => null,
  HelpCircle: () => null,
}));
vi.mock("@/components/RufayQWordmark", () => ({ default: () => <div>RufayQ</div> }));

const activeJourney = {
  id: "journey-1",
  destination: "Frankfurt, Germany",
  hospital: "University Hospital Frankfurt",
  specialty: "Cardiology",
  specialtyEmoji: "❤️",
  departureDate: new Date(Date.now() - 2 * 86400000).toISOString().slice(0, 10),
  returnDate: new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10),
  treatingDoctor: "Dr. Heart",
  companion: false,
  companionName: "",
  insuranceRef: "",
  status: "active" as const,
  outboundFlight: null,
  returnFlight: null,
};

describe("HomeScreen dashboard", () => {
  beforeEach(() => {
    useJourneysMock.mockReset();
    useAppointmentsMock.mockReset();
    useAppointmentsMock.mockReturnValue({ items: [], isLoading: false, isSyncing: false, error: null, lastSyncedAt: null, refresh: vi.fn(), save: vi.fn(), remove: vi.fn() });
  });

  it("shows the inline plan-first-trip CTA when no active trip exists", () => {
    const onNavigate = vi.fn();
    useJourneysMock.mockReturnValue({ journeys: [], loading: false, error: null });

    render(<HomeScreen onNavigate={onNavigate} onProfile={vi.fn()} />);

    fireEvent.click(screen.getByText(/Plan your first journey/i));
    expect(onNavigate).toHaveBeenCalledWith("journey", "new-trip");
  });

  it("renders the TodayCard summary for an active trip and routes Open Journey", () => {
    const onNavigate = vi.fn();
    useJourneysMock.mockReturnValue({ journeys: [activeJourney], loading: false, error: null });

    render(<HomeScreen onNavigate={onNavigate} onProfile={vi.fn()} />);

    expect(screen.getByText(/Frankfurt, Germany/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Open Journey/i }));
    expect(onNavigate).toHaveBeenCalledWith("journey", "view");
  });

  it("does not render full active-trip card, other-journeys list, or full appointment/medication lists", () => {
    useJourneysMock.mockReturnValue({ journeys: [activeJourney], loading: false, error: null });

    render(<HomeScreen onNavigate={vi.fn()} onProfile={vi.fn()} />);

    expect(screen.queryByText(/ACTIVE TRIP — FRANKFURT/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/OTHER JOURNEYS/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/UPCOMING APPOINTMENTS/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/TODAY'S MEDICATIONS/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/View all medications/i)).not.toBeInTheDocument();
  });

  it("renders QuickActionsGrid", () => {
    useJourneysMock.mockReturnValue({ journeys: [], loading: false, error: null });
    render(<HomeScreen onNavigate={vi.fn()} onProfile={vi.fn()} />);
    expect(screen.getByText(/QUICK ACTIONS/i)).toBeInTheDocument();
  });
});
