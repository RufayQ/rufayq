import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import EmrScreen from "@/features/emr/EmrScreen";

describe("EmrScreen — sub-tab accessibility", () => {
  it("renders a tablist with one selected tab and matching tabpanel", () => {
    render(<EmrScreen />);
    const tablist = screen.getByRole("tablist", { name: /Electronic Medical Record sections/i });
    expect(tablist).toBeInTheDocument();

    const tabs = screen.getAllByRole("tab");
    expect(tabs.length).toBeGreaterThanOrEqual(4);

    const selected = tabs.filter((t) => t.getAttribute("aria-selected") === "true");
    expect(selected).toHaveLength(1);
    expect(selected[0]).toHaveAttribute("id", "emr-tab-medication");

    // Roving tabindex: the active tab is focusable, others are -1.
    expect(selected[0]).toHaveAttribute("tabindex", "0");
    tabs.filter((t) => t !== selected[0]).forEach((t) =>
      expect(t).toHaveAttribute("tabindex", "-1")
    );

    const panel = document.getElementById("emr-panel-medication");
    expect(panel).not.toBeNull();
    expect(panel).toHaveAttribute("aria-labelledby", "emr-tab-medication");
  });

  it("ArrowRight moves selection + focus to the next tab", () => {
    render(<EmrScreen />);
    const med = screen.getByRole("tab", { selected: true });
    med.focus();
    fireEvent.keyDown(med, { key: "ArrowRight" });

    const lab = screen.getByRole("tab", { selected: true });
    expect(lab).toHaveAttribute("id", "emr-tab-laboratory");
    expect(lab).toHaveAttribute("tabindex", "0");
  });

  it("ArrowLeft from the first tab wraps to the last", () => {
    render(<EmrScreen />);
    const first = screen.getByRole("tab", { selected: true });
    first.focus();
    fireEvent.keyDown(first, { key: "ArrowLeft" });
    const last = screen.getByRole("tab", { selected: true });
    expect(last).toHaveAttribute("id", "emr-tab-interventions");
  });

  it("End jumps to the last tab and Home returns to the first", () => {
    render(<EmrScreen />);
    const first = screen.getByRole("tab", { selected: true });
    first.focus();
    fireEvent.keyDown(first, { key: "End" });
    expect(screen.getByRole("tab", { selected: true })).toHaveAttribute("id", "emr-tab-interventions");

    fireEvent.keyDown(screen.getByRole("tab", { selected: true }), { key: "Home" });
    expect(screen.getByRole("tab", { selected: true })).toHaveAttribute("id", "emr-tab-medication");
  });

  it("clicking a tab updates aria-selected and the rendered tabpanel link", () => {
    render(<EmrScreen />);
    fireEvent.click(screen.getByRole("tab", { name: /Radiology/i }));
    const sel = screen.getByRole("tab", { selected: true });
    expect(sel).toHaveAttribute("id", "emr-tab-radiology");
    expect(screen.getByRole("tabpanel")).toHaveAttribute("aria-labelledby", "emr-tab-radiology");
  });
});
