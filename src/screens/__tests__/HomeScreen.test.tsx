import React from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
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
  departureDate: "2026-06-01",
  returnDate: "2026-06-15",
  treatingDoctor: "Dr. Heart",
  companion: false,
  companionName: "",
  insuranceRef: "",
  status: "active" as const,
  outboundFlight: null,
  returnFlight: null,
};

describe("HomeScreen journey dashboard", () => {
  beforeEach(() => {
    useJourneysMock.mockReset();
    useAppointmentsMock.mockReset();
    useAppointmentsMock.mockReturnValue({ items: [], isLoading: false, isSyncing: false, error: null, lastSyncedAt: null, refresh: vi.fn(), save: vi.fn(), remove: vi.fn() });
  });

  it("shows the first-trip CTA only when no journeys exist", async () => {
    const onNavigate = vi.fn();
    useJourneysMock.mockReturnValue({ journeys: [], loading: false, error: null });

    render(<HomeScreen onNavigate={onNavigate} onProfile={vi.fn()} />);

    expect(await screen.findByText(/No journeys yet/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Add your first trip/i }));
    expect(onNavigate).toHaveBeenCalledWith("journey", "new-trip");
  });

  it("renders an active journey summary instead of the empty state", async () => {
    const onNavigate = vi.fn();
    useJourneysMock.mockReturnValue({ journeys: [activeJourney], loading: false, error: null });

    render(<HomeScreen onNavigate={onNavigate} onProfile={vi.fn()} />);

    expect(await screen.findByText(/Frankfurt, Germany/i)).toBeInTheDocument();
    expect(screen.getByText(/Cardiology/i)).toBeInTheDocument();
    expect(screen.queryByText(/No journeys yet/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByText(/New Trip/i));
    expect(onNavigate).toHaveBeenCalledWith("journey", "new-trip");

    fireEvent.click(screen.getByText(/View full journey/i));
    await waitFor(() => expect(onNavigate).toHaveBeenCalledWith("journey", "view"));
  });

  it("does not render demo medications or appointments for signed-in users", async () => {
    useJourneysMock.mockReturnValue({ journeys: [], loading: false, error: null });

    render(<HomeScreen onNavigate={vi.fn()} onProfile={vi.fn()} />);

    expect(await screen.findByText(/No medications scheduled today/i)).toBeInTheDocument();
    expect(screen.getByText(/No upcoming appointments/i)).toBeInTheDocument();
    expect(screen.queryByText(/Enoxaparin/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Amoxicillin/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Klaus Mueller/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Charité/i)).not.toBeInTheDocument();
  });

  it("renders demo medications and appointments for guest users", async () => {
    useJourneysMock.mockReturnValue({ journeys: [], loading: false, error: null });

    render(<HomeScreen isGuest onNavigate={vi.fn()} onProfile={vi.fn()} />);

    expect(await screen.findByText(/Enoxaparin 40mg/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Dr\. Klaus Mueller/i).length).toBeGreaterThan(0);
  });

});
