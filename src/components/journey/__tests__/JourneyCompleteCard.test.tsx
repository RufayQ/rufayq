import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import JourneyCompleteCard from "../JourneyCompleteCard";
import type { TripData } from "@/components/AddTripSheet";
import type { JourneyMilestone } from "@/hooks/useJourneyOverview";

// jsPDF / UniversalDocumentPreview are heavy and irrelevant to wiring tests.
vi.mock("@/lib/dischargePack", () => ({
  buildDischargePackPdf: () => ({
    blob: new Blob(["fake-pdf"], { type: "application/pdf" }),
    url: "blob:fake-discharge-pack",
    fileName: "discharge-pack.pdf",
  }),
}));

vi.mock("@/components/records/UniversalDocumentPreview", () => ({
  default: ({ url, fileName }: { url: string; fileName: string }) => (
    <div data-testid="upd-mock">
      <span data-testid="upd-url">{url}</span>
      <span data-testid="upd-name">{fileName}</span>
      <button data-testid="upd-search">Search</button>
      <button data-testid="upd-zoom-in">Zoom in</button>
      <button data-testid="upd-zoom-out">Zoom out</button>
    </div>
  ),
}));

// Toast is harmless but stub it to keep output clean.
vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const trip: TripData = {
  id: "trip-1",
  destination: "Berlin",
  hospital: "Charité",
  specialty: "Cardiology",
  specialtyEmoji: "❤️",
  departureDate: "2026-07-01",
  returnDate: "2026-07-10",
  treatingDoctor: "Dr. Smith",
  companion: false,
  companionName: "",
  insuranceRef: "",
  status: "active",
  outboundFlight: null,
  returnFlight: null,
};

const milestones: JourneyMilestone[] = [
  { id: "m1", kind: "departure", title: "Departure", state: "done", date: "2026-07-01" } as any,
  { id: "m2", kind: "appointment", title: "Pre-op consult", state: "done", date: "2026-07-03" } as any,
  { id: "m3", kind: "return", title: "Return", state: "done", date: "2026-07-10" } as any,
];

describe("JourneyCompleteCard — discharge pack E2E", () => {
  beforeEach(() => {
    // jsdom lacks URL.createObjectURL/revokeObjectURL.
    if (!URL.revokeObjectURL) URL.revokeObjectURL = vi.fn();
    // @ts-ignore
    URL.revokeObjectURL = vi.fn();
    // anchor.click() download stub
    HTMLAnchorElement.prototype.click = vi.fn();
  });

  it("opens UniversalDocumentPreview when the Discharge pack button is tapped", async () => {
    render(
      <JourneyCompleteCard
        trip={trip}
        milestones={milestones}
        totalDays={10}
        notes={["Take antibiotics for 7 days"]}
        onCreateNewJourney={() => {}}
      />,
    );

    await act(async () => {
      fireEvent.click(screen.getByTestId("discharge-pack-open"));
    });

    const preview = await screen.findByTestId("discharge-pack-preview");
    expect(preview).toBeInTheDocument();
    expect(screen.getByTestId("upd-url").textContent).toBe("blob:fake-discharge-pack");
    expect(screen.getByTestId("upd-name").textContent).toBe("discharge-pack.pdf");
    // Search / Zoom controls (provided by the unified PDF viewer) are reachable.
    expect(screen.getByTestId("upd-search")).toBeInTheDocument();
    expect(screen.getByTestId("upd-zoom-in")).toBeInTheDocument();
    expect(screen.getByTestId("upd-zoom-out")).toBeInTheDocument();
  });

  it("downloads the discharge pack when the toolbar Download button is tapped", async () => {
    render(
      <JourneyCompleteCard
        trip={trip}
        milestones={milestones}
        totalDays={10}
        onCreateNewJourney={() => {}}
      />,
    );

    await act(async () => {
      fireEvent.click(screen.getByTestId("discharge-pack-open"));
    });
    await act(async () => {
      fireEvent.click(screen.getByTestId("discharge-pack-download"));
    });
    expect(HTMLAnchorElement.prototype.click).toHaveBeenCalled();
  });

  it("opens the related milestone detail when a step summary is tapped", () => {
    const onOpenMilestone = vi.fn();
    render(
      <JourneyCompleteCard
        trip={trip}
        milestones={milestones}
        totalDays={10}
        onCreateNewJourney={() => {}}
        onOpenMilestone={onOpenMilestone}
      />,
    );
    fireEvent.click(screen.getByTestId("journey-complete-step-m2"));
    expect(onOpenMilestone).toHaveBeenCalledWith("m2");
  });

  it("opens the share menu with all transports", async () => {
    render(
      <JourneyCompleteCard
        trip={trip}
        milestones={milestones}
        totalDays={10}
        onCreateNewJourney={() => {}}
      />,
    );
    await act(async () => {
      fireEvent.click(screen.getByTestId("discharge-pack-share"));
    });
    expect(screen.getByTestId("discharge-pack-share-menu")).toBeInTheDocument();
    expect(screen.getByTestId("discharge-pack-share-copy")).toBeInTheDocument();
    expect(screen.getByTestId("discharge-pack-share-email")).toBeInTheDocument();
    expect(screen.getByTestId("discharge-pack-share-whatsapp")).toBeInTheDocument();
    expect(screen.getByTestId("discharge-pack-share-file")).toBeInTheDocument();
  });
});
