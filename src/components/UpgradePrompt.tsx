import { Sparkles, X } from "lucide-react";

interface UpgradePromptProps {
  open: boolean;
  onClose: () => void;
  onUpgrade: () => void;
  /** Optional context: "guest" shows guest-specific copy, otherwise subscriber copy. */
  variant?: "guest" | "subscriber";
  /** Plan name (subscriber variant) */
  plan?: string;
  /** When the daily counter resets (ISO or Date). */
  resetsAt?: Date | string | null;
  /** Context that triggered the prompt — drives the copy. Defaults to "ai_limit". */
  reason?: "ai_limit" | "device_uploads";
}

const formatResetIn = (d: Date) => {
  const ms = d.getTime() - Date.now();
  if (ms <= 0) return "soon";
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  if (h >= 1) return `${h}h ${m}m`;
  return `${m}m`;
};

const UpgradePrompt = ({ open, onClose, onUpgrade, variant = "guest", plan, resetsAt, reason = "ai_limit" }: UpgradePromptProps) => {
  if (!open) return null;
  const reset = resetsAt ? (typeof resetsAt === "string" ? new Date(resetsAt) : resetsAt) : null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center"
      style={{ background: "rgba(13,27,42,0.55)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-[360px] rounded-t-3xl sm:rounded-3xl overflow-hidden animate-fade-in-up"
        style={{ background: "var(--white)", boxShadow: "0 -10px 40px rgba(0,0,0,0.25)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="relative px-5 pt-5 pb-4"
          style={{ background: "linear-gradient(135deg, var(--header-teal-from), var(--header-teal-to))" }}
        >
          <button onClick={onClose} className="absolute top-3 right-3 btn-press" aria-label="Close">
            <X size={18} color="white" />
          </button>
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center mb-3"
            style={{ background: "var(--gold)", boxShadow: "0 0 20px rgba(197,150,90,0.5)" }}
          >
            <Sparkles size={22} color="white" />
          </div>
          <p className="text-[18px] font-bold text-white" style={{ fontFamily: "'DM Sans'" }}>
            {variant === "guest" ? "Daily AI limit reached" : "Plan AI limit reached"}
          </p>
          <p className="font-arabic text-[12px] mt-0.5" dir="rtl" style={{ color: "rgba(255,255,255,0.75)" }}>
            {variant === "guest" ? "انتهى الحد اليومي للذكاء الاصطناعي" : "انتهى حد باقتك اليومي"}
          </p>
        </div>

        <div className="px-5 py-4 space-y-3">
          <p className="text-[13px] leading-relaxed" style={{ color: "var(--ink)" }}>
            {variant === "guest"
              ? "You've used your 5 free guest prompts for today. Upgrade to RufayQ to unlock more daily prompts, full medical record vault, and bilingual concierge support."
              : `Your ${plan ?? "current"} plan's daily AI prompts are used up. Upgrade for more daily credits.`}
          </p>
          <p className="font-arabic text-[11px] leading-relaxed" dir="rtl" style={{ color: "var(--gray)" }}>
            {variant === "guest"
              ? "استهلكت 5 طلبات مجانية اليوم. ترقّى للحصول على المزيد ومزايا كاملة."
              : "اكتمل عدد طلبات الذكاء الاصطناعي اليومية لباقتك. ترقّى للحصول على رصيد إضافي."}
          </p>

          {reset && (
            <div
              className="rounded-lg px-3 py-2 flex items-center justify-between text-[11px]"
              style={{ background: "var(--off-white)", border: "1px solid var(--gray-light)" }}
            >
              <span style={{ color: "var(--gray)" }}>Resets in</span>
              <span className="font-mono font-semibold" style={{ color: "var(--teal-deep)" }}>
                {formatResetIn(reset)}
              </span>
            </div>
          )}

          <button
            onClick={onUpgrade}
            className="w-full py-3 rounded-xl font-bold text-[14px] btn-press"
            style={{
              background: "linear-gradient(135deg, var(--gold), #b8843e)",
              color: "white",
              boxShadow: "0 4px 14px rgba(197,150,90,0.4)",
            }}
          >
            Upgrade RufayQ · ترقية
          </button>
          <button
            onClick={onClose}
            className="w-full py-2.5 text-[12px] btn-press"
            style={{ color: "var(--gray)" }}
          >
            Maybe later · ربما لاحقاً
          </button>
        </div>
      </div>
    </div>
  );
};

export default UpgradePrompt;
