/**
 * ReceiptDetailsScreen — patient-facing detailed view for a single
 * payment_receipts row. Mirrors the same status timeline used in the post-
 * checkout confirmation, plus:
 *   - Receipt file download / share (signed URL from `payment-receipts` bucket)
 *   - Bilingual audit trail with PDF export
 *   - Reviewer message + key receipt facts
 *
 * Designed as a modal/sheet so it can be opened from MyReceiptsList without
 * a full route change. Pure presentational + minimal data fetching.
 */
import { useEffect, useMemo, useState } from "react";
import { X, Download, Share2, FileText, Loader2, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import ReceiptStatusTimeline, { type TimelineReceipt } from "./ReceiptStatusTimeline";
import ReceiptAuditLog from "@/features/payments/admin/ui/ReceiptAuditLog";
import { ACTION_LABELS } from "@/features/payments/logic/auditLabels";

export interface PatientReceipt {
  id: string;
  status: TimelineReceipt["status"];
  payment_reference: string | null;
  reviewer_notes: string | null;
  patient_message: string | null;
  created_at: string;
  reviewed_at: string | null;
  amount: number;
  currency: string;
  requested_plan: string;
  billing_cycle: string | null;
  receipt_file_path: string | null;
  payer_name: string | null;
  bank_name: string | null;
  reference_no: string | null;
  transfer_date: string | null;
  code_expires_at: string | null;
}

const STATUS_LABEL: Record<PatientReceipt["status"], { en: string; ar: string }> = {
  pending:         { en: "Pending verification",  ar: "قيد التحقق" },
  under_review:    { en: "Under review",          ar: "قيد المراجعة" },
  needs_more_info: { en: "More info needed",      ar: "مطلوب معلومات إضافية" },
  verified:        { en: "Approved",              ar: "تمت الموافقة" },
  rejected:        { en: "Rejected",              ar: "مرفوض" },
  code_expired:    { en: "Code expired",          ar: "انتهت صلاحية المرجع" },
};

interface Props {
  receipt: PatientReceipt;
  onClose: () => void;
}

const ReceiptDetailsScreen = ({ receipt, onClose }: Props) => {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loadingFile, setLoadingFile] = useState(false);

  // Lazily resolve a 1-hour signed URL for the uploaded receipt file.
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!receipt.receipt_file_path) return;
      setLoadingFile(true);
      const { data, error } = await supabase.storage
        .from("payment-receipts")
        .createSignedUrl(receipt.receipt_file_path, 3600);
      if (!cancelled) {
        if (error) toast.error("Could not load receipt file");
        else setSignedUrl(data?.signedUrl ?? null);
        setLoadingFile(false);
      }
    };
    run();
    return () => { cancelled = true; };
  }, [receipt.receipt_file_path]);

  const status = STATUS_LABEL[receipt.status];

  // Build the same step list that ReceiptStatusTimeline renders so the PDF
  // export stays in sync with the on-screen timeline.
  const pdfTimeline = useMemo(() => {
    const steps = [
      { enLabel: "Pending", arLabel: "قيد الانتظار", reachedAt: receipt.created_at, active: receipt.status === "pending" },
    ];
    if (receipt.status === "code_expired") {
      steps.push({ enLabel: "Code expired", arLabel: "انتهت صلاحية المرجع", reachedAt: receipt.code_expires_at, active: true, failed: true } as any);
    }
    steps.push({ enLabel: "Under review", arLabel: "قيد المراجعة", reachedAt: receipt.status === "under_review" || receipt.status === "verified" || receipt.status === "rejected" ? receipt.reviewed_at : null, active: receipt.status === "under_review" || receipt.status === "needs_more_info" });
    steps.push({ enLabel: receipt.status === "rejected" ? "Rejected" : "Approved", arLabel: receipt.status === "rejected" ? "مرفوض" : "تمت الموافقة", reachedAt: receipt.status === "verified" || receipt.status === "rejected" ? receipt.reviewed_at : null, active: receipt.status === "verified" || receipt.status === "rejected", failed: receipt.status === "rejected" } as any);
    return steps;
  }, [receipt]);

  const handleShare = async () => {
    if (!signedUrl) return;
    const shareData = {
      title: `RufayQ receipt ${receipt.payment_reference ?? ""}`,
      text: `${status.en} · ${receipt.requested_plan} · ${receipt.currency} ${receipt.amount}`,
      url: signedUrl,
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(signedUrl);
        toast.success("Link copied · تم النسخ");
      }
    } catch {
      /* user cancelled */
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md max-h-[92vh] overflow-y-auto rounded-t-3xl md:rounded-3xl bg-white shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 px-5 py-4 border-b flex items-center justify-between z-10"
             style={{ background: "linear-gradient(135deg, var(--header-dark-from), var(--header-dark-to))" }}>
          <div className="min-w-0">
            <p className="font-display text-base text-white truncate">
              Receipt details · <span className="font-arabic">تفاصيل الإيصال</span>
            </p>
            {receipt.payment_reference && (
              <p className="font-mono text-[10px] text-white/70 truncate">{receipt.payment_reference}</p>
            )}
          </div>
          <button onClick={onClose} className="text-white/80 btn-press"><X size={20} /></button>
        </div>

        <div className="p-5 space-y-4">
          {/* Summary */}
          <div className="rounded-xl p-3" style={{ background: "var(--off-white)" }}>
            <div className="flex items-center justify-between">
              <p className="text-xs" style={{ color: "var(--gray)" }}>Plan · الباقة</p>
              <p className="text-sm font-bold" style={{ color: "var(--navy)" }}>{receipt.requested_plan} {receipt.billing_cycle ? `· ${receipt.billing_cycle}` : ""}</p>
            </div>
            <div className="flex items-center justify-between mt-1">
              <p className="text-xs" style={{ color: "var(--gray)" }}>Amount · المبلغ</p>
              <p className="font-display text-lg font-bold" style={{ color: "var(--navy)" }}>{receipt.currency} {receipt.amount.toLocaleString()}</p>
            </div>
            <div className="flex items-center justify-between mt-1">
              <p className="text-xs" style={{ color: "var(--gray)" }}>Status · الحالة</p>
              <p className="text-xs font-semibold" style={{ color: "var(--navy)" }}>
                {status.en} · <span className="font-arabic" dir="rtl">{status.ar}</span>
              </p>
            </div>
          </div>

          {/* Reviewer message if any */}
          {receipt.patient_message && (
            <div className="rounded-xl p-3 text-[12px]" style={{ background: "var(--gold-pale)", border: "1px solid var(--gold)" }}>
              <p className="font-bold mb-1" style={{ color: "var(--navy)" }}>From RufayQ team · من فريق رُفَيْق:</p>
              <p style={{ color: "var(--navy)" }}>{receipt.patient_message}</p>
            </div>
          )}

          {/* File actions */}
          <div className="rounded-xl p-3 space-y-2" style={{ background: "var(--off-white)" }}>
            <p className="text-[10px] font-mono tracking-widest" style={{ color: "var(--gray)" }}>
              RECEIPT FILE · ملف الإيصال
            </p>
            {!receipt.receipt_file_path ? (
              <p className="text-[11px]" style={{ color: "var(--gray)" }}>No file attached.</p>
            ) : loadingFile ? (
              <p className="text-[11px] flex items-center gap-1" style={{ color: "var(--gray)" }}>
                <Loader2 size={11} className="animate-spin" /> Resolving file…
              </p>
            ) : signedUrl ? (
              <div className="flex flex-wrap gap-2">
                <a href={signedUrl} target="_blank" rel="noreferrer"
                   className="flex-1 min-w-[120px] py-2 rounded-lg text-[12px] font-semibold flex items-center justify-center gap-1 btn-press"
                   style={{ background: "var(--teal-deep)", color: "white" }}>
                  <ExternalLink size={12} /> Open
                </a>
                <a href={signedUrl} download
                   className="flex-1 min-w-[120px] py-2 rounded-lg text-[12px] font-semibold flex items-center justify-center gap-1 btn-press"
                   style={{ background: "var(--navy)", color: "white" }}>
                  <Download size={12} /> Download
                </a>
                <button onClick={handleShare}
                   className="flex-1 min-w-[120px] py-2 rounded-lg text-[12px] font-semibold flex items-center justify-center gap-1 btn-press"
                   style={{ background: "var(--gold)", color: "var(--navy)" }}>
                  <Share2 size={12} /> Share
                </button>
              </div>
            ) : (
              <p className="text-[11px]" style={{ color: "var(--danger)" }}>Could not load file.</p>
            )}
          </div>

          {/* Timeline */}
          <ReceiptStatusTimeline receipt={receipt} />

          {/* Audit trail with PDF export */}
          <div className="rounded-xl p-3 bg-slate-900">
            <ReceiptAuditLog
              receiptId={receipt.id}
              exportContext={{
                receipt: {
                  payment_reference: receipt.payment_reference,
                  requested_plan: receipt.requested_plan,
                  amount: receipt.amount,
                  currency: receipt.currency,
                  status: receipt.status,
                  created_at: receipt.created_at,
                  reviewed_at: receipt.reviewed_at,
                  payer_name: receipt.payer_name,
                },
                timeline: pdfTimeline as any,
              }}
            />
          </div>

          <button onClick={onClose} className="w-full py-3 rounded-xl font-semibold text-white btn-press"
                  style={{ background: "var(--teal-deep)" }}>
            Close · إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReceiptDetailsScreen;
