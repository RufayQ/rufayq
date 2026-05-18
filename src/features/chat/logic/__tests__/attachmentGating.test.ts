import { describe, it, expect } from "vitest";
import { canUploadDeviceFiles, canAttachFromRecords } from "../attachmentGating";

describe("chat attachment gating", () => {
  describe("canAttachFromRecords — My Records button is always enabled", () => {
    it.each([
      ["null (guest)", null],
      ["undefined", undefined],
      ["FREE", "FREE"],
      ["STARTER", "STARTER"],
      ["COMPANION", "COMPANION"],
      ["FAMILY", "FAMILY"],
      ["legacy lowercase free", "free"],
      ["legacy lowercase companion", "companion"],
      ["unknown plan", "ENTERPRISE"],
    ])("returns true for %s", (_label, plan) => {
      expect(canAttachFromRecords(plan as any)).toBe(true);
    });
  });

  describe("canUploadDeviceFiles — Camera/Files is Companion+ only", () => {
    it.each([
      [null, false],
      [undefined, false],
      ["FREE", false],
      ["STARTER", false],
      ["COMPANION", true],
      ["FAMILY", true],
      ["companion", true],
      ["family", true],
      ["starter", false],
    ])("plan=%s → %s", (plan, expected) => {
      expect(canUploadDeviceFiles(plan as any)).toBe(expected);
    });
  });
});
