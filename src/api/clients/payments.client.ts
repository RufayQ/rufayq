/**
 * Payments client — receipts, subscriptions and add-ons.
 *
 * Returns `ApiResult<T>` envelopes; never throws. The admin payments UI and
 * (future) mobile admin shell both consume this surface so the contract stays
 * identical across platforms.
 */
import { supabase } from "@/integrations/supabase/client";
import {
  PaymentReceiptSchema,
  ReceiptUploadSchema,
  ReceiptStatusUpdateSchema,
  type PaymentReceipt,
  type ReceiptUpload,
  type ReceiptStatusUpdate,
} from "@/api/contracts/payments";
import type { ApiResult } from "@/api/clients/subscriptions.client";

const ok = <T>(data: T): ApiResult<T> => ({ data, error: null });
const fail = <T = never>(code: string, message: string): ApiResult<T> =>
  ({ data: null, error: { code, message } });

const PERIOD_DAYS: Record<string, number> = { monthly: 30, quarterly: 90, yearly: 365 };

// --- Lightweight row shapes used by admin UI (kept loose intentionally so we
//     don't break on optional columns added later). ---
export interface SubscriptionRow {
  id: string; device_id: string; plan: string; status: string;
  billing_cycle: string; amount: number | null; currency: string;
  current_period_start: string | null; current_period_end: string | null;
  activated_by: string | null; activated_at: string | null;
  notes: string | null; provider: string;
  created_at: string;
}

export interface AddonRow {
  id: string; subscription_id: string; addon_key: string; addon_label: string;
  quantity: number; unit_price: number | null; currency: string;
  active_from: string; active_until: string | null; is_active: boolean;
  created_at: string;
}

