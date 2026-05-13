import { X } from "lucide-react";
import type { JourneyMilestone } from "@/hooks/useJourneyOverview";

interface MilestoneSheetProps {
  milestone: JourneyMilestone | null;
  onClose: () => void;
  onOpenSubTab: (key: string) => void;
}

const subTabFor = (kind: JourneyMilestone["kind"]): { key: string; en: string; ar: string } => {
  switch (kind) {
    case "departure":
    case "return":
      return { key: "tickets", en: "Open Tickets", ar: "افتح التذاكر" };
    case "treatment":
    case "appointment":
      return { key: "appointments", en: "Open Appointments", ar: "افتح المواعيد" };
    default:
      return { key: "steps", en: "Open Steps", ar: "افتح الخطوات" };
  }
};

const MilestoneSheet = ({ milestone, onClose, onOpenSubTab }: MilestoneSheetProps) => {
  if (!milestone) return null;
  const cta = subTabFor(milestone.kind);
  return (
    <div
      className="absolute inset-0 z-30 flex items-end"
      style={{ background: "rgba(10,20,40,0.45)" }}
      onClick={onClose}
    >
      <div
        className="w-full rounded-t-2xl p-5 animate-slide-in-bottom"
        style={{ background: "var(--white)" }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label={`${milestone.title} · ${milestone.titleAr}`}
      >
        <div className="flex items-start justify-between mb-2">
          <div>
            <p className="font-mono text-[10px] tracking-widest" style={{ color: "var(--gold)" }}>
              MILESTONE · محطة
            </p>
            <p className="font-display text-lg" style={{ color: "var(--navy)" }}>{milestone.title}</p>
            <p className="font-arabic text-xs" dir="rtl" style={{ color: "var(--gray)" }}>{milestone.titleAr}</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="btn-press p-1">
            <X size={18} color="var(--gray)" />
          </button>
        </div>

        {milestone.date && (
          <p className="text-[12px] mt-1" style={{ color: "var(--gray)" }}>
            {milestone.date}
          </p>
        )}

        <button
          onClick={() => { onOpenSubTab(cta.key); onClose(); }}
          className="mt-4 w-full py-2.5 rounded-full text-[13px] font-semibold text-white btn-press"
          style={{ background: "var(--teal-deep)" }}
        >
          {cta.en} · {cta.ar}
        </button>
      </div>
    </div>
  );
};

export default MilestoneSheet;
