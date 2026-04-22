/**
 * TourRunner — generic step-by-step overlay used by feature & element tours.
 *
 * The original 6-step welcome tour still lives in TourGuide.tsx (it has a
 * richer first-launch experience). TourRunner is purpose-built for the
 * shorter, configurable tours defined in `tours.ts`:
 *
 *  • feature tours: full overlay, can't be skipped past the last step
 *  • element tours: same UI, smaller (1–2 steps), shown after first tap
 *
 * Both render the same card so users get a familiar experience.
 */
import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { TourConfig } from "@/lib/tours";

interface Props {
  tour: TourConfig;
  onFinish: () => void;
  /** When false, the user can't dismiss until reaching the last step. */
  allowSkip?: boolean;
}

const TourRunner = ({ tour, onFinish, allowSkip = true }: Props) => {
  const [idx, setIdx] = useState(0);
  const total = tour.steps.length;
  const step = tour.steps[idx];
  if (!step) return null;
  const isLast = idx === total - 1;
  const accent = step.accent || "var(--gold)";

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 animate-fade-in"
      style={{ background: "rgba(6,16,26,0.85)", backdropFilter: "blur(8px)" }}
      role="dialog"
      aria-modal="true"
      aria-label={tour.titleEn}
    >
      <div
        className="w-full max-w-sm rounded-3xl overflow-hidden flex flex-col"
        style={{
          background: "var(--white)",
          boxShadow: "0 30px 80px rgba(0,0,0,0.5)",
          maxHeight: "90vh",
        }}
      >
        {/* Skip (if allowed) */}
        <div className="flex justify-end p-3" style={{ minHeight: 38 }}>
          {allowSkip && (
            <button
              onClick={onFinish}
              className="text-[11px] px-3 py-1 rounded-full btn-press"
              style={{ color: "var(--gray)" }}
            >
              Skip<span className="font-arabic" dir="rtl"> · تخطى</span>
            </button>
          )}
        </div>

        {/* Icon */}
        <div className="px-6 pb-2 flex justify-center">
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center text-4xl"
            style={{
              background: `linear-gradient(135deg, ${accent}22, ${accent}08)`,
              border: `1.5px solid ${accent}55`,
            }}
          >
            {step.icon}
          </div>
        </div>

        {/* Body */}
        <div className="px-6 pb-2 text-center">
          <p className="font-mono text-[10px] tracking-widest mb-2" style={{ color: accent }}>
            {step.badgeEn} · <span className="font-arabic">{step.badgeAr}</span>
          </p>
          <h2 className="font-display text-xl mb-1" style={{ color: "var(--navy)", fontWeight: 500 }}>
            {step.titleEn}
          </h2>
          <p className="font-arabic text-base mb-3" dir="rtl" style={{ color: "var(--teal-deep)" }}>
            {step.titleAr}
          </p>
          <p className="text-[13px] leading-relaxed mb-2" style={{ color: "var(--gray)" }}>
            {step.bodyEn}
          </p>
          <p className="font-arabic text-[12px] leading-relaxed" dir="rtl" style={{ color: "var(--gray)" }}>
            {step.bodyAr}
          </p>
        </div>

        {/* Progress dots (only if multi-step) */}
        {total > 1 && (
          <div className="flex items-center justify-center gap-1.5 py-4">
            {tour.steps.map((_, i) => (
              <div
                key={i}
                className="rounded-full transition-all"
                style={{
                  width: i === idx ? 20 : 6,
                  height: 6,
                  background: i === idx ? accent : "var(--gray-light)",
                  opacity: i === idx ? 1 : 0.6,
                }}
              />
            ))}
          </div>
        )}

        {/* Footer */}
        <div
          className="flex items-center justify-between gap-2 p-4 border-t"
          style={{ borderColor: "var(--gray-light)", background: "var(--off-white)" }}
        >
          <button
            onClick={() => (idx > 0 ? setIdx(idx - 1) : (allowSkip ? onFinish() : undefined))}
            disabled={idx === 0 && !allowSkip}
            className="text-xs flex items-center gap-1 px-3 py-2 rounded-full btn-press disabled:opacity-30"
            style={{ color: "var(--gray)" }}
          >
            <ChevronLeft size={14} />
            {idx > 0 ? "Back" : (allowSkip ? "Skip" : "")}
          </button>
          <p className="text-[10px] font-mono" style={{ color: "var(--gray)" }}>
            {idx + 1} / {total}
          </p>
          <button
            onClick={() => (isLast ? onFinish() : setIdx(idx + 1))}
            className="text-xs font-semibold flex items-center gap-1 px-5 py-2 rounded-full btn-press"
            style={{ background: accent, color: "#fff" }}
          >
            {isLast ? "Got it" : "Next"}
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default TourRunner;
