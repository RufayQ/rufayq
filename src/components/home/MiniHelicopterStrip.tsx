import { useMemo } from "react";
import type { JourneyMilestone } from "@/hooks/useJourneyOverview";
import PhaseRibbon from "./PhaseRibbon";
import { derivePhase } from "./journeyPhase";

interface MiniHelicopterStripProps {
  milestones: JourneyMilestone[];
  onSelect: (milestoneId: string) => void;
}

/**
 * Compact, premium "journey ribbon" for Home.
 *
 * Visual signature taken from the reference timeline mock: a soft dotted
 * curved path with circular pucks anchored at gentle wave points, plus a
 * 5-segment phase ribbon above. Stays inside the home shell — does not
 * duplicate the full HelicopterCanvas in JourneyScreen.
 */

const stateBg = (s: JourneyMilestone["state"]) =>
  s === "done" ? "var(--success)" : s === "current" ? "var(--teal-deep)" : "var(--white)";

const kindAccent = (k: JourneyMilestone["kind"]) => {
  switch (k) {
    case "departure":
    case "return":
      return "var(--gold)";
    case "treatment":
      return "var(--accent-surgery, #993556)";
    default:
      return "var(--teal-bright)";
  }
};

const kindIcon = (k: JourneyMilestone["kind"]) => {
  switch (k) {
    case "departure":
      return "✈";
    case "return":
      return "🏠";
    case "treatment":
      return "✚";
    case "followup":
      return "↻";
    default:
      return "•";
  }
};

