import { useMemo, useRef, useState } from "react";
import type { TransportSegment } from "@/components/TransportCard";

interface Props {
  segments: TransportSegment[];
  onSelect: (segment: TransportSegment) => void;
}

const iconFor = (type: TransportSegment["type"]) => ({
  flight: "✈️",
  train: "🚄",
  bus: "🚌",
  taxi: "🚕",
  rental: "🚗",
  medical: "🚑",
}[type] || "📍");

const statusFor = (segment: TransportSegment) => {
  const now = Date.now();
  const dep = new Date(segment.departureDateTime).getTime();
  const arr = new Date(segment.arrivalDateTime).getTime();
  if (now >= dep && now <= arr) return "active";
  return dep > now ? "upcoming" : "past";
};

const connectorColor = (segment: TransportSegment) => {
  const status = statusFor(segment);
  if (status === "past") return "var(--success)";
  if (status === "active") return "var(--gold)";
  return "var(--gray-light)";
};

const dateLabel = (iso: string) => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

const timeLabel = (iso: string) => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
};

const JourneyHelicopterTimeline = ({ segments, onSelect }: Props) => {
  const railRef = useRef<HTMLDivElement>(null);
  const [focusedIndex, setFocusedIndex] = useState(0);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const ordered = useMemo(
    () => segments.filter((s) => s.type === "flight").sort((a, b) => new Date(a.departureDateTime).getTime() - new Date(b.departureDateTime).getTime()),
    [segments],
  );

  if (ordered.length < 2) return null;

  const visible = ordered.length > 6 ? ordered.slice(0, 6) : ordered;
  const hidden = ordered.length - visible.length;

  const moveFocus = (direction: -1 | 1) => {
    const next = Math.max(0, Math.min(visible.length - 1, focusedIndex + direction));
    setFocusedIndex(next);
    const button = railRef.current?.querySelector<HTMLButtonElement>(`[data-node-index="${next}"]`);
    button?.focus();
  };

  const toggleExpand = (index: number, segment: TransportSegment) => {
    if (expandedIndex === index) {
      setExpandedIndex(null);
      onSelect(segment);
    } else {
      setExpandedIndex(index);
    }
  };

  return (
    <section className="px-4 mb-3" aria-label="Journey overview · نظرة عامة على الرحلة">
      <div className="rounded-2xl px-3 py-2.5" style={{ background: "linear-gradient(135deg, rgba(0,77,91,0.06), rgba(197,150,90,0.08))", border: "1px solid rgba(0,77,91,0.10)" }}>
        <div className="flex items-center justify-between gap-3 mb-2">
          <div className="flex items-baseline gap-2">
            <p className="font-mono text-[9px] tracking-widest" style={{ color: "var(--teal-deep)" }}>HELICOPTER VIEW</p>
            <p className="font-arabic text-[10px]" dir="rtl" style={{ color: "var(--gray)" }}>نظرة شاملة</p>
          </div>
          <span className="rounded-full px-2 py-0.5 text-[9px] font-bold" style={{ background: "var(--white)", color: "var(--teal-deep)" }}>{ordered.length} legs</span>
        </div>

        <div
          ref={railRef}
          role="list"
          className="flex items-center overflow-x-auto pb-1 -mx-1 px-1"
          style={{ scrollSnapType: "x mandatory" }}
          onKeyDown={(e) => {
            if (e.key === "ArrowRight") moveFocus(1);
            if (e.key === "ArrowLeft") moveFocus(-1);
          }}
        >
          {visible.map((segment, index) => {
            const code = segment.fromCode || segment.fromCity || "—";
            const toCode = segment.toCode || segment.toCity || "—";
            const last = index === visible.length - 1;
            const isExpanded = expandedIndex === index;
            return (
              <div key={segment.id} role="listitem" className="flex items-center shrink-0" style={{ scrollSnapAlign: "start" }}>
                <button
                  data-node-index={index}
                  onClick={() => toggleExpand(index, segment)}
                  onFocus={() => setFocusedIndex(index)}
                  className="flex items-center gap-1.5 rounded-full outline-none btn-press focus:ring-2 transition-all duration-300 ease-out"
                  style={{
                    background: isExpanded ? "var(--white)" : "transparent",
                    padding: isExpanded ? "4px 10px 4px 4px" : "0",
                  }}
                  aria-expanded={isExpanded}
                  aria-label={`${segment.type} ${code} to ${toCode} on ${dateLabel(segment.departureDateTime)}`}
                >
                  <span
                    className="flex items-center justify-center rounded-full text-[18px] leading-none shrink-0 transition-all duration-300"
                    aria-hidden="true"
                    style={{
                      width: 36,
                      height: 36,
                      background: "var(--white)",
                      boxShadow: focusedIndex === index || isExpanded ? "0 2px 8px rgba(0,77,91,0.18)" : "0 1px 3px rgba(0,0,0,0.06)",
                      border: focusedIndex === index ? "1.5px solid var(--gold)" : "1px solid rgba(0,77,91,0.10)",
                    }}
                  >
                    {iconFor(segment.type)}
                  </span>
                  <div
                    className="grid overflow-hidden text-left transition-all duration-300 ease-out"
                    style={{
                      gridTemplateColumns: isExpanded ? "1fr" : "0fr",
                      opacity: isExpanded ? 1 : 0,
                    }}
                  >
                    <div className="min-w-0 overflow-hidden whitespace-nowrap">
                      <div className="font-mono text-[11px] font-bold leading-tight" style={{ color: "var(--navy)" }}>
                        {code} → {toCode}
                      </div>
                      <div className="text-[9px] leading-tight" style={{ color: "var(--gray)" }}>
                        {dateLabel(segment.departureDateTime)} · {timeLabel(segment.departureDateTime)}
                      </div>
                    </div>
                  </div>
                </button>
                {!last && (
                  <div
                    className="mx-1 h-[3px] shrink-0 rounded-full transition-all duration-300"
                    style={{ width: isExpanded ? 12 : 18, background: connectorColor(segment) }}
                  />
                )}
              </div>
            );
          })}
          {hidden > 0 && (
            <span className="ml-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold shrink-0" style={{ background: "var(--white)", color: "var(--teal-deep)" }}>+{hidden}</span>
          )}
        </div>
      </div>
    </section>
  );
};

export default JourneyHelicopterTimeline;
