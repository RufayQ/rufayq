import { PHASES, type Phase } from "./journeyPhase";
import { useLanguage } from "@/contexts/LanguageContext";

interface PhaseRibbonProps {
  current: Phase;
  variant?: "light" | "ondark";
}

/**
 * Slim 5-segment ribbon showing PREPARE · TRAVEL · CARE · RECOVER · HOME
 * with the current phase highlighted. Inspired by the journey-timeline
 * reference. Visual only — no interactions.
 */
const PhaseRibbon = ({ current, variant = "light" }: PhaseRibbonProps) => {
  const { showEn, showAr } = useLanguage();
  const onDark = variant === "ondark";
  const idx = PHASES.findIndex((p) => p.id === current);
  return (
    <div
      className="flex items-center gap-1 px-1"
      role="group"
      aria-label="Journey phase"
    >
      {PHASES.map((p, i) => {
        const isPast = i < idx;
        const isActive = i === idx;
        const baseColor = onDark ? "rgba(255,255,255,0.35)" : "var(--gray)";
        const activeColor = onDark ? "#FFFFFF" : "var(--teal-deep)";
        const dotPast = onDark ? "rgba(197,150,90,0.85)" : "var(--gold)";
        const dotActive = onDark ? "#FFFFFF" : "var(--teal-deep)";
        const dotIdle = onDark ? "rgba(255,255,255,0.18)" : "var(--gray-light)";
        return (
          <div key={p.id} className="flex-1 flex flex-col items-center min-w-0">
            <div className="flex items-center w-full">
              {i > 0 && (
                <div
                  className="flex-1 h-px"
                  style={{
                    background: isPast || isActive ? dotPast : dotIdle,
                    opacity: isActive ? 0.9 : 1,
                  }}
                />
              )}
              <span
                className={isActive ? "ring-2 ring-offset-1" : ""}
                style={{
                  width: isActive ? 9 : 6,
                  height: isActive ? 9 : 6,
                  borderRadius: 9999,
                  background: isActive ? dotActive : isPast ? dotPast : dotIdle,
                  // @ts-ignore -- ringColor via inline style is intentional
                  ["--tw-ring-color" as any]: onDark
                    ? "rgba(197,150,90,0.55)"
                    : "rgba(197,150,90,0.45)",
                  // @ts-ignore
                  ["--tw-ring-offset-color" as any]: onDark ? "transparent" : "var(--white)",
                }}
              />
              {i < PHASES.length - 1 && (
                <div
                  className="flex-1 h-px"
                  style={{
                    background: isPast ? dotPast : dotIdle,
                  }}
                />
              )}
            </div>
            <span
              className="font-mono mt-1 tracking-[0.18em] truncate"
              style={{
                fontSize: 8.5,
                color: isActive ? activeColor : baseColor,
                fontWeight: isActive ? 700 : 500,
              }}
            >
              {showEn && <span>{p.en.toUpperCase()}</span>}
              {showEn && showAr && <span> · </span>}
              {showAr && <span className="font-arabic" dir="rtl">{p.ar}</span>}
            </span>
          </div>
        );
      })}
    </div>
  );
};

export default PhaseRibbon;
