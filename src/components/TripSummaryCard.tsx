/**
 * Compact trip summary card — trip type, leg count, progress %.
 * Pure render. Pass a parsed `FlightJourney`.
 */
import { useMemo } from "react";
import type { FlightJourney } from "@/lib/flightJourney";
import { computeLegStatus } from "@/components/JourneyTimeline";

const TRIP_LABEL: Record<FlightJourney["tripType"], { en: string; ar: string }> = {
  "one-way": { en: "One-way", ar: "ذهاب فقط" },
  "round-trip": { en: "Round-trip", ar: "ذهاب وعودة" },
  "multi-city": { en: "Multi-city", ar: "متعدد الوجهات" },
};

interface Props {
  journey: FlightJourney;
  now?: number;
}

const TripSummaryCard = ({ journey, now = Date.now() }: Props) => {
  const { doneCount, totalCount, percent } = useMemo(() => {
    const total = journey.legs.length;
    const done = journey.legs.filter(l => computeLegStatus(l, now) === "done").length;
    return {
      doneCount: done,
      totalCount: total,
      percent: total === 0 ? 0 : Math.round((done / total) * 100),
    };
  }, [journey.legs, now]);

  const label = TRIP_LABEL[journey.tripType];

  return (
    <div
      className="rounded-2xl p-4"
      style={{
        background: "linear-gradient(135deg, var(--teal-deep), var(--teal-bright))",
        boxShadow: "0 4px 16px rgba(0,0,0,0.10)",
      }}
      data-testid="trip-summary-card"
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="font-mono text-[9px] tracking-widest" style={{ color: "var(--gold)" }}>
            TRIP SUMMARY · <span className="font-arabic">ملخص الرحلة</span>
          </p>
          <p className="text-[18px] font-bold text-white mt-0.5" style={{ fontFamily: "'DM Sans'" }}>
            {label.en}
            <span className="ml-2 text-[11px] font-normal" style={{ color: "rgba(255,255,255,0.7)" }}>
              · {totalCount} {totalCount === 1 ? "leg" : "legs"}
            </span>
          </p>
          <p className="font-arabic text-[11px]" dir="rtl" style={{ color: "rgba(255,255,255,0.6)" }}>
            {label.ar}
          </p>
        </div>
        <div className="text-right">
          <p className="font-mono text-[28px] font-bold leading-none" style={{ color: "var(--gold)" }}>
            {percent}<span className="text-[14px]">%</span>
          </p>
          <p className="text-[9px]" style={{ color: "rgba(255,255,255,0.6)" }}>
            {doneCount}/{totalCount} done
          </p>
        </div>
      </div>

      <div
        className="mt-3 w-full rounded-full overflow-hidden"
        style={{ height: 6, background: "rgba(255,255,255,0.15)" }}
      >
        <div
          style={{
            width: `${percent}%`,
            height: "100%",
            background: "var(--gold)",
            transition: "width 400ms ease",
          }}
        />
      </div>

      {journey.source === "manual" && (
        <p className="mt-2 text-[9px]" style={{ color: "rgba(255,255,255,0.55)" }}>
          ✎ Manual Entry
        </p>
      )}
    </div>
  );
};

export default TripSummaryCard;
