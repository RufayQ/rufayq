import { useMemo } from "react";
import {
  Stethoscope,
  FlaskConical,
  Activity,
  Plane,
  HeartPulse,
  BedDouble,
  Home as HomeIcon,
  RotateCw,
  Check,
  type LucideIcon,
} from "lucide-react";
import type { JourneyMilestone } from "@/hooks/useJourneyOverview";

/**
 * JourneyConstellation
 * Card-based, staggered milestone canvas inspired by the reference mock:
 * – rounded white cards arranged in a flowing 3-column zigzag
 * – curved green SVG ribbons connecting each card centre
 * – dotted-border phase chips floating between groups
 * – selected card wrapped in concentric gold rings
 *
 * Lives entirely on Home (alongside TodayCard); deep-links into Journey
 * on tap. Pure presentation – no data fetching here.
 */

interface JourneyConstellationProps {
  milestones: JourneyMilestone[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  /** ISO trip departure / return for the floating phase chips. */
  departureDate?: string;
  returnDate?: string;
}

/* ------------------------------------------------------------------ */
/* Visual mappings                                                     */
/* ------------------------------------------------------------------ */



interface KindStyle {
  Icon: LucideIcon;
  ring: string;        // icon ring color
  tint: string;        // soft fill behind icon
  ink: string;         // icon stroke color
}

const STYLES: Record<JourneyMilestone["kind"], KindStyle> = {
  appointment: { Icon: Stethoscope,  ring: "var(--teal-deep)",   tint: "var(--teal-light)",  ink: "var(--teal-deep)" },
  treatment:   { Icon: HeartPulse,   ring: "var(--accent-surgery)", tint: "#F8E5EC",          ink: "var(--accent-surgery)" },
  departure:   { Icon: Plane,        ring: "var(--gold)",        tint: "var(--gold-pale)",   ink: "var(--gold)" },
  return:      { Icon: Plane,        ring: "var(--gold)",        tint: "var(--gold-pale)",   ink: "var(--gold)" },
  followup:    { Icon: RotateCw,     ring: "var(--teal-bright)", tint: "var(--teal-light)",  ink: "var(--teal-bright)" },
};

const SECONDARY: Record<string, KindStyle> = {
  labs:    { Icon: FlaskConical, ring: "#7C5CCB", tint: "#EFEAFB", ink: "#7C5CCB" },
  imaging: { Icon: Activity,     ring: "#2E83C7", tint: "#E5F0FA", ink: "#2E83C7" },
  ward:    { Icon: BedDouble,    ring: "var(--gray)", tint: "var(--off-white)", ink: "var(--gray)" },
  home:    { Icon: HomeIcon,     ring: "var(--teal-bright)", tint: "var(--teal-light)", ink: "var(--teal-bright)" },
};

/** Pick a richer style by inspecting the milestone's title for medical hints. */
function styleFor(m: JourneyMilestone): KindStyle {
  const t = `${m.title} ${m.titleAr}`.toLowerCase();
  if (/lab|blood|تحليل|مختبر/.test(t)) return SECONDARY.labs;
  if (/echo|scan|x-?ray|mri|ct|أشع|تصوير/.test(t)) return SECONDARY.imaging;
  if (/ward|icu|recover|تعافي|عناية/.test(t)) return SECONDARY.ward;
  if (m.kind === "return" && /home|عودة/.test(t)) return SECONDARY.home;
  return STYLES[m.kind];
}

/* ------------------------------------------------------------------ */
/* Layout                                                              */
/* ------------------------------------------------------------------ */

/** Staggered 3-column zigzag pattern, repeats every 6 indices. */
const COL_PATTERN = [0, 1, 2, 1, 0, 2];

interface PlacedNode {
  m: JourneyMilestone;
  idx: number;
  col: number;
  row: number;
  cx: number; // %
  cy: number; // %
}

function layout(milestones: JourneyMilestone[]): {
  nodes: PlacedNode[];
  totalRows: number;
} {
  const cols = [16.5, 50, 83.5]; // x centres in %
  const rowPx = 96;              // logical px per row
  const padTop = 56;             // first node y in px
  const nodes: PlacedNode[] = milestones.map((m, i) => {
    const col = COL_PATTERN[i % COL_PATTERN.length];
    const row = i;
    return {
      m, idx: i, col, row,
      cx: cols[col],
      cy: padTop + row * rowPx,
    };
  });
  return { nodes, totalRows: milestones.length };
}

/* ------------------------------------------------------------------ */

import { formatChipDate } from "@/lib/journeyOverview";

const PHASE_LABELS: Record<JourneyMilestone["phase"], { en: string; order: number }> = {
  before: { en: "BEFORE", order: 0 },
  travel: { en: "TRAVEL", order: 1 },
  care:   { en: "CARE",   order: 2 },
  after:  { en: "AFTER",  order: 3 },
};

const JourneyConstellation = ({
  milestones,
  selectedId,
  onSelect,
  departureDate,
  returnDate,
}: JourneyConstellationProps) => {
  const compact = milestones.slice(0, 8);
  const { nodes } = useMemo(() => layout(compact), [compact]);

  const heightPx = nodes.length === 0 ? 200 : nodes[nodes.length - 1].cy + 70;

  // Curved SVG path through node centres.
  const pathD = useMemo(() => {
    if (nodes.length < 2) return "";
    let d = `M ${nodes[0].cx} ${nodes[0].cy}`;
    for (let i = 1; i < nodes.length; i++) {
      const a = nodes[i - 1];
      const b = nodes[i];
      const c1x = a.cx;
      const c1y = a.cy + (b.cy - a.cy) * 0.55;
      const c2x = b.cx;
      const c2y = a.cy + (b.cy - a.cy) * 0.45;
      d += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${b.cx} ${b.cy}`;
    }
    return d;
  }, [nodes]);

  // Completed-so-far sub-path (gold/teal trace).
  const doneD = useMemo(() => {
    const upto = nodes.findIndex((n) => n.m.state === "current");
    const stop = upto === -1 ? nodes.length - 1 : upto;
    if (stop <= 0) return "";
    let d = `M ${nodes[0].cx} ${nodes[0].cy}`;
    for (let i = 1; i <= stop; i++) {
      const a = nodes[i - 1];
      const b = nodes[i];
      const c1y = a.cy + (b.cy - a.cy) * 0.55;
      const c2y = a.cy + (b.cy - a.cy) * 0.45;
      d += ` C ${a.cx} ${c1y}, ${b.cx} ${c2y}, ${b.cx} ${b.cy}`;
    }
    return d;
  }, [nodes]);

  // One chip per phase, anchored to the FIRST node of that phase, dated
  // from that node's actual milestone date (or trip dep/ret for travel/after).
  const chips = useMemo(() => {
    if (nodes.length === 0) return [];
    const seen = new Set<string>();
    const out: { id: string; label: string; sub: string; cx: number; cy: number }[] = [];
    // Iterate in phase order so chips list stays predictable for a11y.
    const ordered = [...nodes].sort((a, b) => {
      const oa = PHASE_LABELS[a.m.phase].order;
      const ob = PHASE_LABELS[b.m.phase].order;
      if (oa !== ob) return oa - ob;
      return a.idx - b.idx;
    });
    for (const n of ordered) {
      const phase = n.m.phase;
      if (seen.has(phase)) continue;
      seen.add(phase);
      // Date source: prefer trip dates for the travel/after anchors.
      const dateSrc =
        phase === "travel" ? (departureDate ?? n.m.date ?? null) :
        phase === "after"  && n.m.refId === "return" ? (returnDate ?? n.m.date ?? null) :
        n.m.date ?? null;
      // Place opposite to the node's column to avoid overlap.
      const cx = n.col === 0 ? 78 : n.col === 2 ? 22 : (n.idx % 2 === 0 ? 82 : 18);
      const cy = Math.max(20, n.cy - 30);
      out.push({
        id: `chip-${phase}`,
        label: PHASE_LABELS[phase].en,
        sub: formatChipDate(dateSrc),
        cx, cy,
      });
    }
    return out;
  }, [nodes, departureDate, returnDate]);

  if (nodes.length === 0) return null;

  return (
    <section
      className="relative rounded-[26px] overflow-hidden stagger-2"
      style={{
        background:
          "radial-gradient(120% 80% at 50% 0%, #FFFFFF 0%, var(--off-white) 65%)",
        border: "1px solid var(--gray-light)",
        boxShadow:
          "0 1px 0 rgba(255,255,255,0.7) inset, 0 14px 34px -18px rgba(0,77,91,0.22)",
      }}
      aria-label="Journey constellation"
    >
      {/* Header */}
      <header className="flex items-center justify-between px-4 pt-4">
        <div className="flex items-center gap-2">
          <span
            className="inline-block w-1.5 h-1.5 rounded-full"
            style={{ background: "var(--gold)" }}
          />
          <p
            className="font-mono text-[10px] tracking-[0.24em]"
            style={{ color: "var(--gray)" }}
          >
            JOURNEY MAP · رحلتك
          </p>
        </div>
        <span
          className="font-mono text-[9.5px] tracking-[0.18em] px-2 py-0.5 rounded-full"
          style={{
            color: "var(--teal-deep)",
            background: "var(--teal-light)",
          }}
        >
          {compact.length} STOPS
        </span>
      </header>

      {/* Canvas */}
      <div
        className="relative mx-3 my-3 rounded-[20px]"
        style={{
          height: heightPx,
          background:
            "linear-gradient(180deg, #FCFAF6 0%, #F4EFE6 100%)",
          border: "1px dashed rgba(197,150,90,0.35)",
        }}
      >
        {/* Connectors */}
        <svg
          viewBox={`0 0 100 ${heightPx}`}
          preserveAspectRatio="none"
          className="absolute inset-0 w-full h-full pointer-events-none"
          aria-hidden="true"
        >
          <path
            d={pathD}
            fill="none"
            stroke="rgba(61,170,110,0.22)"
            strokeWidth={2.4}
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
          {doneD && (
            <path
              d={doneD}
              fill="none"
              stroke="var(--success)"
              strokeWidth={2.4}
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
              opacity={0.95}
            />
          )}
        </svg>

        {/* Phase chips */}
        {chips.map((c, i) => (
          <div
            key={c.id}
            className="absolute z-10"
            style={{
              left: `${c.cx}%`,
              top: c.cy,
              transform: "translate(-50%, -50%)",
            }}
          >
            <div
              className="px-2.5 py-1 rounded-full font-mono text-[9px] tracking-[0.18em] whitespace-nowrap"
              style={{
                color: "var(--gray)",
                background: "rgba(255,255,255,0.9)",
                border: "1px dashed var(--gray-light)",
                backdropFilter: "blur(2px)",
              }}
            >
              <span style={{ color: "var(--navy)", fontWeight: 700 }}>{c.label}</span>
              {c.sub && (
                <>
                  <span className="mx-1" style={{ color: "var(--gray-light)" }}>·</span>
                  <span style={{ color: "var(--gray)" }}>{c.sub}</span>
                </>
              )}
            </div>
          </div>
        ))}

        {/* Nodes */}
        {nodes.map((n) => {
          const s = styleFor(n.m);
          const isSelected = selectedId === n.m.id;
          const isCurrent = n.m.state === "current";
          const isDone = n.m.state === "done";
          const Icon = s.Icon;

          return (
            <button
              key={n.m.id}
              onClick={() => onSelect(n.m.id)}
              data-testid={`constellation-node-${n.m.id}`}
              aria-label={`${n.m.title} · ${n.m.titleAr}`}
              aria-current={isCurrent ? "step" : undefined}
              className="absolute group focus:outline-none"
              style={{
                left: `${n.cx}%`,
                top: n.cy,
                transform: "translate(-50%, -50%)",
                width: 96,
              }}
            >
              {/* Concentric rings (selected only) */}
              {isSelected && (
                <>
                  <span
                    className="absolute rounded-full pointer-events-none"
                    style={{
                      inset: "-14px",
                      border: "1px dashed rgba(197,150,90,0.55)",
                    }}
                  />
                  <span
                    className="absolute rounded-full pointer-events-none"
                    style={{
                      inset: "-22px",
                      border: "1px dashed rgba(197,150,90,0.3)",
                    }}
                  />
                </>
              )}

              {/* Card */}
              <div
                className={`relative flex flex-col items-center px-2 pt-3 pb-2 transition-transform duration-200 ${isCurrent ? "scale-[1.04]" : "group-active:scale-95"}`}
                style={{
                  borderRadius: 16,
                  background: isCurrent ? "var(--white)" : isDone ? "var(--white)" : "rgba(255,255,255,0.85)",
                  border: isCurrent
                    ? `1.5px solid ${s.ring}`
                    : isDone
                    ? "1px solid var(--gray-light)"
                    : "1px dashed var(--gray-light)",
                  boxShadow: isCurrent
                    ? `0 8px 22px -10px ${s.ring}55, 0 1px 0 rgba(255,255,255,0.8) inset`
                    : isDone
                    ? "0 4px 12px -6px rgba(0,77,91,0.18)"
                    : "0 2px 8px -4px rgba(13,27,42,0.08)",
                  opacity: isDone || isCurrent || isSelected ? 1 : 0.86,
                }}
              >
                {/* Icon disc */}
                <div className="relative">
                  <div
                    className="flex items-center justify-center rounded-full"
                    style={{
                      width: 38,
                      height: 38,
                      background: s.tint,
                      border: `1.5px solid ${s.ring}`,
                      color: s.ink,
                    }}
                  >
                    <Icon size={18} strokeWidth={1.8} />
                  </div>
                  {isDone && (
                    <span
                      className="absolute -bottom-0.5 -right-0.5 flex items-center justify-center rounded-full"
                      style={{
                        width: 14,
                        height: 14,
                        background: "var(--success)",
                        border: "1.5px solid var(--white)",
                      }}
                    >
                      <Check size={8} strokeWidth={3} color="#fff" />
                    </span>
                  )}
                </div>

                {/* Title */}
                <p
                  className="mt-1.5 text-[10.5px] font-semibold leading-tight text-center w-full truncate"
                  style={{ color: "var(--navy)" }}
                  title={n.m.title}
                >
                  {n.m.title}
                </p>

                {/* Date / today */}
                {isCurrent ? (
                  <span
                    className="mt-0.5 px-2 py-[1px] rounded-full font-mono text-[8.5px] tracking-[0.14em]"
                    style={{ background: s.ring, color: "#fff" }}
                  >
                    TODAY
                  </span>
                ) : n.m.date ? (
                  <span
                    className="mt-0.5 font-mono text-[9px] tracking-[0.1em]"
                    style={{ color: "var(--gray)" }}
                  >
                    {formatChipDate(n.m.date)}
                  </span>
                ) : null}
              </div>

              {/* color the icon via inheritance */}
              <span className="hidden" style={{ color: s.ink }} />
            </button>
          );
        })}
      </div>
    </section>
  );
};

export default JourneyConstellation;
