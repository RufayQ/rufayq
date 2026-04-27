/**
 * Payment-receipt verification state machine — single source of truth.
 * Status tones are shared with the subscription pill set so the admin UI
 * stays visually consistent.
 */
import type { PaymentStatus } from "@/shared/types/payment";

export const RECEIPT_STATUS_TONE: Record<PaymentStatus, string> = {
  pending: "bg-amber-500/15 text-amber-300",
  under_review: "bg-amber-500/15 text-amber-300",
  needs_more_info: "bg-orange-500/15 text-orange-300",
  verified: "bg-emerald-500/15 text-emerald-300",
  rejected: "bg-rose-500/15 text-rose-300",
  code_expired: "bg-orange-600/20 text-orange-400",
};

export const receiptTone = (s: string): string =>
  RECEIPT_STATUS_TONE[s as PaymentStatus] ?? "bg-slate-700 text-slate-300";

export const PENDING_RECEIPT_STATUSES: PaymentStatus[] = [
  "pending", "under_review", "needs_more_info",
];

export const isPendingReceipt = (s: string): boolean =>
  (PENDING_RECEIPT_STATUSES as string[]).includes(s);

/* ── Transition rules ─────────────────────────────────────────────────── */

export const canStartReview = (s: PaymentStatus): boolean => s === "pending";
export const canRequestInfo = (s: PaymentStatus): boolean =>
  s === "pending" || s === "under_review";
export const canVerify      = (s: PaymentStatus): boolean =>
  s === "pending" || s === "under_review" || s === "needs_more_info";
export const canReject      = (s: PaymentStatus): boolean =>
  s === "pending" || s === "under_review" || s === "needs_more_info";
