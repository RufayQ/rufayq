import React from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import HelicopterCanvas from "@/components/journey/HelicopterCanvas";
import type { JourneyMilestone } from "@/hooks/useJourneyOverview";

const milestones: JourneyMilestone[] = [
  { id: "m1", kind: "departure", title: "Depart", titleAr: "السفر", date: "2026-04-01", state: "done" },
  { id: "m2", kind: "appointment", title: "Pre-op", titleAr: "ما قبل العملية", date: "2026-04-05", state: "current" },
  { id: "m3", kind: "treatment", title: "Surgery", titleAr: "الجراحة", date: "2026-04-08", state: "upcoming" },
  { id: "m4", kind: "return", title: "Return", titleAr: "العودة", date: "2026-04-15", state: "upcoming" },
];

describe("HelicopterCanvas", () => {
  it("renders all milestones as buttons", () => {
    render(<HelicopterCanvas milestones={milestones} onSelect={() => {}} />);
    milestones.forEach((m) => {
      expect(screen.getByTestId(`milestone-${m.id}`)).toBeInTheDocument();
    });
  });

  it("marks the current milestone with data-state=current", () => {
    render(<HelicopterCanvas milestones={milestones} onSelect={() => {}} />);
    expect(screen.getByTestId("milestone-m2").getAttribute("data-state")).toBe("current");
  });

  it("dispatches onSelect when a milestone is clicked", () => {
    const onSelect = vi.fn();
    render(<HelicopterCanvas milestones={milestones} onSelect={onSelect} />);
    fireEvent.click(screen.getByTestId("milestone-m3"));
    expect(onSelect).toHaveBeenCalledWith("m3");
  });

  it("renders empty state when no milestones provided", () => {
    render(<HelicopterCanvas milestones={[]} onSelect={() => {}} />);
    expect(screen.getByText(/No journey milestones/i)).toBeInTheDocument();
  });
});
