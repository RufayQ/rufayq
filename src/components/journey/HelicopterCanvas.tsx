import { useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  BedDouble,
  Check,
  Cloud,
  FlaskConical,
  HeartPulse,
  Home,
  PlaneLanding,
  PlaneTakeoff,
  Stethoscope,
  type LucideIcon,
} from "lucide-react";
import type { JourneyMilestone, MilestoneSubKind } from "@/hooks/useJourneyOverview";
import { formatChipDate, parseDate } from "@/lib/journeyOverview";

interface HelicopterCanvasProps {
  milestones: JourneyMilestone[];
  selectedId?: string | null;
  onSelect: (milestoneId: string) => void;
  rtl?: boolean;
}

const VIEW_W = 340;
const VIEW_H = 440;

// Reference waypoint table (top, left in canvas pixels). Sliced by milestone count.
// Hand-placed to give a S-curve feel similar to the reference.
const WAYPOINTS: { top: number; left: number }[] = [
  { top: 30,  left: 60 },
  { top: 60,  left: 170 },
  { top: 100, left: 270 },
  { top: 160, left: 170 },
  { top: 220, left: 70 },
  { top: 260, left: 180 },
  { top: 300, left: 280 },
  { top: 360, left: 160 },
  { top: 410, left: 70 },
];

interface KindStyle {
  Icon: LucideIcon;
  size: number;
  border: number;
  bg: string;   // CSS var name (without var())
  ring: string;
  fg: string;
}

const KIND_STYLES: Record<MilestoneSubKind, KindStyle> = {
  consult:  { Icon: Stethoscope,  size: 50, border: 2, bg: "--kind-consult-bg",  ring: "--kind-consult-border",  fg: "--kind-consult-fg" },
  lab:      { Icon: FlaskConical, size: 50, border: 2, bg: "--kind-lab-bg",      ring: "--kind-lab-border",      fg: "--kind-lab-fg" },
  rad:      { Icon: Activity,     size: 50, border: 2, bg: "--kind-rad-bg",      ring: "--kind-rad-border",      fg: "--kind-rad-fg" },
  flight:   { Icon: PlaneTakeoff, size: 56, border: 2, bg: "--kind-flight-bg",   ring: "--kind-flight-border",   fg: "--kind-flight-fg" },
  surgery:  { Icon: HeartPulse,   size: 58, border: 3, bg: "--kind-surgery-bg",  ring: "--kind-surgery-border",  fg: "--kind-surgery-fg" },
  recovery: { Icon: BedDouble,    size: 50, border: 2, bg: "--kind-recovery-bg", ring: "--kind-recovery-border", fg: "--kind-recovery-fg" },
  followup: { Icon: Home,         size: 50, border: 2, bg: "--kind-followup-bg", ring: "--kind-followup-border", fg: "--kind-followup-fg" },
};

