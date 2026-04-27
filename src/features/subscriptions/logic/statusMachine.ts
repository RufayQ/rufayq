/**
 * Subscription status machine — single source of truth for:
 *   - status → tone class (used by every admin & patient surface)
 *   - legal transitions (canActivate / canSuspend / canResume / canCancel)
 *   - plan-code normalisation between legacy lowercase and spec uppercase
 *
 * Phase 1 of the refactor: components import from here instead of redefining
 * STATUS_TONE / PLAN_OPTIONS locally.
 */
import type {
  SubscriptionStatus,
  SubscriptionPlan,
} from "@/shared/types/subscription";

/** Canonical plan codes per the RufayQ pricing spec. */
export const PLAN_CODES: readonly SubscriptionPlan[] = [
  "FREE",
  "STARTER",
  "COMPANION",
  "FAMILY",
] as const;

/** Tone classes (Tailwind) shared by every status pill in the app. */
export const STATUS_TONE: Record<SubscriptionStatus, string> = {
  active: "bg-emerald-500/15 text-emerald-300",
  trial: "bg-amber-500/15 text-amber-300",
  pending_receipt: "bg-amber-500/15 text-amber-300",
  past_due: "bg-orange-500/15 text-orange-300",
  suspended: "bg-orange-500/15 text-orange-300",
  pending_cancel: "bg-rose-500/10 text-rose-300",
  cancelled: "bg-rose-500/15 text-rose-300",
  expired: "bg-slate-500/15 text-slate-300",
  rejected: "bg-rose-500/15 text-rose-300",
};

export const statusTone = (s: string): string =>
  STATUS_TONE[s as SubscriptionStatus] ?? "bg-slate-700/50 text-slate-300";

/**
 * Normalise an arbitrary plan string from the DB into a canonical PlanCode,
 * or `null` if it doesn't map to one of the four spec tiers.
 *
 * Legacy mapping: basic→STARTER, pro→COMPANION, premium→FAMILY.
 */
export const normalizePlanCode = (raw: string | null | undefined): SubscriptionPlan | null => {
  if (!raw) return null;
  const u = raw.toUpperCase();
  if ((PLAN_CODES as readonly string[]).includes(u)) return u as SubscriptionPlan;
  switch (raw.toLowerCase()) {
    case "basic": return "STARTER";
    case "pro":
    case "companion": return "COMPANION";
    case "premium":
    case "family": return "FAMILY";
    case "free": return "FREE";
    default: return null;
  }
};

/* ── Transition rules ─────────────────────────────────────────────────── */

export const canActivate = (s: SubscriptionStatus): boolean => s !== "active";
export const canSuspend  = (s: SubscriptionStatus): boolean => s === "active";
export const canResume   = (s: SubscriptionStatus): boolean => s === "suspended";
export const canCancel   = (s: SubscriptionStatus): boolean =>
  s !== "cancelled" && s !== "rejected";

/** Returns the set of statuses a row may legally transition to. */
export const nextStatuses = (s: SubscriptionStatus): SubscriptionStatus[] => {
  const out: SubscriptionStatus[] = [];
  if (canActivate(s)) out.push("active");
  if (canSuspend(s))  out.push("suspended");
  if (canResume(s))   out.push("active");
  if (canCancel(s))   out.push("cancelled");
  return out;
};
