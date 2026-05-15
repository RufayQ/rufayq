import { ArrowRight } from "lucide-react";
import type { JourneyOverview } from "@/hooks/useJourneyOverview";
import { derivePhase, PHASES } from "./journeyPhase";
import { useLanguage } from "@/contexts/LanguageContext";

interface TodayCardProps {
  overview: JourneyOverview;
  onOpenJourney: () => void;
  onPlanFirstTrip: () => void;
}

/** Circular gold progress ring drawn with two SVG arcs. */
const ProgressRing = ({ pct, dayN, totalDays }: { pct: number; dayN: number | null; totalDays: number | null }) => {
  const size = 76;
  const stroke = 5;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (Math.max(0, Math.min(100, pct)) / 100) * c;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--gold-light)"
          strokeWidth={stroke}
          opacity={0.55}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--gold)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 600ms ease-out" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-[20px] leading-none" style={{ color: "var(--navy)" }}>
          {dayN ?? "—"}
        </span>
        <span className="font-mono text-[9px] tracking-widest mt-0.5" style={{ color: "var(--gray)" }}>
          / {totalDays ?? "—"}
        </span>
      </div>
    </div>
  );
};

const TodayCard = ({ overview, onOpenJourney, onPlanFirstTrip }: TodayCardProps) => {
  const { showEn, showAr } = useLanguage();
  const { activeTrip, dayN, totalDays, progressPct, nextAppointment, nextMedication, formattedReturnDate } = overview;

  // ---- Empty state: refined, single inline CTA. ----
  if (!activeTrip) {
    return (
      <button
        onClick={onPlanFirstTrip}
        className="relative w-full rounded-[22px] p-5 text-left animate-fade-in-up card-press overflow-hidden"
        style={{
          background:
            "linear-gradient(140deg, var(--white) 0%, var(--white) 60%, var(--gold-pale) 100%)",
          boxShadow:
            "0 1px 0 rgba(255,255,255,0.6) inset, 0 12px 40px -12px rgba(0,77,91,0.18)",
          border: "1px solid rgba(197,150,90,0.18)",
        }}
      >
        <span
          className="absolute -top-10 -right-10 w-32 h-32 rounded-full"
          style={{ background: "radial-gradient(closest-side, rgba(197,150,90,0.18), transparent)" }}
        />
        <p className="font-mono text-[9.5px] tracking-[0.22em] mb-2" style={{ color: "var(--gold)" }}>
          {showEn && "TODAY"}{showEn && showAr && " · "}{showAr && "اليوم"}
        </p>
        {showEn && (
          <p className="font-display text-[20px] leading-tight" style={{ color: "var(--navy)" }}>
            Plan your first journey
          </p>
        )}
        {showAr && (
          <p className="font-arabic text-[12px] mt-1" dir="rtl" style={{ color: "var(--gray)" }}>
            ابدأ رحلتك العلاجية الأولى
          </p>
        )}
        <span
          className="mt-3 inline-flex items-center gap-1.5 text-[12px] font-semibold"
          style={{ color: "var(--teal-deep)" }}
        >
          {showEn ? "Begin" : "ابدأ"} <ArrowRight size={13} />
        </span>
      </button>
    );
  }

  const phase = derivePhase(dayN, totalDays);
  const phaseLabel = PHASES.find((p) => p.id === phase)!;

  const next = nextAppointment
    ? {
        emoji: "🩺",
        en: `${nextAppointment.specialty} · ${nextAppointment.time}`,
        ar: `${nextAppointment.specialtyAr || nextAppointment.specialty} · ${nextAppointment.time}`,
      }
    : nextMedication
    ? {
        emoji: "💊",
        en: `${nextMedication.name} · ${nextMedication.time}`,
        ar: `${nextMedication.nameAr} · ${nextMedication.time}`,
      }
    : {
        emoji: "🗓️",
        en: `Return ${formattedReturnDate}`,
        ar: `العودة ${formattedReturnDate}`,
      };

  return (
    <div
      className="relative rounded-[22px] p-5 animate-fade-in-up overflow-hidden"
      style={{
        background:
          "linear-gradient(155deg, var(--white) 0%, var(--white) 55%, rgba(224,244,245,0.55) 100%)",
        boxShadow:
          "0 1px 0 rgba(255,255,255,0.7) inset, 0 16px 44px -16px rgba(0,77,91,0.22)",
        border: "1px solid rgba(0,77,91,0.08)",
      }}
    >
      {/* Soft teal halo top-right */}
      <span
        className="absolute -top-12 -right-12 w-40 h-40 rounded-full pointer-events-none"
        style={{ background: "radial-gradient(closest-side, rgba(0,146,159,0.12), transparent)" }}
      />
      {/* Gold corner accent */}
      <span
        className="absolute top-0 left-0 w-10 h-[3px] rounded-br-md"
        style={{ background: "linear-gradient(90deg, var(--gold), transparent)" }}
      />

      <div className="relative flex items-start gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <p className="font-mono text-[9.5px] tracking-[0.22em]" style={{ color: "var(--gold)" }}>
              {showAr && !showEn ? "اليوم" : "TODAY"}
            </p>
            <span
              className="font-mono text-[9px] tracking-[0.18em] px-2 py-[2px] rounded-full"
              style={{
                background: "var(--teal-light)",
                color: "var(--teal-deep)",
                border: "1px solid rgba(0,77,91,0.10)",
              }}
            >
              {showEn && phaseLabel.en.toUpperCase()}
              {showEn && showAr && " · "}
              {showAr && phaseLabel.ar}
            </span>
          </div>
          <p
            className="font-display text-[19px] leading-tight truncate"
            style={{ color: "var(--navy)" }}
          >
            {activeTrip.specialtyEmoji || "🏥"} {activeTrip.destination}
          </p>
          <p className="text-[11.5px] mt-0.5 truncate" style={{ color: "var(--gray)" }}>
            {activeTrip.hospital || activeTrip.specialty}
          </p>

          <div
            className="mt-3 flex items-center gap-2 rounded-xl px-3 py-2"
            style={{ background: "var(--off-white)", border: "1px solid var(--gray-light)" }}
          >
            <span className="text-[14px]">{next.emoji}</span>
            <div className="flex-1 min-w-0">
              {showEn && (
                <p className="text-[11.5px] font-semibold truncate" style={{ color: "var(--navy)" }}>
                  {next.en}
                </p>
              )}
              {showAr && (
                <p
                  className="font-arabic text-[10px] truncate"
                  dir="rtl"
                  style={{ color: "var(--gray)" }}
                >
                  {next.ar}
                </p>
              )}
            </div>
          </div>
        </div>

        <ProgressRing pct={progressPct} dayN={dayN} totalDays={totalDays} />
      </div>

      <button
        onClick={onOpenJourney}
        className="relative mt-4 w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full text-[12.5px] font-semibold text-white btn-press"
        style={{
          background: "linear-gradient(135deg, var(--teal-deep), var(--teal-mid))",
          boxShadow: "0 6px 18px -6px rgba(0,77,91,0.55)",
        }}
      >
        {showEn && "Open Journey"}{showEn && showAr && " · "}{showAr && "افتح رحلتك"} <ArrowRight size={14} />
      </button>
    </div>
  );
};

export default TodayCard;
