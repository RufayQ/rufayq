/**
 * Payment / receipt domain types.
 * Used by both the admin verification UI and the patient bank-transfer flow.
 */

export type PaymentStatus =
  | "pending"
  | "under_review"
  | "needs_more_info"
  | "verified"
  | "rejected";

export interface PaymentReceipt {
  id: string;
  device_id: string;
  subscription_id: string | null;
  plan: string;
  billing_cycle: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  reviewer_notes: string | null;
  receipt_url: string | null;
  created_at: string;
}

export interface SubscriptionAddon {
  id: string;
  subscription_id: string;
  addon_key: string;
  addon_label: string;
  quantity: number;
  unit_price: number | null;
  currency: string;
  active_from: string;
  active_until: string | null;
  is_active: boolean;
  created_at: string;
}
