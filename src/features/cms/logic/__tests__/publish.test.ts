import { describe, it, expect } from "vitest";
import {
  canTransition, validatePublish, isVisibleNow, PAGE_STATUS_TONE,
} from "../publish";

const base = { title_en: "Hello", scheduled_at: null, status: "draft" as const };

describe("cms publish workflow", () => {
  describe("canTransition", () => {
    it("allows draft → scheduled, published, archived", () => {
      expect(canTransition("draft", "scheduled")).toBe(true);
      expect(canTransition("draft", "published")).toBe(true);
      expect(canTransition("draft", "archived")).toBe(true);
    });
    it("allows scheduled → published or back to draft", () => {
      expect(canTransition("scheduled", "published")).toBe(true);
      expect(canTransition("scheduled", "draft")).toBe(true);
    });
    it("disallows published → scheduled (must go via draft)", () => {
      expect(canTransition("published", "scheduled")).toBe(false);
    });
    it("archived only revives to draft", () => {
      expect(canTransition("archived", "draft")).toBe(true);
      expect(canTransition("archived", "published")).toBe(false);
    });
  });

  describe("validatePublish", () => {
    it("rejects no-op changes", () => {
      const r = validatePublish({ ...base, status: "draft" }, "draft", null);
      expect(r.ok).toBe(false);
      expect(r.error).toMatch(/No status change/i);
    });

    it("requires English title before publishing", () => {
      const r = validatePublish({ ...base, title_en: "" }, "published", null);
      expect(r.ok).toBe(false);
      expect(r.error).toMatch(/title/i);
    });

    it("publishes when title is present", () => {
      const r = validatePublish(base, "published", null);
      expect(r.ok).toBe(true);
    });

    it("requires scheduled_at when scheduling", () => {
      const r = validatePublish(base, "scheduled", null);
      expect(r.ok).toBe(false);
      expect(r.error).toMatch(/scheduled_at/i);
    });

    it("rejects scheduled_at in the past", () => {
      const past = new Date(Date.now() - 60_000).toISOString();
      const r = validatePublish(base, "scheduled", past);
      expect(r.ok).toBe(false);
      expect(r.error).toMatch(/future/i);
    });

    it("rejects malformed scheduled_at", () => {
      const r = validatePublish(base, "scheduled", "not-a-date");
      expect(r.ok).toBe(false);
      expect(r.error).toMatch(/valid date/i);
    });

    it("accepts scheduled_at in the future", () => {
      const future = new Date(Date.now() + 60 * 60_000).toISOString();
      const r = validatePublish(base, "scheduled", future);
      expect(r.ok).toBe(true);
    });

    it("rejects illegal transitions", () => {
      const r = validatePublish(
        { ...base, status: "published" }, "scheduled", null,
      );
      expect(r.ok).toBe(false);
      expect(r.error).toMatch(/Cannot move/);
    });
  });

  describe("isVisibleNow", () => {
    it("published is always visible", () => {
      expect(isVisibleNow({ status: "published", scheduled_at: null })).toBe(true);
    });
    it("draft and archived are never visible", () => {
      expect(isVisibleNow({ status: "draft", scheduled_at: null })).toBe(false);
      expect(isVisibleNow({ status: "archived", scheduled_at: null })).toBe(false);
    });
    it("scheduled is visible only after scheduled_at", () => {
      const future = new Date(Date.now() + 60_000).toISOString();
      const past   = new Date(Date.now() - 60_000).toISOString();
      expect(isVisibleNow({ status: "scheduled", scheduled_at: future })).toBe(false);
      expect(isVisibleNow({ status: "scheduled", scheduled_at: past })).toBe(true);
    });
    it("scheduled with no scheduled_at stays hidden", () => {
      expect(isVisibleNow({ status: "scheduled", scheduled_at: null })).toBe(false);
    });
  });

  it("PAGE_STATUS_TONE has a class for every status", () => {
    expect(PAGE_STATUS_TONE.draft).toBeTruthy();
    expect(PAGE_STATUS_TONE.published).toBeTruthy();
    expect(PAGE_STATUS_TONE.scheduled).toBeTruthy();
    expect(PAGE_STATUS_TONE.archived).toBeTruthy();
  });
});