export const paymentsClient = {
  // ───────── Receipts ─────────
  async list(limit = 500): Promise<ApiResult<PaymentReceipt[]>> {
    const { data, error } = await supabase
      .from("payment_receipts")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) return fail("query_failed", error.message);
    const parsed = PaymentReceiptSchema.array().safeParse(data ?? []);
    if (!parsed.success) return fail("contract_violation", parsed.error.message);
    return ok(parsed.data);
  },

  async upload(input: ReceiptUpload): Promise<ApiResult<PaymentReceipt>> {
    const parsed = ReceiptUploadSchema.safeParse(input);
    if (!parsed.success) return fail("invalid_input", parsed.error.message);
    const { data, error } = await supabase
      .from("payment_receipts")
      .insert(parsed.data as never)
      .select()
      .single();
    if (error) return fail("insert_failed", error.message);
    const out = PaymentReceiptSchema.safeParse(data);
    if (!out.success) return fail("contract_violation", out.error.message);
    return ok(out.data);
  },

  /**
   * Pre-create a `pending` receipt row at the start of the bank-transfer flow
   * so the patient sees the canonical `payment_reference` (set by the DB
   * trigger) before they go to their bank app. The same row is later updated
   * by `attachAndSubmit` once they upload proof — guaranteeing the admin
   * queue is never empty for a real payer.
   */
  async createPendingReceipt(input: {
    device_id: string;
    requested_plan: string;
    billing_cycle: "monthly" | "yearly" | "quarterly";
    currency: string;
    amount: number;
    payment_method: string;
    payer_name?: string | null;
    payer_phone?: string | null;
    submission_channel?: string;
  }): Promise<ApiResult<PaymentReceipt>> {
    const { data, error } = await supabase
      .from("payment_receipts")
      .insert({
        device_id: input.device_id,
        requested_plan: input.requested_plan,
        billing_cycle: input.billing_cycle,
        currency: input.currency,
        amount: input.amount,
        payment_method: input.payment_method,
        payer_name: input.payer_name ?? null,
        payer_phone: input.payer_phone ?? null,
        submission_channel: input.submission_channel ?? "web",
        status: "pending",
      } as never)
      .select()
      .single();
    if (error) return fail("insert_failed", error.message);
    const out = PaymentReceiptSchema.safeParse(data);
    if (!out.success) return fail("contract_violation", out.error.message);
    return ok(out.data);
  },

  /**
   * Patient finished the bank transfer and uploaded proof — flip the
   * existing pending row to `under_review` with the receipt details.
   */
  async attachAndSubmit(id: string, patch: {
    receipt_file_path?: string | null;
    submission_channel?: string;
    bank_name?: string | null;
    transfer_date?: string | null;
    reference_no?: string | null;
    payer_name?: string | null;
    payer_phone?: string | null;
    patient_message?: string | null;
  }): Promise<ApiResult<true>> {
    const { error } = await supabase
      .from("payment_receipts")
      .update({ ...patch, status: "under_review" } as never)
      .eq("id", id);
    if (error) return fail("update_failed", error.message);
    return ok(true);
  },

  async updateStatus(id: string, patch: ReceiptStatusUpdate): Promise<ApiResult<true>> {
    const parsed = ReceiptStatusUpdateSchema.safeParse(patch);
    if (!parsed.success) return fail("invalid_input", parsed.error.message);
    const { error } = await supabase
      .from("payment_receipts")
      .update({ ...parsed.data, reviewed_at: new Date().toISOString() } as never)
      .eq("id", id);
    if (error) return fail("update_failed", error.message);
    return ok(true);
  },

  async pendingCount(): Promise<ApiResult<number>> {
    const { count, error } = await supabase
      .from("payment_receipts")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending");
    if (error) return fail("query_failed", error.message);
    return ok(count ?? 0);
  },

  /** Mark a receipt as `under_review` — assigns the current admin as reviewer. */
  async markUnderReview(id: string): Promise<ApiResult<true>> {
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("payment_receipts").update({
      status: "under_review",
      reviewer_id: user?.id ?? null,
    } as never).eq("id", id);
    if (error) return fail("update_failed", error.message);
    return ok(true);
  },

  /** Ask patient for more info — stores both the public message and an internal note. */
  async requestMoreInfo(id: string, patientMsg: string, internalNote?: string): Promise<ApiResult<true>> {
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("payment_receipts").update({
      status: "needs_more_info",
      reviewer_id: user?.id ?? null,
      patient_message: patientMsg,
      internal_note: internalNote || null,
      reviewed_at: new Date().toISOString(),
    } as never).eq("id", id);
    if (error) return fail("update_failed", error.message);
    return ok(true);
  },

  /** Reject a receipt with an explanation visible to the patient. */
  async reject(id: string, patientMsg: string, internalNote?: string): Promise<ApiResult<true>> {
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("payment_receipts").update({
      status: "rejected",
      reviewer_id: user?.id ?? null,
      reviewer_notes: patientMsg,
      patient_message: patientMsg,
      internal_note: internalNote || null,
      reviewed_at: new Date().toISOString(),
    } as never).eq("id", id);
    if (error) return fail("update_failed", error.message);
    return ok(true);
  },

  /**
   * Verify a receipt: expires any active sub on the same device, creates the
   * paid subscription, and links the receipt back to it.
   */
  async verifyAndActivate(receipt: PaymentReceipt): Promise<ApiResult<{ subscriptionId: string }>> {
    const days = PERIOD_DAYS[receipt.billing_cycle] ?? 30;
    const start = new Date();
    const end = new Date(Date.now() + days * 86400000);
    const { data: { user } } = await supabase.auth.getUser();

    await supabase.from("user_subscriptions")
      .update({ status: "expired" } as never)
      .eq("device_id", receipt.device_id).eq("status", "active");

    const { data: subRow, error: subErr } = await supabase.from("user_subscriptions").insert({
      device_id: receipt.device_id,
      plan: receipt.requested_plan,
      status: "active",
      billing_cycle: receipt.billing_cycle,
      amount: receipt.amount,
      currency: receipt.currency,
      current_period_start: start.toISOString(),
      current_period_end: end.toISOString(),
      activated_by: user?.id ?? null,
      activated_at: start.toISOString(),
      provider: "manual",
      payment_receipt_id: receipt.id,
      notes: `Verified from receipt ${receipt.id.slice(0, 8)}`,
    } as never).select().single();
    if (subErr || !subRow) return fail("insert_failed", subErr?.message ?? "Could not create subscription");

    const { error: rErr } = await supabase.from("payment_receipts").update({
      status: "verified",
      subscription_id: (subRow as { id: string }).id,
      reviewer_id: user?.id ?? null,
      reviewed_at: new Date().toISOString(),
    } as never).eq("id", receipt.id);
    if (rErr) return fail("update_failed", rErr.message);

    return ok({ subscriptionId: (subRow as { id: string }).id });
  },

  async getSignedReceiptUrl(path: string, expiresIn = 60): Promise<ApiResult<string>> {
    const { data, error } = await supabase.storage
      .from("payment-receipts")
      .createSignedUrl(path, expiresIn);
    if (error) return fail("storage_failed", error.message);
    return ok(data.signedUrl);
  },

  // ───────── Subscriptions (admin) ─────────
  async listSubscriptions(limit = 500): Promise<ApiResult<SubscriptionRow[]>> {
    const { data, error } = await supabase
      .from("user_subscriptions").select("*")
      .order("created_at", { ascending: false }).limit(limit);
    if (error) return fail("query_failed", error.message);
    return ok((data ?? []) as SubscriptionRow[]);
  },

  async activateSubscription(s: SubscriptionRow): Promise<ApiResult<{ end: Date }>> {
    const days = PERIOD_DAYS[s.billing_cycle] ?? 30;
    const start = new Date();
    const end = new Date(Date.now() + days * 86400000);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("user_subscriptions").update({
      status: "active",
      current_period_start: start.toISOString(),
      current_period_end: end.toISOString(),
      activated_by: user?.id ?? null,
      activated_at: start.toISOString(),
    } as never).eq("id", s.id);
    if (error) return fail("update_failed", error.message);
    return ok({ end });
  },

  async cancelSubscription(id: string): Promise<ApiResult<true>> {
    const { error } = await supabase.from("user_subscriptions").update({
      status: "cancelled",
      cancelled_at: new Date().toISOString(),
    } as never).eq("id", id);
    if (error) return fail("update_failed", error.message);
    return ok(true);
  },

  async extendSubscription(s: SubscriptionRow, days: number): Promise<ApiResult<{ end: Date }>> {
    const base = s.current_period_end ? new Date(s.current_period_end) : new Date();
    const newEnd = new Date(Math.max(base.getTime(), Date.now()) + days * 86400000);
    const { error } = await supabase.from("user_subscriptions").update({
      current_period_end: newEnd.toISOString(),
    } as never).eq("id", s.id);
    if (error) return fail("update_failed", error.message);
    return ok({ end: newEnd });
  },

  // ───────── Add-ons ─────────
  async listAddons(limit = 500): Promise<ApiResult<AddonRow[]>> {
    const { data, error } = await supabase
      .from("user_subscription_addons").select("*")
      .order("created_at", { ascending: false }).limit(limit);
    if (error) return fail("query_failed", error.message);
    return ok((data ?? []) as unknown as AddonRow[]);
  },

  async addAddon(input: {
    subscription_id: string; addon_key: string; addon_label: string;
    quantity: number; unit_price: number; currency?: string;
  }): Promise<ApiResult<true>> {
    const { error } = await supabase.from("user_subscription_addons").insert({
      ...input, currency: input.currency ?? "SAR",
    } as never);
    if (error) return fail("insert_failed", error.message);
    return ok(true);
  },

  async removeAddon(id: string): Promise<ApiResult<true>> {
    const { error } = await supabase.from("user_subscription_addons").delete().eq("id", id);
    if (error) return fail("delete_failed", error.message);
    return ok(true);
  },
};
