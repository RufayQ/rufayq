import { useState } from "react";
import { journeySteps } from "@/constants/data";
import { ChevronDown, ChevronUp } from "lucide-react";
import AddTripSheet, { type TripData } from "@/components/AddTripSheet";
import FlightTicketCard, { MissingFlightCard, InlineFlightRow } from "@/components/FlightTicketCard";

const phases = [
  { key: "before", label: "Before Travel", labelAr: "قبل السفر", color: "var(--teal-deep)" },
  { key: "during", label: "During Treatment", labelAr: "أثناء العلاج", color: "var(--gold)" },
  { key: "after", label: "After Return", labelAr: "بعد العودة", color: "var(--teal-bright)" },
];

const defaultTrip: TripData = {
  id: "trip-001", destination: "Berlin, Germany", hospital: "Charité Hospital",
  specialty: "Orthopedics", specialtyEmoji: "🦴", departureDate: "2026-04-05",
  returnDate: "2026-04-20", treatingDoctor: "Dr. Mueller", companion: true,
  companionName: "Sara Al-Rashidi", insuranceRef: "BUPA-2026-7823", status: "active",
  outboundFlight: {
    airline: "Saudia", flightNumber: "SV 301", bookingRef: "AB1234",
    fromAirport: "RUH", fromCity: "Riyadh", fromAirportFull: "King Khalid Intl",
    toAirport: "BER", toCity: "Berlin", toAirportFull: "Brandenburg Intl",
    departureDateTime: "2026-04-05T08:30", arrivalDateTime: "2026-04-05T14:00",
    seatClass: "Business", seatNumber: "24A",
  },
  returnFlight: {
    airline: "Saudia", flightNumber: "SV 302", bookingRef: "AB1234",
    fromAirport: "BER", fromCity: "Berlin", fromAirportFull: "Brandenburg Intl",
    toAirport: "RUH", toCity: "Riyadh", toAirportFull: "King Khalid Intl",
    departureDateTime: "2026-04-15T15:00", arrivalDateTime: "2026-04-15T23:30",
    seatClass: "Business", seatNumber: "24A",
  },
};