const MiniHelicopterStrip = ({ milestones, onSelect }: MiniHelicopterStripProps) => {
  const compact = milestones.slice(0, 6);

  // Lay nodes out on a gentle sine wave inside the SVG viewport.
  const positions = useMemo(() => {
    const n = compact.length;
    return compact.map((_, i) => {
      const t = n === 1 ? 0.5 : i / (n - 1);
      const x = 6 + t * 88; // 6% .. 94%
      const y = 50 + Math.sin(t * Math.PI * 1.6) * 22; // wave amplitude
      return { x, y };
    });
  }, [compact]);

  const path = useMemo(() => {
    if (positions.length < 2) return "";
    // Smooth-ish polyline using quadratic curves between successive points.
    let d = `M ${positions[0].x} ${positions[0].y}`;
    for (let i = 1; i < positions.length; i++) {
      const prev = positions[i - 1];
      const cur = positions[i];
      const cx = (prev.x + cur.x) / 2;
      const cy = (prev.y + cur.y) / 2 - 4;
      d += ` Q ${cx} ${cy} ${cur.x} ${cur.y}`;
    }
    return d;
  }, [positions]);

  // Find current node for the "today" badge + animated trace.
  const currentIdx = compact.findIndex((m) => m.state === "current");

  // Phase derivation: position of "current" in the overall timeline ⇒ phase.
  const phase = useMemo(() => {
    if (compact.length === 0) return "prepare" as const;
    const idx = currentIdx === -1 ? compact.findIndex((m) => m.state !== "done") : currentIdx;
    const pos = idx === -1 ? compact.length : idx;
    return derivePhase(pos, Math.max(1, compact.length - 1));
  }, [compact, currentIdx]);

  if (compact.length === 0) return null;

  // Build the "completed so far" sub-path for the gold accent line.
  const completedPath = useMemo(() => {
    const stop = currentIdx === -1 ? positions.length - 1 : currentIdx;
    if (stop <= 0) return "";
    let d = `M ${positions[0].x} ${positions[0].y}`;
    for (let i = 1; i <= stop; i++) {
      const prev = positions[i - 1];
      const cur = positions[i];
      const cx = (prev.x + cur.x) / 2;
      const cy = (prev.y + cur.y) / 2 - 4;
      d += ` Q ${cx} ${cy} ${cur.x} ${cur.y}`;
    }
    return d;
  }, [positions, currentIdx]);

  return (
    <div
      className="relative rounded-[22px] p-4 stagger-2 overflow-hidden"
      style={{
        background:
          "linear-gradient(160deg, var(--white) 0%, var(--off-white) 100%)",
        boxShadow:
          "0 1px 0 rgba(255,255,255,0.7) inset, 0 10px 28px -14px rgba(0,77,91,0.18)",
        border: "1px solid var(--gray-light)",
      }}
    >
      {/* Soft gold radial */}
      <span
        className="absolute -bottom-16 -left-12 w-44 h-44 rounded-full pointer-events-none"
        style={{ background: "radial-gradient(closest-side, rgba(197,150,90,0.12), transparent)" }}
      />

      <div className="relative flex items-center justify-between mb-2">
        <p className="font-mono text-[9.5px] tracking-[0.22em]" style={{ color: "var(--gray)" }}>
          JOURNEY · رحلتك
        </p>
        <span className="font-mono text-[9px] tracking-[0.18em]" style={{ color: "var(--gold)" }}>
          {compact.length} STOPS
        </span>
      </div>

      <PhaseRibbon current={phase} />

      <div className="relative mt-2 w-full" style={{ aspectRatio: "5 / 2.2" }}>
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="absolute inset-0 w-full h-full"
          aria-hidden="true"
        >
          {/* Subtle base path */}
          <path
            d={path}
            fill="none"
            stroke="var(--gray-light)"
            strokeWidth={0.9}
            strokeDasharray="1.6 2.2"
            vectorEffect="non-scaling-stroke"
          />
          {/* Completed-so-far gold trace */}
          {completedPath && (
            <path
              d={completedPath}
              fill="none"
              stroke="var(--gold)"
              strokeWidth={1.3}
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
              opacity={0.85}
            />
          )}
        </svg>

        {compact.map((m, i) => {
          const p = positions[i];
          const isCurrent = m.state === "current";
          const isDone = m.state === "done";
          return (
            <button
              key={m.id}
              onClick={() => onSelect(m.id)}
              className={isCurrent ? "animate-pulse" : ""}
              data-state={m.state}
              data-testid={`mini-milestone-${m.id}`}
              style={{
                position: "absolute",
                left: `${p.x}%`,
                top: `${p.y}%`,
                transform: "translate(-50%, -50%)",
                width: 28,
                height: 28,
                borderRadius: 9999,
                background: stateBg(m.state),
                border: `2px solid ${isDone ? "var(--success)" : kindAccent(m.kind)}`,
                boxShadow: isCurrent
                  ? "0 0 0 5px rgba(0,77,91,0.14), 0 4px 10px rgba(0,77,91,0.22)"
                  : "0 2px 6px rgba(0,77,91,0.14)",
                color: isDone || isCurrent ? "#fff" : "var(--navy)",
                fontSize: 12,
                fontWeight: 700,
                lineHeight: 1,
                cursor: "pointer",
              }}
              aria-label={`${m.title} · ${m.titleAr}`}
              aria-current={isCurrent ? "step" : undefined}
            >
              <span aria-hidden="true">{kindIcon(m.kind)}</span>
            </button>
          );
        })}

        {currentIdx >= 0 && (
          <div
            style={{
              position: "absolute",
              left: `${positions[currentIdx].x}%`,
              top: `${positions[currentIdx].y - 22}%`,
              transform: "translate(-50%, -100%)",
              padding: "2px 7px",
              borderRadius: 9999,
              background: "var(--gold)",
              color: "#fff",
              fontSize: 8.5,
              fontWeight: 700,
              letterSpacing: "0.12em",
              whiteSpace: "nowrap",
              boxShadow: "0 4px 10px rgba(197,150,90,0.4)",
            }}
          >
            TODAY · اليوم
          </div>
        )}
      </div>

      {/* Compact label row under the curve */}
      <div className="relative mt-1 grid" style={{ gridTemplateColumns: `repeat(${compact.length}, minmax(0, 1fr))` }}>
        {compact.map((m) => (
          <div key={`${m.id}-lbl`} className="px-1 text-center min-w-0">
            <p className="text-[9.5px] font-semibold truncate" style={{ color: "var(--navy)" }}>
              {m.title}
            </p>
            <p
              className="font-arabic text-[9px] truncate"
              dir="rtl"
              style={{ color: "var(--gray)" }}
            >
              {m.titleAr}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MiniHelicopterStrip;
