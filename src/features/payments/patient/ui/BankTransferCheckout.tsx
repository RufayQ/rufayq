/**
 * BankTransferCheckout — manual bank-transfer checkout for paid plans.
 *
 * Replaces the older UpgradeCTA with a spec-aligned flow:
 *   1. Selected plan summary (price, cycle, VAT note, RFQ-PAY reference).
 *   2. Bank transfer instructions (IBAN, beneficiary, transfer ref).
 *   3. Submission methods: in-app upload, transaction ref, sender name,
 *      transfer date, plus copy-WhatsApp / copy-Email helpers.
 *   4. Real-time status timeline (Submitted → Under Review → Approved/Rejected)
 *      driven by `subscription_events`.
 *
 * Bilingual EN + AR. Self-contained — safe to remove without touching the
 * rest of the subscription system.
 */
import { useEffect, useMemo, useState } from "react";
import { X, Upload, Loader2, CheckCircle2, Clock, Copy, FileText, AlertTriangle, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getDeviceId } from "@/hooks/useDeviceId";
import { paymentsClient } from "@/api";
import { BANK_DETAILS, PLAN_BY_CODE, planPrice, type BillingCycle, type PlanCode } from "@/data/subscriptionPlans";
import ReceiptStatusTimeline from "@/features/payments/patient/ui/ReceiptStatusTimeline";

interface Props {
  open: boolean;
  onClose: () => void;
  defaultPlan?: PlanCode;        // FREE is rejected; falls back to COMPANION
  defaultCycle?: BillingCycle;
  onSuccess?: () => void;
  rufayqId?: string | null;      // patient's RufayQ ID, shown in copy-templates
}

interface ReceiptRow {
  id: string;
  status: "pending" | "under_review" | "verified" | "rejected" | "needs_more_info" | "code_expired";
  payment_reference: string | null;
  reviewer_notes: string | null;
  patient_message: string | null;
  created_at: string;
  reviewed_at: string | null;
  amount: number;
  requested_plan: string;
  code_expires_at?: string | null;
}

const STATUS_META: Record<ReceiptRow["status"], { en: string; ar: string; tone: string; icon: any }> = {
  pending:         { en: "Pending verification",  ar: "قيد التحقق",          tone: "var(--gold)",       icon: Clock },
  under_review:    { en: "Under review",          ar: "قيد المراجعة",        tone: "var(--gold)",       icon: RefreshCw },
  needs_more_info: { en: "More info needed",      ar: "مطلوب معلومات إضافية", tone: "var(--gold)",       icon: AlertTriangle },
  verified:        { en: "Approved & active",     ar: "تمت الموافقة",        tone: "var(--success)",    icon: CheckCircle2 },
  rejected:        { en: "Rejected",              ar: "مرفوض",              tone: "var(--danger)",     icon: X },
  code_expired:    { en: "Reference code expired",ar: "انتهت صلاحية المرجع",  tone: "var(--danger)",     icon: AlertTriangle },
};

