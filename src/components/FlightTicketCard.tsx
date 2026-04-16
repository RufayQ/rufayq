import { useState } from "react";
import { ExternalLink, X } from "lucide-react";
import { toast } from "sonner";
import type { FlightInfo } from "./AddTripSheet";

const airlineLinks: Record<string, any> = {
  "Saudia": { webFallback: "https://www.saudia.com/en-gb/manage-booking/retrieve-booking", displayNameAR: "الخطوط السعودية" },
  "flynas": { webFallback: "https://www.flynas.com/en/manage-booking", displayNameAR: "فلاي ناس" },
  "flyadeal": { webFallback: "https://www.flyadeal.com/en/manage-booking", displayNameAR: "فلاي ديل" },
  "Emirates": { webFallback: "https://www.emirates.com/english/manage-booking/retrieve-booking/", displayNameAR: "طيران الإمارات" },
  "Qatar Airways": { webFallback: "https://www.qatarairways.com/en/manage/booking-summary.html", displayNameAR: "القطرية" },
  "Lufthansa": { webFallback: "https://www.lufthansa.com/us/en/manage-booking", displayNameAR: "لوفتهانزا" },
  "British Airways": { webFallback: "https://www.britishairways.com/travel/managebooking/public/en_gb", displayNameAR: "الخطوط البريطانية" },
  "Turkish Airlines": { webFallback: "https://www.turkishairlines.com/en-int/flights/manage-your-booking/", displayNameAR: "الخطوط التركية" },
  "Air France": { webFallback: "https://www.airfrance.com/en/manage-my-bookings", displayNameAR: "إير فرانس" },
};

const airlineButtonLabels: Record<string, { en: string; ar: string }> = {
  "Saudia": { en: "Open in Saudia", ar: "فتح في السعودية" },
  "flynas": { en: "Open in flynas", ar: "فتح في فلاي ناس" },
  "flyadeal": { en: "Open in flyadeal", ar: "فتح في فلاي ديل" },
  "Emirates": { en: "Open in Emirates", ar: "فتح في الإمارات" },
  "Qatar Airways": { en: "Open in Qatar Airways", ar: "فتح في القطرية" },
  "Lufthansa": { en: "Open in Lufthansa", ar: "فتح في لوفتهانزا" },
  "British Airways": { en: "Open in British Airways", ar: "فتح في البريطانية" },
  "Turkish Airlines": { en: "Open in Turkish Airlines", ar: "فتح في التركية" },
};

function formatFlightDate(dt: string) {
  if (!dt) return "";
  const d = new Date(dt);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) + " · " + d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
}

interface ConfirmSheetProps {
  flight: FlightInfo;
  onConfirm: () => void;
  onClose: () => void;
  showWarning?: boolean;
}

