/**
 * AdminAddReceiptPanel — manual receipt entry for admins.
 *
 * Used when a patient paid via WhatsApp / email / in-person and admin
 * needs to create the row themselves so the verification queue is correct.
 *
 * Flow:
 *   1. Search patient (debounced) by name / email / phone / RufayQ ID.
 *   2. Pick plan + cycle + amount + submission channel + bank info.
 *   3. (Optional) upload the receipt image to `payment-receipts` storage.
 *   4. Submit → inserts a `payment_receipts` row with status=`under_review`
 *      and the current admin as reviewer. The DB trigger assigns
 *      `payment_reference`, and the AdminPayments realtime listener
 *      refreshes the queue automatically.
 */
import { useEffect, useMemo, useState } from "react";
import { X, Search, Loader2, Upload, CheckCircle2, User as UserIcon, FileText, AlertCircle, Eye } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { paymentsClient } from "@/api";
import { PLANS, type PlanCode, type BillingCycle, planPrice } from "@/data/subscriptionPlans";

interface Patient {
  id: string;
  device_id: string;
  full_name_en: string | null;
  full_name_ar: string | null;
  email: string | null;
  phone: string | null;
  rufayq_id: string | null;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated?: () => void;
}

const CHANNELS = ["whatsapp", "email", "app", "other"] as const;
const CURRENCIES = ["SAR", "EGP", "USD"] as const;
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"] as const;
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

const formatBytes = (n: number): string => {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
};

