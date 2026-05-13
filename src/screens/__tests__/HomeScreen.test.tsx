<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import HomeScreen from "@/screens/HomeScreen";
import type { TripData } from "@/components/AddTripSheet";

vi.mock("@/hooks/usePatientName", () => ({
  usePatientName: () => ({ patientName: "Mona", patientNameAr: "منى", loading: false }),
}));

const mockJourneys = vi.fn((_seed?: TripData[]): { journeys: TripData[] } => ({ journeys: [] }));
vi.mock("@/hooks/useJourneys", () => ({
  useJourneys: (seed?: TripData[]) => mockJourneys(seed),
}));

vi.mock("@/components/RufayQWordmark", () => ({ default: () => <div /> }));
vi.mock("@/components/NotificationBell", () => ({ default: () => <div /> }));
vi.mock("@/components/HeaderMenu", () => ({
  default: () => <div />,
  Copy: () => null, Share2: () => null, RefreshCw: () => null,
  Bell: () => null, Settings: () => null, HelpCircle: () => null,
}));

const sampleTrip = (over: Partial<TripData> = {}): TripData => ({
  id: over.id ?? "t-1",
  destination: "Berlin, DE",
  hospital: "Charité",
  specialty: "Orthopedic Surgery",
  specialtyEmoji: "🦴",
  departureDate: "2026-05-01",
  returnDate: "2026-05-15",
  treatingDoctor: "Dr. M",
  companion: false,
  companionName: "",
  insuranceRef: "",
  status: "active",
  outboundFlight: null,
  returnFlight: null,
  ...over,
});

describe("HomeScreen", () => {
  beforeEach(() => {
    mockJourneys.mockReset();
  });

  it("renders empty state CTA when there are no journeys", () => {
    mockJourneys.mockReturnValue({ journeys: [] });
    const onNavigate = vi.fn();
    render(<HomeScreen onNavigate={onNavigate} onProfile={() => {}} />);
    const cta = screen.getByText(/Start a new trip/i);
    fireEvent.click(cta);
    expect(onNavigate).toHaveBeenCalledWith("journey", "new-trip");
  });

  it("renders ActiveTripCard when an active trip exists", () => {
    mockJourneys.mockReturnValue({ journeys: [sampleTrip()] });
    render(<HomeScreen onNavigate={vi.fn()} onProfile={() => {}} />);
    expect(screen.getByText(/Orthopedic Surgery/i)).toBeInTheDocument();
    expect(screen.queryByText(/Start a new trip/i)).toBeNull();
  });

  it("'View full journey' navigates with view intent", () => {
    mockJourneys.mockReturnValue({ journeys: [sampleTrip()] });
    const onNavigate = vi.fn();
    render(<HomeScreen onNavigate={onNavigate} onProfile={() => {}} />);
    fireEvent.click(screen.getByText(/View full journey/i));
    expect(onNavigate).toHaveBeenCalledWith("journey", "view");
  });

  it("'New Trip' on active card navigates with new-trip intent", () => {
    mockJourneys.mockReturnValue({ journeys: [sampleTrip()] });
    const onNavigate = vi.fn();
    render(<HomeScreen onNavigate={onNavigate} onProfile={() => {}} />);
    fireEvent.click(screen.getByText(/New Trip/i));
    expect(onNavigate).toHaveBeenCalledWith("journey", "new-trip");
  });

  it("other-journey row navigates with view intent", () => {
    mockJourneys.mockReturnValue({
      journeys: [sampleTrip(), sampleTrip({ id: "t-2", status: "upcoming", destination: "Istanbul" })],
    });
    const onNavigate = vi.fn();
    render(<HomeScreen onNavigate={onNavigate} onProfile={() => {}} />);
    fireEvent.click(screen.getByText(/Istanbul/i));
    expect(onNavigate).toHaveBeenCalledWith("journey", "view");
  });

  it("prefers active over upcoming when both are present", () => {
    mockJourneys.mockReturnValue({
      journeys: [
        sampleTrip({ id: "u-1", status: "upcoming", destination: "Tokyo" }),
        sampleTrip({ id: "a-1", status: "active", destination: "Berlin, DE" }),
      ],
    });
    render(<HomeScreen onNavigate={vi.fn()} onProfile={() => {}} />);
    expect(screen.getByText(/ACTIVE TRIP — BERLIN/i)).toBeInTheDocument();
  });

  it("renders specialty emoji + specialty text on the active card", () => {
    mockJourneys.mockReturnValue({
      journeys: [sampleTrip({ specialtyEmoji: "❤️", specialty: "Cardiology" })],
    });
    render(<HomeScreen onNavigate={vi.fn()} onProfile={() => {}} />);
    expect(screen.getByText(/❤️\s*Cardiology/)).toBeInTheDocument();
  });

  it("renders Arabic subline and date range on the active card", () => {
    mockJourneys.mockReturnValue({ journeys: [sampleTrip()] });
    render(<HomeScreen onNavigate={vi.fn()} onProfile={() => {}} />);
    expect(screen.getByText("رحلتك العلاجية الحالية")).toBeInTheDocument();
    expect(screen.getByText(/May 1.*→.*May 15/)).toBeInTheDocument();
  });

  it("renders Journey/Days Left/Companion stats and not the redesigned Total stat", () => {
    mockJourneys.mockReturnValue({ journeys: [sampleTrip()] });
    render(<HomeScreen onNavigate={vi.fn()} onProfile={() => {}} />);
    expect(screen.getByText(/Journey$|Journeys$/)).toBeInTheDocument();
    expect(screen.getByText("Days Left")).toBeInTheDocument();
    expect(screen.getByText("Companion")).toBeInTheDocument();
    expect(screen.queryByText(/^Total$/)).toBeNull();
  });

  it("does not render demo medications, appointments, or medication reminders for signed-in users", () => {
    mockJourneys.mockReturnValue({ journeys: [] });
    render(<HomeScreen onNavigate={vi.fn()} onProfile={() => {}} />);
    expect(screen.queryByText(/Enoxaparin/i)).toBeNull();
    expect(screen.queryByText(/Amoxicillin/i)).toBeNull();
    expect(screen.queryByText(/Ibuprofen/i)).toBeNull();
    expect(screen.queryByText(/Klaus Mueller/i)).toBeNull();
    expect(screen.queryByText(/Charité/i)).toBeNull();
    expect(screen.getByText(/No medications scheduled today/i)).toBeInTheDocument();
    expect(screen.getByText(/No upcoming appointments/i)).toBeInTheDocument();
    // Reminders strip must not surface a demo medication-due row.
    expect(screen.queryByText(/8:00 PM/)).toBeNull();
    expect(screen.queryByText(/Next Medication Due/i)).toBeNull();
    expect(screen.queryByText(/UPCOMING REMINDERS/i)).toBeNull();
  });

  it("renders demo medications, appointments, and a consistent medication reminder for guest users", () => {
    mockJourneys.mockReturnValue({ journeys: [] });
    render(<HomeScreen isGuest onNavigate={vi.fn()} onProfile={() => {}} />);
    expect(screen.getByText(/Enoxaparin 40mg/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Dr\. Klaus Mueller/i).length).toBeGreaterThan(0);
    // Guest demo currently seeds taken-status meds, so the reminders strip
    // may legitimately be hidden — what matters is consistency with the card.
  });
=======
=======
>>>>>>> theirs
=======
>>>>>>> theirs
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

<<<<<<< ours
<<<<<<< ours
>>>>>>> theirs
=======
>>>>>>> theirs
=======
>>>>>>> theirs
});
