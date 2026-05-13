import { useEffect, useRef } from "react";
import type { JourneyMilestone } from "@/hooks/useJourneyOverview";

interface HelicopterCanvasProps {
  milestones: JourneyMilestone[];
  selectedId?: string | null;
  onSelect: (milestoneId: string) => void;
  rtl?: boolean;
}

const stateColor = (s: JourneyMilestone["state"]) =>
  s === "done" ? "var(--success)" : s === "current" ? "var(--teal-deep)" : "var(--gray-light)";

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

const HelicopterCanvas = ({ milestones, selectedId, onSelect, rtl = false }: HelicopterCanvasProps) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Re-trigger pulse animation when current node changes.
  useEffect(() => { /* no-op; CSS handles pulse */ }, [milestones]);

  if (milestones.length === 0) {
    return (
      <div
        className="mx-4 mt-3 rounded-2xl p-6 text-center"
        style={{ background: "var(--off-white)", border: "1px dashed var(--gray-light)" }}
      >
        <p className="text-[12px]" style={{ color: "var(--gray)" }}>
          No journey milestones yet · لا توجد محطات بعد
        </p>
      </div>
    );
  }

  // Lay milestones out on a gentle wave path.
  const count = milestones.length;
  const positions = milestones.map((_, i) => {
    const t = count === 1 ? 0.5 : i / (count - 1);
    const x = 8 + t * 84; // 8% .. 92%
    const y = 50 + Math.sin(t * Math.PI * 1.4) * 18; // gentle wave
    return { x, y };
  });

  // Build SVG path through the points.
  const path = positions
    .map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`))
    .join(" ");
  // Find current index for "today" flag.
  const currentIdx = milestones.findIndex((m) => m.state === "current");

  return (
    <div
      ref={containerRef}
      className="mx-4 mt-3 rounded-2xl p-4"
      style={{ background: "var(--off-white)", border: "1px solid var(--gray-light)" }}
      data-testid="helicopter-canvas"
    >
      <div className="relative w-full" style={{ aspectRatio: "5 / 3" }}>
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="absolute inset-0 w-full h-full"
          style={{ transform: rtl ? "scaleX(-1)" : undefined }}
          aria-hidden="true"
        >
          <path
            d={path}
            fill="none"
            stroke="var(--gray-light)"
            strokeWidth={0.8}
            strokeDasharray="2 2"
            vectorEffect="non-scaling-stroke"
          />
          {currentIdx > 0 && (
            <path
              d={positions
                .slice(0, currentIdx + 1)
                .map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`))
                .join(" ")}
              fill="none"
              stroke="var(--success)"
              strokeWidth={1.2}
              vectorEffect="non-scaling-stroke"
            />
          )}
        </svg>

        {milestones.map((m, i) => {
          const p = positions[i];
          const isSelected = selectedId === m.id;
          return (
            <button
              key={m.id}
              onClick={() => onSelect(m.id)}
              className={m.state === "current" ? "animate-pulse" : ""}
              data-state={m.state}
              data-testid={`milestone-${m.id}`}
              style={{
                position: "absolute",
                left: `${p.x}%`,
                top: `${p.y}%`,
                transform: "translate(-50%, -50%)",
                width: 34,
                height: 34,
                borderRadius: 9999,
                background: stateColor(m.state),
                border: `2px solid ${kindAccent(m.kind)}`,
                boxShadow: isSelected
                  ? "0 0 0 4px rgba(197,150,90,0.35)"
                  : m.state === "current"
                  ? "0 0 0 4px rgba(20,89,121,0.18)"
                  : "0 1px 3px rgba(0,0,0,0.12)",
                color: m.state === "upcoming" ? "var(--navy)" : "#fff",
                fontSize: 14,
                fontWeight: 700,
                cursor: "pointer",
              }}
              aria-label={`${m.title} · ${m.titleAr}`}
              aria-current={m.state === "current" ? "step" : undefined}
            >
              {i + 1}
            </button>
          );
        })}

        {/* Station labels (not mirrored even in RTL) */}
        {milestones.map((m, i) => {
          const p = positions[i];
          return (
            <div
              key={`${m.id}-label`}
              style={{
                position: "absolute",
                left: `${p.x}%`,
                top: `${p.y + 14}%`,
                transform: "translate(-50%, 0)",
                width: 64,
                textAlign: "center",
                fontSize: 9,
                lineHeight: 1.15,
                color: "var(--navy)",
                pointerEvents: "none",
              }}
            >
              <div className="font-semibold truncate">{m.title}</div>
              <div className="font-arabic" dir="rtl" style={{ color: "var(--gray)" }}>{m.titleAr}</div>
            </div>
          );
        })}

        {currentIdx >= 0 && (
          <div
            style={{
              position: "absolute",
              left: `${positions[currentIdx].x}%`,
              top: `${positions[currentIdx].y - 18}%`,
              transform: "translate(-50%, -100%)",
              padding: "2px 8px",
              borderRadius: 9999,
              background: "var(--gold)",
              color: "#fff",
              fontSize: 9,
              fontWeight: 700,
              whiteSpace: "nowrap",
            }}
          >
            TODAY · اليوم
          </div>
        )}
      </div>
    </div>
  );
};

export default HelicopterCanvas;
