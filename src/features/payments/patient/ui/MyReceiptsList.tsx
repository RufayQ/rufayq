/**
 * MyReceiptsList — patient-facing list of every payment_receipts row for the
 * current device. Lets the patient drill into any receipt to view its audit
 * trail, status timeline, and exported PDF.
 *
 * Grouped chronologically, newest first. Each item reveals plan, amount,
 * status badge and submission date. Clicking opens ReceiptDetailsScreen.
 */
import { useEffect, useState } from "react";
import { ArrowLeft, Receipt as ReceiptIcon, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getDeviceId } from "@/hooks/useDeviceId";
import ReceiptDetailsScreen, { type PatientReceipt } from "./ReceiptDetailsScreen";

const STATUS_TONE: Record<PatientReceipt["status"], { bg: string; fg: string; en: string; ar: string }> = {
  pending:         { bg: "var(--gold-pale)", fg: "var(--gold)",     en: "Pending",      ar: "قيد الانتظار" },
  under_review:    { bg: "var(--gold-pale)", fg: "var(--gold)",     en: "Reviewing",    ar: "قيد المراجعة" },
  needs_more_info: { bg: "var(--gold-pale)", fg: "var(--gold)",     en: "More info",    ar: "معلومات إضافية" },
  verified:        { bg: "#e8f5ec",          fg: "var(--success)",  en: "Approved",     ar: "موافَق" },
  rejected:        { bg: "#fde8e8",          fg: "var(--danger)",   en: "Rejected",     ar: "مرفوض" },
  code_expired:    { bg: "#fde8e8",          fg: "var(--danger)",   en: "Expired",      ar: "منتهي" },
};

interface Props {
  onBack: () => void;
}

const MyReceiptsList = ({ onBack }: Props) => {
  const [rows, setRows] = useState<PatientReceipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<PatientReceipt | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const { data, error } = await supabase
        .from("payment_receipts")
        .select("id,status,payment_reference,reviewer_notes,patient_message,created_at,reviewed_at,amount,currency,requested_plan,billing_cycle,receipt_file_path,payer_name,bank_name,reference_no,transfer_date,code_expires_at")
        .eq("device_id", getDeviceId())
        .order("created_at", { ascending: false });
      if (!cancelled) {
        if (!error && data) setRows(data as PatientReceipt[]);
        setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="flex flex-col h-full">
      <div className="px-5 pt-3 pb-4 flex items-center gap-3"
           style={{ background: "linear-gradient(135deg, var(--header-dark-from), var(--header-dark-to))" }}>
        <button onClick={onBack} className="btn-press"><ArrowLeft size={20} color="white" /></button>
        <div>
          <p className="font-display text-base text-white">My Receipts</p>
          <p className="font-arabic text-[11px] text-white/70" dir="rtl">إيصالاتي</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3" style={{ background: "var(--off-white)" }}>
        {loading ? (
          <p className="flex items-center gap-2 text-sm" style={{ color: "var(--gray)" }}>
            <Loader2 size={14} className="animate-spin" /> Loading…
          </p>
        ) : rows.length === 0 ? (
          <div className="rounded-2xl p-6 text-center" style={{ background: "white", border: "1px solid var(--gray-light)" }}>
            <ReceiptIcon size={28} className="mx-auto mb-2" color="var(--gray)" />
            <p className="text-sm font-semibold" style={{ color: "var(--navy)" }}>No receipts yet</p>
            <p className="text-[11px] mt-0.5" style={{ color: "var(--gray)" }}>
              Submit a bank transfer to see receipts here.
            </p>
            <p className="font-arabic text-[10px] mt-0.5" dir="rtl" style={{ color: "var(--gray)" }}>
              لا توجد إيصالات بعد.
            </p>
          </div>
        ) : (
          rows.map((r) => {
            const tone = STATUS_TONE[r.status];
            return (
              <button key={r.id} onClick={() => setActive(r)}
                className="w-full text-left rounded-2xl p-3.5 btn-press"
                style={{ background: "white", border: "1px solid var(--gray-light)" }}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-bold truncate" style={{ color: "var(--navy)" }}>
                      {r.requested_plan} {r.billing_cycle ? `· ${r.billing_cycle}` : ""}
                    </p>
                    {r.payment_reference && (
                      <p className="font-mono text-[10px] mt-0.5 truncate" style={{ color: "var(--gray)" }}>
                        {r.payment_reference}
                      </p>
                    )}
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold whitespace-nowrap"
                        style={{ background: tone.bg, color: tone.fg }}>
                    {tone.en} · <span className="font-arabic" dir="rtl">{tone.ar}</span>
                  </span>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <p className="text-[11px]" style={{ color: "var(--gray)" }}>
                    {new Date(r.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                  </p>
                  <p className="text-sm font-bold" style={{ color: "var(--navy)" }}>
                    {r.currency} {r.amount.toLocaleString()}
                  </p>
                </div>
              </button>
            );
          })
        )}
      </div>

      {active && <ReceiptDetailsScreen receipt={active} onClose={() => setActive(null)} />}
    </div>
  );
};

export default MyReceiptsList;