const AdminAddReceiptPanel = ({ open, onClose, onCreated }: Props) => {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Patient[]>([]);
  const [searching, setSearching] = useState(false);
  const [patient, setPatient] = useState<Patient | null>(null);

  const [plan, setPlan] = useState<PlanCode>("COMPANION");
  const [cycle, setCycle] = useState<BillingCycle>("monthly");
  const [currency, setCurrency] = useState<(typeof CURRENCIES)[number]>("SAR");
  const [amount, setAmount] = useState<number>(planPrice("COMPANION", "monthly"));
  const [channel, setChannel] = useState<(typeof CHANNELS)[number]>("whatsapp");
  const [bankName, setBankName] = useState("");
  const [transferDate, setTransferDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [referenceNo, setReferenceNo] = useState("");
  const [internalNote, setInternalNote] = useState("");
  const [patientMessage, setPatientMessage] = useState("");
  const [noImage, setNoImage] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Manage object URL lifetime for preview images
  useEffect(() => {
    if (!file) { setPreviewUrl(null); return; }
    if (file.type.startsWith("image/")) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    }
    setPreviewUrl(null);
  }, [file]);

  const onPickFile = (f: File | null) => {
    setFileError(null);
    if (!f) { setFile(null); return; }
    if (!(ACCEPTED_TYPES as readonly string[]).includes(f.type)) {
      setFileError(`Unsupported file type "${f.type || "unknown"}". Use JPG, PNG, WebP or PDF.`);
      setFile(null);
      return;
    }
    if (f.size > MAX_BYTES) {
      setFileError(`File too large (${formatBytes(f.size)}). Max ${formatBytes(MAX_BYTES)}.`);
      setFile(null);
      return;
    }
    setFile(f);
  };

  // Reset on close
  useEffect(() => {
    if (open) return;
    setQ(""); setResults([]); setPatient(null);
    setPlan("COMPANION"); setCycle("monthly"); setCurrency("SAR");
    setAmount(planPrice("COMPANION", "monthly"));
    setChannel("whatsapp"); setBankName(""); setReferenceNo("");
    setInternalNote(""); setPatientMessage(""); setNoImage(false); setFile(null);
  }, [open]);

  // Auto-fill amount when plan/cycle changes
  useEffect(() => { setAmount(planPrice(plan, cycle)); }, [plan, cycle]);

  // Debounced patient search
  useEffect(() => {
    if (!open || !q.trim() || patient) return;
    const t = setTimeout(async () => {
      setSearching(true);
      const term = q.trim();
      const { data } = await supabase
        .from("profiles")
        .select("id,device_id,full_name_en,full_name_ar,email,phone,rufayq_id")
        .or(`full_name_en.ilike.%${term}%,full_name_ar.ilike.%${term}%,email.ilike.%${term}%,phone.ilike.%${term}%,rufayq_id.ilike.%${term}%`)
        .limit(8);
      setResults((data ?? []) as Patient[]);
      setSearching(false);
    }, 300);
    return () => clearTimeout(t);
  }, [q, open, patient]);

  const planList = useMemo(() => PLANS.filter((p) => p.code !== "FREE"), []);

  const submit = async () => {
    if (!patient) return toast.error("Select a patient first");
    if (amount <= 0) return toast.error("Amount must be > 0");
    setSubmitting(true);
    try {
      let path: string | null = null;
      if (file && !noImage) {
        const ext = file.name.split(".").pop() || "bin";
        path = `${patient.device_id}/admin-${Date.now()}-${plan}-${cycle}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("payment-receipts")
          .upload(path, file, { upsert: false });
        if (upErr) throw upErr;
      }

      // Use the contracted client for the insert so validation runs.
      const res = await paymentsClient.upload({
        device_id: patient.device_id,
        requested_plan: plan,
        billing_cycle: cycle,
        amount,
        currency,
        payment_method: "bank_transfer",
        receipt_file_path: path,
        payer_name: patient.full_name_en || patient.full_name_ar,
        payer_phone: patient.phone,
        bank_name: bankName.trim() || null,
        transfer_date: transferDate || null,
        reference_no: referenceNo.trim() || null,
        patient_message: patientMessage.trim() || null,
        submission_channel: channel,
      });
      if (res.error || !res.data) throw new Error(res.error?.message || "Insert failed");

      // Immediately mark as under_review so it lands in the verification queue,
      // and (best-effort) attach the internal note.
      const r1 = await paymentsClient.markUnderReview(res.data.id);
      if (r1.error) toast.warning("Created, but could not auto-mark under review");
      if (internalNote.trim()) {
        await supabase.from("payment_receipts")
          .update({ internal_note: internalNote.trim() } as never)
          .eq("id", res.data.id);
      }

      const name = patient.full_name_en || patient.full_name_ar || patient.email || "patient";
      toast.success(`Receipt created for ${name}`);
      onCreated?.();
      onClose();
    } catch (e: any) {
      toast.error(e?.message || "Failed to create receipt");
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md h-full overflow-y-auto bg-slate-950 border-l border-slate-800 shadow-2xl"
      >
        {/* Header */}
        <div className="sticky top-0 z-10 px-5 py-4 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
          <div>
            <p className="font-semibold text-white">Add Receipt</p>
            <p className="text-[11px] text-slate-400">Create a receipt for a patient who paid via bank transfer</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Step 1: patient search */}
          <section>
            <p className="text-[10px] font-mono tracking-widest text-slate-400 mb-2">1 · FIND PATIENT</p>
            {patient ? (
              <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/5 p-3 flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-sm text-white">
                    <UserIcon size={13} className="text-emerald-400" />
                    {patient.full_name_en || patient.full_name_ar || "(no name)"}
                  </div>
                  <p className="text-[11px] text-slate-400 truncate">{patient.email || patient.phone || patient.rufayq_id || patient.device_id}</p>
                  <p className="text-[10px] text-slate-500 font-mono mt-0.5">device {patient.device_id.slice(0, 18)}…</p>
                </div>
                <button onClick={() => setPatient(null)} className="text-[11px] text-slate-400 hover:text-white">Change</button>
              </div>
            ) : (
              <>
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Search by name, email, phone, or RufayQ ID"
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-sm text-slate-200"
                  />
                </div>
                <div className="mt-2 space-y-1 max-h-56 overflow-y-auto">
                  {searching && <p className="text-[11px] text-slate-500 flex items-center gap-1"><Loader2 size={10} className="animate-spin" />Searching…</p>}
                  {!searching && q && results.length === 0 && (
                    <p className="text-[11px] text-slate-500">No matches.</p>
                  )}
                  {results.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setPatient(p)}
                      className="w-full text-left rounded-lg border border-slate-800 hover:border-amber-500/40 hover:bg-amber-500/5 p-2"
                    >
                      <p className="text-sm text-white truncate">{p.full_name_en || p.full_name_ar || "(no name)"}</p>
                      <p className="text-[11px] text-slate-400 truncate">
                        {p.email || "—"} · {p.phone || "—"} · {p.rufayq_id || "—"}
                      </p>
                    </button>
                  ))}
                </div>
              </>
            )}
          </section>

          {patient && (
            <>
              {/* Step 2: plan + amount */}
              <section className="space-y-2">
                <p className="text-[10px] font-mono tracking-widest text-slate-400">2 · PLAN DETAILS</p>
                <div className="grid grid-cols-3 gap-1.5">
                  {planList.map((p) => (
                    <button
                      key={p.code}
                      onClick={() => setPlan(p.code)}
                      className={`px-2 py-1.5 rounded-md text-xs border ${plan === p.code ? "bg-amber-500/15 text-amber-300 border-amber-500/40" : "border-slate-800 text-slate-300 hover:text-white"}`}
                    >
                      {p.nameEn}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <select value={cycle} onChange={(e) => setCycle(e.target.value as BillingCycle)}
                    className="bg-slate-900 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-slate-200">
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                  <select value={currency} onChange={(e) => setCurrency(e.target.value as typeof currency)}
                    className="bg-slate-900 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-slate-200">
                    {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-slate-200"
                    placeholder="Amount"
                  />
                  <span className="text-[10px] text-slate-500">auto-filled from plan, editable</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <select value={channel} onChange={(e) => setChannel(e.target.value as typeof channel)}
                    className="bg-slate-900 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-slate-200">
                    {CHANNELS.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <input type="date" value={transferDate} onChange={(e) => setTransferDate(e.target.value)}
                    className="bg-slate-900 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-slate-200" />
                </div>
                <input value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="Bank name (e.g. Al Rajhi Bank)"
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-slate-200" />
                <input value={referenceNo} onChange={(e) => setReferenceNo(e.target.value)} placeholder="Bank transaction reference (optional)"
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-slate-200" />
              </section>

              {/* Step 3: image */}
              <section className="space-y-2">
                <p className="text-[10px] font-mono tracking-widest text-slate-400">3 · RECEIPT IMAGE</p>
                <label className={`block rounded-lg border-2 border-dashed p-3 text-center cursor-pointer ${noImage ? "opacity-40 pointer-events-none" : ""}`}
                  style={{ borderColor: file ? "rgba(16,185,129,0.5)" : "rgb(30,41,59)" }}>
                  <input type="file" accept="image/*,application/pdf" className="hidden"
                    onChange={(e) => setFile(e.target.files?.[0] || null)} />
                  {file ? (
                    <p className="text-xs text-emerald-300 flex items-center justify-center gap-1"><CheckCircle2 size={12} />{file.name}</p>
                  ) : (
                    <p className="text-xs text-slate-400 flex items-center justify-center gap-1"><Upload size={12} />Click to upload (JPG / PNG / PDF, ≤5MB)</p>
                  )}
                </label>
                <label className="flex items-center gap-2 text-[11px] text-slate-400">
                  <input type="checkbox" checked={noImage} onChange={(e) => { setNoImage(e.target.checked); if (e.target.checked) setFile(null); }} />
                  Image not available (e.g. WhatsApp without screenshot)
                </label>
              </section>

              {/* Step 4: notes */}
              <section className="space-y-2">
                <p className="text-[10px] font-mono tracking-widest text-slate-400">4 · NOTES (OPTIONAL)</p>
                <textarea value={internalNote} onChange={(e) => setInternalNote(e.target.value)}
                  placeholder="Staff-only internal note"
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-slate-200 min-h-[60px]" />
                <textarea value={patientMessage} onChange={(e) => setPatientMessage(e.target.value)}
                  placeholder="Message visible to the patient"
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-slate-200 min-h-[60px]" />
              </section>

              <button
                onClick={submit}
                disabled={submitting}
                className="w-full py-2.5 rounded-lg font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-60"
                style={{ background: "var(--teal-deep, #0f766e)" }}
              >
                {submitting && <Loader2 size={14} className="animate-spin" />}
                {submitting ? "Creating…" : "Create & Start Review"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminAddReceiptPanel;
