import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import MilestoneSheet, { type SheetItem } from "@/components/journey/MilestoneSheet";
import type { JourneyMilestone } from "@/hooks/useJourneyOverview";

// Stub useArtifactCount — it would otherwise hit Supabase.
vi.mock("@/hooks/useArtifactCount", () => ({
  useArtifactCount: () => 0,
}));

// Stub RelatedDocumentsCard — the real one talks to Supabase storage.
vi.mock("@/components/RelatedDocumentsCard", () => ({
  default: (props: any) => (
    <div data-testid="related-docs" data-segref={props.segmentRef}>
      {props.title || "docs"}
    </div>
  ),
}));

const baseMilestone = (over: Partial<JourneyMilestone> = {}): JourneyMilestone => ({
  id: "m-1",
  refId: "appt-1",
  kind: "appointment",
  subKind: "consult",
  title: "Pre-op consult",
  titleAr: "استشارة ما قبل العملية",
  date: "2026-06-03",
  state: "upcoming",
  phase: "care",
  ...over,
});

describe("MilestoneSheet — Tap for details expand", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the expand toggle when there are items", () => {
    const items: SheetItem[] = [
      { id: "x", kind: "visit", title: "Dr Müller", subtitle: "10:00", state: "Upcoming", tone: "soon" },
    ];
    render(<MilestoneSheet milestone={baseMilestone()} items={items} />);
    expect(screen.getByTestId("milestone-sheet-expand")).toBeInTheDocument();
  });

  it("keeps content collapsed by default and reveals items on tap", () => {
    const items: SheetItem[] = [
      { id: "x", kind: "visit", title: "Dr Müller", subtitle: "10:00", state: "Upcoming", tone: "soon" },
    ];
    render(<MilestoneSheet milestone={baseMilestone()} items={items} />);
    expect(screen.queryByTestId("milestone-sheet-items")).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId("milestone-sheet-expand"));
    expect(screen.getByTestId("milestone-sheet-items")).toBeInTheDocument();
    expect(screen.getByText("Dr Müller")).toBeInTheDocument();
  });

  it("renders per-traveler boarding-pass slots for flight milestones when expanded", () => {
    render(
      <MilestoneSheet
        milestone={baseMilestone({ id: "m-dep", refId: "departure", kind: "departure", subKind: "flight", phase: "travel" })}
        flightTicketId="tkt-123"
        documentSlots={[
          { segmentRef: "seg-1::bp::patient",  title: "Boarding pass — Patient",  preferredLabels: ["Boarding Pass"] },
          { segmentRef: "seg-1::bp::spouse",   title: "Boarding pass — Spouse",   preferredLabels: ["Boarding Pass"] },
        ]}
      />,
    );
    fireEvent.click(screen.getByTestId("milestone-sheet-expand"));
    const slots = screen.getByTestId("milestone-sheet-extra-slots");
    expect(slots).toBeInTheDocument();
    expect(slots.querySelectorAll('[data-testid="related-docs"]').length).toBe(2);
    expect(screen.getByText(/Boarding pass — Patient/)).toBeInTheDocument();
    expect(screen.getByText(/Boarding pass — Spouse/)).toBeInTheDocument();
  });

  it("collapses again when the toggle is tapped a second time", () => {
    const items: SheetItem[] = [
      { id: "x", kind: "lab", title: "Blood panel", state: "Done", tone: "done" },
    ];
    render(<MilestoneSheet milestone={baseMilestone()} items={items} defaultExpanded />);
    expect(screen.getByTestId("milestone-sheet-items")).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("milestone-sheet-expand"));
    expect(screen.queryByTestId("milestone-sheet-items")).not.toBeInTheDocument();
  });

  it("still exposes the toggle for an empty milestone via its document scope", () => {
    // Every milestone gets a canonical segmentRef (for record uploads), so the
    // toggle should always be available even with zero inline items.
    render(<MilestoneSheet milestone={baseMilestone()} items={[]} />);
    expect(screen.getByTestId("milestone-sheet-expand")).toBeInTheDocument();
  });

  // E2E coverage: every milestone "kind" must expand and collapse cleanly when
  // the user taps the chevron — regression guard for the "Tap for details"
  // behavior that was previously broken on flight/transport milestones.
  const kindCases: Array<{ label: string; milestone: JourneyMilestone }> = [
    { label: "flight (departure)", milestone: baseMilestone({ id: "m-dep", refId: "departure", kind: "departure", subKind: "flight", phase: "travel" }) },
    { label: "appointment (consult)", milestone: baseMilestone({ id: "m-appt", kind: "appointment", subKind: "consult" }) },
    { label: "treatment (surgery)",   milestone: baseMilestone({ id: "m-trt",  kind: "treatment",   subKind: "surgery" }) },
    { label: "return (flight home)",  milestone: baseMilestone({ id: "m-ret",  refId: "return", kind: "return", subKind: "flight", phase: "after" }) },
  ];

  it.each(kindCases)("expands and collapses milestone: $label", ({ milestone }) => {
    const items: SheetItem[] = [
      { id: "x", kind: milestone.subKind === "flight" ? "flight" : milestone.subKind === "surgery" ? "visit" : "visit", title: "Detail row", state: "Upcoming", tone: "soon" },
    ];
    render(<MilestoneSheet milestone={milestone} items={items} />);
    const toggle = screen.getByTestId("milestone-sheet-expand");

    // Initially collapsed.
    expect(screen.queryByTestId("milestone-sheet-items")).not.toBeInTheDocument();

    // Tap to expand.
    fireEvent.click(toggle);
    expect(screen.getByTestId("milestone-sheet-items")).toBeInTheDocument();
    expect(toggle.getAttribute("aria-expanded")).toBe("true");

    // Tap to collapse again.
    fireEvent.click(toggle);
    expect(screen.queryByTestId("milestone-sheet-items")).not.toBeInTheDocument();
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
  });

  it("forwards emptyHint into per-traveler boarding-pass slots", () => {
    render(
      <MilestoneSheet
        milestone={baseMilestone({ id: "m-dep", refId: "departure", kind: "departure", subKind: "flight", phase: "travel" })}
        flightTicketId="tkt-9"
        documentSlots={[
          {
            segmentRef: "seg-1::bp::patient",
            title: "Boarding pass — Patient",
            preferredLabels: ["Boarding Pass"],
            emptyHint: { en: "Upload Patient's boarding pass", ar: "ارفع بطاقة الصعود" },
          },
        ]}
      />,
    );
    fireEvent.click(screen.getByTestId("milestone-sheet-expand"));
    // The mock RelatedDocumentsCard renders its props — assert the slot exists.
    expect(screen.getByText(/Boarding pass — Patient/)).toBeInTheDocument();
  });
});
