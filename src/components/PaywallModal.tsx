import { X, Sparkles, Check, Crown } from "lucide-react";
import { toast } from "sonner";
import { useTrial } from "@/hooks/useTrial";

interface PaywallModalProps {
  open: boolean;
  onClose: () => void;
  onUpgrade: () => void;
  onTrialStarted?: () => void;
  feature?: string;
  featureAr?: string;
}

const PaywallModal = ({ open, onClose, onUpgrade, onTrialStarted, feature = "Add new trip", featureAr = "إضافة رحلة جديدة" }: PaywallModalProps) => {
  const { hasTrial, isActive, daysLeft, startTrial } = useTrial();

  if (!open) return null;

  const handleStartTrial = async () => {
    if (hasTrial) {
      toast.error(
        isActive ? `Trial active · ${daysLeft} days left` : "Trial already used · Please upgrade",
        { description: isActive ? "تجربتك نشطة" : "تم استخدام التجربة المجانية" }
      );
      if (isActive) {
        onTrialStarted?.();
        onClose();
      }
      return;
    }
    const ok = await startTrial();
    if (ok) {
      toast.success("✓ 14-day free trial started!", { description: "بدأت تجربتك المجانية لمدة ١٤ يوم" });
      onTrialStarted?.();
      onClose();
    } else {
      toast.error("Could not start trial · حاول لاحقاً");
    }
  };

  return (
    <div className="absolute inset-0 z-[80] flex items-center justify-center px-5" onClick={onClose}>
      <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.65)" }} />
      <div
        className="relative rounded-3xl overflow-hidden w-full max-w-sm animate-fade-in-up"
        style={{ background: "var(--white)", boxShadow: "0 30px 80px rgba(0,0,0,0.4)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Hero */}
        <div className="relative px-6 pt-7 pb-5 text-center" style={{ background: "linear-gradient(160deg, var(--teal-deep), var(--navy))" }}>
          <button onClick={onClose} className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center btn-press" style={{ background: "rgba(255,255,255,0.15)" }}>
            <X size={16} color="white" />
          </button>
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-3" style={{ background: "rgba(197,150,90,0.2)", border: "1px solid var(--gold)" }}>
            <Crown size={26} color="var(--gold)" />
          </div>
          <p className="font-mono text-[10px] tracking-widest mb-1" style={{ color: "var(--gold)" }}>PRO FEATURE</p>
          <p className="font-display text-2xl text-white mb-1">{feature}</p>
          <p className="font-arabic text-xs" dir="rtl" style={{ color: "rgba(255,255,255,0.7)" }}>{featureAr} — ميزة بريميوم</p>
        </div>

        {/* Body */}
        <div className="px-6 py-5">
          <p className="text-[13px] mb-3 leading-relaxed" style={{ color: "var(--navy)" }}>
            Upgrade to <strong>RufayQ Pro</strong> to manage <strong>unlimited trips</strong>, get unlimited AI, smart reminders & priority support.
          </p>
          <p className="font-arabic text-[11px] mb-4" dir="rtl" style={{ color: "var(--gray)" }}>
            رقّ إلى الباقة الاحترافية لإدارة عدد غير محدود من الرحلات والذكاء الاصطناعي والتذكيرات الذكية.
          </p>

          {/* Perks */}
          <div className="space-y-2 mb-5">
            {[
              { en: "Unlimited journeys & trips", ar: "رحلات غير محدودة" },
              { en: "Unlimited RufayQ AI chat", ar: "محادثات AI غير محدودة" },
              { en: "Smart reminders & alerts", ar: "تذكيرات ذكية" },
              { en: "Priority bilingual support", ar: "دعم بأولوية" },
            ].map((p) => (
              <div key={p.en} className="flex items-center gap-2.5">
                <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0" style={{ background: "var(--teal-light)" }}>
                  <Check size={11} color="var(--teal-deep)" />
                </div>
                <p className="text-[12px] flex-1" style={{ color: "var(--navy)" }}>
                  {p.en} · <span className="font-arabic" dir="rtl" style={{ color: "var(--gray)" }}>{p.ar}</span>
                </p>
              </div>
            ))}
          </div>

          {/* Trial banner */}
          {hasTrial && isActive && (
            <div className="rounded-xl p-3 mb-3 text-center" style={{ background: "var(--teal-light)", border: "1px solid var(--teal-deep)" }}>
              <p className="text-[12px] font-semibold" style={{ color: "var(--teal-deep)" }}>
                ✓ Trial active — {daysLeft} day{daysLeft === 1 ? "" : "s"} left
              </p>
              <p className="font-arabic text-[10px]" dir="rtl" style={{ color: "var(--teal-deep)" }}>تجربتك نشطة</p>
            </div>
          )}

          {/* CTAs */}
          <button
            onClick={handleStartTrial}
            disabled={hasTrial && !isActive}
            className="w-full py-3.5 rounded-xl font-semibold text-white btn-press flex items-center justify-center gap-2 mb-2 disabled:opacity-50"
            style={{ background: "linear-gradient(135deg, var(--gold), #B8884D)" }}
          >
            <Sparkles size={15} />
            {hasTrial && isActive
              ? `Continue Trial (${daysLeft}d left)`
              : hasTrial
              ? "Trial used — Upgrade"
              : "Start 14-day Free Trial"}
          </button>
          <button
            onClick={() => { onUpgrade(); onClose(); }}
            className="w-full py-3 rounded-xl font-semibold btn-press"
            style={{ background: "var(--white)", color: "var(--teal-deep)", border: "1px solid var(--teal-deep)" }}
          >
            See plans & pricing · <span className="font-arabic">الباقات</span>
          </button>
          <p className="text-center font-mono text-[9px] mt-3" style={{ color: "var(--gray)" }}>
            No credit card required for trial · بدون بطاقة ائتمان
          </p>
        </div>
      </div>
    </div>
  );
};

export default PaywallModal;
