/**
 * Refund-policy edge-case coverage. These scenarios mirror the SQL
 * `compute_refund_tier()` function so we can catch drift between the two.
 */
import { describe, it, expect } from "vitest";
import { computeRefund, computeAddonOverride } from "../policy";

const days = (n: number) => n * 86_400_000;
const start = new Date("2026-01-01T00:00:00Z");

describe("computeRefund — time-elapsed tiers", () => {
  it("returns FULL refund at the very start of the period", () => {
    const r = computeRefund(start, new Date(start.getTime() + days(30)), 300, start);
    expect(r.tier).toBe("full");
    expect(r.pct).toBe(100);
    expect(r.amount).toBe(300);
  });

  it("returns FULL refund at exactly 25% elapsed (boundary inclusive)", () => {
    const end = new Date(start.getTime() + days(30));
    const now = new Date(start.getTime() + days(7.5)); // 25.0%
    const r = computeRefund(start, end, 200, now);
    expect(r.tier).toBe("full");
    expect(r.amount).toBe(200);
  });

  it("returns PARTIAL refund just past 25% (e.g. 30%)", () => {
    const end = new Date(start.getTime() + days(30));
    const now = new Date(start.getTime() + days(9)); // 30%
    const r = computeRefund(start, end, 200, now);
    expect(r.tier).toBe("partial");
    expect(r.pct).toBe(50);
    expect(r.amount).toBe(100);
  });

  it("returns PARTIAL refund at exactly 45% elapsed (boundary inclusive)", () => {
    const end = new Date(start.getTime() + days(30));
    const now = new Date(start.getTime() + days(13.5)); // 45%
    const r = computeRefund(start, end, 200, now);
    expect(r.tier).toBe("partial");
    expect(r.amount).toBe(100);
  });

  it("returns NONE just past 45% (e.g. 46%)", () => {
    const end = new Date(start.getTime() + days(30));
    const now = new Date(start.getTime() + days(13.8)); // 46%
    const r = computeRefund(start, end, 200, now);
    expect(r.tier).toBe("none");
    expect(r.amount).toBe(0);
  });

  it("returns NONE after the period has ended (>100% elapsed)", () => {
    const end = new Date(start.getTime() + days(30));
    const now = new Date(start.getTime() + days(60));
    const r = computeRefund(start, end, 200, now);
    expect(r.tier).toBe("none");
    expect(r.elapsedPct).toBe(100);
  });
});

describe("computeRefund — degenerate inputs", () => {
  it("handles zero-duration periods (start == end) safely", () => {
    const r = computeRefund(start, start, 100, start);
    expect(r.tier).toBe("none");
    expect(r.amount).toBe(0);
    expect(r.elapsedPct).toBe(100);
  });

  it("handles negative-duration periods (end < start) safely", () => {
    const end = new Date(start.getTime() - days(5));
    const r = computeRefund(start, end, 100, start);
    expect(r.tier).toBe("none");
  });

  it("returns no refund for amount = 0", () => {
    const end = new Date(start.getTime() + days(30));
    const r = computeRefund(start, end, 0, start);
    expect(r.amount).toBe(0);
  });

  it("returns no refund for null period", () => {
    expect(computeRefund(null, null, 100).tier).toBe("none");
    expect(computeRefund(start, null, 100).tier).toBe("none");
  });

  it("clamps elapsed to 0 when 'now' precedes start (future-dated cancel)", () => {
    const end = new Date(start.getTime() + days(30));
    const before = new Date(start.getTime() - days(2));
    const r = computeRefund(start, end, 100, before);
    expect(r.elapsedPct).toBe(0);
    expect(r.tier).toBe("full");
  });

  it("rounds amount to 2 decimals (not floating-point noise)", () => {
    const end = new Date(start.getTime() + days(30));
    const now = new Date(start.getTime() + days(10)); // 33.3% → partial 50%
    const r = computeRefund(start, end, 199.99, now);
    expect(r.amount).toBe(100); // 99.995 → 100.00 after round
  });
});

describe("computeAddonOverride — manual admin refunds", () => {
  it("accepts a valid percentage", () => {
    const r = computeAddonOverride(100, 1, { kind: "percent", value: 50 });
    expect(r).toEqual({ amount: 50, valid: true, cap: 100 });
  });

  it("respects quantity when computing the cap", () => {
    const r = computeAddonOverride(50, 3, { kind: "percent", value: 100 });
    expect(r.cap).toBe(150);
    expect(r.amount).toBe(150);
    expect(r.valid).toBe(true);
  });

  it("rejects amount that exceeds the cap", () => {
    const r = computeAddonOverride(100, 1, { kind: "amount", value: 150 });
    expect(r.valid).toBe(false);
  });

  it("rejects zero or negative amounts", () => {
    expect(computeAddonOverride(100, 1, { kind: "amount", value: 0 }).valid).toBe(false);
    expect(computeAddonOverride(100, 1, { kind: "percent", value: 0 }).valid).toBe(false);
  });

  it("treats missing unit price as zero cap (no refund possible)", () => {
    const r = computeAddonOverride(null, 1, { kind: "percent", value: 50 });
    expect(r.cap).toBe(0);
    expect(r.valid).toBe(false);
  });
});

/* ── Device-mismatch scenario ─────────────────────────────────────────────
 * The wallet credit RPC matches by (user_id, device_id). When neither is
 * present, the function should refuse rather than silently create an
 * orphaned wallet. We assert the *policy* contract here (the SQL test
 * lives in the migration). The local helper guards against amount=0 which
 * is the JS-side analogue of the same check.
 */
describe("computeRefund — device-mismatch guard (amount=0 short-circuit)", () => {
  it("returns no refund when amount is null (caller would skip credit_wallet)", () => {
    const end = new Date(start.getTime() + days(30));
    const r = computeRefund(start, end, null, start);
    expect(r.amount).toBe(0);
    expect(r.tier).toBe("none");
  });
});
