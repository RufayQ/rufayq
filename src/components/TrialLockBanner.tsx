import { useTrial } from "@/hooks/useTrial";
import { Lock } from "lucide-react";

interface Props { onUpgrade: () => void }

const TrialLockBanner = ({ onUpgrade }: Props) => {
  const { hasTrial, isActive, daysLeft, loading } = useTrial();
  if (loading) return null;

  // Trial expired — locked
  if (hasTrial && !isActive) {
    return (
      <div className="px-4 py-2.5 flex items-center gap-2.5" style={{ background: "var(--error)", color: "white" }}>
        <Lock size={14} />
        <div className="flex-1">
          <p className="text-[12px] font-semibold leading-tight">Trial expired — read-only mode</p>
          <p className="font-arabic text-[10px] leading-tight" dir="rtl">انتهت الفترة التجريبية — وضع القراءة فقط</p>
        </div>
        <button onClick={onUpgrade} className="px-3 py-1 rounded-full text-[11px] font-bold btn-press" style={{ background: "white", color: "var(--error)" }}>
          Subscribe
        </button>
      </div>
    );
  }

  // Trial running but ≤3 days left — warn
  if (hasTrial && isActive && daysLeft <= 3) {
    return (
      <div className="px-4 py-2 flex items-center gap-2 text-[11px]" style={{ background: "var(--gold)", color: "var(--navy)" }}>
        <Lock size={12} />
        <span className="flex-1 font-semibold">Trial ends in {daysLeft} day{daysLeft === 1 ? "" : "s"} · تنتهي خلال {daysLeft} يوم</span>
        <button onClick={onUpgrade} className="underline font-bold">Subscribe</button>
      </div>
    );
  }
  return null;
};

export default TrialLockBanner;
