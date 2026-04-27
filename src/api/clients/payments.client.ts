/**
 * Payments client — receipt upload + admin verification.
 * Returns `ApiResult<T>` envelopes; never throws.
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

export const paymentsClient = {
  /** Admin: list receipts (most-recent-first). */
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

  /** Patient: submit a manually-paid bank transfer receipt. */
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

  /** Admin: change a receipt's status (verified / rejected / needs_more_info). */
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

  /** Admin: total pending count (for badges). */
  async pendingCount(): Promise<ApiResult<number>> {
    const { count, error } = await supabase
      .from("payment_receipts")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending");
    if (error) return fail("query_failed", error.message);
    return ok(count ?? 0);
  },
};
