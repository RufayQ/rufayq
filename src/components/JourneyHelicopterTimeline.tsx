/**
 * JourneyHelicopterTimeline — single-rail iconic overview of all transport
 * segments in the trip. Lets the user see the whole journey at a glance and
 * jump to a specific ticket card by tapping a node.
 */
import { useMemo, useRef } from "react";
import type { TransportSegment } from "./TransportCard";

const typeIcon: Record<TransportSegment["type"], string> = {
  flight: "✈️",
  train: "🚄",
  bus: "🚌",
  taxi: "🚕",
  rental: "🚗",
  medical: "🚑",
};

interface Props {
  segments: TransportSegment[];
  onNodeClick?: (seg: TransportSegment) => void;
}

const fmtShortDate = (iso: string) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

const groupOf = (s: TransportSegment, now: number): "past" | "current" | "upcoming" => {
  const dep = new Date(s.departureDateTime).getTime();
  const arr = new Date(s.arrivalDateTime).getTime();
  if (now >= dep && now <= arr) return "current";
  if (dep > now) return "upcoming";
  return "past";
};

const colorFor = (g: "past" | "current" | "upcoming") =>
  g === "past" ? "var(--success)" : g === "current" ? "var(--gold)" : "var(--gray-light)";

const JourneyHelicopterTimeline = ({ segments, onNodeClick }: Props) => {
  const railRef = useRef<HTMLDivElement>(null);
  const nodes = useMemo(() => {
    const sorted = [...segments].sort(
      (a, b) => new Date(a.departureDateTime).getTime() - new Date(b.departureDateTime).getTime(),
    );
    const now = Date.now();
    return sorted.map((seg) => ({ seg, group: groupOf(seg, now) }));
  }, [segments]);

  if (nodes.length < 2) return null;

  return (
    <div
      className="mx-4 mt-2 mb-3 rounded-2xl p-3"
      style={{ background: "var(--white)", border: "1px solid var(--gray-light)", boxShadow: "0 4px 14px rgba(0,0,0,0.06)" }}
      role="region"
      aria-label="Journey overview · نظرة شاملة على الرحلة"
    >
      <div className="flex items-center justify-between mb-2">
        <p className="font-mono text-[9px] tracking-widest" style={{ color: "var(--teal-deep)" }}>
          🚁 HELICOPTER VIEW
        </p>
        <p className="font-arabic text-[10px]" dir="rtl" style={{ color: "var(--gray)" }}>
          نظرة شاملة على رحلتك
        </p>
      </div>

      <div
        ref={railRef}
        className="overflow-x-auto pb-1"
        style={{ scrollSnapType: "x mandatory", scrollbarWidth: "none" }}
        role="list"
      >
        <div className="flex items-stretch min-w-min">
          {nodes.map(({ seg, group }, i) => {
            const isLast = i === nodes.length - 1;
            const code = seg.fromCode || seg.fromCity?.slice(0, 3).toUpperCase() || "—";
            const toCode = seg.toCode || seg.toCity?.slice(0, 3).toUpperCase() || "—";
            const lineColor = colorFor(group);
            return (
              <div key={seg.id} className="flex items-center" style={{ scrollSnapAlign: "start" }} role="listitem">
                <button
                  onClick={() => onNodeClick?.(seg)}
                  className="flex flex-col items-center btn-press px-1"
                  style={{ minWidth: 56 }}
                  aria-label={`${seg.type} ${code} to ${toCode} on ${fmtShortDate(seg.departureDateTime)}`}
                >
                  <div
                    className="rounded-full flex items-center justify-center"
                    style={{
                      width: 36,
                      height: 36,
                      background: group === "current" ? "var(--gold-pale)" : "var(--off-white)",
                      border: `2px solid ${lineColor === "var(--gray-light)" ? "var(--gray)" : lineColor}`,
                      boxShadow: group === "current" ? "0 0 0 4px rgba(197,150,90,0.18)" : "none",
                    }}
                  >
                    <span style={{ fontSize: 18 }}>{typeIcon[seg.type]}</span>
                  </div>
                  <p className="font-mono text-[10px] font-bold mt-1" style={{ color: "var(--navy)" }}>
                    {code}
                  </p>
                  <p className="font-mono text-[8px]" style={{ color: "var(--gray)" }}>
                    {fmtShortDate(seg.departureDateTime)}
                  </p>
                </button>
                {!isLast && (
                  <div
                    aria-hidden
                    className="self-center"
                    style={{
                      width: 24,
                      height: 2,
                      background: lineColor,
                      borderRadius: 2,
                      marginTop: -22,
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex items-center justify-between mt-1.5 px-1">
        <span className="text-[9px]" style={{ color: "var(--gray)" }}>
          <span style={{ color: "var(--success)" }}>●</span> Past · <span style={{ color: "var(--gold)" }}>●</span> Now · <span style={{ color: "var(--gray)" }}>●</span> Upcoming
        </span>
        <span className="font-mono text-[9px]" style={{ color: "var(--gray)" }}>
          {nodes.length} legs
        </span>
      </div>
    </div>
  );
};

export default JourneyHelicopterTimeline;
