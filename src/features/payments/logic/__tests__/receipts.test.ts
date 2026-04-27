import { describe, it, expect } from "vitest";
import {
  receiptTone, isPendingReceipt,
  canStartReview, canRequestInfo, canVerify, canReject,
} from "../receipts";

describe("payment receipts state machine", () => {
  it("receiptTone covers every status", () => {
    expect(receiptTone("pending")).toContain("amber");
    expect(receiptTone("under_review")).toContain("amber");
    expect(receiptTone("needs_more_info")).toContain("orange");
    expect(receiptTone("verified")).toContain("emerald");
    expect(receiptTone("rejected")).toContain("rose");
  });

  it("receiptTone falls back to slate for unknown status", () => {
    expect(receiptTone("xyz")).toContain("slate");
  });

  it("isPendingReceipt matches the three open states", () => {
    expect(isPendingReceipt("pending")).toBe(true);
    expect(isPendingReceipt("under_review")).toBe(true);
    expect(isPendingReceipt("needs_more_info")).toBe(true);
    expect(isPendingReceipt("verified")).toBe(false);
    expect(isPendingReceipt("rejected")).toBe(false);
  });

  describe("transitions", () => {
    it("canStartReview only from pending", () => {
      expect(canStartReview("pending")).toBe(true);
      expect(canStartReview("under_review")).toBe(false);
      expect(canStartReview("verified")).toBe(false);
    });

    it("canRequestInfo from pending or under_review", () => {
      expect(canRequestInfo("pending")).toBe(true);
      expect(canRequestInfo("under_review")).toBe(true);
      expect(canRequestInfo("needs_more_info")).toBe(false);
      expect(canRequestInfo("verified")).toBe(false);
    });

    it("canVerify from any open state", () => {
      expect(canVerify("pending")).toBe(true);
      expect(canVerify("under_review")).toBe(true);
      expect(canVerify("needs_more_info")).toBe(true);
      expect(canVerify("verified")).toBe(false);
      expect(canVerify("rejected")).toBe(false);
    });

    it("canReject from any open state", () => {
      expect(canReject("pending")).toBe(true);
      expect(canReject("under_review")).toBe(true);
      expect(canReject("needs_more_info")).toBe(true);
      expect(canReject("verified")).toBe(false);
      expect(canReject("rejected")).toBe(false);
    });
  });
});
