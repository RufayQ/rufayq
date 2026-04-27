/**
 * Subscription domain types — single source of truth.
 *
 * Plan codes are uppercase per spec (FREE/STARTER/COMPANION/FAMILY) but the
 * DB historically holds lowercase legacy values too; UI normalises with
 * `normalizePlanCode()` from `features/subscriptions/logic/statusMachine`.
 */

export type SubscriptionPlan = "FREE" | "STARTER" | "COMPANION" | "FAMILY";

export type SubscriptionStatus =
  | "active"
  | "trial"
  | "pending_receipt"
  | "past_due"
  | "suspended"
  | "pending_cancel"
  | "cancelled"
  | "expired"
  | "rejected";

export type BillingCycle = "monthly" | "quarterly" | "yearly";

export interface Subscription {
  id: string;
  device_id: string;
  /** Stored as TEXT — may be legacy lowercase. Normalise before display. */
  plan: string;
  status: SubscriptionStatus;
  billing_cycle: BillingCycle;
  amount: number | null;
  currency: string;
  current_period_start: string | null;
  current_period_end: string | null;
  activated_at: string | null;
  notes: string | null;
  created_at: string;
}