const AirlineConfirmSheet = ({ flight, onConfirm, onClose, showWarning }: ConfirmSheetProps) => {
  const label = airlineButtonLabels[flight.airline] || { en: "Manage Booking", ar: "إدارة الحجز" };
  const arName = airlineLinks[flight.airline]?.displayNameAR || flight.airline;

  return (
    <div className="absolute inset-0 z-[60] flex flex-col justify-end" onClick={onClose}>
      <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.5)" }} />
      <div className="relative animate-slide-up rounded-t-3xl" style={{ background: "var(--white)", maxHeight: "60%" }} onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-center pt-3"><div style={{ width: 36, height: 4, background: "#DEE4E9", borderRadius: 2 }} /></div>
        <div className="px-5 pt-4">
          <p className="font-display text-xl" style={{ color: "var(--navy)" }}>Open {flight.airline}?</p>
          <p className="font-arabic text-sm" dir="rtl" style={{ color: "var(--gray)" }}>فتح {arName}؟</p>

          <div className="mt-3 rounded-xl p-3.5 space-y-2" style={{ background: "var(--off-white)" }}>
            <div className="flex justify-between text-[12px]"><span style={{ color: "var(--gray)" }}>✈️ Flight</span><span style={{ color: "var(--navy)", fontWeight: 600 }}>{flight.flightNumber}</span></div>
            <div className="flex justify-between text-[12px]"><span style={{ color: "var(--gray)" }}>📋 Booking Ref</span><span className="font-mono" style={{ color: "var(--gold)", fontWeight: 700, fontSize: 14 }}>{flight.bookingRef}</span></div>
            <div className="flex justify-between text-[12px]"><span style={{ color: "var(--gray)" }}>📅 Date</span><span style={{ color: "var(--navy)" }}>{formatFlightDate(flight.departureDateTime)}</span></div>
          </div>

          {showWarning && (
            <div className="mt-3 rounded-lg p-3" style={{ background: "var(--gold-pale)", border: "1px solid var(--gold)" }}>
              <p className="text-[11px]" style={{ color: "var(--gold)" }}>⚠️ Flight changes may affect your medical appointment schedule.</p>
              <p className="font-arabic text-[10px] mt-1" dir="rtl" style={{ color: "var(--gold)" }}>تغيير الرحلة قد يؤثر على مواعيد علاجك.</p>
            </div>
          )}

          <div className="mt-3 rounded-lg p-3" style={{ background: "var(--teal-light)" }}>
            <p className="text-[11px]" style={{ color: "var(--teal-deep)" }}>RufayQ will redirect you to {flight.airline} to view or modify your booking.</p>
            <p className="font-arabic text-[10px] mt-1" dir="rtl" style={{ color: "var(--gray)" }}>سيحيلك رُفَيِّق إلى تطبيق {arName} لعرض حجزك أو تعديله.</p>
          </div>

          {/* Disclaimer */}
          <div className="mt-3 rounded-lg p-2.5" style={{ background: "rgba(217,79,79,0.05)", border: "1px solid rgba(217,79,79,0.2)" }}>
            <p className="text-[9px] leading-relaxed" style={{ color: "var(--error)" }}>
              ⚠️ <strong>Disclaimer:</strong> RufayQ does NOT read from or connect to any official airline system. All flight information shown is manually entered by the user. Verify all details with your airline directly. RufayQ is not responsible for any discrepancies.
            </p>
            <p className="font-arabic text-[8px] mt-1 leading-relaxed" dir="rtl" style={{ color: "var(--error)" }}>
              تنويه: رُفَيِّق لا يقرأ من أنظمة شركات الطيران الرسمية. جميع المعلومات المعروضة مدخلة يدوياً. تحقق من التفاصيل مع شركة الطيران مباشرة. رُفَيِّق غير مسؤول عن أي تناقضات.
            </p>
          </div>

          <p className="text-[9px] mt-2" style={{ color: "var(--gray)" }}>RufayQ is not affiliated with this airline. · <span className="font-arabic" dir="rtl">رُفَيِّق غير مرتبط بهذه الشركة.</span></p>

          <button onClick={onConfirm} className="w-full mt-4 btn-press" style={{ height: 48, borderRadius: 12, background: "var(--teal-deep)", color: "white", fontFamily: "'DM Sans'", fontSize: 14, fontWeight: 600 }}>
            {label.en} · <span className="font-arabic">{label.ar}</span>
          </button>
          <button onClick={onClose} className="w-full mt-2 mb-6 btn-press" style={{ height: 44, borderRadius: 12, border: "1px solid var(--teal-deep)", color: "var(--teal-deep)", background: "transparent", fontFamily: "'DM Sans'", fontSize: 13 }}>
            Cancel · <span className="font-arabic">إلغاء</span>
          </button>
        </div>
      </div>
    </div>
  );
};

const openAirline = (airline: string, bookingRef: string) => {
  const config = airlineLinks[airline] || { webFallback: `https://www.google.com/search?q=${encodeURIComponent(airline + " manage booking " + bookingRef)}` };
  const url = config.webFallback + (config.webFallback.includes("?") ? "&pnr=" : "?pnr=") + bookingRef;
  window.open(url, "_blank");
  toast.info(`Opening ${airline} website... / جارٍ فتح موقع ${airlineLinks[airline]?.displayNameAR || airline}...`);
};

interface FlightCardProps {
  flight: FlightInfo;
  type: "outbound" | "return";
}