const JourneyScreen = () => {
  const [expanded, setExpanded] = useState<number | null>(null);
  const [trips, setTrips] = useState<TripData[]>([defaultTrip]);
  const [showAddTrip, setShowAddTrip] = useState(false);
  const [activeFlightCard, setActiveFlightCard] = useState(0); // 0 = outbound, 1 = return

  const activeTrip = trips.find((t) => t.status === "active") || trips[0];
  const doneCount = journeySteps.filter((s) => s.status === "done").length;
  const progress = (doneCount / journeySteps.length) * 100;

  const handleAddTrip = (trip: TripData) => {
    setTrips([...trips, trip]);
  };

  const hasOutbound = !!activeTrip?.outboundFlight;
  const hasReturn = !!activeTrip?.returnFlight;

  return (
    <div className="flex flex-col h-full relative">
      {/* Header */}
      <div className="relative px-5 pt-3 pb-4 overflow-hidden" style={{ background: "var(--navy)" }}>
        <div className="absolute -top-6 -right-6 w-28 h-28 rounded-full" style={{ border: "1px solid rgba(197,150,90,0.12)" }} />
        <p className="font-mono text-[10px] tracking-widest mb-1" style={{ color: "rgba(255,255,255,0.4)" }}>02 — JOURNEY MAP</p>
        <p className="font-display text-xl text-white" style={{ fontWeight: 300 }}>Treatment Journey</p>
        <p className="font-arabic text-sm" dir="rtl" style={{ color: "rgba(255,255,255,0.45)" }}>خريطة رحلتك العلاجية</p>

        <div className="mt-3 rounded-lg px-3.5 py-2.5" style={{ background: "rgba(255,255,255,0.08)" }}>
          <div className="flex items-center gap-3">
            <div className="flex-1 h-2 rounded-full" style={{ background: "rgba(255,255,255,0.15)" }}>
              <div className="h-2 rounded-full animate-progress" style={{ width: `${progress}%`, background: "linear-gradient(90deg, var(--teal-bright), var(--gold))" }} />
            </div>
            <span className="text-[13px] font-semibold text-white">{doneCount} / {journeySteps.length}</span>
          </div>
          <p className="font-mono text-[10px] mt-1" style={{ color: "var(--gold)" }}>Step 7 of 10 — In Progress</p>
        </div>
      </div>

      {/* Flight Ticket Cards */}
      <div className="pt-3" style={{ background: "var(--off-white)" }}>
        {hasOutbound || hasReturn ? (
          <>
            {activeFlightCard === 0 && hasOutbound && <FlightTicketCard flight={activeTrip.outboundFlight!} type="outbound" />}
            {activeFlightCard === 1 && hasReturn && <FlightTicketCard flight={activeTrip.returnFlight!} type="return" />}
            {hasOutbound && hasReturn && (
              <div className="flex justify-center gap-2 pb-2">
                <button onClick={() => setActiveFlightCard(0)} className="w-2 h-2 rounded-full" style={{ background: activeFlightCard === 0 ? "var(--teal-deep)" : "var(--gray-light)" }} />
                <button onClick={() => setActiveFlightCard(1)} className="w-2 h-2 rounded-full" style={{ background: activeFlightCard === 1 ? "var(--teal-deep)" : "var(--gray-light)" }} />
              </div>
            )}
          </>
        ) : (
          <MissingFlightCard onAdd={() => setShowAddTrip(true)} />
        )}
      </div>

      {/* Phase Badges */}
      <div className="flex gap-2 px-4 py-3" style={{ background: "var(--off-white)" }}>
        {phases.map((p) => (
          <div key={p.key} className="flex-1 rounded-xl py-2.5 text-center" style={{ background: "var(--white)", border: "1px solid var(--gray-light)" }}>
            <div className="w-2 h-2 rounded-full mx-auto mb-1" style={{ background: p.color }} />
            <p className="text-[9px] font-semibold" style={{ color: "var(--navy)" }}>{p.label}</p>
            <p className="font-arabic text-[9px]" dir="rtl" style={{ color: "var(--gray)" }}>{p.labelAr}</p>
          </div>
        ))}
      </div>

      {/* Timeline */}
      <div className="flex-1 overflow-y-auto px-4 pb-4" style={{ background: "var(--off-white)" }}>
        {phases.map((phase) => {
          const phaseSteps = journeySteps.filter((s) => s.phase === phase.key);
          return (
            <div key={phase.key}>
              {/* Phase divider */}
              <div className="flex items-center gap-2 my-3">
                <div className="flex-1 h-px" style={{ background: "var(--gray-light)" }} />
                <span className="font-mono text-[9px] font-bold tracking-widest" style={{ color: phase.color }}>{phase.label.toUpperCase()}</span>
                <div className="flex-1 h-px" style={{ background: "var(--gray-light)" }} />
              </div>

              <div className="relative pl-7">
                {phaseSteps.map((step, idx) => {
                  const isExpanded = expanded === step.id;
                  const dotColor = step.status === "done" ? "var(--success)" : step.status === "active" ? "var(--gold)" : "var(--gray-light)";
                  const isActive = step.status === "active";
                  const isPending = step.status === "pending";
                  const nextStep = phaseSteps[idx + 1];

                  // Determine connecting line color
                  let lineColor = "var(--gray-light)";
                  if (step.status === "done" && nextStep?.status === "done") {
                    lineColor = "rgba(61,170,110,0.35)";
                  }

                  // Show inline flight row after step 3 (before phase)
                  const showFlightInline = phase.key === "before" && step.id === 3 && activeTrip?.outboundFlight;

                  return (
                    <div key={step.id}>
                      <div className="relative mb-2.5">
                        {/* Connecting line */}
                        {idx < phaseSteps.length - 1 && (
                          <div className="absolute left-[-17px] top-6 bottom-0" style={{ width: 2, background: lineColor }} />
                        )}
                        {/* Dot */}
                        <div
                          className={`absolute -left-[21px] top-3 w-2.5 h-2.5 rounded-full ${isActive ? "pulse-gold" : ""}`}
                          style={{ background: dotColor }}
                        />
                        <button
                          onClick={() => setExpanded(isExpanded ? null : step.id)}
                          className="w-full text-left rounded-xl px-3.5 py-3 transition-all card-press"
                          style={{
                            background: isActive ? "var(--gold-pale)" : isPending ? "#F3F5F7" : "var(--white)",
                            border: isActive ? "1px solid var(--gold)" : "1px solid var(--gray-light)",
                            boxShadow: isActive ? "0 3px 14px rgba(197,150,90,0.16)" : "none",
                          }}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-[13px] font-semibold" style={{ color: isPending ? "var(--gray)" : "var(--navy)" }}>{step.titleEn}</p>
                              <p className="font-arabic text-[10px] mt-0.5" dir="rtl" style={{ color: "var(--gray)" }}>{step.titleAr}</p>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono text-[9px]" style={{ color: "var(--gray)" }}>{step.date}</span>
                              {isExpanded ? <ChevronUp size={12} color="var(--gray)" /> : <ChevronDown size={12} color="var(--gray)" />}
                            </div>
                          </div>
                          {isActive && step.actionLabel && (
                            <div className="mt-2 rounded-lg px-3 py-2.5" style={{ background: "var(--gold-pale)", borderLeft: "3px solid var(--gold)" }}>
                              <p className="text-[10px] font-semibold" style={{ color: "var(--gold)" }}>{step.actionLabel}</p>
                              <p className="font-arabic text-[10px] mt-0.5" dir="rtl" style={{ color: "var(--gray)" }}>حزمة الخروج جاهزة — اضغط لعرضها</p>
                            </div>
                          )}
                          {isExpanded && step.details && (
                            <div className="mt-2 pt-2" style={{ borderTop: "1px solid var(--gray-light)" }}>
                              <p className="text-xs leading-relaxed" style={{ color: "var(--gray)" }}>{step.details}</p>
                              {step.detailsAr && <p className="font-arabic text-[11px] mt-1 leading-relaxed" dir="rtl" style={{ color: "var(--gray)" }}>{step.detailsAr}</p>}
                            </div>
                          )}
                        </button>
                      </div>
                      {/* Inline flight row */}
                      {showFlightInline && <InlineFlightRow flight={activeTrip.outboundFlight!} onModify={() => {}} />}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        <button
          onClick={() => setShowAddTrip(true)}
          className="w-full mt-3 py-4 rounded-xl flex items-center justify-between px-5 btn-press"
          style={{ border: "1.5px dashed var(--teal-mid)", background: "var(--white)" }}
        >
          <span className="text-sm font-bold" style={{ color: "var(--teal-deep)", fontFamily: "'DM Sans'" }}>＋ Add New Trip</span>
          <span className="font-arabic text-[13px]" dir="rtl" style={{ color: "var(--gray)" }}>إضافة رحلة جديدة</span>
        </button>
      </div>

      {/* Add Trip Sheet */}
      <AddTripSheet open={showAddTrip} onClose={() => setShowAddTrip(false)} onSubmit={handleAddTrip} />
    </div>
  );
};

export default JourneyScreen;
