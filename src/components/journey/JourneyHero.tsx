import type { TripData } from "@/components/AddTripSheet";

interface JourneyHeroProps {
  trip: TripData;
  daysLeft: number | null;
  progressPct: number;
  formattedDepartureDate: string;
  formattedReturnDate: string;
}

const JourneyHero = ({ trip, daysLeft, progressPct, formattedDepartureDate, formattedReturnDate }: JourneyHeroProps) => (
  <div className="rounded-2xl p-5 mx-4 mt-3" style={{ background: "var(--white)", boxShadow: "0 8px 32px rgba(0,77,91,0.14)" }}>
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="font-mono text-[9px] tracking-widest" style={{ color: "var(--gold)" }}>
          ACTIVE TRIP · رحلتك الحالية
        </p>
        <p className="font-display text-xl mt-0.5 truncate" style={{ color: "var(--navy)" }}>
          {trip.specialtyEmoji || "🏥"} {trip.destination}
        </p>
        <p className="text-[12px] mt-0.5" style={{ color: "var(--gray)" }}>
          {trip.hospital || "—"} · {trip.specialty || "Treatment"}
        </p>
      </div>
      <span
        className="font-mono text-[10px] px-3 py-1 rounded-full shrink-0"
        style={{ background: "var(--teal-light)", color: "var(--teal-deep)" }}
      >
        {formattedDepartureDate} → {formattedReturnDate}
      </span>
    </div>

    <div className="w-full h-1.5 rounded-full mt-4" style={{ background: "var(--gray-light)" }}>
      <div
        className="h-1.5 rounded-full"
        style={{ width: `${progressPct}%`, background: "linear-gradient(90deg, var(--teal-deep), var(--teal-bright))" }}
      />
    </div>
    <div className="flex items-center justify-between mt-2">
      <span className="text-[11px]" style={{ color: "var(--gray)" }}>
        {daysLeft != null ? `${daysLeft} days left` : "Trip in planning"}
      </span>
      <span className="font-arabic text-[10px]" dir="rtl" style={{ color: "var(--gray)" }}>
        {daysLeft != null ? `متبقي ${daysLeft} يوم` : "قيد التخطيط"}
      </span>
    </div>
  </div>
);

export default JourneyHero;
