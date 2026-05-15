import { describe, it, expect } from "vitest";
import { formatDuration } from "@/lib/flightJourney";

describe("formatDuration", () => {
  it("formats sub-hour durations as Nm", () => {
    expect(formatDuration(45)).toBe("45m");
    expect(formatDuration(1)).toBe("1m");
  });

  it("formats sub-day durations as Hh Mm and drops 0m", () => {
    expect(formatDuration(60)).toBe("1h");
    expect(formatDuration(90)).toBe("1h 30m");
    expect(formatDuration(60 * 23 + 59)).toBe("23h 59m");
  });

  it("switches to days once duration is at least 24h", () => {
    expect(formatDuration(60 * 24)).toBe("1d");
    expect(formatDuration(60 * 25)).toBe("1d 1h");
    expect(formatDuration(60 * 48)).toBe("2d");
    expect(formatDuration(60 * 50)).toBe("2d 2h");
    expect(formatDuration(60 * 73)).toBe("3d 1h");
  });
});
