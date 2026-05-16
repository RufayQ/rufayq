import { useEffect, useState } from "react";
import { Sparkles, Flame, Trash2, Plus } from "lucide-react";
import type { LifestylePlan } from "./lifestyleStore";
import { lifestyleStore } from "./lifestyleStore";
import { fetchBuddyNudge, buildChatContext } from "./lifestyleBuddy";

interface Props {
  plan: LifestylePlan;
  onChat?: (context: string) => void;
}

const ProgressRing = ({ done, target }: { done: number; target: number }) => {
  const pct = Math.min(1, target ? done / target : 0);
  const r = 22;
  const c = 2 * Math.PI * r;
  return (
    <svg width={56} height={56} viewBox="0 0 56 56">
      <circle cx={28} cy={28} r={r} stroke="var(--gray-light)" strokeWidth={4} fill="none" />
      <circle
        cx={28}
        cy={28}
        r={r}
        stroke="var(--teal-deep)"
        strokeWidth={4}
        fill="none"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - pct)}
        strokeLinecap="round"
        transform="rotate(-90 28 28)"
      />
      <text x={28} y={32} textAnchor="middle" fontSize={11} fontWeight={700} fill="var(--navy)">
        {done}/{target}
      </text>
    </svg>
  );
};

const milestoneBadges = (plan: LifestylePlan) => {
  const badges: { en: string; ar: string }[] = [];
  if (plan.streak >= 3) badges.push({ en: `${plan.streak}-day streak`, ar: `${plan.streak} أيام متتالية` });
  if (plan.sessionsDone >= 10) badges.push({ en: "10 sessions", ar: "١٠ جلسات" });
  if (plan.sessionsDone >= plan.weeklyTarget && plan.weeklyTarget > 0)
    badges.push({ en: "Weekly goal", ar: "هدف الأسبوع" });
  return badges;
};

const LifestylePlanCard = ({ plan, onChat }: Props) => {
  const [nudge, setNudge] = useState<{ en: string; ar: string } | null>(null);
  const [loadingNudge, setLoadingNudge] = useState(true);

  useEffect(() => {
    let alive = true;
    fetchBuddyNudge(plan).then((n) => {
      if (alive) {
        setNudge(n);
        setLoadingNudge(false);
      }
    });
    return () => {
      alive = false;
    };
  }, [plan.id, plan.sessionsDone]);

  const badges = milestoneBadges(plan);

  return (
    <div
      className="rounded-2xl p-4"
      style={{ background: "var(--white)", boxShadow: "0 4px 16px rgba(0,0,0,0.06)" }}
    >
      <div className="flex items-start gap-3">
        <ProgressRing done={plan.sessionsDone} target={plan.weeklyTarget} />
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-bold truncate" style={{ color: "var(--navy)" }}>
            {plan.title}
          </p>
          {plan.titleAr && (
            <p className="font-arabic text-[11px] truncate" dir="rtl" style={{ color: "var(--gray)" }}>
              {plan.titleAr}
            </p>
          )}
          <div className="flex flex-wrap gap-1.5 mt-2">
            {plan.scheduleDays?.length ? (
              <span
                className="text-[10px] px-2 py-0.5 rounded-full"
                style={{ background: "var(--off-white)", color: "var(--navy)" }}
              >
                {plan.scheduleDays.join(" · ")}
                {plan.reminderTime ? ` · ${plan.reminderTime}` : ""}
              </span>
            ) : plan.reminderTime ? (
              <span
                className="text-[10px] px-2 py-0.5 rounded-full"
                style={{ background: "var(--off-white)", color: "var(--navy)" }}
              >
                ⏰ {plan.reminderTime}
              </span>
            ) : null}
            {badges.map((b, i) => (
              <span
                key={i}
                className="text-[10px] px-2 py-0.5 rounded-full inline-flex items-center gap-1"
                style={{ background: "rgba(197,150,90,0.15)", color: "var(--gold)" }}
              >
                <Flame size={10} /> {b.en}
              </span>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <button
            onClick={() => lifestyleStore.logSession(plan.id)}
            className="w-7 h-7 rounded-full flex items-center justify-center btn-press"
            style={{ background: "var(--teal-deep)", color: "#fff" }}
            aria-label="Log session"
            title="Log session"
          >
            <Plus size={14} />
          </button>
          <button
            onClick={() => lifestyleStore.remove(plan.id)}
            className="w-7 h-7 rounded-full flex items-center justify-center btn-press"
            style={{ background: "var(--off-white)", color: "var(--gray)" }}
            aria-label="Remove plan"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      {/* AI Buddy strip */}
      <button
        onClick={() => onChat?.(buildChatContext(plan))}
        className="mt-3 w-full text-left rounded-xl px-3 py-2 btn-press flex items-start gap-2"
        style={{ background: "linear-gradient(135deg, rgba(197,150,90,0.10), rgba(20,84,86,0.08))" }}
      >
        <Sparkles size={14} style={{ color: "var(--gold)", marginTop: 2 }} />
        <div className="flex-1 min-w-0">
          {loadingNudge ? (
            <p className="text-[11px]" style={{ color: "var(--gray)" }}>
              Buddy is thinking… · المساعد يفكر…
            </p>
          ) : (
            <>
              <p className="text-[11px]" style={{ color: "var(--navy)" }}>
                {nudge?.en}
              </p>
              <p className="font-arabic text-[10px]" dir="rtl" style={{ color: "var(--gray)" }}>
                {nudge?.ar}
              </p>
            </>
          )}
        </div>
      </button>
    </div>
  );
};

export default LifestylePlanCard;
