import { useState } from "react";
import { journeySteps } from "@/constants/data";
import { ChevronDown, ChevronUp } from "lucide-react";

const phases = [
  { key: "before", label: "Before Travel", labelAr: "قبل السفر", color: "var(--teal-deep)" },
  { key: "during", label: "During Treatment", labelAr: "أثناء العلاج", color: "var(--gold)" },
  { key: "after", label: "After Return", labelAr: "بعد العودة", color: "var(--teal-bright)" },
];

const JourneyScreen = () => {
  const [expanded, setExpanded] = useState<number | null>(null);
  const doneCount = journeySteps.filter((s) => s.status === "done").length;
  const progress = (doneCount / journeySteps.length) * 100;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="relative px-5 pt-3 pb-4 overflow-hidden" style={{ background: "var(--navy)" }}>
        <div className="absolute -top-6 -right-6 w-28 h-28 rounded-full" style={{ border: "1px solid rgba(197,150,90,0.12)" }} />
        <p className="font-mono text-[10px] tracking-widest mb-1" style={{ color: "rgba(255,255,255,0.4)" }}>02 — JOURNEY MAP</p>
        <p className="font-display text-xl text-white" style={{ fontWeight: 300 }}>Treatment Journey</p>
        <p className="font-arabic text-sm" dir="rtl" style={{ color: "rgba(255,255,255,0.45)" }}>خريطة رحلتك العلاجية</p>

        <div className="mt-3 rounded-lg px-3.5 py-2.5" style={{ background: "rgba(255,255,255,0.08)" }}>
          <div className="flex items-center gap-3">
            <div className="flex-1 h-2 rounded-full" style={{ background: "rgba(255,255,255,0.15)" }}>
              <div className="h-2 rounded-full animate-progress" style={{ width: `${progress}%`, background: "linear-gradient(90deg, var(--teal-bright), var(--gold))" }} />
            </div>
            <span className="text-[13px] font-semibold text-white">{doneCount} / {journeySteps.length}</span>
          </div>
          <p className="font-mono text-[10px] mt-1" style={{ color: "var(--gold)" }}>Step 7 of 10 — In Progress</p>
        </div>
      </div>

      {/* Phase Badges */}
      <div className="flex gap-2 px-4 py-3" style={{ background: "var(--off-white)" }}>
        {phases.map((p) => (
          <div key={p.key} className="flex-1 rounded-xl py-2.5 text-center" style={{ background: "var(--white)", border: "1px solid var(--gray-light)" }}>
            <div className="w-2 h-2 rounded-full mx-auto mb-1" style={{ background: p.color }} />
            <p className="text-[9px] font-semibold" style={{ color: "var(--navy)" }}>{p.label}</p>
            <p className="font-arabic text-[9px]" dir="rtl" style={{ color: "var(--gray)" }}>{p.labelAr}</p>
          </div>
        ))}
      </div>

      {/* Timeline */}
      <div className="flex-1 overflow-y-auto px-4 pb-4" style={{ background: "var(--off-white)" }}>
        {phases.map((phase) => {
          const phaseSteps = journeySteps.filter((s) => s.phase === phase.key);
          return (
            <div key={phase.key}>
              {/* Phase divider */}
              <div className="flex items-center gap-2 my-3">
                <div className="flex-1 h-px" style={{ background: "var(--gray-light)" }} />
                <span className="font-mono text-[9px] font-bold tracking-widest" style={{ color: phase.color }}>{phase.label.toUpperCase()}</span>
                <div className="flex-1 h-px" style={{ background: "var(--gray-light)" }} />
              </div>

              <div className="relative pl-7">
                {phaseSteps.map((step, idx) => {
                  const isExpanded = expanded === step.id;
                  const dotColor = step.status === "done" ? "var(--success)" : step.status === "active" ? "var(--gold)" : "var(--gray-light)";
                  const isActive = step.status === "active";
                  const isPending = step.status === "pending";

                  return (
                    <div key={step.id} className="relative mb-2.5">
                      {/* Connecting line */}
                      {idx < phaseSteps.length - 1 && (
                        <div className="absolute left-[-17px] top-6 bottom-0 w-0.5" style={{ background: step.status === "done" && phaseSteps[idx + 1]?.status === "done" ? "rgba(61,170,110,0.3)" : "var(--gray-light)" }} />
                      )}
                      {/* Dot */}
                      <div
                        className={`absolute -left-[21px] top-3 w-2.5 h-2.5 rounded-full ${isActive ? "pulse-gold" : ""}`}
                        style={{ background: dotColor }}
                      />
                      <button
                        onClick={() => setExpanded(isExpanded ? null : step.id)}
                        className="w-full text-left rounded-xl px-3.5 py-3 transition-all card-press"
                        style={{
                          background: isActive ? "var(--gold-pale)" : isPending ? "#F3F5F7" : "var(--white)",
                          border: isActive ? "1px solid var(--gold)" : "1px solid var(--gray-light)",
                          boxShadow: isActive ? "0 3px 14px rgba(197,150,90,0.16)" : "none",
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-[13px] font-semibold" style={{ color: isPending ? "var(--gray)" : "var(--navy)" }}>{step.titleEn}</p>
                            <p className="font-arabic text-[10px] mt-0.5" dir="rtl" style={{ color: "var(--gray)" }}>{step.titleAr}</p>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-[9px]" style={{ color: "var(--gray)" }}>{step.date}</span>
                            {isExpanded ? <ChevronUp size={12} color="var(--gray)" /> : <ChevronDown size={12} color="var(--gray)" />}
                          </div>
                        </div>
                        {isActive && step.actionLabel && (
                          <p className="text-[10px] font-semibold mt-2" style={{ color: "var(--gold)" }}>{step.actionLabel}</p>
                        )}
                        {isExpanded && step.details && (
                          <div className="mt-2 pt-2" style={{ borderTop: "1px solid var(--gray-light)" }}>
                            <p className="text-xs leading-relaxed" style={{ color: "var(--gray)" }}>{step.details}</p>
                            {step.detailsAr && <p className="font-arabic text-[11px] mt-1 leading-relaxed" dir="rtl" style={{ color: "var(--gray)" }}>{step.detailsAr}</p>}
                          </div>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        <button className="w-full mt-3 py-3 rounded-xl text-sm font-medium btn-press" style={{ border: "1px solid var(--gray-light)", color: "var(--gray)" }}>
          ＋ Add New Trip · إضافة رحلة جديدة
        </button>
      </div>
    </div>
  );
};

export default JourneyScreen;
