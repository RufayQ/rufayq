import { describe, it, expect } from "vitest";
import {
  PLAN_CODES, statusTone, normalizePlanCode,
  canActivate, canSuspend, canResume, canCancel, nextStatuses,
} from "../statusMachine";

describe("subscription statusMachine", () => {
  it("PLAN_CODES holds the four spec tiers in order", () => {
    expect(PLAN_CODES).toEqual(["FREE", "STARTER", "COMPANION", "FAMILY"]);
  });

  it("statusTone returns a class for every known status", () => {
    expect(statusTone("active")).toContain("emerald");
    expect(statusTone("pending_receipt")).toContain("amber");
    expect(statusTone("suspended")).toContain("orange");
    expect(statusTone("cancelled")).toContain("rose");
  });

  it("statusTone falls back to slate for unknown status", () => {
    expect(statusTone("totally-fake")).toContain("slate");
  });

  it("normalizePlanCode handles uppercase canonical codes", () => {
    expect(normalizePlanCode("FREE")).toBe("FREE");
    expect(normalizePlanCode("STARTER")).toBe("STARTER");
    expect(normalizePlanCode("COMPANION")).toBe("COMPANION");
    expect(normalizePlanCode("FAMILY")).toBe("FAMILY");
  });

  it("normalizePlanCode maps legacy lowercase to spec tiers", () => {
    expect(normalizePlanCode("basic")).toBe("STARTER");
    expect(normalizePlanCode("pro")).toBe("COMPANION");
    expect(normalizePlanCode("premium")).toBe("FAMILY");
    expect(normalizePlanCode("free")).toBe("FREE");
  });

  it("normalizePlanCode returns null for unknown / nullish", () => {
    expect(normalizePlanCode("ENTERPRISE")).toBeNull();
    expect(normalizePlanCode(null)).toBeNull();
    expect(normalizePlanCode(undefined)).toBeNull();
    expect(normalizePlanCode("")).toBeNull();
  });

  describe("transitions", () => {
    it("canActivate is true except when already active", () => {
      expect(canActivate("active")).toBe(false);
      expect(canActivate("suspended")).toBe(true);
      expect(canActivate("pending_receipt")).toBe(true);
      expect(canActivate("cancelled")).toBe(true);
    });

    it("canSuspend only from active", () => {
      expect(canSuspend("active")).toBe(true);
      expect(canSuspend("suspended")).toBe(false);
      expect(canSuspend("cancelled")).toBe(false);
    });

    it("canResume only from suspended", () => {
      expect(canResume("suspended")).toBe(true);
      expect(canResume("active")).toBe(false);
      expect(canResume("cancelled")).toBe(false);
    });

    it("canCancel rejects already-cancelled and rejected", () => {
      expect(canCancel("active")).toBe(true);
      expect(canCancel("suspended")).toBe(true);
      expect(canCancel("cancelled")).toBe(false);
      expect(canCancel("rejected")).toBe(false);
    });

    it("nextStatuses lists legal moves from active", () => {
      const next = nextStatuses("active");
      expect(next).toContain("suspended");
      expect(next).toContain("cancelled");
      expect(next).not.toContain("active");
    });

    it("nextStatuses from cancelled is empty (terminal)", () => {
      expect(nextStatuses("cancelled")).toEqual([]);
    });
  });
});
