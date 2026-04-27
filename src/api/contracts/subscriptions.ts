/**
 * Subscription API contract.
 *
 * Zod schema is the canonical wire shape. TS type is inferred so the contract
 * and the type can never drift. Used by both web and mobile clients.
 */
import { z } from "zod";

export const SubscriptionStatusSchema = z.enum([
  "active",
  "trial",
  "pending_receipt",
  "past_due",
  "suspended",
  "pending_cancel",
  "cancelled",
  "expired",
  "rejected",
]);

export const BillingCycleSchema = z.enum(["monthly", "quarterly", "yearly"]);

/** Plan code stored as TEXT — UI normalises legacy lowercase values. */
export const SubscriptionPlanCodeSchema = z.string().min(1);

export const SubscriptionSchema = z.object({
  id: z.string().uuid(),
  device_id: z.string().min(1),
  plan: SubscriptionPlanCodeSchema,
  status: SubscriptionStatusSchema,
  billing_cycle: BillingCycleSchema,
  amount: z.number().nullable(),
  currency: z.string().min(3).max(8),
  current_period_start: z.string().nullable(),
  current_period_end: z.string().nullable(),
  activated_at: z.string().nullable(),
  notes: z.string().nullable(),
  created_at: z.string(),
});

/** Subset returned by `useSubscription` — used by the mobile dashboard too. */
export const SubscriptionSummarySchema = SubscriptionSchema.pick({
  id: true,
  plan: true,
  status: true,
  billing_cycle: true,
  current_period_end: true,
  amount: true,
  currency: true,
});

export type SubscriptionStatus = z.infer<typeof SubscriptionStatusSchema>;
export type BillingCycle = z.infer<typeof BillingCycleSchema>;
export type Subscription = z.infer<typeof SubscriptionSchema>;
export type SubscriptionSummary = z.infer<typeof SubscriptionSummarySchema>;
