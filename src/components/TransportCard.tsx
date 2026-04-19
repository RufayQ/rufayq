import { useState, useEffect } from "react";
import { ExternalLink, Phone, Clock } from "lucide-react";
import { toast } from "sonner";

export interface TransportSegment {
  id: string;
  type: "flight" | "train" | "bus" | "taxi" | "rental" | "medical";
  status: "completed" | "active" | "upcoming" | "cancelled";
  // Common
  fromCode?: string;
  fromCity: string;
  fromFull?: string;
  toCode?: string;
  toCity: string;
  toFull?: string;
  departureDateTime: string;
  arrivalDateTime: string;
  duration?: string;
  bookingRef?: string;
  // Flight specific
  airline?: string;
  flightNumber?: string;
  seatClass?: string;
  seatNumber?: string;
  medicalAssistance?: string;
  // Train
  trainOperator?: string;
  trainNumber?: string;
  carNumber?: string;
  // Bus
  busOperator?: string;
  busNumber?: string;
  // Taxi
  taxiProvider?: string;
  driverName?: string;
  driverPhone?: string;
  distance?: string;
  fare?: string;
  // Rental
  rentalCompany?: string;
  carModel?: string;
  carClass?: string;
  rentalDays?: number;
  insured?: boolean;
  pickupLocation?: string;
  returnLocation?: string;
  // Medical
  mobilityType?: string;
  arrangedBy?: string;
  costInfo?: string;
  hospital?: string;
  hospitalPhone?: string;
  // Layover
  layoverAfter?: { duration: string; airport: string; code: string };
  // Companions (family/care companion travelling on same ticket reference)
  companions?: { name: string; relation: string; seatNumber?: string }[];
}

const statusColors: Record<string, string> = {
  completed: "#3DAA6E",
  active: "#C5965A",
  upcoming: "#C0C8D0",
  cancelled: "#D94F4F",
};

const statusLabels: Record<string, { en: string; icon: string }> = {
  completed: { en: "COMPLETED ✓", icon: "✓" },
  active: { en: "IN PROGRESS", icon: "" },
  upcoming: { en: "UPCOMING", icon: "" },
  cancelled: { en: "CANCELLED ✗", icon: "✗" },
};

const typeConfig: Record<string, { icon: string; label: string; gradient: string }> = {
  flight: { icon: "✈️", label: "FLIGHT", gradient: "linear-gradient(135deg, #004D5B, #006D7C)" },
  train: { icon: "🚄", label: "TRAIN", gradient: "linear-gradient(135deg, #1A3A4A, #0D2535)" },
  bus: { icon: "🚌", label: "BUS", gradient: "linear-gradient(135deg, #1A2A14, #0D1A08)" },
  taxi: { icon: "🚕", label: "TAXI", gradient: "linear-gradient(135deg, #2A1A10, #1A0D08)" },
  rental: { icon: "🚗", label: "RENTAL CAR", gradient: "linear-gradient(135deg, #1A1A3A, #0D0D24)" },
  medical: { icon: "🚑", label: "MEDICAL TRANSPORT", gradient: "linear-gradient(135deg, #3A1A1A, #240D0D)" },
};

const airlineLinks: Record<string, { web: string; ar: string }> = {
  "Saudia": { web: "https://www.saudia.com/en-gb/manage-booking/retrieve-booking", ar: "الخطوط السعودية" },
  "flynas": { web: "https://www.flynas.com/en/manage-booking", ar: "فلاي ناس" },
  "flyadeal": { web: "https://www.flyadeal.com/en/manage-booking", ar: "فلاي ديل" },
  "Emirates": { web: "https://www.emirates.com/english/manage-booking/retrieve-booking/", ar: "طيران الإمارات" },
  "Qatar Airways": { web: "https://www.qatarairways.com/en/manage/booking-summary.html", ar: "القطرية" },
  "Lufthansa": { web: "https://www.lufthansa.com/us/en/manage-booking", ar: "لوفتهانزا" },
  "British Airways": { web: "https://www.britishairways.com/travel/managebooking/public/en_gb", ar: "الخطوط البريطانية" },
  "Turkish Airlines": { web: "https://www.turkishairlines.com/en-int/flights/manage-your-booking/", ar: "الخطوط التركية" },
};

function fmtDate(dt: string) {
  if (!dt) return "";
  const d = new Date(dt);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) + " · " +
    d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
}

const StatusBadge = ({ status }: { status: string }) => {
  const color = statusColors[status];
  const label = statusLabels[status];
  return (
    <span
      className={`font-mono text-[8px] tracking-wider px-2 py-0.5 rounded-full ${status === "active" ? "pulse-gold" : ""}`}
      style={{
        background: status === "upcoming" ? "rgba(255,255,255,0.15)" : color,
        color: "white",
      }}
    >
      {label.en}
    </span>
  );
};

