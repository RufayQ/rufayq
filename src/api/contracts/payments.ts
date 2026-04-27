/**
 * Payment / receipt API contract.
 *
 * Mirrors the `payment_receipts` table. The status field is stored as TEXT
 * in the DB (no enum) so we accept any string but expose `KNOWN_PAYMENT_STATUSES`
 * for UI helpers — see `features/payments/logic/receipts.ts`.
 */
import { z } from "zod";

export const KNOWN_PAYMENT_STATUSES = [
  "pending",
  "under_review",
  "needs_more_info",
  "verified",
  "rejected",
  "code_expired",
] as const;

export const PaymentStatusSchema = z.string().min(1);
export const PaymentChannelSchema = z.string().min(1);
/** Re-uses the same `monthly|quarterly|yearly` set as subscriptions. */
export { BillingCycleSchema } from "./subscriptions";
import { BillingCycleSchema } from "./subscriptions";

export const PaymentReceiptSchema = z.object({
  id: z.string().uuid(),
  device_id: z.string().min(1),
  subscription_id: z.string().uuid().nullable(),
  requested_plan: z.string().min(1),
  billing_cycle: BillingCycleSchema,
  amount: z.number(),
  currency: z.string().min(3).max(8),
  payment_method: z.string().min(1),
  reference_no: z.string().nullable(),
  receipt_file_path: z.string().nullable(),
  payer_name: z.string().nullable(),
  payer_phone: z.string().nullable(),
  payment_reference: z.string().nullable(),
  submission_channel: PaymentChannelSchema,
  bank_name: z.string().nullable(),
  transfer_date: z.string().nullable(),
  patient_message: z.string().nullable(),
  internal_note: z.string().nullable(),
  status: PaymentStatusSchema,
  reviewer_notes: z.string().nullable(),
  reviewed_at: z.string().nullable(),
  created_at: z.string(),
});

export const ReceiptUploadSchema = z.object({
  device_id: z.string().min(1),
  requested_plan: z.string().min(1),
  billing_cycle: BillingCycleSchema,
  amount: z.number().positive(),
  currency: z.string().min(3).max(8),
  payment_method: z.string().min(1),
  receipt_file_path: z.string().nullable(),
  payer_name: z.string().nullable(),
  payer_phone: z.string().nullable(),
  bank_name: z.string().nullable(),
  transfer_date: z.string().nullable(),
  reference_no: z.string().nullable(),
  patient_message: z.string().nullable(),
  submission_channel: PaymentChannelSchema.default("web"),
});

export const ReceiptStatusUpdateSchema = z.object({
  status: PaymentStatusSchema,
  reviewer_notes: z.string().nullable().optional(),
  internal_note: z.string().nullable().optional(),
});

export type PaymentReceipt = z.infer<typeof PaymentReceiptSchema>;
export type ReceiptUpload = z.infer<typeof ReceiptUploadSchema>;
export type ReceiptStatusUpdate = z.infer<typeof ReceiptStatusUpdateSchema>;
export type PaymentStatusValue = (typeof KNOWN_PAYMENT_STATUSES)[number];
