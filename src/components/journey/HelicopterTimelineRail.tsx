import { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity, BedDouble, FlaskConical, HeartPulse, Home, PlaneLanding, PlaneTakeoff, Stethoscope,
  type LucideIcon,
} from "lucide-react";
import type { JourneyMilestone, MilestoneSubKind } from "@/hooks/useJourneyOverview";
import { formatChipDate } from "@/lib/journeyOverview";

/**
 * Horizontal "helicopter" timeline rail for the Journey → Map tab.
 * - Smooth auto-scroll keeps the selected milestone centered.
 * - A persistent vertical NOW marker pins the current milestone to the user's eye.
 * - Phase + state filters carry over the chip semantics from the previous Journey overview.
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

const PHASES: Array<{ key: "all" | JourneyMilestone["phase"]; en: string; ar: string; color: string }> = [
  { key: "all",    en: "All",    ar: "الكل",   color: "var(--navy)" },
  { key: "before", en: "Before", ar: "قبل",    color: "var(--teal-deep)" },
  { key: "travel", en: "Travel", ar: "السفر",  color: "var(--teal-bright)" },
  { key: "care",   en: "Care",   ar: "العلاج", color: "var(--gold)" },
  { key: "after",  en: "After",  ar: "بعد",    color: "var(--success)" },
];

const STATES: Array<{ key: "all" | JourneyMilestone["state"]; en: string; ar: string }> = [
  { key: "all",      en: "Any",      ar: "الكل" },
  { key: "done",     en: "Done",     ar: "منجز" },
  { key: "current",  en: "Now",      ar: "الآن" },
  { key: "upcoming", en: "Upcoming", ar: "قادم" },
];

const phaseChip = (phase: JourneyMilestone["phase"]) =>
  PHASES.find((p) => p.key === phase) ?? PHASES[0];

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
  const markerRef = useRef<HTMLDivElement>(null);
  const programmaticRef = useRef(false);
  const rafRef = useRef<number | null>(null);
  const [phaseFilter, setPhaseFilter] = useState<typeof PHASES[number]["key"]>("all");
  const [stateFilter, setStateFilter] = useState<typeof STATES[number]["key"]>("all");
  const [nearestId, setNearestId] = useState<string | null>(selectedId ?? null);

  const filtered = useMemo(() => {
    return milestones.filter((m) => {
      if (phaseFilter !== "all" && m.phase !== phaseFilter) return false;
      if (stateFilter !== "all" && m.state !== stateFilter) return false;
      return true;
    });
  }, [milestones, phaseFilter, stateFilter]);

  // Re-position the NOW marker to sit over a given milestone node, with a
  // smooth CSS transition. Also runs after scroll so the marker tracks the
  // milestone nearest to the viewport center in real time.
  const positionMarker = (id: string | null) => {
    const rail = railRef.current;
    const marker = markerRef.current;
    if (!rail || !marker || !id) return;
    const node = rail.querySelector<HTMLButtonElement>(`[data-mid="${id}"]`);
    if (!node) return;
    const railRect = rail.getBoundingClientRect();
    const nodeRect = node.getBoundingClientRect();
    const centerX = nodeRect.left + nodeRect.width / 2 - railRect.left;
    marker.style.transform = `translateX(${centerX}px) translateX(-50%)`;
    marker.style.opacity = "1";
  };

  // Find milestone whose centre is closest to the rail's viewport centre.
  const computeNearest = (): string | null => {
    const rail = railRef.current;
    if (!rail) return null;
    const rect = rail.getBoundingClientRect();
    const target = rect.left + rect.width / 2;
    let bestId: string | null = null;
    let bestDist = Infinity;
    rail.querySelectorAll<HTMLButtonElement>("[data-mid]").forEach((node) => {
      const r = node.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const d = Math.abs(cx - target);
      if (d < bestDist) { bestDist = d; bestId = node.dataset.mid ?? null; }
    });
    return bestId;
  };

  // Smooth auto-center on EXTERNAL selection changes (deep-link / parent).
  useEffect(() => {
    if (!selectedId) return;
    const node = railRef.current?.querySelector<HTMLButtonElement>(`[data-mid="${selectedId}"]`);
    if (!node) return;
    programmaticRef.current = true;
    requestAnimationFrame(() => {
      node.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
      // Reposition marker immediately; final position is corrected by the scroll listener.
      positionMarker(selectedId);
      // Clear the programmatic flag after the scroll settles.
      window.setTimeout(() => { programmaticRef.current = false; }, 500);
    });
  }, [selectedId, filtered.length, phaseFilter, stateFilter]);

  // Track nearest-to-center as the user scrolls the rail, and slide the
  // NOW marker to follow. Emits onSelect when the nearest milestone changes
  // so the parent (MilestoneSheet, etc.) updates without taps.
  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return;
    const handle = () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        const id = computeNearest();
        if (id) {
          positionMarker(id);
          setNearestId((prev) => {
            if (prev === id) return prev;
            // Don't echo the parent's own programmatic scrolls back as user input.
            if (!programmaticRef.current && id !== selectedId) onSelect(id);
            return id;
          });
        }
      });
    };
    handle(); // initial pass
    rail.addEventListener("scroll", handle, { passive: true });
    window.addEventListener("resize", handle);
    return () => {
      rail.removeEventListener("scroll", handle);
      window.removeEventListener("resize", handle);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered.length, selectedId]);

  if (milestones.length === 0) return null;

  const doneCount = milestones.filter((m) => m.state === "done").length;
  const activeId = nearestId ?? selectedId ?? null;

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
            {doneCount}/{milestones.length}
          </span>
        </div>

        {/* Phase filter chips — carried over from the previous Journey overview. */}
        <div
          role="tablist"
          aria-label="Filter by phase · فلترة حسب المرحلة"
          className="mb-2 flex gap-1.5 overflow-x-auto pb-1"
        >
          {PHASES.map((p) => {
            const active = phaseFilter === p.key;
            return (
              <button
                key={p.key}
                role="tab"
                aria-selected={active}
                onClick={() => setPhaseFilter(p.key)}
                className="shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold btn-press outline-none"
                style={{
                  background: active ? p.color : "var(--white)",
                  color: active ? "var(--white)" : p.color,
                  border: `1px solid ${p.color}`,
                }}
              >
                {p.en} · <span className="font-arabic">{p.ar}</span>
              </button>
            );
          })}
        </div>

        {/* State filter chips. */}
        <div
          role="tablist"
          aria-label="Filter by state · فلترة حسب الحالة"
          className="mb-3 flex gap-1.5 overflow-x-auto"
        >
          {STATES.map((s) => {
            const active = stateFilter === s.key;
            return (
              <button
                key={s.key}
                role="tab"
                aria-selected={active}
                onClick={() => setStateFilter(s.key)}
                className="shrink-0 rounded-full px-2.5 py-[3px] text-[10px] font-bold btn-press outline-none"
                style={{
                  background: active ? "var(--navy)" : "transparent",
                  color: active ? "var(--white)" : "var(--navy)",
                  border: "1px solid var(--navy)",
                }}
              >
                {s.en} · <span className="font-arabic">{s.ar}</span>
              </button>
            );
          })}
        </div>

        {/* Rail + NOW marker. The marker is a sticky-left vertical line painted
            over the scroll container so the user's eye always knows where
            "now" is, even when scrolled away. */}
        <div className="relative">
          {hasCurrentInView && (
            <div
              aria-hidden="true"
              className="pointer-events-none absolute top-0 bottom-2 left-1/2 -translate-x-1/2 flex flex-col items-center"
            >
              <span
                className="rounded-full px-2 py-[2px] text-[9px] font-bold tracking-wider uppercase shadow"
                style={{ background: "var(--gold)", color: "var(--white)" }}
              >
                NOW · الآن
              </span>
              <span
                className="mt-1 flex-1 w-[2px] rounded-full"
                style={{ background: "linear-gradient(180deg, var(--gold), rgba(197,150,90,0.15))" }}
              />
            </div>
          )}

          <div
            ref={railRef}
            role="list"
            className="flex items-stretch overflow-x-auto overflow-y-hidden pb-2 -mx-1 px-1"
            style={{ scrollSnapType: "x mandatory", scrollBehavior: "smooth", scrollbarWidth: "thin" }}
          >
            {/* Lead spacer so the first node can sit at the visual center. */}
            <div aria-hidden="true" className="shrink-0" style={{ width: "40%" }} />

            {filtered.map((m, i) => {
              const Icon = ICONS[m.subKind] ?? Stethoscope;
              const chip = phaseChip(m.phase);
              const s = stateStyle(m.state);
              const selected = selectedId === m.id;
              const last = i === filtered.length - 1;
              const next = filtered[i + 1];
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

            {/* Trail spacer so the last node can sit at the visual center. */}
            <div aria-hidden="true" className="shrink-0" style={{ width: "40%" }} />
          </div>
        </div>

        {filtered.length === 0 ? (
          <p className="mt-1 text-center text-[10px]" style={{ color: "var(--gray)" }}>
            No milestones match these filters · لا توجد محطات مطابقة
          </p>
        ) : (
          <p className="mt-1 text-center text-[10px]" style={{ color: "var(--gray)" }}>
            Tap any milestone to inspect · اضغط أي محطة لعرض التفاصيل
          </p>
        )}
      </div>
    </section>
  );
};

export default HelicopterTimelineRail;
