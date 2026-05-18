import { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity, BedDouble, FlaskConical, HeartPulse, Home, PlaneLanding, PlaneTakeoff, Stethoscope,
  SlidersHorizontal, Check, X, Sparkles,
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
  const [filterOpen, setFilterOpen] = useState(false);

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

  // Re-position marker whenever the nearest id resolves (e.g. after first
  // mount when activeId was null and the marker DOM node didn't exist yet).
  useEffect(() => {
    if (!nearestId) return;
    requestAnimationFrame(() => positionMarker(nearestId));
  }, [nearestId, filtered.length]);

  if (milestones.length === 0) return null;

  const doneCount = milestones.filter((m) => m.state === "done").length;
  const activeId = nearestId ?? selectedId ?? null;
  const phaseCounts = useMemo(() => {
    const map = new Map<string, number>();
    PHASES.forEach((p) => {
      map.set(p.key, p.key === "all" ? milestones.length : milestones.filter((m) => m.phase === p.key).length);
    });
    return map;
  }, [milestones]);
  const stateCounts = useMemo(() => ({
    done: milestones.filter((m) => m.state === "done").length,
    current: milestones.filter((m) => m.state === "current").length,
    upcoming: milestones.filter((m) => m.state === "upcoming").length,
  }), [milestones]);
  const activeFilterCount = (phaseFilter !== "all" ? 1 : 0) + (stateFilter !== "all" ? 1 : 0);

  return (
    <section className="px-4 pt-3" aria-label="Helicopter timeline · الخط الزمني الشامل">
      <div
        className="rounded-3xl p-4"
        style={{
          background: "linear-gradient(135deg, rgba(0,77,91,0.08), rgba(197,150,90,0.10))",
          border: "1px solid rgba(0,77,91,0.12)",
        }}
      >
        {/* Elite eyebrow */}
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-1.5">
            <Sparkles size={10} style={{ color: "var(--gold)" }} />
            <p className="font-mono text-[8px] tracking-[0.22em]" style={{ color: "var(--teal-deep)" }}>
              CURATE YOUR JOURNEY · <span className="font-arabic">انتقِ محطاتك</span>
            </p>
          </div>
          <span className="font-mono text-[8px] tracking-widest" style={{ color: "var(--gray)" }}>
            {filtered.length}/{milestones.length}
          </span>
        </div>

        <div className="flex items-center justify-between gap-2 mb-2.5">
          <div className="min-w-0">
            <p className="font-mono text-[10px] tracking-widest" style={{ color: "var(--teal-deep)" }}>
              HELICOPTER · TIMELINE
            </p>
            <p className="font-arabic text-[10px]" dir="rtl" style={{ color: "var(--gray)" }}>
              نظرة شاملة لمحطات الرحلة
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span
              className="relative rounded-full px-2.5 py-1 text-[10px] font-bold"
              style={{
                background: "var(--white)",
                color: "var(--teal-deep)",
                border: "1px solid rgba(0,77,91,0.10)",
                boxShadow: "0 1px 2px rgba(15,46,61,0.04)",
              }}
            >
              {doneCount}/{milestones.length}
              {doneCount > 0 && (
                <span
                  className="absolute left-2 right-2 -bottom-[3px] h-[2px] rounded-full"
                  style={{ background: "var(--gold)" }}
                />
              )}
            </span>
            <button
              type="button"
              onClick={() => setFilterOpen(true)}
              aria-label="Filter milestones · فلترة المحطات"
              aria-haspopup="dialog"
              aria-expanded={filterOpen}
              className="relative flex h-9 items-center gap-1.5 rounded-full px-3 btn-press transition-all outline-none"
              style={{
                background: activeFilterCount
                  ? "linear-gradient(135deg, var(--teal-deep) 0%, #0a4a5e 100%)"
                  : "var(--white)",
                border: `1px solid ${activeFilterCount ? "var(--teal-deep)" : "rgba(15,46,61,0.10)"}`,
                color: activeFilterCount ? "white" : "var(--navy)",
                boxShadow: activeFilterCount
                  ? "0 4px 14px rgba(15,46,61,0.22)"
                  : "0 1px 2px rgba(15,46,61,0.04)",
              }}
            >
              <SlidersHorizontal size={13} />
              <span className="text-[10px] font-bold tracking-wider uppercase">Refine</span>
              {activeFilterCount > 0 && (
                <span
                  className="flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-bold"
                  style={{ background: "var(--gold)", color: "white" }}
                >
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Inline quick-chip rail — phases + state summary */}
        <div
          className="-mx-1 mb-3 flex items-center gap-1.5 overflow-x-auto pb-1 px-1"
          style={{ scrollbarWidth: "none" }}
        >
          {PHASES.map((p) => {
            const active = phaseFilter === p.key;
            const count = phaseCounts.get(p.key) ?? 0;
            return (
              <button
                key={p.key}
                onClick={() => setPhaseFilter(p.key)}
                className="shrink-0 rounded-full px-3 py-1.5 text-[11px] font-semibold btn-press transition-all"
                style={{
                  background: active
                    ? "linear-gradient(135deg, var(--teal-deep) 0%, #0a4a5e 100%)"
                    : "var(--white)",
                  color: active ? "white" : "var(--navy)",
                  border: `1px solid ${active ? "var(--teal-deep)" : "rgba(15,46,61,0.10)"}`,
                  boxShadow: active
                    ? "0 4px 12px rgba(15,46,61,0.18)"
                    : "0 1px 2px rgba(15,46,61,0.04)",
                }}
              >
                {p.en}
                <span
                  className="ml-1.5 rounded-full px-1.5 py-0.5 text-[9px] font-bold"
                  style={{
                    background: active ? "rgba(255,255,255,0.20)" : "var(--off-white)",
                    color: active ? "white" : "var(--gray)",
                  }}
                >
                  {count}
                </span>
              </button>
            );
          })}

          <div className="shrink-0 mx-1 h-5 w-px" style={{ background: "rgba(197,150,90,0.30)" }} />

          <button
            onClick={() => setFilterOpen(true)}
            aria-label="Open state filters · فلترة الحالة"
            className="shrink-0 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold btn-press transition-all"
            style={{
              background: stateFilter !== "all"
                ? "linear-gradient(135deg, #c5965a 0%, #b07f43 100%)"
                : "var(--white)",
              color: stateFilter !== "all" ? "white" : "var(--navy)",
              border: `1px solid ${stateFilter !== "all" ? "rgba(197,150,90,0.55)" : "rgba(15,46,61,0.10)"}`,
              boxShadow: stateFilter !== "all"
                ? "0 4px 14px rgba(197,150,90,0.32)"
                : "0 1px 2px rgba(15,46,61,0.04)",
            }}
          >
            State
            <span
              className="rounded-full px-1.5 py-0.5 text-[9px] font-bold"
              style={{
                background: stateFilter !== "all" ? "rgba(255,255,255,0.22)" : "var(--off-white)",
                color: stateFilter !== "all" ? "white" : "var(--gray)",
              }}
            >
              {stateFilter === "all"
                ? `${stateCounts.done}·${stateCounts.current}·${stateCounts.upcoming}`
                : STATES.find((s) => s.key === stateFilter)?.en}
            </span>
          </button>
        </div>

        {/* Rail + NOW marker. The marker is a sticky-left vertical line painted
            over the scroll container so the user's eye always knows where
            "now" is, even when scrolled away. */}
        <div className="relative">
          {activeId && (
            <div
              ref={markerRef}
              aria-hidden="true"
              className="pointer-events-none absolute top-0 bottom-2 left-0 flex flex-col items-center"
              style={{
                transform: "translateX(0) translateX(-50%)",
                transition: "transform 320ms cubic-bezier(0.22, 0.61, 0.36, 1), opacity 200ms ease",
                opacity: 0,
                willChange: "transform",
              }}
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
            style={{ scrollSnapType: "x proximity", scrollBehavior: "smooth", scrollbarWidth: "thin" }}
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
                    className="flex w-[72px] flex-col items-center gap-1 bg-transparent border-0 p-0 outline-none btn-press transition-transform"
                    style={{ transform: selected ? "translateY(-2px) scale(1.05)" : "none" }}
                    aria-pressed={selected}
                    aria-label={`${m.title} · ${m.titleAr} · ${m.state}`}
                  >
                    <span
                      className="flex h-11 w-11 items-center justify-center rounded-full"
                      style={{
                        background: s.bg,
                        border: `2px solid ${s.ring}`,
                        boxShadow: selected ? `0 4px 14px ${s.ring}44` : "none",
                      }}
                    >
                      <Display size={20} style={{ color: s.ring }} aria-hidden="true" />
                    </span>
                    <span
                      className="block w-full truncate text-center text-[10px] font-semibold"
                      style={{ color: "var(--navy)" }}
                      title={m.title}
                    >
                      {m.title}
                    </span>
                    <span className="block text-[8px]" style={{ color: chip.color }}>
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

      {filterOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center"
          style={{ background: "rgba(15,23,42,0.45)" }}
          onClick={() => setFilterOpen(false)}
        >
          <div
            role="dialog"
            aria-label="Filter milestones"
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-[420px] rounded-t-3xl p-5"
            style={{
              background: "var(--white)",
              boxShadow: "0 -8px 32px rgba(0,0,0,0.18)",
              animation: "slide-up 240ms cubic-bezier(0.22, 0.61, 0.36, 1)",
            }}
          >
            <div className="mx-auto mb-3 h-1 w-10 rounded-full" style={{ background: "var(--gray-light)" }} />
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="text-[14px] font-bold" style={{ color: "var(--navy)" }}>Filters</p>
                <p className="font-arabic text-[11px]" dir="rtl" style={{ color: "var(--gray)" }}>الفلاتر</p>
              </div>
              <button
                onClick={() => setFilterOpen(false)}
                aria-label="Close"
                className="flex h-7 w-7 items-center justify-center rounded-full"
                style={{ background: "var(--off-white)", color: "var(--navy)" }}
              >
                <X size={14} />
              </button>
            </div>

            <p className="font-mono text-[9px] tracking-widest mb-2" style={{ color: "var(--gold)" }}>PHASE · المرحلة</p>
            <div className="mb-4 flex flex-wrap gap-1.5">
              {PHASES.map((p) => {
                const active = phaseFilter === p.key;
                return (
                  <button
                    key={p.key}
                    onClick={() => setPhaseFilter(p.key)}
                    className="flex items-center gap-1 rounded-full px-3 py-1.5 text-[11px] font-bold btn-press outline-none"
                    style={{
                      background: active ? p.color : "var(--white)",
                      color: active ? "var(--white)" : p.color,
                      border: `1px solid ${p.color}`,
                    }}
                  >
                    {active && <Check size={12} />}
                    {p.en} · <span className="font-arabic">{p.ar}</span>
                  </button>
                );
              })}
            </div>

            <p className="font-mono text-[9px] tracking-widest mb-2" style={{ color: "var(--gold)" }}>STATE · الحالة</p>
            <div className="mb-5 flex flex-wrap gap-1.5">
              {STATES.map((st) => {
                const active = stateFilter === st.key;
                return (
                  <button
                    key={st.key}
                    onClick={() => setStateFilter(st.key)}
                    className="flex items-center gap-1 rounded-full px-3 py-1.5 text-[11px] font-bold btn-press outline-none"
                    style={{
                      background: active ? "var(--navy)" : "transparent",
                      color: active ? "var(--white)" : "var(--navy)",
                      border: "1px solid var(--navy)",
                    }}
                  >
                    {active && <Check size={12} />}
                    {st.en} · <span className="font-arabic">{st.ar}</span>
                  </button>
                );
              })}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => { setPhaseFilter("all"); setStateFilter("all"); }}
                className="flex-1 rounded-full py-2.5 text-[12px] font-bold btn-press"
                style={{ background: "var(--off-white)", color: "var(--navy)" }}
              >
                Reset · إعادة
              </button>
              <button
                onClick={() => setFilterOpen(false)}
                className="flex-1 rounded-full py-2.5 text-[12px] font-bold btn-press"
                style={{ background: "var(--teal-deep)", color: "var(--white)" }}
              >
                Apply · تطبيق
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default HelicopterTimelineRail;
