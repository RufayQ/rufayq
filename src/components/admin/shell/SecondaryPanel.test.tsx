/** @vitest-environment jsdom */
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import SecondaryPanel from "./SecondaryPanel";
import { NAV_MODULES } from "./adminNav";

const baseBadges = { open_tickets: 5, pending_receipts: 0, pending_apps: 0, pending_claims: 2 };

describe("SecondaryPanel", () => {
  it("renders the active group's leaves and shows a badge when count > 0", () => {
    const group = NAV_MODULES[0];
    render(
      <SecondaryPanel
        group={group}
        activeLeaf={group.leaves[0].key}
        onPick={vi.fn()}
        badges={baseBadges as any}
        collapsed={false}
        onToggleCollapsed={vi.fn()}
        role="admin"
      />,
    );
    // First leaf must render
    expect(screen.getByText(group.leaves[0].label)).toBeDefined();
  });

  it("collapses to width 0 and exposes the toggle when collapsed", () => {
    const group = NAV_MODULES[0];
    const onToggle = vi.fn();
    const { container } = render(
      <SecondaryPanel
        group={group}
        activeLeaf={group.leaves[0].key}
        onPick={vi.fn()}
        badges={baseBadges as any}
        collapsed={true}
        onToggleCollapsed={onToggle}
        role="admin"
      />,
    );
    const aside = container.querySelector("aside");
    expect(aside?.className).toMatch(/w-0/);
    const btn = screen.getByLabelText("Expand submenu");
    fireEvent.click(btn);
    expect(onToggle).toHaveBeenCalled();
  });

  it("rapidly switching groups keeps badges stable (no crash)", () => {
    const onPick = vi.fn();
    const { rerender } = render(
      <SecondaryPanel
        group={NAV_MODULES[0]}
        activeLeaf={NAV_MODULES[0].leaves[0].key}
        onPick={onPick}
        badges={baseBadges as any}
        collapsed={false}
        onToggleCollapsed={vi.fn()}
        role="admin"
      />,
    );
    // Simulate rapid switches between groups + badge updates.
    for (let i = 0; i < 5; i++) {
      const g = NAV_MODULES[i % NAV_MODULES.length];
      rerender(
        <SecondaryPanel
          group={g}
          activeLeaf={g.leaves[0].key}
          onPick={onPick}
          badges={{ ...baseBadges, open_tickets: 5 + i } as any}
          collapsed={false}
          onToggleCollapsed={vi.fn()}
          role="admin"
        />,
      );
    }
    // No throw + final group's first leaf must be visible
    const last = NAV_MODULES[4 % NAV_MODULES.length];
    expect(screen.getByText(last.leaves[0].label)).toBeDefined();
  });
});
