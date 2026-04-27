/**
 * ReceiptStatusTimeline — patient-facing 4-step visual timeline used inside
 * BankTransferCheckout's confirmation screen:
 *
 *   Pending → Code Expired (only if applicable) → Under Review → Approved
 *
 * Each step shows the date when it became active. Bilingual EN + AR.
 * Pure presentational component, no data fetching.
 */
import { Clock, AlertTriangle, RefreshCw, CheckCircle2, XCircle } from "lucide-react";

export interface TimelineReceipt {
  status: "pending" | "under_review" | "verified" | "rejected" | "needs_more_info" | "code_expired";
  created_at: string;
  reviewed_at: string | null;
  code_expires_at?: string | null;
}

interface Step {
  key: string;
  en: string;
  ar: string;
  Icon: typeof Clock;
  reachedAt: string | null;
  active: boolean;
  failed?: boolean;
}

const fmt = (iso: string | null): string => {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const ReceiptStatusTimeline = ({ receipt }: { receipt: TimelineReceipt }) => {
  const isExpired = receipt.status === "code_expired";
  const isRejected = receipt.status === "rejected";
  const isVerified = receipt.status === "verified";
  const inReview = receipt.status === "under_review" || receipt.status === "needs_more_info";

  // Approximate when "under_review" started: prefer reviewed_at, fall back to
  // a small offset after creation when the row is already past pending.
  const reviewStartedAt = inReview || isVerified || isRejected ? receipt.reviewed_at : null;

  const steps: Step[] = [
    {
      key: "pending",
      en: "Pending",
      ar: "قيد الانتظار",
      Icon: Clock,
      reachedAt: receipt.created_at,
      active: receipt.status === "pending",
    },
  ];

  if (isExpired) {
    steps.push({
      key: "expired",
      en: "Code expired",
      ar: "انتهت صلاحية المرجع",
      Icon: AlertTriangle,
      reachedAt: receipt.code_expires_at ?? null,
      active: true,
      failed: true,
    });
  }

  steps.push({
    key: "review",
    en: "Under review",
    ar: "قيد المراجعة",
    Icon: RefreshCw,
    reachedAt: reviewStartedAt,
    active: inReview,
  });

  steps.push({
    key: "decision",
    en: isRejected ? "Rejected" : "Approved",
    ar: isRejected ? "مرفوض" : "تمت الموافقة",
    Icon: isRejected ? XCircle : CheckCircle2,
    reachedAt: isVerified || isRejected ? receipt.reviewed_at : null,
    active: isVerified || isRejected,
    failed: isRejected,
  });

  return (
    <div className="space-y-2">
      <p className="text-[10px] font-mono tracking-widest" style={{ color: "var(--gray)" }}>
        TIMELINE · الخط الزمني
      </p>
      <ol className="space-y-2.5">
        {steps.map((s, i) => {
          const reached = !!s.reachedAt;
          const tone = s.failed
            ? "var(--danger)"
            : s.active
            ? "var(--success)"
            : reached
            ? "var(--teal-deep)"
            : "var(--gray-light)";
          const Icon = s.Icon;
          return (
            <li key={s.key} className="flex items-start gap-3">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-white shrink-0"
                style={{ background: tone }}
              >
                <Icon size={14} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p
                    className="text-[13px] font-semibold"
                    style={{ color: s.active ? tone : "var(--navy)" }}
                  >
                    {s.en}
                  </p>
                  <p
                    className="font-arabic text-[11px]"
                    dir="rtl"
                    style={{ color: "var(--gray)" }}
                  >
                    {s.ar}
                  </p>
                  {s.active && (
                    <span
                      className="text-[9px] uppercase font-bold tracking-widest px-1.5 rounded"
                      style={{ background: `${tone}20`, color: tone }}
                    >
                      Now
                    </span>
                  )}
                </div>
                {s.reachedAt ? (
                  <p className="text-[11px] mt-0.5" style={{ color: "var(--gray)" }}>
                    {fmt(s.reachedAt)}
                  </p>
                ) : (
                  <p className="text-[11px] mt-0.5" style={{ color: "var(--gray-light)" }}>
                    Awaiting · بانتظار
                  </p>
                )}
              </div>
              {i < steps.length - 1 && (
                <div className="hidden" /> /* connector handled by spacing */
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
};

export default ReceiptStatusTimeline;
