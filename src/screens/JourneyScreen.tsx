import { useState } from "react";
import { journeySteps } from "@/constants/data";
import { ChevronDown, ChevronUp } from "lucide-react";

const JourneyScreen = () => {
  const [expanded, setExpanded] = useState<number | null>(null);
  const doneCount = journeySteps.filter((s) => s.status === "done").length;
  const progress = (doneCount / journeySteps.length) * 100;

  const phases = [
    { label: "Before Travel", labelAr: "قبل السفر", active: false },
    { label: "During", labelAr: "أثناء العلاج", active: true },
    { label: "After Return", labelAr: "بعد العودة", active: false },
  ];

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 pt-4 pb-4" style={{ background: "var(--navy)" }}>
        <p className="text-base font-semibold mb-1" style={{ color: "#fff" }}>My Journey</p>
        <p className="font-arabic text-sm mb-3" dir="rtl" style={{ color: "var(--teal-light)" }}>رحلتي العلاجية</p>
        <div className="flex items-center gap-2 mb-2">
          <div className="flex-1 h-2 rounded-full" style={{ background: "rgba(255,255,255,0.15)" }}>
            <div className="h-2 rounded-full transition-all" style={{ width: `${progress}%`, background: "var(--teal-bright)" }} />
          </div>
          <span className="text-xs font-medium" style={{ color: "var(--teal-bright)" }}>{Math.round(progress)}%</span>
        </div>
        <div className="flex gap-2">
          {phases.map((p) => (
            <span
              key={p.label}
              className="text-[10px] px-2.5 py-1 rounded-full font-medium"
              style={{
                background: p.active ? "var(--teal-bright)" : "rgba(255,255,255,0.1)",
                color: p.active ? "#fff" : "rgba(255,255,255,0.5)",
              }}
            >
              {p.label}
            </span>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4" style={{ background: "var(--off-white)" }}>
        <div className="relative pl-6">
          {/* Timeline line */}
          <div className="absolute left-[7px] top-2 bottom-2 w-0.5" style={{ background: "var(--gray-light)" }} />

          {journeySteps.map((step) => {
            const isExpanded = expanded === step.id;
            const dotColor = step.status === "done" ? "var(--success)" : step.status === "active" ? "var(--gold)" : "var(--pending)";
            const isActive = step.status === "active";

            return (
              <div key={step.id} className="relative mb-3">
                {/* Dot */}
                <div
                  className="absolute -left-6 top-3 w-3.5 h-3.5 rounded-full border-2"
                  style={{
                    background: dotColor,
                    borderColor: isActive ? "var(--gold)" : dotColor,
                  }}
                />
                <button
                  onClick={() => setExpanded(isExpanded ? null : step.id)}
                  className="w-full text-left rounded-xl p-3 transition-all"
                  style={{
                    background: isActive ? "var(--gold-pale)" : "#fff",
                    border: isActive ? "1.5px solid var(--gold)" : "1px solid var(--gray-light)",
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium" style={{ color: "var(--navy)" }}>{step.titleEn}</p>
                      <p className="font-arabic text-xs mt-0.5" dir="rtl" style={{ color: "var(--gray)" }}>{step.titleAr}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px]" style={{ color: "var(--gray)" }}>{step.date}</span>
                      {isExpanded ? <ChevronUp size={14} color="var(--gray)" /> : <ChevronDown size={14} color="var(--gray)" />}
                    </div>
                  </div>
                  {isExpanded && step.details && (
                    <p className="mt-2 text-xs leading-relaxed" style={{ color: "var(--gray)" }}>
                      {step.details}
                    </p>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default JourneyScreen;