// Build the cubic Bézier path string snaking through n waypoints.
function buildPath(points: { top: number; left: number }[]): string {
  if (points.length === 0) return "";
  if (points.length === 1) return `M ${points[0].left} ${points[0].top}`;
  let d = `M ${points[0].left} ${points[0].top}`;
  // First curve: cubic with control points pulled outward.
  const p0 = points[0], p1 = points[1];
  const c1x = (p0.left + p1.left) / 2 + 40;
  const c1y = p0.top - 10;
  const c2x = (p0.left + p1.left) / 2 - 20;
  const c2y = p1.top + 20;
  d += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p1.left} ${p1.top}`;
  // Subsequent waypoints: smooth shorthand "S" alternating control-point flip.
  for (let i = 2; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const cx = (prev.left + curr.left) / 2 + (i % 2 === 0 ? 50 : -50);
    const cy = (prev.top + curr.top) / 2;
    d += ` S ${cx} ${cy}, ${curr.left} ${curr.top}`;
  }
  return d;
}

const sliceWaypoints = (n: number): { top: number; left: number }[] => {
  if (n <= 0) return [];
  if (n >= WAYPOINTS.length) return WAYPOINTS.slice(0, n);
  // Distribute evenly across the available waypoints.
  const step = (WAYPOINTS.length - 1) / (n - 1 || 1);
  return Array.from({ length: n }, (_, i) => WAYPOINTS[Math.round(i * step)]);
};

const HelicopterCanvas = ({ milestones, selectedId, onSelect, rtl = false }: HelicopterCanvasProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const pathRef = useRef<SVGPathElement>(null);
  const [snapped, setSnapped] = useState<{ top: number; left: number }[] | null>(null);

  const waypoints = useMemo(() => sliceWaypoints(milestones.length), [milestones.length]);
  const pathD = useMemo(() => buildPath(waypoints), [waypoints]);
  const idsKey = useMemo(() => milestones.map((m) => m.id).join("|"), [milestones]);

  // Snap each waypoint onto the actual rendered path (so dots truly sit on the curve).
  useLayoutEffect(() => {
    const node = pathRef.current;
    if (!node || typeof (node as any).getPointAtLength !== "function" || waypoints.length < 2) {
      setSnapped(null);
      return;
    }
    try {
      const total = node.getTotalLength();
      const next = waypoints.map((_, i) => {
        const t = i / (waypoints.length - 1);
        const p = node.getPointAtLength(t * total);
        return { left: p.x, top: p.y };
      });
      setSnapped(next);
    } catch {
      setSnapped(null);
    }
  }, [pathD, waypoints, idsKey]);

  if (milestones.length === 0) {
    return (
      <div
        className="mx-4 mt-3 rounded-2xl p-6 text-center"
        style={{ background: "var(--off-white)", border: "1px dashed var(--gray-light)" }}
        data-testid="helicopter-canvas"
      >
        <p className="text-[12px]" style={{ color: "var(--gray)" }}>
          No journey milestones yet · لا توجد محطات بعد
        </p>
      </div>
    );
  }

  const positions = snapped ?? waypoints;
  const currentIdx = milestones.findIndex((m) => m.state === "current");

  // Split path at the current milestone so we can render done (solid) + future (dashed).
  // We use percentages of the path length for the split rendering via stroke-dasharray.
  // Simpler: render two distinct sub-paths from the same point list.
  const donePts = currentIdx >= 0 ? positions.slice(0, currentIdx + 1) : positions;
  const futurePts = currentIdx >= 0 && currentIdx < positions.length - 1
    ? positions.slice(currentIdx)
    : [];
  const doneD = buildPath(donePts);
  const futureD = buildPath(futurePts);

  // Phase tags — find first milestone per phase and its date.
  const phaseTags: { phase: JourneyMilestone["phase"]; label: string; date: string }[] = [];
  (["before", "travel", "care", "after"] as const).forEach((ph) => {
    const m = milestones.find((x) => x.phase === ph);
    if (m && m.date) {
      const labelMap = { before: "Before", travel: "Travel", care: "Care", after: "After" } as const;
      phaseTags.push({ phase: ph, label: labelMap[ph], date: formatChipDate(m.date) });
    }
  });
  const phaseTagSlot: Record<JourneyMilestone["phase"], React.CSSProperties> = {
    before: { top: 6, right: 10 },
    travel: { top: 130, left: 10 },
    care: { top: 240, right: 10 },
    after: { bottom: 10, left: 10 },
  };

  return (
    <div
      ref={containerRef}
      className="mx-4 mt-3 rounded-[22px] overflow-hidden relative"
      style={{
        height: VIEW_H,
        background: "linear-gradient(180deg, var(--canvas-sky-top) 0%, var(--canvas-sky-bottom) 100%)",
        border: "1px solid var(--gray-light)",
        boxShadow: "0 8px 24px -16px rgba(0,77,91,0.18)",
      }}
      data-testid="helicopter-canvas"
    >
      {/* Atmosphere — subtle clouds */}
      <Cloud
        size={64}
        aria-hidden
        style={{ position: "absolute", top: 70, left: 220, color: "var(--gray)", opacity: 0.08, pointerEvents: "none" }}
      />
      <Cloud
        size={52}
        aria-hidden
        style={{ position: "absolute", top: 240, left: 30, color: "var(--gray)", opacity: 0.07, pointerEvents: "none" }}
      />

      {/* SVG paths */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        preserveAspectRatio="xMidYMid meet"
        style={{ transform: rtl ? "scaleX(-1)" : undefined }}
        aria-hidden="true"
      >
        {/* Hidden full path used for getPointAtLength snapping. */}
        <path ref={pathRef} d={pathD} fill="none" stroke="transparent" />
        {doneD && (
          <path
            d={doneD}
            fill="none"
            stroke="var(--success)"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
        {futureD && (
          <path
            d={futureD}
            fill="none"
            stroke="var(--gray)"
            strokeOpacity={0.55}
            strokeWidth={2}
            strokeDasharray="4 4"
            strokeLinecap="round"
          />
        )}
      </svg>

      {/* Phase tags */}
      {phaseTags.map((t, i) => (
        <span
          key={t.phase}
          data-testid={`helicopter-phase-tag-${i}`}
          className="font-mono text-[9px] tracking-[0.08em] uppercase"
          style={{
            position: "absolute",
            ...phaseTagSlot[t.phase],
            background: "rgba(255,255,255,0.78)",
            border: "1px solid var(--gray-light)",
            color: "var(--gray)",
            padding: "2px 8px",
            borderRadius: 999,
            backdropFilter: "blur(4px)",
            WebkitBackdropFilter: "blur(4px)",
            zIndex: 2,
          }}
        >
          {t.label} · {t.date}
        </span>
      ))}

      {/* Stations */}
      {milestones.map((m, i) => {
        const p = positions[i];
        if (!p) return null;
        const style = KIND_STYLES[m.subKind] ?? KIND_STYLES.consult;
        const isSelected = selectedId === m.id;
        const isCurrent = m.state === "current";
        const isDone = m.state === "done";
        const isFuture = m.state === "upcoming" && !isCurrent;
        const Icon = style.Icon;
        const usePlaneLanding = m.subKind === "flight" && m.kind === "return";
        const FinalIcon: LucideIcon = usePlaneLanding ? PlaneLanding : Icon;

        return (
          <div
            key={m.id}
            style={{ position: "absolute", top: p.top, left: p.left, transform: "translate(-50%, -50%)", width: 78, marginLeft: 0, zIndex: 3 }}
          >
            {/* NOW flag */}
            {isCurrent && (
              <div
                data-testid="helicopter-now-flag"
                style={{
                  position: "absolute",
                  bottom: `calc(100% + 4px)`,
                  left: "50%",
                  transform: "translateX(-50%)",
                  background: "var(--kind-rad-fg)",
                  color: "#fff",
                  fontSize: 9,
                  fontWeight: 700,
                  padding: "3px 8px",
                  borderRadius: 999,
                  whiteSpace: "nowrap",
                  letterSpacing: "0.04em",
                  boxShadow: "0 4px 12px -4px rgba(12,68,124,0.45)",
                  zIndex: 4,
                }}
              >
                NOW · {m.date ? formatChipDate(m.date) : "TODAY"}
                <span
                  aria-hidden
                  style={{
                    position: "absolute",
                    width: 6,
                    height: 6,
                    background: "var(--kind-rad-fg)",
                    left: "50%",
                    bottom: -3,
                    transform: "translateX(-50%) rotate(45deg)",
                  }}
                />
              </div>
            )}

            <button
              type="button"
              onClick={() => onSelect(m.id)}
              data-testid={`milestone-${m.id}`}
              data-test-station={`helicopter-station-${m.id}`}
              data-state={m.state}
              aria-label={`${m.title} · ${m.titleAr}`}
              aria-current={isCurrent ? "step" : undefined}
              className="block bg-transparent border-0 p-0 cursor-pointer"
              style={{ width: 78, display: "flex", flexDirection: "column", alignItems: "center" }}
            >
              {/* Pulse ring */}
              {isCurrent && (
                <span
                  aria-hidden
                  className="helicopter-pulse"
                  style={{
                    position: "absolute",
                    top: -6,
                    left: "50%",
                    transform: "translateX(-50%)",
                    width: style.size + 12,
                    height: style.size + 12,
                    borderRadius: "50%",
                    border: `2px solid var(${style.ring})`,
                    pointerEvents: "none",
                  }}
                />
              )}
              {/* Puck */}
              <span
                style={{
                  position: "relative",
                  width: style.size,
                  height: style.size,
                  borderRadius: "50%",
                  background: `var(${style.bg})`,
                  border: `${style.border}px ${isFuture ? "dashed" : "solid"} var(${style.ring})`,
                  color: `var(${style.fg})`,
                  opacity: isFuture ? 0.65 : 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: isCurrent
                    ? "0 0 0 4px var(--canvas-sky-bottom), 0 0 0 6px var(--kind-rad-fg)"
                    : isSelected
                    ? "0 0 0 2px var(--navy), 0 0 0 5px var(--canvas-sky-bottom)"
                    : "0 2px 6px -2px rgba(0,0,0,0.18)",
                  transition: "transform .15s ease",
                }}
              >
                <FinalIcon size={Math.round(style.size * 0.42)} strokeWidth={2} />
                {isDone && (
                  <span
                    aria-hidden
                    style={{
                      position: "absolute",
                      bottom: -2,
                      right: -2,
                      width: 18,
                      height: 18,
                      borderRadius: "50%",
                      background: "var(--success)",
                      color: "#fff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      border: "2px solid var(--canvas-sky-bottom)",
                    }}
                  >
                    <Check size={10} strokeWidth={3} />
                  </span>
                )}
              </span>
              {/* Label */}
              <span
                style={{
                  marginTop: 6,
                  fontSize: 10,
                  fontWeight: 600,
                  color: isFuture ? "var(--gray)" : "var(--navy)",
                  textAlign: "center",
                  lineHeight: 1.2,
                  maxWidth: 80,
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                  letterSpacing: "-0.01em",
                  textShadow: "0 1px 0 rgba(255,255,255,0.6)",
                }}
              >
                {m.title}
              </span>
              {/* Date */}
              {m.date && (
                <span
                  className="font-mono"
                  style={{
                    marginTop: 2,
                    fontSize: 9,
                    color: "var(--gray)",
                    fontVariantNumeric: "tabular-nums",
                    letterSpacing: "0.04em",
                  }}
                >
                  {isCurrent ? "TODAY" : formatChipDate(m.date)}
                </span>
              )}
            </button>
          </div>
        );
      })}
    </div>
  );
};

export default HelicopterCanvas;

// Used by sheet location-bucketing in JourneyScreen — re-exported for convenience.
export { parseDate as __parseDate };
