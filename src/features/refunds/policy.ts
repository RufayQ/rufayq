/**
 * Refund policy — single source of truth shared by admin and patient UIs.
 *
 * Mirrors the server-side `public.compute_refund_tier()` SQL function so the
 * two stay aligned. Keep this file pure (no React, no Supabase) so it can be
 * unit-tested in isolation and imported from anywhere.
 *
 * Tiers (time-elapsed only, in the current billing period):
 *   ≤ 25%       → FULL refund (100%)
 *   25% – 45%   → PARTIAL refund (50%)
 *   > 45%       → NO refund
 *
 * Add-ons are non-refundable by default; admins can issue manual overrides
 * (fixed amount or % of unit price) via `admin_issue_refund` RPC.
 */

export type RefundTier = "full" | "partial" | "none";

export interface RefundPreview {
  tier: RefundTier;
  /** 100, 50, or 0 — refund percentage of paid amount */
  pct: number;
  /** Refund amount, rounded to 2 decimals */
  amount: number;
  /** % of period elapsed at the time of computation (0..100) */
  elapsedPct: number;
}

/**
 * Compute the refund preview for a subscription cancellation.
 * Edge cases:
 *   - missing dates / amount ≤ 0 → none, 100% elapsed
 *   - end ≤ start (zero/negative duration) → none
 *   - now < start (future cancel) → full (still in period)
 *   - now > end (already finished) → none, 100% elapsed
 */
export function computeRefund(
  periodStart: Date | string | null | undefined,
  periodEnd: Date | string | null | undefined,
  amount: number | null | undefined,
  now: Date = new Date(),
): RefundPreview {
  const a = Number(amount ?? 0);
  if (!periodStart || !periodEnd || a <= 0) {
    return { tier: "none", pct: 0, amount: 0, elapsedPct: 100 };
  }
  const start = new Date(periodStart).getTime();
  const end = new Date(periodEnd).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
    return { tier: "none", pct: 0, amount: 0, elapsedPct: 100 };
  }
  const elapsedPct = Math.max(0, Math.min(100,
    ((now.getTime() - start) / (end - start)) * 100,
  ));
  if (elapsedPct <= 25) {
    return { tier: "full", pct: 100, amount: round2(a), elapsedPct: round2(elapsedPct) };
  }
  if (elapsedPct <= 45) {
    return { tier: "partial", pct: 50, amount: round2(a * 0.5), elapsedPct: round2(elapsedPct) };
  }
  return { tier: "none", pct: 0, amount: 0, elapsedPct: round2(elapsedPct) };
}

/**
 * Manual add-on refund preview. Add-ons are non-refundable by default —
 * this only validates the override an admin entered (% or fixed amount)
 * against the cap (unit_price × quantity).
 */
export function computeAddonOverride(
  unitPrice: number | null | undefined,
  quantity: number | null | undefined,
  override: { kind: "amount"; value: number } | { kind: "percent"; value: number },
): { amount: number; valid: boolean; cap: number } {
  const cap = round2(Number(unitPrice ?? 0) * Number(quantity ?? 1));
  const raw = override.kind === "amount"
    ? Number(override.value)
    : (cap * Number(override.value)) / 100;
  const amount = round2(raw);
  return { amount, valid: amount > 0 && amount <= cap, cap };
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/* ── Bilingual copy ─────────────────────────────────────────────────────── */

export const REFUND_COPY = {
  policyTitle: { en: "Refund policy", ar: "سياسة الاسترداد" },
  policyShort: {
    en: "≤25% of period = full refund · 25–45% = 50% · >45% = none",
    ar: "حتى 25٪ من المدة = استرداد كامل · 25–45٪ = 50٪ · أكثر من 45٪ = لا يوجد",
  },
  examples: {
    en: [
      "Day 5 of 30 → 16.7% elapsed → FULL refund",
      "Day 10 of 30 → 33.3% elapsed → 50% refund",
      "Day 20 of 30 → 66.7% elapsed → no refund",
    ],
    ar: [
      "اليوم 5 من 30 → 16.7٪ → استرداد كامل",
      "اليوم 10 من 30 → 33.3٪ → استرداد 50٪",
      "اليوم 20 من 30 → 66.7٪ → لا يوجد استرداد",
    ],
  },
  addonsNote: {
    en: "Add-ons are non-refundable unless an admin issues a manual override.",
    ar: "الإضافات غير قابلة للاسترداد إلا بقرار إداري.",
  },
  walletNote: {
    en: "Refunds are credited to your in-app wallet first, with a credit-note reference. You can request a bank payout from support.",
    ar: "تُضاف المبالغ المستردة إلى محفظتك داخل التطبيق أولاً مع إشعار دائن. يمكنك طلب تحويل بنكي عبر الدعم.",
  },
  tierLabel(tier: RefundTier, isAr: boolean): string {
    if (tier === "full") return isAr ? "استرداد كامل (100٪)" : "Full refund (100%)";
    if (tier === "partial") return isAr ? "استرداد جزئي (50٪)" : "Partial refund (50%)";
    return isAr ? "لا يوجد استرداد (>45٪)" : "No refund (>45%)";
  },
} as const;
