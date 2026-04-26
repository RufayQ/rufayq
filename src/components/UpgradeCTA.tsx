/**
 * UpgradeCTA — modal for users to submit a manual payment receipt to upgrade.
 *
 * Modular: lives independently and can be removed without touching pricing or
 * subscription logic. Used by PricingScreen + ChatScreen "Upgrade" buttons.
 *
 * Flow:
 *  1. User picks plan + cycle, sees price & bank/STC details.
 *  2. Uploads receipt image/pdf to {device_id}/{ts}-{file} in payment-receipts bucket.
 *  3. Inserts payment_receipts row (status=pending) — admin verifies in /admin.
 *  4. After verification, user_subscriptions row activates and useSubscription refreshes.
 */
import { useState } from "react";
import { X, Upload, Loader2, CheckCircle2, Crown } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getDeviceId } from "@/hooks/useDeviceId";

type Plan = "basic" | "companion" | "family" | "premium";
type Cycle = "monthly" | "yearly";

const PLAN_PRICES: Record<Plan, { monthly: number; yearly: number; credits: number; nameAr: string }> = {
  basic:     { monthly: 29,  yearly: 290,  credits: 25,  nameAr: "أساسي" },
  companion: { monthly: 59,  yearly: 590,  credits: 50,  nameAr: "رفيق" },
  family:    { monthly: 99,  yearly: 990,  credits: 100, nameAr: "العائلة" },
  premium:   { monthly: 199, yearly: 1990, credits: 200, nameAr: "متميز" },
};

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  defaultPlan?: Plan;
}

