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

const JourneyHelicopterTimeline = ({ segments, onSelect }: Props) => {
  const railRef = useRef<HTMLDivElement>(null);
  const [focusedIndex, setFocusedIndex] = useState(0);
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

  return (
    <section className="px-4 mb-3" aria-label="Journey overview · نظرة عامة على الرحلة">
      <div className="rounded-3xl p-4 overflow-hidden" style={{ background: "linear-gradient(135deg, rgba(0,77,91,0.08), rgba(197,150,90,0.10))", border: "1px solid rgba(0,77,91,0.12)" }}>
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <p className="font-mono text-[9px] tracking-widest" style={{ color: "var(--teal-deep)" }}>HELICOPTER VIEW</p>
            <p className="font-arabic text-[10px]" dir="rtl" style={{ color: "var(--gray)" }}>نظرة شاملة لمسار الرحلة</p>
          </div>
          <span className="rounded-full px-2 py-1 text-[9px] font-bold" style={{ background: "var(--white)", color: "var(--teal-deep)" }}>{ordered.length} legs</span>
        </div>

        <div
          ref={railRef}
          role="list"
          className="flex items-stretch overflow-x-auto pb-2"
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
            return (
              <div key={segment.id} role="listitem" className="flex min-w-[88px] items-center" style={{ scrollSnapAlign: "start" }}>
                <button
                  data-node-index={index}
                  onClick={() => onSelect(segment)}
                  onFocus={() => setFocusedIndex(index)}
                  className="rounded-2xl px-2 py-2 text-center outline-none btn-press focus:ring-2"
                  style={{ background: focusedIndex === index ? "var(--white)" : "rgba(255,255,255,0.55)", color: "var(--navy)" }}
                  aria-label={`${segment.type} from ${code} to ${toCode} on ${dateLabel(segment.departureDateTime)} · من ${code} إلى ${toCode}`}
                >
                  <span className="block text-[28px] leading-none" aria-hidden="true">{iconFor(segment.type)}</span>
                  <span className="mt-1 block font-mono text-[11px] font-bold">{code}</span>
                  <span className="block text-[9px]" style={{ color: "var(--gray)" }}>{dateLabel(segment.departureDateTime)}</span>
                </button>
                {!last && <div className="mx-1 h-1 w-10 shrink-0 rounded-full" style={{ background: connectorColor(segment) }} />}
              </div>
            );
          })}
          {hidden > 0 && (
            <div className="flex min-w-[72px] items-center justify-center">
              <span className="rounded-full px-3 py-2 text-[11px] font-bold" style={{ background: "var(--white)", color: "var(--teal-deep)" }}>+{hidden} more</span>
            </div>
          )}
          <span className="ml-2 self-center text-[18px]" aria-hidden="true" style={{ color: "var(--gray)" }}>›</span>
        </div>
      </div>
    </section>
  );
};

export default JourneyHelicopterTimeline;