const FlightTicketCard = ({ flight, type }: FlightCardProps) => {
  const [showConfirm, setShowConfirm] = useState(false);
  const label = airlineButtonLabels[flight.airline] || { en: "Manage Booking", ar: "إدارة الحجز" };

  return (
    <>
      <div className="mx-4 mb-3 overflow-hidden" style={{ borderRadius: 20, background: type === "outbound" ? "linear-gradient(135deg, #004D5B 0%, #006D7C 100%)" : "linear-gradient(135deg, #006D7C 0%, #004D5B 100%)", boxShadow: "0 8px 32px rgba(0,77,91,0.25)" }}>
        {/* Top */}
        <div className="px-5 pt-4">
          <div className="flex items-center justify-between mb-3">
            <span className="font-mono text-[9px] tracking-widest" style={{ color: "#E0F4F5", opacity: 0.7 }}>✈️ {type === "outbound" ? "OUTBOUND FLIGHT" : "RETURN FLIGHT"}</span>
            <span className="text-[11px]" style={{ color: "rgba(255,255,255,0.6)", fontFamily: "'DM Sans'" }}>{flight.airline}</span>
          </div>

          {/* Route */}
          <div className="flex items-center">
            <div className="flex-1">
              <p className="font-display text-[42px] leading-none text-white font-bold">{flight.fromAirport}</p>
              <p className="text-[11px] mt-0.5" style={{ color: "rgba(255,255,255,0.55)" }}>{flight.fromCity}</p>
              <p className="text-[9px]" style={{ color: "rgba(255,255,255,0.4)" }}>{flight.fromAirportFull}</p>
            </div>
            <div className="flex-1 flex flex-col items-center">
              <div className="w-full flex items-center px-2">
                <div className="flex-1 border-t border-dashed" style={{ borderColor: "rgba(255,255,255,0.3)" }} />
                <span className="mx-1">✈️</span>
                <div className="flex-1 border-t border-dashed" style={{ borderColor: "rgba(255,255,255,0.3)" }} />
              </div>
              <p className="font-mono text-[11px] mt-1" style={{ color: "var(--gold)" }}>{flight.flightNumber}</p>
            </div>
            <div className="flex-1 text-right">
              <p className="font-display text-[42px] leading-none text-white font-bold">{flight.toAirport}</p>
              <p className="text-[11px] mt-0.5" style={{ color: "rgba(255,255,255,0.55)" }}>{flight.toCity}</p>
              <p className="text-[9px]" style={{ color: "rgba(255,255,255,0.4)" }}>{flight.toAirportFull}</p>
            </div>
          </div>

          {/* Dates */}
          <div className="flex items-center justify-between py-3">
            <div>
              <p className="font-mono text-[8px] tracking-widest" style={{ color: "rgba(255,255,255,0.45)" }}>DEPARTURE</p>
              <p className="text-[13px] font-bold text-white" style={{ fontFamily: "'DM Sans'" }}>{formatFlightDate(flight.departureDateTime)}</p>
            </div>
            <div style={{ width: 1, height: 24, background: "rgba(255,255,255,0.15)" }} />
            <div className="text-right">
              <p className="font-mono text-[8px] tracking-widest" style={{ color: "rgba(255,255,255,0.45)" }}>ARRIVAL</p>
              <p className="text-[13px] font-bold text-white" style={{ fontFamily: "'DM Sans'" }}>{formatFlightDate(flight.arrivalDateTime)}</p>
            </div>
          </div>
        </div>

        {/* Perforated separator */}
        <div className="flex items-center" style={{ height: 24 }}>
          <div className="w-3 h-6 rounded-r-full" style={{ background: "var(--off-white)" }} />
          <div className="flex-1 border-t-2 border-dashed" style={{ borderColor: "rgba(255,255,255,0.2)" }} />
          <div className="w-3 h-6 rounded-l-full" style={{ background: "var(--off-white)" }} />
        </div>

        {/* Bottom section */}
        <div className="px-5 pb-4" style={{ background: "rgba(0,0,0,0.15)" }}>
          <div className="grid grid-cols-4 gap-2 py-2">
            {[{ label: "FLIGHT", value: flight.flightNumber }, { label: "PNR", value: flight.bookingRef }, { label: "CLASS", value: flight.seatClass }, { label: "SEAT", value: flight.seatNumber || "—" }].map((item) => (
              <div key={item.label}>
                <p className="font-mono text-[8px] tracking-wider" style={{ color: "rgba(255,255,255,0.45)" }}>{item.label}</p>
                <p className="text-[12px] font-bold text-white" style={{ fontFamily: "'DM Sans'" }}>{item.value}</p>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between pt-2.5" style={{ borderTop: "1px dashed rgba(255,255,255,0.15)" }}>
            <p className="font-mono text-[9px]" style={{ color: "rgba(255,255,255,0.5)" }}>Ref: {flight.bookingRef}</p>
            <button onClick={() => setShowConfirm(true)} className="flex items-center gap-1.5 px-3.5 btn-press" style={{
              height: 30, borderRadius: 20, background: "var(--gold)",
            }}>
              <span className="text-[11px] font-bold text-white" style={{ fontFamily: "'DM Sans'" }}>{label.en}</span>
              <ExternalLink size={12} color="white" />
            </button>
          </div>
        </div>
      </div>

      {showConfirm && (
        <AirlineConfirmSheet
          flight={flight}
          onConfirm={() => { openAirline(flight.airline, flight.bookingRef); setShowConfirm(false); }}
          onClose={() => setShowConfirm(false)}
        />
      )}
    </>
  );
};

export const MissingFlightCard = ({ onAdd }: { onAdd: () => void }) => (
  <div className="mx-4 mb-3 py-6 flex flex-col items-center rounded-2xl" style={{ border: "1.5px dashed var(--teal-deep)", background: "rgba(0,77,91,0.04)" }}>
    <span className="text-[32px] mb-2" style={{ color: "var(--gray)" }}>✈️</span>
    <p className="text-[13px]" style={{ color: "var(--gray)", fontFamily: "'DM Sans'" }}>No flight details added</p>
    <p className="font-arabic text-[11px]" dir="rtl" style={{ color: "var(--gray)" }}>لم تُضف تفاصيل الرحلة</p>
    <button onClick={onAdd} className="mt-3 text-[13px] font-medium btn-press" style={{ color: "var(--teal-deep)", fontFamily: "'DM Sans'" }}>
      ＋ Add Flight Details · <span className="font-arabic">إضافة تفاصيل الطيران</span>
    </button>
  </div>
);

export const InlineFlightRow = ({ flight, onModify }: { flight: FlightInfo; onModify: () => void }) => {
  const [showConfirm, setShowConfirm] = useState(false);
  return (
    <>
      <div className="relative mb-2.5 ml-7">
        <div className="flex items-center justify-between rounded-xl px-3 py-2" style={{ background: "var(--teal-light)", border: "1px solid rgba(0,77,91,0.15)" }}>
          <div className="flex items-center gap-2">
            <span style={{ color: "var(--teal-deep)" }}>✈️</span>
            <div>
              <p className="text-[12px]" style={{ color: "var(--navy)", fontFamily: "'DM Sans'" }}>Flight: {flight.flightNumber} · {formatFlightDate(flight.departureDateTime)}</p>
              <p className="font-arabic text-[10px]" dir="rtl" style={{ color: "var(--gray)" }}>رحلة الطيران {flight.flightNumber}</p>
            </div>
          </div>
          <button onClick={() => setShowConfirm(true)} className="font-mono text-[9px] px-2 py-1 rounded-full btn-press" style={{ border: "1px solid var(--gold)", color: "var(--gold)" }}>
            Modify →
          </button>
        </div>
      </div>
      {showConfirm && (
        <AirlineConfirmSheet
          flight={flight}
          showWarning
          onConfirm={() => { openAirline(flight.airline, flight.bookingRef); setShowConfirm(false); }}
          onClose={() => setShowConfirm(false)}
        />
      )}
    </>
  );
};

export default FlightTicketCard;