const UpgradeCTA = ({ open, onClose, onSuccess, defaultPlan = "companion" }: Props) => {
  const [plan, setPlan] = useState<Plan>(defaultPlan);
  const [cycle, setCycle] = useState<Cycle>("monthly");
  const [method, setMethod] = useState<"bank_transfer" | "stc_pay" | "mada">("bank_transfer");
  const [reference, setReference] = useState("");
  const [payerName, setPayerName] = useState("");
  const [payerPhone, setPayerPhone] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  if (!open) return null;

  const amount = PLAN_PRICES[plan][cycle];

  const submit = async () => {
    if (!file) return toast.error("Upload the receipt image or PDF");
    if (!reference.trim()) return toast.error("Reference / transaction number required");
    if (!payerName.trim()) return toast.error("Your name is required");

    setSubmitting(true);
    try {
      const deviceId = getDeviceId();
      const ext = file.name.split(".").pop() || "bin";
      const path = `${deviceId}/${Date.now()}-${plan}-${cycle}.${ext}`;
      const { error: upErr } = await supabase.storage.from("payment-receipts").upload(path, file, { upsert: false });
      if (upErr) throw upErr;

      const { error: insErr } = await supabase.from("payment_receipts").insert({
        device_id: deviceId,
        requested_plan: plan,
        billing_cycle: cycle,
        amount,
        currency: "SAR",
        payment_method: method,
        reference_no: reference.trim(),
        payer_name: payerName.trim(),
        payer_phone: payerPhone.trim() || null,
        receipt_file_path: path,
        status: "pending",
      });
      if (insErr) throw insErr;

      setSubmitted(true);
      toast.success("Receipt submitted · سيتم التحقق خلال ٢٤ ساعة");
      onSuccess?.();
    } catch (e: any) {
      toast.error(e?.message || "Submission failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md max-h-[92vh] overflow-y-auto rounded-t-3xl md:rounded-3xl bg-white shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 px-5 py-4 border-b flex items-center justify-between"
             style={{ background: "linear-gradient(135deg, var(--header-dark-from), var(--header-dark-to))" }}>
          <div className="flex items-center gap-2">
            <Crown size={18} color="var(--gold)" />
            <p className="font-display text-base text-white">Upgrade RufayQ · <span className="font-arabic">ترقية</span></p>
          </div>
          <button onClick={onClose} className="text-white/80 btn-press" disabled={submitting}><X size={20} /></button>
        </div>

        {submitted ? (
          <div className="p-6 text-center space-y-3">
            <CheckCircle2 size={48} className="mx-auto text-emerald-500" />
            <p className="font-display text-lg" style={{ color: "var(--navy)" }}>Receipt submitted</p>
            <p className="font-arabic text-sm" dir="rtl" style={{ color: "var(--gray)" }}>تم استلام الإيصال</p>
            <p className="text-xs" style={{ color: "var(--gray)" }}>
              Our team will verify within 24 hours. Your plan activates automatically once approved.
            </p>
            <button onClick={onClose} className="w-full py-3 rounded-xl font-semibold text-white btn-press"
              style={{ background: "var(--teal-deep)" }}>Done</button>
          </div>
        ) : (
          <div className="p-5 space-y-4">
            {/* Plan picker */}
            <div>
              <p className="text-[10px] font-mono tracking-widest mb-2" style={{ color: "var(--gray)" }}>SELECT PLAN</p>
              <div className="grid grid-cols-2 gap-2">
                {(Object.keys(PLAN_PRICES) as Plan[]).map((p) => {
                  const meta = PLAN_PRICES[p];
                  const selected = plan === p;
                  return (
                    <button key={p} onClick={() => setPlan(p)}
                      className="rounded-xl p-3 text-left transition-all"
                      style={{
                        background: selected ? "var(--teal-light)" : "white",
                        border: selected ? "2px solid var(--teal-deep)" : "1px solid var(--gray-light)",
                      }}>
                      <p className="text-sm font-bold capitalize" style={{ color: "var(--navy)" }}>{p}</p>
                      <p className="font-arabic text-[10px]" dir="rtl" style={{ color: "var(--gray)" }}>{meta.nameAr}</p>
                      <p className="text-[11px] mt-1" style={{ color: "var(--teal-deep)" }}>{meta.credits} AI prompts/day</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Cycle */}
            <div>
              <p className="text-[10px] font-mono tracking-widest mb-2" style={{ color: "var(--gray)" }}>BILLING</p>
              <div className="flex gap-2">
                {(["monthly", "yearly"] as Cycle[]).map((c) => (
                  <button key={c} onClick={() => setCycle(c)}
                    className="flex-1 py-2 rounded-lg text-xs font-semibold capitalize"
                    style={{
                      background: cycle === c ? "var(--gold)" : "var(--off-white)",
                      color: cycle === c ? "var(--navy)" : "var(--gray)",
                    }}>
                    {c} {c === "yearly" && "(Save 17%)"}
                  </button>
                ))}
              </div>
            </div>

            {/* Amount */}
            <div className="rounded-xl p-3 flex items-center justify-between" style={{ background: "var(--off-white)" }}>
              <p className="text-xs" style={{ color: "var(--gray)" }}>Total to pay</p>
              <p className="font-display text-xl font-bold" style={{ color: "var(--navy)" }}>SAR {amount.toLocaleString()}</p>
            </div>

            {/* Payment instructions */}
            <div className="rounded-xl p-3 text-[11px] space-y-1" style={{ background: "var(--gold-pale)", border: "1px solid var(--gold)" }}>
              <p className="font-bold" style={{ color: "var(--navy)" }}>How to pay:</p>
              <p style={{ color: "var(--navy)" }}>• Bank transfer: <span className="font-mono">SA00 0000 0000 0000 0000 0000</span></p>
              <p style={{ color: "var(--navy)" }}>• STC Pay: <span className="font-mono">+966 50 000 0000</span></p>
              <p style={{ color: "var(--navy)" }}>Then upload your receipt below.</p>
            </div>

            {/* Method */}
            <div>
              <p className="text-[10px] font-mono tracking-widest mb-2" style={{ color: "var(--gray)" }}>PAYMENT METHOD</p>
              <select value={method} onChange={(e) => setMethod(e.target.value as any)}
                className="w-full rounded-lg px-3 py-2 text-sm" style={{ border: "1px solid var(--gray-light)" }}>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="stc_pay">STC Pay</option>
                <option value="mada">MADA</option>
              </select>
            </div>

            {/* Form */}
            <input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Reference / Transaction No."
              className="w-full rounded-lg px-3 py-2 text-sm" style={{ border: "1px solid var(--gray-light)" }} />
            <input value={payerName} onChange={(e) => setPayerName(e.target.value)} placeholder="Payer name"
              className="w-full rounded-lg px-3 py-2 text-sm" style={{ border: "1px solid var(--gray-light)" }} />
            <input value={payerPhone} onChange={(e) => setPayerPhone(e.target.value)} placeholder="Phone (optional)"
              className="w-full rounded-lg px-3 py-2 text-sm" style={{ border: "1px solid var(--gray-light)" }} />

            {/* File */}
            <label className="block">
              <p className="text-[10px] font-mono tracking-widest mb-2" style={{ color: "var(--gray)" }}>RECEIPT (image or PDF)</p>
              <div className="rounded-xl border-2 border-dashed p-4 text-center cursor-pointer"
                style={{ borderColor: file ? "var(--teal-deep)" : "var(--gray-light)" }}>
                <input type="file" accept="image/*,application/pdf" className="hidden"
                  onChange={(e) => setFile(e.target.files?.[0] || null)} />
                <Upload size={20} className="mx-auto mb-1" color={file ? "var(--teal-deep)" : "var(--gray)"} />
                <p className="text-xs" style={{ color: file ? "var(--teal-deep)" : "var(--gray)" }}>
                  {file ? file.name : "Tap to choose file"}
                </p>
              </div>
            </label>

            <button onClick={submit} disabled={submitting}
              className="w-full py-3 rounded-xl font-semibold text-white btn-press flex items-center justify-center gap-2 disabled:opacity-60"
              style={{ background: "var(--teal-deep)" }}>
              {submitting && <Loader2 size={16} className="animate-spin" />}
              {submitting ? "Submitting…" : "Submit Receipt · إرسال الإيصال"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default UpgradeCTA;
