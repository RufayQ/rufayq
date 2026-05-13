import { describe, expect, it } from "vitest";
import { computeProgress, daysBetween, formatDate } from "@/lib/journeyOverview";

describe("journeyOverview helpers", () => {
  it("daysBetween returns null for invalid input", () => {
    expect(daysBetween(null, null)).toBeNull();
    expect(daysBetween("not-a-date", "2026-01-01")).toBeNull();
  });

  it("daysBetween returns whole days, never negative", () => {
    expect(daysBetween("2026-01-01", "2026-01-11")).toBe(10);
    expect(daysBetween("2026-01-11", "2026-01-01")).toBe(0);
  });

  it("formatDate handles missing and invalid dates", () => {
    expect(formatDate(null)).toBe("TBD");
    expect(formatDate("garbage")).toBe("garbage");
    expect(formatDate("2026-04-05")).toMatch(/Apr/);
  });

  it("computeProgress falls back gracefully without dates", () => {
    const r = computeProgress(null, null);
    expect(r.totalDays).toBeNull();
    expect(r.dayN).toBeNull();
    expect(r.daysLeft).toBeNull();
    expect(r.progressPct).toBe(20);
  });

  it("computeProgress clamps progress between 8 and 100", () => {
    const past = new Date(Date.now() - 100 * 86400000).toISOString().slice(0, 10);
    const future = new Date(Date.now() + 100 * 86400000).toISOString().slice(0, 10);
    const r = computeProgress(past, future);
    expect(r.progressPct).toBeGreaterThanOrEqual(8);
    expect(r.progressPct).toBeLessThanOrEqual(100);
    expect(r.daysLeft).not.toBeNull();
  });
});
