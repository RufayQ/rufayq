import { useEffect, useMemo, useRef } from "react";
import {
  Activity, BedDouble, FlaskConical, HeartPulse, Home, PlaneLanding, PlaneTakeoff, Stethoscope,
  type LucideIcon,
} from "lucide-react";
import type { JourneyMilestone, MilestoneSubKind } from "@/hooks/useJourneyOverview";
import { formatChipDate } from "@/lib/journeyOverview";

/**
 * Horizontal "helicopter" timeline rail for the Journey → Map tab.
 * Replaces the 2D HelicopterCanvas with an elite scrollable rail that keeps
 * the same milestone semantics (kind, state, phase) and selection contract.
 */
interface Props {
  milestones: JourneyMilestone[];
  selectedId?: string | null;
  onSelect: (id: string) => void;
}

const ICONS: Record<MilestoneSubKind, LucideIcon> = {
  consult: Stethoscope,
  lab: FlaskConical,
  rad: Activity,
  flight: PlaneTakeoff,
  surgery: HeartPulse,
  recovery: BedDouble,
  followup: Home,
};

const phaseChip = (phase: JourneyMilestone["phase"]) => {
  switch (phase) {
    case "before": return { en: "Before", ar: "قبل", color: "var(--teal-deep)" };
    case "travel": return { en: "Travel", ar: "السفر", color: "var(--teal-bright)" };
    case "care":   return { en: "Care",   ar: "العلاج", color: "var(--gold)" };
    case "after":  return { en: "After",  ar: "بعد",   color: "var(--success)" };
  }
};

const stateStyle = (state: JourneyMilestone["state"]) => {
  if (state === "done")    return { ring: "var(--success)",   bg: "rgba(16,185,129,0.10)" };
  if (state === "current") return { ring: "var(--gold)",      bg: "rgba(197,150,90,0.18)" };
  return { ring: "var(--teal-deep)", bg: "rgba(0,77,91,0.08)" };
};

const connectorColor = (a: JourneyMilestone, b: JourneyMilestone) => {
  if (a.state === "done" && b.state === "done") return "var(--success)";
  if (a.state === "done" || a.state === "current" || b.state === "current") return "var(--gold)";
  return "var(--gray-light)";
};

const HelicopterTimelineRail = ({ milestones, selectedId, onSelect }: Props) => {
  const railRef = useRef<HTMLDivElement>(null);
  const ordered = useMemo(() => milestones, [milestones]);

  // Auto-scroll the selected node into view (smooth, horizontal).
  useEffect(() => {
    if (!selectedId) return;
    const node = railRef.current?.querySelector<HTMLButtonElement>(`[data-mid="${selectedId}"]`);
    node?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [selectedId]);

  if (ordered.length === 0) return null;

  const currentIdx = ordered.findIndex((m) => m.state === "current");
  const doneCount = ordered.filter((m) => m.state === "done").length;

  return (
    <section className="px-4 pt-3" aria-label="Helicopter timeline · الخط الزمني الشامل">
      <div
        className="rounded-3xl p-4"
        style={{
          background: "linear-gradient(135deg, rgba(0,77,91,0.08), rgba(197,150,90,0.10))",
          border: "1px solid rgba(0,77,91,0.12)",
        }}
      >
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="font-mono text-[10px] tracking-widest" style={{ color: "var(--teal-deep)" }}>
              HELICOPTER · TIMELINE
            </p>
            <p className="font-arabic text-[10px]" dir="rtl" style={{ color: "var(--gray)" }}>
              نظرة شاملة لمحطات الرحلة
            </p>
          </div>
          <span
            className="rounded-full px-2.5 py-1 text-[10px] font-bold"
            style={{ background: "var(--white)", color: "var(--teal-deep)" }}
          >
            {doneCount}/{ordered.length}
          </span>
        </div>

        <div
          ref={railRef}
          role="list"
          className="flex items-stretch overflow-x-auto overflow-y-hidden pb-2 -mx-1 px-1"
          style={{ scrollSnapType: "x mandatory", scrollbarWidth: "thin" }}
        >
          {ordered.map((m, i) => {
            const Icon = ICONS[m.subKind] ?? Stethoscope;
            const chip = phaseChip(m.phase);
            const s = stateStyle(m.state);
            const selected = selectedId === m.id;
            const last = i === ordered.length - 1;
            const next = ordered[i + 1];
            // Departure / return get their dedicated icons.
            const Display = m.kind === "departure" ? PlaneTakeoff : m.kind === "return" ? PlaneLanding : Icon;
            return (
              <div key={m.id} role="listitem" className="flex items-center" style={{ scrollSnapAlign: "center" }}>
                <button
                  data-mid={m.id}
                  onClick={() => onSelect(m.id)}
                  className="flex w-[108px] flex-col items-center gap-1.5 rounded-2xl px-2 py-2.5 outline-none btn-press transition-transform"
                  style={{
                    background: selected ? "var(--white)" : "rgba(255,255,255,0.55)",
                    boxShadow: selected ? "0 6px 18px rgba(0,77,91,0.18)" : "none",
                    transform: selected ? "translateY(-2px)" : "none",
                  }}
                  aria-pressed={selected}
                  aria-label={`${m.title} · ${m.titleAr} · ${m.state}`}
                >
                  <span
                    className="rounded-full px-1.5 py-[2px] text-[8px] font-bold tracking-wide uppercase"
                    style={{ background: chip.color, color: "var(--white)" }}
                  >
                    {chip.en} · {chip.ar}
                  </span>
                  <span
                    className="flex h-12 w-12 items-center justify-center rounded-full"
                    style={{ background: s.bg, border: `2px solid ${s.ring}` }}
                  >
                    <Display size={22} style={{ color: s.ring }} aria-hidden="true" />
                  </span>
                  <span
                    className="block w-full truncate text-center text-[11px] font-semibold"
                    style={{ color: "var(--navy)" }}
                    title={m.title}
                  >
                    {m.title}
                  </span>
                  <span className="block text-[9px]" style={{ color: "var(--gray)" }}>
                    {formatChipDate(m.date) || "—"}
                  </span>
                  {m.state === "current" && (
                    <span className="text-[9px] font-bold" style={{ color: "var(--gold)" }}>NOW · الآن</span>
                  )}
                </button>
                {!last && next && (
                  <div
                    className="mx-1 h-[3px] w-8 shrink-0 rounded-full"
                    style={{ background: connectorColor(m, next) }}
                  />
                )}
              </div>
            );
          })}
        </div>

        {currentIdx >= 0 && (
          <p className="mt-2 text-center text-[10px]" style={{ color: "var(--gray)" }}>
            Tap any milestone to inspect · اضغط أي محطة لعرض التفاصيل
          </p>
        )}
      </div>
    </section>
  );
};

export default HelicopterTimelineRail;
