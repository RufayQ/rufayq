import { useState } from "react";
import { journeySteps, defaultTransportSegments } from "@/constants/data";
import { ChevronDown, ChevronUp } from "lucide-react";
import AddTripSheet, { type TripData } from "@/components/AddTripSheet";
import { InlineFlightRow } from "@/components/FlightTicketCard";
import TransportCard, { LayoverIndicator, type TransportSegment } from "@/components/TransportCard";

const phases = [
  { key: "before", label: "Before Travel", labelAr: "قبل السفر", color: "var(--teal-deep)" },
  { key: "during", label: "During Treatment", labelAr: "أثناء العلاج", color: "var(--gold)" },
  { key: "after", label: "After Return", labelAr: "بعد العودة", color: "var(--teal-bright)" },
];

const subTabs = [
  { key: "tickets", icon: "✈️", label: "Tickets" },
  { key: "stay", icon: "🏨", label: "Stay" },
  { key: "steps", icon: "🗺️", label: "Steps" },
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
  const [activeSubTab, setActiveSubTab] = useState("tickets");
  const [transportSegments] = useState<TransportSegment[]>(defaultTransportSegments);

  const activeTrip = trips.find((t) => t.status === "active") || trips[0];
  const doneCount = journeySteps.filter((s) => s.status === "done").length;
  const progress = (doneCount / journeySteps.length) * 100;

  const handleAddTrip = (trip: TripData) => {
    setTrips([...trips, trip]);
  };

  return (
    <div className="flex flex-col" style={{ height: 0, flex: 1, overflow: "hidden" }}>
      {/* Header */}
      <div className="relative px-5 pt-3 pb-4 overflow-hidden shrink-0" style={{ background: "var(--navy)" }}>
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

      {/* Sub-tab pills */}
      <div className="flex gap-2.5 px-4 py-3 shrink-0" style={{ background: "var(--off-white)" }}>
        {subTabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveSubTab(tab.key)}
            className="flex-1 flex items-center justify-center gap-1.5 rounded-full transition-all"
            style={{
              height: 36,
              background: activeSubTab === tab.key ? "var(--teal-deep)" : "var(--white)",
              color: activeSubTab === tab.key ? "white" : "var(--gray)",
              border: activeSubTab === tab.key ? "none" : "1px solid var(--gray-light)",
              boxShadow: activeSubTab === tab.key ? "0 4px 12px rgba(0,77,91,0.25)" : "none",
              fontFamily: "'DM Sans'",
              fontSize: 13,
              fontWeight: 700,
            }}
          >
            <span>{tab.icon}</span> {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content — scrollable */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden pb-6" style={{ background: "var(--off-white)", WebkitOverflowScrolling: "touch" }}>
        {activeSubTab === "tickets" && <TicketsTab segments={transportSegments} />}
        {activeSubTab === "stay" && <StayTab />}
        {activeSubTab === "steps" && (
          <StepsTab
            expanded={expanded}
            setExpanded={setExpanded}
            activeTrip={activeTrip}
            onAddTrip={() => setShowAddTrip(true)}
          />
        )}
      </div>

      <AddTripSheet open={showAddTrip} onClose={() => setShowAddTrip(false)} onSubmit={handleAddTrip} />
    </div>
  );
};

/* ─── TICKETS TAB ─── */
const TicketsTab = ({ segments }: { segments: TransportSegment[] }) => (
  <div className="pt-2">
    <div className="px-4 mb-3">
      <p className="font-mono text-[9px] tracking-widest" style={{ color: "var(--teal-deep)" }}>YOUR FULL TRANSPORT TIMELINE</p>
      <p className="font-arabic text-[10px]" dir="rtl" style={{ color: "var(--gray)" }}>جميع وسائل تنقلك في هذه الرحلة</p>
    </div>
    {segments.map((seg, i) => (
      <div key={seg.id}>
        <TransportCard seg={seg} />
        {seg.layoverAfter && (
          <LayoverIndicator duration={seg.layoverAfter.duration} airport={seg.layoverAfter.airport} code={seg.layoverAfter.code} />
        )}
      </div>
    ))}
  </div>
);

/* ─── STAY TAB ─── */
const StayTab = () => (
  <div className="px-4 pt-4 space-y-3">
    {/* Hotel card */}
    <div className="rounded-2xl overflow-hidden" style={{ boxShadow: "0 4px 20px rgba(0,0,0,0.08)" }}>
      <div className="p-4" style={{ background: "linear-gradient(135deg, #1A3A4A, #0D2535)" }}>
        <div className="flex items-center justify-between mb-2">
          <span className="font-mono text-[9px] tracking-widest" style={{ color: "rgba(255,255,255,0.7)" }}>🏨 ACCOMMODATION</span>
          <span className="font-mono text-[8px] px-2 py-0.5 rounded-full" style={{ background: "var(--success)", color: "white" }}>CONFIRMED</span>
        </div>
        <p className="font-display text-lg text-white font-semibold">Hotel Adlon Kempinski</p>
        <p className="text-[11px]" style={{ color: "rgba(255,255,255,0.55)" }}>Unter den Linden 77, Berlin</p>
        <p className="font-arabic text-[11px] mt-1" dir="rtl" style={{ color: "rgba(255,255,255,0.45)" }}>فندق أدلون كمبينسكي — برلين</p>
      </div>
      <div className="p-4" style={{ background: "var(--white)" }}>
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <p className="font-mono text-[8px] tracking-wider" style={{ color: "var(--gray)" }}>CHECK-IN</p>
            <p className="text-[13px] font-bold" style={{ color: "var(--navy)" }}>Apr 5</p>
          </div>
          <div>
            <p className="font-mono text-[8px] tracking-wider" style={{ color: "var(--gray)" }}>CHECK-OUT</p>
            <p className="text-[13px] font-bold" style={{ color: "var(--navy)" }}>Apr 15</p>
          </div>
          <div>
            <p className="font-mono text-[8px] tracking-wider" style={{ color: "var(--gray)" }}>NIGHTS</p>
            <p className="text-[13px] font-bold" style={{ color: "var(--gold)" }}>10</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5 mt-3">
          {["Suite · جناح", "Breakfast ✓", "WiFi ✓", "Halal meals ✓", "Airport shuttle"].map((c) => (
            <span key={c} className="font-mono text-[9px] px-2 py-0.5 rounded-full" style={{ background: "var(--off-white)", color: "var(--gray)", border: "1px solid var(--gray-light)" }}>{c}</span>
          ))}
        </div>
        <div className="mt-3 flex gap-2">
          <button className="flex-1 py-2.5 rounded-xl text-[12px] font-semibold text-white btn-press" style={{ background: "var(--teal-deep)" }}>
            View Booking
          </button>
          <button className="flex-1 py-2.5 rounded-xl text-[12px] font-medium btn-press" style={{ border: "1px solid var(--gray-light)", color: "var(--navy)" }}>
            📞 Call Hotel
          </button>
        </div>
      </div>
    </div>

    {/* Hospital stay */}
    <div className="rounded-2xl p-4" style={{ background: "var(--white)", border: "1px solid var(--gray-light)" }}>
      <div className="flex items-center gap-2 mb-2">
        <span>🏥</span>
        <p className="font-mono text-[9px] tracking-widest" style={{ color: "var(--gold)" }}>HOSPITAL STAY</p>
      </div>
      <p className="text-[14px] font-semibold" style={{ color: "var(--navy)" }}>Charité Hospital — Ward 4B</p>
      <p className="font-arabic text-[11px]" dir="rtl" style={{ color: "var(--gray)" }}>مستشفى شاريتيه — جناح ٤ب</p>
      <div className="flex gap-4 mt-2">
        <div>
          <p className="font-mono text-[8px]" style={{ color: "var(--gray)" }}>ADMITTED</p>
          <p className="text-[12px] font-bold" style={{ color: "var(--navy)" }}>Apr 8</p>
        </div>
        <div>
          <p className="font-mono text-[8px]" style={{ color: "var(--gray)" }}>DISCHARGED</p>
          <p className="text-[12px] font-bold" style={{ color: "var(--success)" }}>Apr 11</p>
        </div>
      </div>
    </div>
  </div>
);

/* ─── STEPS TAB ─── */
const StepsTab = ({
  expanded, setExpanded, activeTrip, onAddTrip,
}: {
  expanded: number | null;
  setExpanded: (v: number | null) => void;
  activeTrip: TripData;
  onAddTrip: () => void;
}) => (
  <div>
    {/* Phase Badges */}
    <div className="flex gap-2 px-4 py-3">
      {phases.map((p) => (
        <div key={p.key} className="flex-1 rounded-xl py-2.5 text-center" style={{ background: "var(--white)", border: "1px solid var(--gray-light)" }}>
          <div className="w-2 h-2 rounded-full mx-auto mb-1" style={{ background: p.color }} />
          <p className="text-[9px] font-semibold" style={{ color: "var(--navy)" }}>{p.label}</p>
          <p className="font-arabic text-[9px]" dir="rtl" style={{ color: "var(--gray)" }}>{p.labelAr}</p>
        </div>
      ))}
    </div>

    {/* Timeline */}
    <div className="px-4 pb-4">
      {phases.map((phase) => {
        const phaseSteps = journeySteps.filter((s) => s.phase === phase.key);
        return (
          <div key={phase.key}>
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

                let lineColor = "var(--gray-light)";
                if (step.status === "done" && nextStep?.status === "done") lineColor = "rgba(61,170,110,0.35)";

                const showFlightInline = phase.key === "before" && step.id === 3 && activeTrip?.outboundFlight;

                return (
                  <div key={step.id}>
                    <div className="relative mb-2.5">
                      {idx < phaseSteps.length - 1 && (
                        <div className="absolute left-[-17px] top-6 bottom-0" style={{ width: 2, background: lineColor }} />
                      )}
                      <div className={`absolute -left-[21px] top-3 w-2.5 h-2.5 rounded-full ${isActive ? "pulse-gold" : ""}`} style={{ background: dotColor }} />
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
                    {showFlightInline && <InlineFlightRow flight={activeTrip.outboundFlight!} onModify={() => {}} />}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      <button
        onClick={onAddTrip}
        className="w-full mt-3 py-4 rounded-xl flex items-center justify-between px-5 btn-press"
        style={{ border: "1.5px dashed var(--teal-mid)", background: "var(--white)" }}
      >
        <span className="text-sm font-bold" style={{ color: "var(--teal-deep)", fontFamily: "'DM Sans'" }}>＋ Add New Trip</span>
        <span className="font-arabic text-[13px]" dir="rtl" style={{ color: "var(--gray)" }}>إضافة رحلة جديدة</span>
      </button>
    </div>
  </div>
);

export default JourneyScreen;