const BankTransferCheckout = ({ open, onClose, defaultPlan = "COMPANION", defaultCycle = "monthly", onSuccess, rufayqId }: Props) => {
  const initialPlan: PlanCode = defaultPlan === "FREE" ? "COMPANION" : defaultPlan;
  const [plan, setPlan] = useState<PlanCode>(initialPlan);
  const [cycle, setCycle] = useState<BillingCycle>(defaultCycle);
  const [reference, setReference] = useState("");
  const [payerName, setPayerName] = useState("");
  const [payerPhone, setPayerPhone] = useState("");
  const [transferDate, setTransferDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [bankName, setBankName] = useState("");
  const [channel, setChannel] = useState<"app" | "whatsapp" | "email">("app");
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  // Field-level validation: keys map to field names; values are bilingual.
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [pollReceipt, setPollReceipt] = useState<ReceiptRow | null>(null);
  // Pending row created on mount / when plan or cycle changes — gives the
  // patient a real `payment_reference` (set by DB trigger) before they pay.
  const [pendingReceipt, setPendingReceipt] = useState<ReceiptRow | null>(null);
  const [generating, setGenerating] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      setSubmitted(false);
      setPollReceipt(null);
      setPendingReceipt(null);
      setFile(null);
      setReference(""); setPayerName(""); setPayerPhone(""); setBankName("");
    }
  }, [open]);

  const planDef = PLAN_BY_CODE[plan];
  const amount = planPrice(plan, cycle);

  // Pre-create pending receipt whenever the modal opens or plan/cycle changes.
  // This gives the patient the canonical RFQ-PAY-... reference up front.
  const generatePending = async () => {
    setGenerating(true);
    const res = await paymentsClient.createPendingReceipt({
      device_id: getDeviceId(),
      requested_plan: plan,
      billing_cycle: cycle,
      currency: "SAR",
      amount,
      payment_method: "bank_transfer",
      submission_channel: "web",
    });
    if (res.error || !res.data) {
      toast.error(res.error?.message || "Could not generate reference code");
      setGenerating(false);
      return;
    }
    setPendingReceipt(res.data as ReceiptRow);
    setGenerating(false);
  };

  useEffect(() => {
    if (!open || submitted) return;
    generatePending();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, plan, cycle]);

  // Tick every 30s for countdown rendering.
  useEffect(() => {
    if (!open || submitted) return;
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, [open, submitted]);

  // Poll latest receipt for live status updates while open
  useEffect(() => {
    if (!open || !submitted || !pollReceipt) return;
    const id = pollReceipt.id;
    const tick = async () => {
      const { data } = await supabase
        .from("payment_receipts")
        .select("id,status,payment_reference,reviewer_notes,patient_message,created_at,reviewed_at,amount,requested_plan,code_expires_at")
        .eq("id", id)
        .maybeSingle();
      if (data) {
        setPollReceipt(data as ReceiptRow);
        if (data.status === "verified") onSuccess?.();
      }
    };
    const t = setInterval(tick, 4000);
    return () => clearInterval(t);
  }, [open, submitted, pollReceipt?.id]);

  // Expiry derivation
  const expiresAt = pendingReceipt?.code_expires_at ? new Date(pendingReceipt.code_expires_at).getTime() : null;
  const msLeft = expiresAt ? expiresAt - now : null;
  const isExpired = msLeft !== null && msLeft <= 0;
  const expiryTone = msLeft === null ? "var(--gray)"
    : msLeft < 30 * 60_000 ? "var(--danger)"
    : msLeft < 2 * 60 * 60_000 ? "var(--gold)"
    : "var(--success)";
  const expiryLabel = msLeft === null ? ""
    : msLeft <= 0 ? "Code expired · انتهت الصلاحية"
    : msLeft > 60 * 60_000 ? `Valid for ${Math.floor(msLeft / 3_600_000)}h ${Math.floor((msLeft % 3_600_000) / 60_000)}m`
    : `Valid for ${Math.max(1, Math.floor(msLeft / 60_000))}m`;

  if (!open) return null;

  // === Copy helpers ===
  const copyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied · تم النسخ`);
  };
  const refForCopy = pendingReceipt?.payment_reference || "[reference code]";
  const whatsappCopy = `Hello RufayQ Support,
I have transferred the subscription payment.
RufayQ ID: ${rufayqId || "[your RufayQ ID]"}
Plan: ${planDef.nameEn} (${cycle})
Amount: SAR ${amount}
RufayQ reference: ${refForCopy}
Bank transfer reference: ${reference || "[transfer reference]"}
Please verify and activate my subscription.`;
  const emailCopy = whatsappCopy;
  const arabicCopy = `مرحباً فريق رُفَيْق،
تم تحويل مبلغ الاشتراك.
رقم رُفَيْق: ${rufayqId || "[رقم رُفَيْق الخاص بك]"}
الباقة: ${planDef.nameAr} (${cycle === "monthly" ? "شهري" : "سنوي"})
المبلغ: ${amount} ر.س
مرجع رُفَيْق: ${refForCopy}
رقم المرجع البنكي: ${reference || "[رقم المرجع]"}
نرجو التحقق وتفعيل الاشتراك.`;

  // === Submit ===
  // Validate every field together so the form can highlight ALL invalid
  // controls at once (not the first failure only). After validation we focus
  // & scroll the first invalid input into view for accessibility.
  const validate = (): Record<string, string> => {
    const errs: Record<string, string> = {};
    const MAX_BYTES = 8 * 1024 * 1024; // 8 MB
    const ALLOWED = /^(image\/(png|jpe?g|webp|heic)|application\/pdf)$/i;
    if (!pendingReceipt) errs._global = "Please wait for the reference code · انتظر إنشاء المرجع";
    else if (isExpired) errs._global = "Reference code expired — please regenerate · انتهت الصلاحية";
    if (channel === "app") {
      if (!file) errs.file = "Upload the receipt image or PDF · أرفق الإيصال";
      else if (file.size > MAX_BYTES) errs.file = "File too large (max 8 MB) · الملف كبير جداً";
      else if (file.type && !ALLOWED.test(file.type)) errs.file = "Use JPG, PNG, WebP or PDF · استخدم صيغة مدعومة";
    }
    if (!reference.trim()) errs.reference = "Bank transfer reference required · رقم المرجع مطلوب";
    else if (reference.trim().length < 3) errs.reference = "Reference looks too short · المرجع قصير جداً";
    if (!payerName.trim()) errs.payerName = "Sender name required · اسم المرسل مطلوب";
    else if (payerName.trim().length < 2) errs.payerName = "Sender name looks too short · الاسم قصير جداً";
    if (payerPhone.trim() && !/^[+0-9 \-()]{6,}$/.test(payerPhone.trim())) {
      errs.payerPhone = "Invalid phone number · رقم جوال غير صالح";
    }
    if (!transferDate) errs.transferDate = "Pick a transfer date · حدّد تاريخ التحويل";
    return errs;
  };

  const submit = async () => {
    const errs = validate();
    setFieldErrors(errs);
    if (Object.keys(errs).length > 0) {
      // Surface a top-level toast then focus the first invalid control.
      const firstKey = errs._global ? null : Object.keys(errs)[0];
      toast.error(errs._global || errs[firstKey!] || "Please fix the highlighted fields");
      if (firstKey) {
        const el = document.querySelector<HTMLElement>(`[data-field="${firstKey}"]`);
        el?.scrollIntoView({ behavior: "smooth", block: "center" });
        (el as HTMLInputElement | null)?.focus?.();
      }
      return;
    }

    setSubmitting(true);
    try {
      const deviceId = getDeviceId();
      let path: string | null = null;
      if (file) {
        const ext = file.name.split(".").pop() || "bin";
        path = `${deviceId}/${Date.now()}-${plan}-${cycle}.${ext}`;
        const { error: upErr } = await supabase.storage.from("payment-receipts").upload(path, file, { upsert: false });
        if (upErr) throw upErr;
      }
      const upd = await paymentsClient.attachAndSubmit(pendingReceipt!.id, {
        receipt_file_path: path,
        submission_channel: channel,
        bank_name: bankName.trim() || null,
        transfer_date: transferDate || null,
        reference_no: reference.trim(),
        payer_name: payerName.trim(),
        payer_phone: payerPhone.trim() || null,
      });
      if (upd.error) throw new Error(upd.error.message);

      // Re-fetch the row so the timeline shows the latest server state
      const { data: row } = await supabase
        .from("payment_receipts")
        .select("id,status,payment_reference,reviewer_notes,patient_message,created_at,reviewed_at,amount,requested_plan,code_expires_at")
        .eq("id", pendingReceipt!.id)
        .maybeSingle();
      setPollReceipt((row as ReceiptRow) || pendingReceipt);
      setSubmitted(true);
      setFieldErrors({});
      toast.success("Receipt submitted · تم استلام الإيصال");
    } catch (e: any) {
      toast.error(e?.message || "Submission failed · فشل الإرسال");
    } finally {
      setSubmitting(false);
    }
  };

  // === Render: timeline view (after submission) ===
  if (submitted && pollReceipt) {
    const meta = STATUS_META[pollReceipt.status];
    const Icon = meta.icon;
    return (
      <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm">
        <div className="w-full max-w-md max-h-[92vh] overflow-y-auto rounded-t-3xl md:rounded-3xl bg-white shadow-2xl">
          <div className="sticky top-0 px-5 py-4 border-b flex items-center justify-between"
               style={{ background: "linear-gradient(135deg, var(--header-dark-from), var(--header-dark-to))" }}>
            <p className="font-display text-base text-white">Receipt status · <span className="font-arabic">حالة الإيصال</span></p>
            <button onClick={onClose} className="text-white/80 btn-press"><X size={20} /></button>
          </div>

          <div className="p-5 space-y-4">
            <div className="rounded-xl p-4 text-center" style={{ background: "var(--off-white)", border: `1px solid ${meta.tone}` }}>
              <Icon size={32} className="mx-auto mb-2" color={meta.tone} />
              <p className="font-display text-lg" style={{ color: "var(--navy)" }}>{meta.en}</p>
              <p className="font-arabic text-sm" dir="rtl" style={{ color: "var(--gray)" }}>{meta.ar}</p>
              {pollReceipt.payment_reference && (
                <p className="font-mono text-[11px] mt-2" style={{ color: "var(--gray)" }}>
                  Ref: {pollReceipt.payment_reference}
                </p>
              )}
            </div>

            {pollReceipt.patient_message && (
              <div className="rounded-xl p-3 text-[12px]" style={{ background: "var(--gold-pale)", border: "1px solid var(--gold)" }}>
                <p className="font-bold mb-1" style={{ color: "var(--navy)" }}>From RufayQ team:</p>
                <p style={{ color: "var(--navy)" }}>{pollReceipt.patient_message}</p>
              </div>
            )}

            {/* Timeline */}
            <ReceiptStatusTimeline receipt={pollReceipt} />

            <button onClick={onClose} className="w-full py-3 rounded-xl font-semibold text-white btn-press"
              style={{ background: "var(--teal-deep)" }}>
              Done · إغلاق
            </button>
          </div>
        </div>
      </div>
    );
  }

  // === Render: checkout form ===
  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md max-h-[92vh] overflow-y-auto rounded-t-3xl md:rounded-3xl bg-white shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 px-5 py-4 border-b flex items-center justify-between z-10"
             style={{ background: "linear-gradient(135deg, var(--header-dark-from), var(--header-dark-to))" }}>
          <p className="font-display text-base text-white">Bank Transfer · <span className="font-arabic">تحويل بنكي</span></p>
          <button onClick={onClose} className="text-white/80 btn-press" disabled={submitting}><X size={20} /></button>
        </div>

        <div className="p-5 space-y-4">
          {/* Plan picker */}
          <div>
            <p className="text-[10px] font-mono tracking-widest mb-2" style={{ color: "var(--gray)" }}>SELECT PLAN · اختر الباقة</p>
            <div className="grid grid-cols-3 gap-2">
              {(["STARTER", "COMPANION", "FAMILY"] as PlanCode[]).map((p) => {
                const meta = PLAN_BY_CODE[p];
                const selected = plan === p;
                return (
                  <button key={p} onClick={() => setPlan(p)}
                    className="rounded-xl p-2.5 text-left transition-all"
                    style={{
                      background: selected ? "var(--teal-light)" : "white",
                      border: selected ? "2px solid var(--teal-deep)" : "1px solid var(--gray-light)",
                    }}>
                    <p className="text-[12px] font-bold" style={{ color: "var(--navy)" }}>{meta.nameEn}</p>
                    <p className="font-arabic text-[10px]" dir="rtl" style={{ color: "var(--gray)" }}>{meta.nameAr}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Cycle */}
          <div className="flex gap-2">
            {(["monthly", "yearly"] as BillingCycle[]).map((c) => (
              <button key={c} onClick={() => setCycle(c)}
                className="flex-1 py-2 rounded-lg text-xs font-semibold capitalize"
                style={{
                  background: cycle === c ? "var(--gold)" : "var(--off-white)",
                  color: cycle === c ? "var(--navy)" : "var(--gray)",
                }}>
                {c === "yearly" ? "Yearly · Save 2 months" : "Monthly"}
              </button>
            ))}
          </div>

          {/* Amount + real RFQ-PAY reference + countdown */}
          <div className="rounded-xl p-3" style={{ background: "var(--off-white)" }}>
            <div className="flex items-center justify-between">
              <p className="text-xs" style={{ color: "var(--gray)" }}>Amount due · المبلغ</p>
              <p className="font-display text-2xl font-bold" style={{ color: "var(--navy)" }}>SAR {amount.toLocaleString()}</p>
            </div>
            <p className="text-[10px] mt-1" style={{ color: "var(--gray)" }}>VAT may apply depending on official billing setup. · قد تُطبَّق ضريبة القيمة المضافة.</p>

            <div className="mt-2 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[9px] uppercase tracking-widest" style={{ color: "var(--gray)" }}>Use this exact reference in your bank transfer</p>
                {generating && !pendingReceipt ? (
                  <p className="font-mono text-xs flex items-center gap-1" style={{ color: "var(--gray)" }}>
                    <Loader2 size={11} className="animate-spin" /> Generating…
                  </p>
                ) : (
                  <button
                    onClick={() => pendingReceipt?.payment_reference && copyText(pendingReceipt.payment_reference, "Reference")}
                    className="font-mono text-sm font-bold flex items-center gap-1.5 btn-press"
                    style={{ color: isExpired ? "var(--danger)" : "var(--gold)" }}
                  >
                    {pendingReceipt?.payment_reference || "—"}
                    {pendingReceipt?.payment_reference && <Copy size={11} />}
                  </button>
                )}
              </div>
              {pendingReceipt && !isExpired && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap"
                      style={{ background: `${expiryTone}20`, color: expiryTone, border: `1px solid ${expiryTone}` }}>
                  {expiryLabel}
                </span>
              )}
            </div>

            {isExpired && (
              <div className="mt-2 rounded-lg p-2 flex items-center justify-between gap-2"
                   style={{ background: "var(--danger-bg, #fee)", border: "1px solid var(--danger)" }}>
                <p className="text-[11px]" style={{ color: "var(--danger)" }}>
                  Reference expired · انتهت صلاحية المرجع
                </p>
                <button onClick={generatePending} disabled={generating}
                  className="text-[11px] font-semibold px-2 py-1 rounded flex items-center gap-1"
                  style={{ background: "var(--teal-deep)", color: "white" }}>
                  {generating ? <Loader2 size={10} className="animate-spin" /> : <RefreshCw size={10} />}
                  Get new code
                </button>
              </div>
            )}
            <p className="text-[10px] mt-1" style={{ color: "var(--gray)" }}>Subscription will not activate until payment is verified.</p>
          </div>

          {/* Bank instructions */}
          <div className="rounded-xl p-3 text-[11px] space-y-1" style={{ background: "var(--gold-pale)", border: "1px solid var(--gold)" }}>
            <p className="font-bold mb-1" style={{ color: "var(--navy)" }}>Bank transfer details · بيانات التحويل</p>
            <Row label="Beneficiary" value={BANK_DETAILS.beneficiary} />
            <Row label="Bank" value={BANK_DETAILS.bankName} />
            <Row label="IBAN" value={BANK_DETAILS.iban} mono onCopy={() => copyText(BANK_DETAILS.iban, "IBAN")} />
            <Row label="Account" value={BANK_DETAILS.accountNo} mono />
          </div>

          {/* Submission channel */}
          <div>
            <p className="text-[10px] font-mono tracking-widest mb-2" style={{ color: "var(--gray)" }}>SUBMISSION METHOD · طريقة الإرسال</p>
            <div className="grid grid-cols-3 gap-2 mb-2">
              {(["app", "whatsapp", "email"] as const).map((c) => (
                <button key={c} onClick={() => setChannel(c)}
                  className="py-2 rounded-lg text-[11px] font-semibold capitalize"
                  style={{
                    background: channel === c ? "var(--teal-deep)" : "var(--off-white)",
                    color: channel === c ? "white" : "var(--gray)",
                  }}>
                  {c === "app" ? "Upload" : c}
                </button>
              ))}
            </div>
            {channel !== "app" && (
              <div className="rounded-lg p-2 text-[11px] space-y-2" style={{ background: "var(--off-white)" }}>
                <p style={{ color: "var(--navy)" }}>
                  Send your receipt to{" "}
                  <span className="font-mono">{channel === "whatsapp" ? BANK_DETAILS.whatsapp : BANK_DETAILS.email}</span>{" "}
                  with your RufayQ ID and transfer reference.
                </p>
                <div className="flex gap-2">
                  <button onClick={() => copyText(channel === "whatsapp" ? whatsappCopy : emailCopy, "Message")}
                    className="flex-1 py-1.5 rounded text-[10px] font-semibold flex items-center justify-center gap-1"
                    style={{ background: "var(--teal-deep)", color: "white" }}>
                    <Copy size={10} /> Copy English
                  </button>
                  <button onClick={() => copyText(arabicCopy, "النسخة العربية")}
                    className="flex-1 py-1.5 rounded text-[10px] font-semibold flex items-center justify-center gap-1 font-arabic"
                    style={{ background: "var(--gold)", color: "var(--navy)" }} dir="rtl">
                    <Copy size={10} /> نسخ العربية
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Form fields */}
          <input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Transaction reference · رقم المرجع البنكي"
            className="w-full rounded-lg px-3 py-2 text-sm" style={{ border: "1px solid var(--gray-light)" }} />
          <input value={payerName} onChange={(e) => setPayerName(e.target.value)} placeholder="Sender account name · اسم المرسل"
            className="w-full rounded-lg px-3 py-2 text-sm" style={{ border: "1px solid var(--gray-light)" }} />
          <input value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="Sending bank (optional) · البنك المُرسل"
            className="w-full rounded-lg px-3 py-2 text-sm" style={{ border: "1px solid var(--gray-light)" }} />
          <div className="grid grid-cols-2 gap-2">
            <input value={payerPhone} onChange={(e) => setPayerPhone(e.target.value)} placeholder="Phone (opt.) · جوال"
              className="rounded-lg px-3 py-2 text-sm" style={{ border: "1px solid var(--gray-light)" }} />
            <input type="date" value={transferDate} onChange={(e) => setTransferDate(e.target.value)}
              className="rounded-lg px-3 py-2 text-sm" style={{ border: "1px solid var(--gray-light)" }} />
          </div>

          {/* File upload */}
          {channel === "app" && (
            <label className="block">
              <p className="text-[10px] font-mono tracking-widest mb-2" style={{ color: "var(--gray)" }}>RECEIPT (image or PDF) · الإيصال</p>
              <div className="rounded-xl border-2 border-dashed p-4 text-center cursor-pointer"
                style={{ borderColor: file ? "var(--teal-deep)" : "var(--gray-light)" }}>
                <input type="file" accept="image/*,application/pdf" className="hidden"
                  onChange={(e) => setFile(e.target.files?.[0] || null)} />
                <Upload size={20} className="mx-auto mb-1" color={file ? "var(--teal-deep)" : "var(--gray)"} />
                <p className="text-xs" style={{ color: file ? "var(--teal-deep)" : "var(--gray)" }}>
                  {file ? file.name : "Tap to choose file · اختر ملف"}
                </p>
              </div>
            </label>
          )}

          <button onClick={submit} disabled={submitting || !pendingReceipt || isExpired}
            className="w-full py-3 rounded-xl font-semibold text-white btn-press flex items-center justify-center gap-2 disabled:opacity-60"
            style={{ background: "var(--teal-deep)" }}>
            {submitting && <Loader2 size={16} className="animate-spin" />}
            {submitting ? "Submitting…" : "Submit for Verification · إرسال للتحقق"}
          </button>
        </div>
      </div>
    </div>
  );
};

const Row = ({ label, value, mono, onCopy }: { label: string; value: string; mono?: boolean; onCopy?: () => void }) => (
  <div className="flex items-center justify-between gap-2">
    <span style={{ color: "var(--gray)" }}>{label}:</span>
    <span className={`flex-1 text-right ${mono ? "font-mono" : ""}`} style={{ color: "var(--navy)" }}>{value}</span>
    {onCopy && (
      <button onClick={onCopy} className="p-1 rounded hover:bg-white/40">
        <Copy size={11} color="var(--gray)" />
      </button>
    )}
  </div>
);

export default BankTransferCheckout;