const PerforatedLine = () => (
  <div className="relative flex items-center" style={{ height: 24 }}>
    <div className="absolute left-[-7px] w-[14px] h-[14px] rounded-full" style={{ background: "var(--off-white)", top: 5 }} />
    <div className="w-full border-t-2 border-dashed mx-2" style={{ borderColor: "rgba(255,255,255,0.2)" }} />
    <div className="absolute right-[-7px] w-[14px] h-[14px] rounded-full" style={{ background: "var(--off-white)", top: 5 }} />
  </div>
);

const RouteDisplay = ({ seg, icon }: { seg: TransportSegment; icon: string }) => {
  const useCode = seg.type === "flight" || seg.type === "train";
  return (
    <div className="flex items-center px-5 pt-4 pb-2">
      <div className="flex-1">
        <p className="font-display text-white font-bold leading-none" style={{ fontSize: useCode ? 42 : 20 }}>
          {useCode ? seg.fromCode : seg.fromCity}
        </p>
        {useCode && <p className="text-[11px] mt-0.5" style={{ color: "rgba(255,255,255,0.55)" }}>{seg.fromCity}</p>}
        {seg.fromFull && <p className="text-[9px]" style={{ color: "rgba(255,255,255,0.4)" }}>{seg.fromFull}</p>}
      </div>
      <div className="flex-1 flex flex-col items-center">
        <div className="w-full flex items-center px-2">
          <div className="flex-1 border-t border-dashed" style={{ borderColor: "rgba(255,255,255,0.3)" }} />
          <span className="mx-1 text-sm">{icon}</span>
          <div className="flex-1 border-t border-dashed" style={{ borderColor: "rgba(255,255,255,0.3)" }} />
        </div>
        {seg.flightNumber && <p className="font-mono text-[11px] mt-1" style={{ color: "var(--gold)" }}>{seg.flightNumber}</p>}
        {seg.trainNumber && <p className="font-mono text-[11px] mt-1" style={{ color: "var(--gold)" }}>{seg.trainNumber}</p>}
        {seg.duration && <p className="text-[9px]" style={{ color: "rgba(255,255,255,0.45)" }}>{seg.duration}</p>}
      </div>
      <div className="flex-1 text-right">
        <p className="font-display text-white font-bold leading-none" style={{ fontSize: useCode ? 42 : 20 }}>
          {useCode ? seg.toCode : seg.toCity}
        </p>
        {useCode && <p className="text-[11px] mt-0.5" style={{ color: "rgba(255,255,255,0.55)" }}>{seg.toCity}</p>}
        {seg.toFull && <p className="text-[9px]" style={{ color: "rgba(255,255,255,0.4)" }}>{seg.toFull}</p>}
      </div>
    </div>
  );
};

const DateRow = ({ seg }: { seg: TransportSegment }) => (
  <div className="flex items-center justify-between px-5 py-2">
    <div>
      <p className="font-mono text-[8px] tracking-widest" style={{ color: "rgba(255,255,255,0.45)" }}>DEPARTURE</p>
      <p className="text-[13px] font-bold text-white" style={{ fontFamily: "'DM Sans'" }}>{fmtDate(seg.departureDateTime)}</p>
    </div>
    <div style={{ width: 1, height: 24, background: "rgba(255,255,255,0.15)" }} />
    <div className="text-right">
      <p className="font-mono text-[8px] tracking-widest" style={{ color: "rgba(255,255,255,0.45)" }}>ARRIVAL</p>
      <p className="text-[13px] font-bold text-white" style={{ fontFamily: "'DM Sans'" }}>{fmtDate(seg.arrivalDateTime)}</p>
    </div>
  </div>
);

