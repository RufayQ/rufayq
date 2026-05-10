/**
 * Slice 2B — Vertical journey timeline.
 *
 * Pure render component. Given a `FlightJourney`, renders each leg as a step
 * with status `done | active | pending` (derived from current time vs the
 * departure timestamp), and lets the user expand a leg to see its details
 * (flight #, route, seat class, PNR, passenger).
 *
 * Intentionally has no business logic — callers pass `journey` and (optionally)
 * a `now` for tests.
 */
import { useMemo, useState } from "react";
import type { FlightJourney, JourneyLeg } from "@/lib/flightJourney";
import { computeLayover } from "@/lib/flightJourney";

export type LegStatus = "done" | "active" | "pending";

const fmtDate = (iso: string) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso.split("T")[0] || iso;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
};
const fmtTime = (iso: string) => {
  if (!iso || !iso.includes("T")) return "";
  return iso.split("T")[1].slice(0, 5);
};

export const computeLegStatus = (leg: JourneyLeg, now: number): LegStatus => {
  const dep = Date.parse(leg.departureDateTime);
  const arr = Date.parse(leg.arrivalDateTime);
  if (!isNaN(arr) && now >= arr) return "done";
  if (!isNaN(dep) && now >= dep) return "active";
  return "pending";
};

interface Props {
  journey: FlightJourney;
  /** Override "now" for tests. Defaults to Date.now(). */
  now?: number;
  /** Compact = no expand affordance; used for previews. */
  compact?: boolean;
  /** Optional click handler for analytics / nav. */
  onLegClick?: (leg: JourneyLeg, index: number) => void;
}

const dotColor = (s: LegStatus) =>
  s === "done" ? "#3DAA6E" : s === "active" ? "var(--gold)" : "var(--gray)";

const JourneyTimeline = ({ journey, now = Date.now(), compact, onLegClick }: Props) => {
  const [expanded, setExpanded] = useState<number | null>(compact ? null : 0);

  const items = useMemo(
    () => journey.legs.map((leg, i) => ({ leg, status: computeLegStatus(leg, now), index: i })),
    [journey.legs, now],
  );

  if (items.length === 0) {
    return (
      <div
        className="rounded-2xl px-4 py-5 text-center"
        style={{ background: "var(--white)", border: "1px dashed var(--gray-light)" }}
      >
        <p className="text-[12px]" style={{ color: "var(--gray)" }}>
          No flight legs to show
        </p>
        <p className="font-arabic text-[10px]" dir="rtl" style={{ color: "var(--gray)" }}>
          لا توجد رحلات للعرض
        </p>
      </div>
    );
  }

  return (
    <div
      className="rounded-2xl p-4"
      style={{ background: "var(--white)", boxShadow: "0 4px 16px rgba(0,0,0,0.06)" }}
      data-testid="journey-timeline"
    >
      <div className="relative">
        {items.map(({ leg, status, index }, i) => {
          const isLast = i === items.length - 1;
          const isOpen = expanded === index;
          const layover = !isLast ? computeLayover(leg, items[i + 1].leg) : null;
          return (
            <div key={`${leg.flightNumber}-${leg.departureDateTime}-${i}`} className="relative pl-8 pb-4">
              {/* connector line */}
              {!isLast && (
                <span
                  aria-hidden
                  style={{
                    position: "absolute",
                    left: 9,
                    top: 18,
                    bottom: -4,
                    width: 2,
                    background: status === "done" ? "#3DAA6E" : "var(--gray-light)",
                  }}
                />
              )}
              {/* dot */}
              <span
                aria-hidden
                style={{
                  position: "absolute",
                  left: 4,
                  top: 4,
                  width: 12,
                  height: 12,
                  borderRadius: 999,
                  background: dotColor(status),
                  boxShadow: status === "active" ? "0 0 0 4px rgba(197,150,90,0.18)" : undefined,
                }}
              />
              <button
                onClick={() => {
                  if (!compact) setExpanded(isOpen ? null : index);
                  onLegClick?.(leg, index);
                }}
                className="w-full text-left btn-press"
                aria-expanded={isOpen}
                data-testid={`journey-leg-${index}`}
              >
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-[13px] font-bold" style={{ color: "var(--navy)" }}>
                    {leg.from.code} → {leg.to.code}
                    <span className="ml-2 text-[11px] font-normal" style={{ color: "var(--gray)" }}>
                      {leg.airline} {leg.flightNumber}
                    </span>
                  </p>
                  <span
                    className="text-[9px] px-2 py-0.5 rounded-full font-bold uppercase"
                    style={{
                      background:
                        status === "done"
                          ? "rgba(61,170,110,0.12)"
                          : status === "active"
                          ? "rgba(197,150,90,0.18)"
                          : "var(--gray-light)",
                      color:
                        status === "done"
                          ? "#2A7F50"
                          : status === "active"
                          ? "var(--navy)"
                          : "var(--gray)",
                    }}
                  >
                    {status}
                  </span>
                </div>
                <p className="text-[11px] mt-0.5" style={{ color: "var(--gray)" }}>
                  {leg.from.city} → {leg.to.city}
                </p>
                <p className="font-mono text-[10px] mt-0.5" style={{ color: "var(--gray)" }}>
                  {fmtDate(leg.departureDateTime)} · {fmtTime(leg.departureDateTime) || "--:--"}
                </p>
              </button>

              {isOpen && !compact && (
                <div
                  className="mt-2 rounded-xl p-3 grid grid-cols-2 gap-x-3 gap-y-1.5"
                  style={{ background: "var(--off-white)" }}
                  data-testid={`journey-leg-details-${index}`}
                >
                  <DetailRow k="Flight" v={`${leg.airline || ""} ${leg.flightNumber || ""}`.trim() || "—"} />
                  <DetailRow k="PNR" v={leg.bookingRef || "—"} />
                  <DetailRow k="Class" v={leg.seatClass || "—"} />
                  <DetailRow k="Seat" v={leg.seatNumber || "—"} />
                  <DetailRow k="Departs" v={`${fmtDate(leg.departureDateTime)} ${fmtTime(leg.departureDateTime)}`.trim()} />
                  <DetailRow k="Arrives" v={`${fmtDate(leg.arrivalDateTime)} ${fmtTime(leg.arrivalDateTime)}`.trim()} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {journey.passenger?.name && (
        <p className="mt-1 text-[10px]" style={{ color: "var(--gray)" }}>
          Passenger: <span style={{ color: "var(--navy)", fontWeight: 600 }}>{journey.passenger.name}</span>
          {journey.passenger.passport ? ` · ${journey.passenger.passport}` : ""}
        </p>
      )}
    </div>
  );
};

const DetailRow = ({ k, v }: { k: string; v: string }) => (
  <div>
    <p className="font-mono text-[8px] tracking-wider" style={{ color: "var(--gray)" }}>
      {k.toUpperCase()}
    </p>
    <p className="text-[12px] font-bold" style={{ color: "var(--navy)" }}>
      {v || "—"}
    </p>
  </div>
);

export default JourneyTimeline;
