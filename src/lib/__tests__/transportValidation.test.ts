import { describe, it, expect } from "vitest";
import {
  validateTransportSegment,
  fieldErrorMap,
  hasBlockingErrors,
} from "@/lib/transportValidation";
import type { TransportSegment } from "@/components/TransportCard";

const base = (overrides: Partial<TransportSegment> = {}): TransportSegment => ({
  id: "t1",
  type: "train",
  status: "upcoming",
  fromCity: "Riyadh",
  toCity: "Jeddah",
  departureDateTime: "2026-01-01T08:00:00",
  arrivalDateTime: "2026-01-01T12:00:00",
  ...overrides,
});

describe("validateTransportSegment", () => {
  describe("common rules", () => {
    it("returns no errors for a fully populated train segment", () => {
      const issues = validateTransportSegment(base({ trainNumber: "HHR-203" }));
      expect(hasBlockingErrors(issues)).toBe(false);
      expect(issues.filter((i) => i.level === "warning")).toHaveLength(0);
    });

    it("flags missing departure city as error on `fromCity`", () => {
      const issues = validateTransportSegment(base({ fromCity: "" }));
      expect(fieldErrorMap(issues).fromCity).toMatch(/required/i);
    });

    it("flags missing arrival city as error on `toCity`", () => {
      const issues = validateTransportSegment(base({ toCity: "" }));
      expect(fieldErrorMap(issues).toCity).toMatch(/required/i);
    });

    it("flags identical from/to (case-insensitive) as `route` error", () => {
      const issues = validateTransportSegment(base({ fromCity: "RIYADH", toCity: "riyadh" }));
      expect(fieldErrorMap(issues).route).toMatch(/different/i);
    });

    it("flags arrival before departure as `arrivalDateTime` error", () => {
      const issues = validateTransportSegment(
        base({ departureDateTime: "2026-01-02T10:00:00", arrivalDateTime: "2026-01-02T09:00:00" })
      );
      expect(fieldErrorMap(issues).arrivalDateTime).toMatch(/after departure/i);
    });

    it("flags arrival equal to departure as error", () => {
      const issues = validateTransportSegment(
        base({ departureDateTime: "2026-01-02T10:00:00", arrivalDateTime: "2026-01-02T10:00:00" })
      );
      expect(fieldErrorMap(issues).arrivalDateTime).toMatch(/after departure/i);
    });

    it("flags missing departureDateTime / arrivalDateTime", () => {
      const issues = validateTransportSegment(
        base({ departureDateTime: "", arrivalDateTime: "" })
      );
      const map = fieldErrorMap(issues);
      expect(map.departureDateTime).toBeTruthy();
      expect(map.arrivalDateTime).toBeTruthy();
    });

    it("hasBlockingErrors is false when only warnings exist", () => {
      const issues = validateTransportSegment(base({ trainNumber: undefined }));
      expect(hasBlockingErrors(issues)).toBe(false);
      expect(issues.some((i) => i.level === "warning" && i.field === "trainNumber")).toBe(true);
    });
  });

  describe("per-type warnings", () => {
    it("flight: warns on missing airline + flightNumber", () => {
      const issues = validateTransportSegment(base({ type: "flight" }));
      const fields = issues.filter((i) => i.level === "warning").map((i) => i.field);
      expect(fields).toEqual(expect.arrayContaining(["airline", "flightNumber"]));
    });

    it("flight: no warning when airline + flightNumber present", () => {
      const issues = validateTransportSegment(
        base({ type: "flight", airline: "Saudia", flightNumber: "SV123" })
      );
      expect(issues.filter((i) => i.level === "warning")).toHaveLength(0);
    });

    it("train: warns on missing trainNumber", () => {
      const issues = validateTransportSegment(base({ type: "train" }));
      expect(issues.find((i) => i.field === "trainNumber")?.level).toBe("warning");
    });

    it("bus: warns on missing busNumber", () => {
      const issues = validateTransportSegment(base({ type: "bus" }));
      expect(issues.find((i) => i.field === "busNumber")?.level).toBe("warning");
    });

    it("taxi: warns on missing taxiProvider", () => {
      const issues = validateTransportSegment(base({ type: "taxi" }));
      expect(issues.find((i) => i.field === "taxiProvider")?.level).toBe("warning");
    });

    it("rental: warns on missing rentalCompany", () => {
      const issues = validateTransportSegment(base({ type: "rental" }));
      expect(issues.find((i) => i.field === "rentalCompany")?.level).toBe("warning");
    });

    it("medical: warns on missing mobilityType", () => {
      const issues = validateTransportSegment(base({ type: "medical" }));
      expect(issues.find((i) => i.field === "mobilityType")?.level).toBe("warning");
    });
  });

  describe("fieldErrorMap", () => {
    it("only includes errors, not warnings", () => {
      const issues = validateTransportSegment(
        base({ type: "flight", fromCity: "" })
      );
      const map = fieldErrorMap(issues);
      expect(map.fromCity).toBeTruthy();
      expect(map.airline).toBeUndefined(); // warning, not error
    });

    it("keeps the first error per field on duplicates", () => {
      const map = fieldErrorMap([
        { field: "fromCity", message: "first", level: "error" },
        { field: "fromCity", message: "second", level: "error" },
      ]);
      expect(map.fromCity).toBe("first");
    });
  });
});