const DetailsStrip = ({ items }: { items: { label: string; value: string; gold?: boolean }[] }) => (
  <div className="px-5 py-2" style={{ background: "rgba(0,0,0,0.2)" }}>
    <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${items.length}, 1fr)` }}>
      {items.map((it) => (
        <div key={it.label}>
          <p className="font-mono text-[8px] tracking-wider" style={{ color: "rgba(255,255,255,0.45)" }}>{it.label}</p>
          <p className="text-[12px] font-bold" style={{ color: it.gold ? "var(--gold)" : "white", fontFamily: "'DM Sans'" }}>{it.value}</p>
        </div>
      ))}
    </div>
  </div>
);

const ActionRow = ({ children }: { children: React.ReactNode }) => (
  <div className="flex items-center justify-between px-5 py-2.5" style={{ borderTop: "1px dashed rgba(255,255,255,0.15)" }}>
    {children}
  </div>
);

const GoldPill = ({ label, onClick }: { label: string; onClick: () => void }) => (
  <button onClick={onClick} className="flex items-center gap-1.5 px-3.5 btn-press" style={{ height: 30, borderRadius: 20, background: "var(--gold)" }}>
    <span className="text-[11px] font-bold text-white" style={{ fontFamily: "'DM Sans'" }}>{label}</span>
    <ExternalLink size={12} color="white" />
  </button>
);

const GreenPill = ({ label, onClick }: { label: string; onClick: () => void }) => (
  <button onClick={onClick} className="flex items-center gap-1.5 px-3.5 btn-press" style={{ height: 30, borderRadius: 20, background: "var(--success)" }}>
    <Phone size={12} color="white" />
    <span className="text-[11px] font-bold text-white" style={{ fontFamily: "'DM Sans'" }}>{label}</span>
  </button>
);

// Layover indicator
export const LayoverIndicator = ({ duration, airport, code }: { duration: string; airport: string; code: string }) => (
  <div className="flex justify-center my-1">
    <div className="text-center px-4 py-2 rounded-full" style={{ background: "var(--gold-pale)", border: "1px solid rgba(197,150,90,0.3)" }}>
      <p className="text-[11px] font-medium" style={{ color: "var(--navy)", fontFamily: "'DM Sans'" }}>🕐 {duration} LAYOVER — {airport} ({code})</p>
      <p className="font-arabic text-[9px]" dir="rtl" style={{ color: "var(--gray)" }}>توقف في {airport} — {duration}</p>
    </div>
  </div>
);

const useCountdown = (targetDate: string, enabled: boolean) => {
  const [timeLeft, setTimeLeft] = useState("");
  useEffect(() => {
    if (!enabled) return;
    const calc = () => {
      const diff = new Date(targetDate).getTime() - Date.now();
      if (diff <= 0) { setTimeLeft(""); return; }
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      if (d > 0) setTimeLeft(`${d}d ${h}h ${m}m`);
      else if (h > 0) setTimeLeft(`${h}h ${m}m ${s}s`);
      else setTimeLeft(`${m}m ${s}s`);
    };
    calc();
    const id = setInterval(calc, 1000);
    return () => clearInterval(id);
  }, [targetDate, enabled]);
  return timeLeft;
};

const CountdownBanner = ({ timeLeft }: { timeLeft: string }) => (
  <div className="flex items-center justify-center gap-1.5 py-1.5" style={{ background: "rgba(197,150,90,0.15)" }}>
    <Clock size={11} style={{ color: "var(--gold)" }} />
    <span className="font-mono text-[10px] font-bold tracking-wide" style={{ color: "var(--gold)" }}>
      DEPARTS IN {timeLeft}
    </span>
  </div>
);

const TransportCard = ({ seg, onTap }: { seg: TransportSegment; onTap?: () => void }) => {
  const cfg = typeConfig[seg.type];
  const stripColor = statusColors[seg.status];
  const showCountdown = seg.status === "upcoming" || seg.status === "active";
  const countdown = useCountdown(seg.departureDateTime, showCountdown);

  const openLink = (url: string, name: string) => {
    window.open(url, "_blank");
    toast.info(`Opening ${name}...`);
  };

  return (
    <div
      className="mx-4 mb-3.5 overflow-hidden relative card-press"
      style={{ borderRadius: 20, boxShadow: "0 8px 32px rgba(0,0,0,0.15)", cursor: "pointer" }}
      onClick={onTap}
    >
      {/* Left status strip */}
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${seg.status === "active" ? "shimmer-strip" : ""}`} style={{ background: stripColor }} />

      <div style={{ background: cfg.gradient, marginLeft: 4 }}>
        {/* Top bar */}
        <div className="flex items-center justify-between px-5" style={{ height: 36, background: "rgba(0,0,0,0.2)" }}>
          <span className="font-mono text-[9px] tracking-widest" style={{ color: "rgba(255,255,255,0.7)" }}>
            {cfg.icon} {cfg.label}
          </span>
          <div className="flex items-center gap-2">
            {seg.airline && <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.6)", fontFamily: "'DM Sans'" }}>{seg.airline}</span>}
            {seg.trainOperator && <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.6)" }}>{seg.trainOperator}</span>}
            {seg.busOperator && <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.6)" }}>{seg.busOperator}</span>}
            {seg.taxiProvider && <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.6)" }}>{seg.taxiProvider}</span>}
            {seg.rentalCompany && <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.6)" }}>{seg.rentalCompany}</span>}
            <StatusBadge status={seg.status} />
          </div>
        </div>

        {/* Medical banner */}
        {seg.type === "medical" && seg.hospital && (
          <div className="px-5 py-1.5" style={{ background: "rgba(197,150,90,0.1)" }}>
            <p className="text-[10px]" style={{ color: "var(--gold)" }}>⚕️ Medical transport — coordinated with {seg.hospital}</p>
            <p className="font-arabic text-[9px]" dir="rtl" style={{ color: "var(--gold)" }}>نقل طبي — منسق مع {seg.hospital}</p>
          </div>
        )}

        {/* Medical assistance banner for flights */}
        {seg.type === "flight" && seg.medicalAssistance && (
          <div className="px-5 py-1.5" style={{ background: "rgba(197,150,90,0.1)" }}>
            <p className="text-[10px]" style={{ color: "var(--gold)" }}>⚕️ {seg.medicalAssistance}</p>
            <p className="font-arabic text-[9px]" dir="rtl" style={{ color: "var(--gold)" }}>طُلبت مساعدة طبية — كرسي متحرك عند البوابة</p>
          </div>
        )}

        {/* Rental car info */}
        {seg.type === "rental" && seg.carModel && (
          <div className="px-5 pt-4">
            <p className="font-display text-xl text-white">{seg.carModel}</p>
            {seg.carClass && <p className="text-[11px]" style={{ color: "rgba(255,255,255,0.5)" }}>{seg.carClass}</p>}
          </div>
        )}

        {/* Route */}
        <RouteDisplay seg={seg} icon={cfg.icon} />

        {/* Date row */}
        <DateRow seg={seg} />

        {/* Perforated line for flights/trains */}
        {(seg.type === "flight" || seg.type === "train") && <PerforatedLine />}

        {/* Details strip */}
        {seg.type === "flight" && (
          <DetailsStrip items={[
            { label: "FLIGHT", value: seg.flightNumber || "—" },
            { label: "PNR", value: seg.bookingRef || "—", gold: true },
            { label: "CLASS", value: seg.seatClass || "—" },
            { label: "SEAT", value: seg.seatNumber || "—" },
          ]} />
        )}
        {seg.type === "train" && (
          <DetailsStrip items={[
            { label: "TRAIN", value: seg.trainNumber || "—" },
            { label: "PNR", value: seg.bookingRef || "—", gold: true },
            { label: "CLASS", value: seg.seatClass || "—" },
            { label: "CAR+SEAT", value: `${seg.carNumber || ""}${seg.seatNumber || "—"}` },
          ]} />
        )}
        {seg.type === "bus" && (
          <DetailsStrip items={[
            { label: "BUS", value: seg.busNumber || "—" },
            { label: "BOOKING", value: seg.bookingRef || "—", gold: true },
            { label: "DEPARTS", value: fmtDate(seg.departureDateTime).split(" · ")[1] || "—" },
            { label: "ARRIVES", value: fmtDate(seg.arrivalDateTime).split(" · ")[1] || "—" },
          ]} />
        )}
        {seg.type === "taxi" && (
          <DetailsStrip items={[
            { label: "TYPE", value: seg.taxiProvider || "Private" },
            { label: "REF", value: seg.bookingRef || "—", gold: true },
            { label: "DIST", value: seg.distance || "—" },
            { label: "FARE", value: seg.fare || "—" },
          ]} />
        )}
        {seg.type === "rental" && (
          <DetailsStrip items={[
            { label: "BOOKING", value: seg.bookingRef || "—", gold: true },
            { label: "CLASS", value: seg.carClass || "—" },
            { label: "DAYS", value: String(seg.rentalDays || "—") },
            { label: "INSURED", value: seg.insured ? "✓" : "✗" },
          ]} />
        )}
        {seg.type === "medical" && (
          <DetailsStrip items={[
            { label: "MOBILITY", value: seg.mobilityType || "—" },
            { label: "ARRANGED BY", value: seg.arrangedBy || "—" },
            { label: "COST", value: seg.costInfo || "—" },
          ]} />
        )}

        {/* Countdown banner */}
        {showCountdown && countdown && <CountdownBanner timeLeft={countdown} />}

        {/* Action row */}
        <ActionRow>
          <p className="font-mono text-[9px]" style={{ color: "rgba(255,255,255,0.45)" }}>
            {seg.bookingRef ? `Ref: ${seg.bookingRef}` : ""}
          </p>
          <div className="flex gap-2">
            <span className="text-[10px] px-2 py-1 rounded-full" style={{ background: "rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.7)" }}>
              Tap for details →
            </span>
          </div>
        </ActionRow>
      </div>
    </div>
  );
};

export default TransportCard;
