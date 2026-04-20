import { useState } from "react";
import { toast } from "sonner";
import HeaderMenu, { type HeaderMenuItem } from "@/components/HeaderMenu";
import { Copy, Share2, Download, RefreshCw, Plus, Video, MapPin, Building2, Edit3, Settings as SettingsIcon, HelpCircle, CreditCard } from "lucide-react";
import { journeySteps as defaultJourneySteps, defaultTransportSegments, appointments, type Appointment, type JourneyStep } from "@/constants/data";
import { ChevronDown, ChevronUp } from "lucide-react";
import AddTripSheet, { type TripData } from "@/components/AddTripSheet";
import EditTripSheet from "@/components/EditTripSheet";
import EditStepSheet from "@/components/EditStepSheet";
import { InlineFlightRow } from "@/components/FlightTicketCard";
import TransportCard, { LayoverIndicator, type TransportSegment } from "@/components/TransportCard";
import TicketDetailSheet, { type OverrideAnnotation, type SmartReminder, getSystemReminders } from "@/components/TicketDetailSheet";
import AppointmentFormSheet, { type AppointmentFormData } from "@/components/AppointmentFormSheet";
import PaywallModal from "@/components/PaywallModal";
import { useTrial } from "@/hooks/useTrial";
import { Sparkles, Copy as CopyIcon, Lock } from "lucide-react";

const phases = [
  { key: "before", label: "Before Travel", labelAr: "قبل السفر", color: "var(--teal-deep)" },
  { key: "during", label: "During Treatment", labelAr: "أثناء العلاج", color: "var(--gold)" },
  { key: "after", label: "After Return", labelAr: "بعد العودة", color: "var(--teal-bright)" },
];

const subTabs = [
  { key: "tickets", icon: "✈️", label: "Tickets" },
  { key: "stay", icon: "🏨", label: "Stay" },
  { key: "appointments", icon: "🩺", label: "Appts" },
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

const transportTypeOptions = [
  { icon: "✈️", en: "Flight", ar: "طيران" },
  { icon: "🚄", en: "Train", ar: "قطار" },
  { icon: "🚌", en: "Bus", ar: "باص" },
  { icon: "🚕", en: "Taxi", ar: "تاكسي" },
  { icon: "🚗", en: "Rental", ar: "إيجار" },
  { icon: "🚑", en: "Medical", ar: "طبي" },
];

const stayTypeOptions = [
  { icon: "🏨", en: "Hotel", ar: "فندق" },
  { icon: "🏢", en: "Apartment", ar: "شقة" },
  { icon: "🏠", en: "Private House", ar: "منزل" },
  { icon: "🏥", en: "Hospital Stay", ar: "إقامة مستشفى" },
];

const JourneyScreen = ({ onOpenScanner, onNavigate }: { onOpenScanner?: (cat?: string) => void; onNavigate?: (tab: string) => void }) => {
  const [expanded, setExpanded] = useState<number | null>(null);
  const [trips, setTrips] = useState<TripData[]>([defaultTrip]);
  const [showAddTrip, setShowAddTrip] = useState(false);
  const [showEditTrip, setShowEditTrip] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState("tickets");
  const [transportSegments, setTransportSegments] = useState<TransportSegment[]>(defaultTransportSegments);
  const [showAddTransport, setShowAddTransport] = useState(false);
  const [showAddStay, setShowAddStay] = useState(false);
  const [journeySteps, setJourneySteps] = useState<JourneyStep[]>(defaultJourneySteps);
  const [editingStep, setEditingStep] = useState<JourneyStep | null>(null);
  const [flashStepId, setFlashStepId] = useState<number | null>(null);
  const [flashTripId, setFlashTripId] = useState<string | null>(null);
  const [dragStepId, setDragStepId] = useState<number | null>(null);
  const { isActive: trialActive } = useTrial();

  const flashStep = (id: number) => {
    setFlashStepId(id);
    setTimeout(() => setFlashStepId(null), 1100);
  };
  const flashTrip = (id: string) => {
    setFlashTripId(id);
    setTimeout(() => setFlashTripId(null), 1100);
  };

  // Reorder steps within the same phase via HTML5 drag-drop
  const handleReorderStep = (sourceId: number, targetId: number) => {
    if (sourceId === targetId) return;
    setJourneySteps((prev) => {
      const src = prev.find((s) => s.id === sourceId);
      const tgt = prev.find((s) => s.id === targetId);
      if (!src || !tgt || src.phase !== tgt.phase) return prev;
      const without = prev.filter((s) => s.id !== sourceId);
      const tgtIdx = without.findIndex((s) => s.id === targetId);
      const next = [...without.slice(0, tgtIdx), src, ...without.slice(tgtIdx)];
      return next;
    });
    flashStep(sourceId);
    toast.success("Step reordered · تم إعادة الترتيب", { duration: 1500 });
  };

  const activeTrip = trips.find((t) => t.status === "active") || trips[0];

  const requireProForAddTrip = () => {
    // Free tier: 1 trip. If user already has any trip, gate behind paywall unless trial is active.
    if (trips.length >= 1 && !trialActive) {
      setShowPaywall(true);
      return false;
    }
    return true;
  };

  const handleReplicateSegment = (seg: TransportSegment) => {
    const newDep = new Date();
    newDep.setDate(newDep.getDate() + 30);
    const dur = new Date(seg.arrivalDateTime).getTime() - new Date(seg.departureDateTime).getTime();
    const newArr = new Date(newDep.getTime() + dur);
    const copy: TransportSegment = {
      ...seg,
      id: `${seg.id}-copy-${Date.now()}`,
      status: "upcoming",
      departureDateTime: newDep.toISOString(),
      arrivalDateTime: newArr.toISOString(),
      bookingRef: undefined,
    };
    setTransportSegments((prev) => [...prev, copy]);
    toast.success("Ticket replicated to future date · تم نسخ التذكرة لتاريخ مستقبلي", { description: `New trip: ${newDep.toLocaleDateString("en-US", { month: "short", day: "numeric" })}` });
  };
  const doneCount = journeySteps.filter((s) => s.status === "done").length;
  const progress = (doneCount / journeySteps.length) * 100;

  const handleAddTrip = (trip: TripData) => {
    setTrips([...trips, trip]);
  };

  const handleCopyJourney = () => {
    const text = `Treatment Journey — Berlin\n${doneCount}/${journeySteps.length} steps completed\n\nSteps:\n${journeySteps.map((s, i) => `${i + 1}. ${s.titleEn} — ${s.status}`).join("\n")}`;
    navigator.clipboard.writeText(text);
    toast.success("Journey copied · تم نسخ الرحلة", { duration: 2000 });
  };

  const handleShareJourney = () => {
    const text = `Treatment Journey — Berlin\n${doneCount}/${journeySteps.length} steps completed`;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
  };

  const handleExportJourney = () => {
    const text = journeySteps.map(s => `${s.titleEn}\t${s.status}\t${s.date || ""}`).join("\n");
    const blob = new Blob([`Step\tStatus\tDate\n${text}`], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "treatment-journey.txt"; a.click();
    URL.revokeObjectURL(url);
    toast.success("Journey exported · تم تصدير الرحلة", { duration: 2000 });
  };

  const handleAddStep = () => {
    const id = Math.max(...journeySteps.map(s => s.id), 0) + 1;
    const newStep: JourneyStep = {
      id, titleEn: "New Step", titleAr: "خطوة جديدة", date: "TBD", status: "pending", phase: "before",
    };
    setJourneySteps(prev => [...prev, newStep]);
    setEditingStep(newStep);
  };

  const journeyMenuItems: HeaderMenuItem[] = [
    { icon: <Edit3 size={14} />, label: "Edit Current Trip", labelAr: "تعديل الرحلة الحالية", onClick: () => setShowEditTrip(true) },
    { icon: <Plus size={14} />, label: "Add New Trip", labelAr: "إضافة رحلة جديدة", onClick: () => { if (requireProForAddTrip()) setShowAddTrip(true); } },
    { icon: <Plus size={14} />, label: "Add Journey Step", labelAr: "إضافة خطوة", onClick: handleAddStep },
    { icon: <Sparkles size={14} />, label: "Scan New Ticket", labelAr: "مسح تذكرة جديدة", onClick: () => onOpenScanner?.("flight") },
    { icon: <Plus size={14} />, label: "Add Companion Ticket", labelAr: "إضافة تذكرة مرافق", onClick: () => { setShowEditTrip(true); toast.info("Add companions in 'Edit Current Trip' · المرافقون داخل تعديل الرحلة"); } },
    { icon: <Copy size={14} />, label: "Copy Summary", labelAr: "نسخ الملخص", onClick: handleCopyJourney },
    { icon: <Download size={14} />, label: "Export Journey", labelAr: "تصدير الرحلة", onClick: handleExportJourney },
    { icon: <Share2 size={14} />, label: "Share Progress", labelAr: "مشاركة التقدم", onClick: handleShareJourney },
    { icon: <CreditCard size={14} />, label: "Subscriptions", labelAr: "الاشتراكات", onClick: () => onNavigate?.("pricing") },
    { icon: <SettingsIcon size={14} />, label: "Settings", labelAr: "الإعدادات", onClick: () => onNavigate?.("settings") },
    { icon: <HelpCircle size={14} />, label: "Help & Support", labelAr: "المساعدة", onClick: () => onNavigate?.("support") },
  ];

  return (
    <div className="flex flex-col" style={{ height: 0, flex: 1, overflow: "hidden" }}>
      {/* Header */}
      <div className="relative px-5 pt-3 pb-4 overflow-hidden shrink-0" style={{ background: "var(--navy)" }}>
        <div className="absolute -top-6 -right-6 w-28 h-28 rounded-full" style={{ border: "1px solid rgba(197,150,90,0.12)" }} />
        <div className="flex items-center justify-between">
          <div>
            <p className="font-mono text-[10px] tracking-widest mb-1" style={{ color: "rgba(255,255,255,0.4)" }}>02 — JOURNEY MAP</p>
            <p className="font-display text-xl text-white" style={{ fontWeight: 300 }}>Treatment Journey</p>
            <p className="font-arabic text-sm" dir="rtl" style={{ color: "rgba(255,255,255,0.45)" }}>خريطة رحلتك العلاجية</p>
          </div>
          <HeaderMenu items={journeyMenuItems} />
        </div>
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
              fontFamily: "'DM Sans'", fontSize: 13, fontWeight: 700,
            }}
          >
            <span>{tab.icon}</span> {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content — scrollable */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden pb-6" style={{ background: "var(--off-white)", WebkitOverflowScrolling: "touch" }}>
        {activeSubTab === "tickets" && <TicketsTab segments={transportSegments} onAdd={() => setShowAddTransport(true)} onScan={() => onOpenScanner?.("flight")} onReplicate={handleReplicateSegment} />}
        {activeSubTab === "stay" && <StayTab onAdd={() => setShowAddStay(true)} onScan={() => onOpenScanner?.("hotel")} />}
        {activeSubTab === "appointments" && <AppointmentsTab onOpenScanner={onOpenScanner} />}
        {activeSubTab === "steps" && (
          <StepsTab
            expanded={expanded} setExpanded={setExpanded} activeTrip={activeTrip} trips={trips}
            steps={journeySteps}
            flashStepId={flashStepId}
            flashTripId={flashTripId}
            dragStepId={dragStepId}
            setDragStepId={setDragStepId}
            onReorderStep={handleReorderStep}
            onAddTrip={() => { if (requireProForAddTrip()) setShowAddTrip(true); }}
            onEditTrip={() => setShowEditTrip(true)}
            onEditStep={(s) => setEditingStep(s)}
            onAddStep={handleAddStep}
          />
        )}
      </div>

      <PaywallModal
        open={showPaywall}
        onClose={() => setShowPaywall(false)}
        onUpgrade={() => onNavigate?.("pricing")}
        onTrialStarted={() => setShowAddTrip(true)}
        feature="Add new trip"
        featureAr="إضافة رحلة جديدة"
      />

      <AddTripSheet open={showAddTrip} onClose={() => setShowAddTrip(false)} onSubmit={handleAddTrip} />

      <EditTripSheet
        open={showEditTrip}
        trip={activeTrip}
        onClose={() => setShowEditTrip(false)}
        onSave={(updated) => { setTrips(prev => prev.map(t => t.id === updated.id ? updated : t)); flashTrip(updated.id); }}
      />

      <EditStepSheet
        open={!!editingStep}
        step={editingStep}
        onClose={() => setEditingStep(null)}
        onSave={(updated) => { setJourneySteps(prev => prev.map(s => s.id === updated.id ? updated : s)); flashStep(updated.id); }}
        onDelete={(id) => setJourneySteps(prev => prev.filter(s => s.id !== id))}
      />

      {/* Add Transport Sheet */}
      {showAddTransport && (
        <TypePickerSheet
          title="Add Transport" titleAr="إضافة وسيلة تنقل"
          options={transportTypeOptions}
          onClose={() => setShowAddTransport(false)}
        />
      )}

      {/* Add Stay Sheet */}
      {showAddStay && (
        <TypePickerSheet
          title="Add Accommodation" titleAr="إضافة إقامة"
          options={stayTypeOptions}
          onClose={() => setShowAddStay(false)}
        />
      )}
    </div>
  );
};

/* ─── TYPE PICKER BOTTOM SHEET ─── */
const TypePickerSheet = ({ title, titleAr, options, onClose }: {
  title: string; titleAr: string;
  options: { icon: string; en: string; ar: string }[];
  onClose: () => void;
}) => (
  <div className="absolute inset-0 z-50 flex flex-col justify-end" onClick={onClose}>
    <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.5)" }} />
    <div className="relative animate-slide-up rounded-t-3xl" style={{ background: "var(--white)" }} onClick={(e) => e.stopPropagation()}>
      <div className="flex justify-center pt-3"><div style={{ width: 36, height: 4, background: "#DEE4E9", borderRadius: 2 }} /></div>
      <div className="px-5 pt-4 pb-2">
        <p className="font-display text-xl" style={{ color: "var(--navy)" }}>{title}</p>
        <p className="font-arabic text-sm" dir="rtl" style={{ color: "var(--gray)" }}>{titleAr}</p>
      </div>
      <div className="px-5 pb-6" style={{ display: "grid", gridTemplateColumns: options.length > 4 ? "1fr 1fr 1fr" : "1fr 1fr", gap: 10 }}>
        {options.map((o) => (
          <button key={o.en} className="rounded-xl flex flex-col items-center justify-center gap-1 card-press" style={{ height: 70, background: "var(--off-white)", border: "1px solid var(--gray-light)" }}>
            <span className="text-[26px]">{o.icon}</span>
            <span className="text-[11px] font-bold" style={{ color: "var(--navy)" }}>{o.en}</span>
            <span className="font-arabic text-[9px]" style={{ color: "var(--gray)" }}>{o.ar}</span>
          </button>
        ))}
      </div>
      <button onClick={onClose} className="w-full py-3 text-[13px] font-medium mb-4 btn-press" style={{ color: "var(--gray)" }}>
        Cancel · <span className="font-arabic">إلغاء</span>
      </button>
    </div>
  </div>
);

/* ─── ADD BUTTON (reusable dashed) ─── */
const AddButton = ({ labelEn, labelAr, onClick }: { labelEn: string; labelAr: string; onClick: () => void }) => (
  <button
    onClick={onClick}
    className="w-full flex items-center justify-between px-5 btn-press"
    style={{ height: 52, borderRadius: 14, border: "1.5px dashed var(--teal-mid)", background: "rgba(0,77,91,0.04)" }}
  >
    <span className="text-sm font-bold" style={{ color: "var(--teal-deep)", fontFamily: "'DM Sans'" }}>{labelEn}</span>
    <span className="font-arabic text-[13px]" dir="rtl" style={{ color: "var(--gray)" }}>{labelAr}</span>
  </button>
);

/* ─── TICKETS TAB ─── */
const TicketsTab = ({ segments, onAdd, onScan, onReplicate }: { segments: TransportSegment[]; onAdd: () => void; onScan?: () => void; onReplicate: (seg: TransportSegment) => void }) => {
  const [selectedSeg, setSelectedSeg] = useState<TransportSegment | null>(null);
  const [ticketNotes, setTicketNotes] = useState<Record<string, string>>({});
  const [ticketAlarms, setTicketAlarms] = useState<Record<string, number[]>>({});
  const [ticketOverrides, setTicketOverrides] = useState<Record<string, OverrideAnnotation[]>>({});
  const [ticketSystemReminders, setTicketSystemReminders] = useState<Record<string, SmartReminder[]>>({});
  const [ticketMutedAlerts, setTicketMutedAlerts] = useState<Record<string, boolean>>({});

  // Filter UI state
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [familyOnly, setFamilyOnly] = useState(false);

  const handleToggleAlarm = (segId: string, minutes: number) => {
    setTicketAlarms((prev) => {
      const current = prev[segId] || [];
      return { ...prev, [segId]: current.includes(minutes) ? current.filter((m) => m !== minutes) : [...current, minutes] };
    });
  };

  // Apply search/date/family filters before grouping
  const filteredSegments = segments.filter((s) => {
    if (familyOnly && !(s.companions && s.companions.length > 0)) return false;
    if (dateFrom && new Date(s.departureDateTime) < new Date(dateFrom)) return false;
    if (dateTo && new Date(s.departureDateTime) > new Date(`${dateTo}T23:59:59`)) return false;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      const hay = [
        s.airline, s.flightNumber, s.trainNumber, s.busNumber,
        s.fromCity, s.toCity, s.fromCode, s.toCode, s.bookingRef,
      ].filter(Boolean).join(" ").toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
  const familyCount = segments.filter(s => (s.companions?.length || 0) > 0).length;

  return (
    <div className="pt-2">
      <div className="px-4 mb-3">
        <p className="font-mono text-[9px] tracking-widest" style={{ color: "var(--teal-deep)" }}>YOUR FULL TRANSPORT TIMELINE</p>
        <p className="font-arabic text-[10px]" dir="rtl" style={{ color: "var(--gray)" }}>جميع وسائل تنقلك في هذه الرحلة</p>
        <p className="text-[10px] mt-1" style={{ color: "var(--gray)" }}>Tap any ticket for full details, barcode & notes</p>
        <div className="mt-2 rounded-lg p-2" style={{ background: "rgba(217,79,79,0.05)", border: "1px solid rgba(217,79,79,0.15)" }}>
          <p className="text-[8px] leading-relaxed" style={{ color: "var(--error)" }}>⚠️ All flight/transport info is user-entered. RufayQ does not connect to airline systems. Verify with your carrier.</p>
          <p className="font-arabic text-[8px]" dir="rtl" style={{ color: "var(--error)" }}>جميع معلومات النقل مُدخلة يدوياً. تحقق من شركة النقل مباشرة.</p>
        </div>

        {/* Search + filter controls */}
        <div className="mt-3 space-y-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search airline, flight #, city, PNR…"
            className="w-full px-3 py-2 rounded-lg text-[12px] outline-none"
            style={{ background: "var(--white)", border: "1px solid var(--gray-light)", color: "var(--navy)" }}
          />
          <div className="flex gap-2">
            <div className="flex-1">
              <p className="font-mono text-[8px] tracking-wider mb-0.5" style={{ color: "var(--gray)" }}>FROM</p>
              <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
                className="w-full px-2 py-1.5 rounded-lg text-[11px] outline-none"
                style={{ background: "var(--white)", border: "1px solid var(--gray-light)", color: "var(--navy)" }} />
            </div>
            <div className="flex-1">
              <p className="font-mono text-[8px] tracking-wider mb-0.5" style={{ color: "var(--gray)" }}>TO</p>
              <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
                className="w-full px-2 py-1.5 rounded-lg text-[11px] outline-none"
                style={{ background: "var(--white)", border: "1px solid var(--gray-light)", color: "var(--navy)" }} />
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5 items-center">
            <button
              onClick={() => setFamilyOnly(v => !v)}
              className="text-[10px] font-bold px-2.5 py-1 rounded-full btn-press transition-all"
              style={{
                background: familyOnly ? "var(--gold)" : "var(--white)",
                color: familyOnly ? "white" : "var(--navy)",
                border: `1px solid ${familyOnly ? "var(--gold)" : "var(--gray-light)"}`,
              }}
            >
              👨‍👩‍👧‍👦 Family / Companion {familyCount > 0 ? `· ${familyCount}` : ""}
            </button>
            {(search || dateFrom || dateTo || familyOnly) && (
              <button
                onClick={() => { setSearch(""); setDateFrom(""); setDateTo(""); setFamilyOnly(false); }}
                className="text-[10px] px-2 py-1 rounded-full btn-press"
                style={{ color: "var(--teal-deep)" }}
              >
                ✕ Clear
              </button>
            )}
            <span className="ml-auto font-mono text-[9px]" style={{ color: "var(--gray)" }}>
              {filteredSegments.length} / {segments.length}
            </span>
          </div>
        </div>
      </div>
      {(() => {
        const now = Date.now();
        const annotated = filteredSegments.map((s) => {
          const dep = new Date(s.departureDateTime).getTime();
          const arr = new Date(s.arrivalDateTime).getTime();
          let group: "current" | "upcoming" | "past";
          if (now >= dep && now <= arr) group = "current";
          else if (dep > now) group = "upcoming";
          else group = "past";
          return { seg: s, group };
        });
        const order = { current: 0, upcoming: 1, past: 2 };
        annotated.sort((a, b) => {
          if (order[a.group] !== order[b.group]) return order[a.group] - order[b.group];
          return new Date(a.seg.departureDateTime).getTime() - new Date(b.seg.departureDateTime).getTime();
        });
        const sections: { key: string; label: string; labelAr: string; color: string; items: typeof annotated }[] = [
          { key: "current", label: "IN PROGRESS", labelAr: "حالياً", color: "var(--success)", items: annotated.filter(a => a.group === "current") },
          { key: "upcoming", label: "UPCOMING", labelAr: "قادم", color: "var(--gold)", items: annotated.filter(a => a.group === "upcoming") },
          { key: "past", label: "PAST (LOCKED)", labelAr: "سابقة (مقفلة)", color: "var(--gray)", items: annotated.filter(a => a.group === "past") },
        ];
        return sections.map((sec) => sec.items.length === 0 ? null : (
          <div key={sec.key} className="mb-3">
            <div className="px-4 flex items-center gap-2 mb-1.5">
              <div className="h-px flex-1" style={{ background: "var(--gray-light)" }} />
              <span className="font-mono text-[9px] tracking-widest" style={{ color: sec.color }}>
                {sec.label} · <span className="font-arabic">{sec.labelAr}</span>
              </span>
              <div className="h-px flex-1" style={{ background: "var(--gray-light)" }} />
            </div>
            {sec.items.map(({ seg, group }) => (
              <div key={seg.id} style={{ opacity: group === "past" ? 0.85 : 1 }}>
                <div className="relative">
                  {group === "past" && (
                    <div className="absolute top-2 right-6 z-10 flex items-center gap-1 px-2 py-1 rounded-full" style={{ background: "rgba(0,0,0,0.7)" }}>
                      <Lock size={9} color="white" />
                      <span className="font-mono text-[8px] text-white">READ-ONLY</span>
                    </div>
                  )}
                  <TransportCard seg={seg} onTap={() => {
                    if (group === "past") {
                      toast.info("Past tickets are read-only · التذاكر السابقة للعرض فقط", { description: "Tap Replicate to copy as a future trip" });
                      return;
                    }
                    if (!ticketSystemReminders[seg.id]) {
                      setTicketSystemReminders((prev) => ({ ...prev, [seg.id]: getSystemReminders(seg) }));
                    }
                    setSelectedSeg(seg);
                  }} />
                </div>
                {group === "past" && (
                  <div className="mx-4 mb-3 -mt-2 flex justify-end">
                    <button
                      onClick={() => onReplicate(seg)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold btn-press"
                      style={{ background: "var(--teal-light)", color: "var(--teal-deep)", border: "1px solid var(--teal-deep)" }}
                    >
                      <CopyIcon size={11} /> Replicate to future · <span className="font-arabic">إعادة لتاريخ مستقبلي</span>
                    </button>
                  </div>
                )}
                {seg.layoverAfter && (
                  <LayoverIndicator duration={seg.layoverAfter.duration} airport={seg.layoverAfter.airport} code={seg.layoverAfter.code} />
                )}
              </div>
            ))}
          </div>
        ));
      })()}
      <div className="px-4 mt-2 space-y-2">
        <AddButton labelEn="＋ Add Transport" labelAr="إضافة وسيلة تنقل" onClick={onAdd} />
        {onScan && (
          <button onClick={onScan} className="w-full text-center text-[12px] py-1.5 btn-press" style={{ color: "var(--teal-mid)" }}>
            📸 Or scan a boarding pass / booking confirmation
            <span className="block font-arabic text-[10px]" dir="rtl" style={{ color: "var(--gray)" }}>أو امسح بطاقة الصعود / تأكيد الحجز</span>
          </button>
        )}
      </div>

      {selectedSeg && (
        <TicketDetailSheet
          seg={selectedSeg}
          onClose={() => setSelectedSeg(null)}
          notes={ticketNotes[selectedSeg.id] || ""}
          onSaveNotes={(n) => setTicketNotes((prev) => ({ ...prev, [selectedSeg.id]: n }))}
          alarms={ticketAlarms[selectedSeg.id] || []}
          onToggleAlarm={(m) => handleToggleAlarm(selectedSeg.id, m)}
          overrides={ticketOverrides[selectedSeg.id] || []}
          onSaveOverrides={(ovrs) => setTicketOverrides((prev) => ({ ...prev, [selectedSeg.id]: ovrs }))}
          systemReminders={ticketSystemReminders[selectedSeg.id] || []}
          onUpdateSystemReminders={(reminders) => setTicketSystemReminders((prev) => ({ ...prev, [selectedSeg.id]: reminders }))}
          systemAlertsMuted={ticketMutedAlerts[selectedSeg.id] || false}
          onToggleSystemAlertsMuted={() => setTicketMutedAlerts((prev) => ({ ...prev, [selectedSeg.id]: !prev[selectedSeg.id] }))}
        />
      )}
    </div>
  );
};

/* ─── STAY TAB ─── */
const StayTab = ({ onAdd, onScan }: { onAdd: () => void; onScan?: () => void }) => (
  <div className="pt-2">
    {/* Header */}
    <div className="px-4 pb-1">
      <div className="flex items-center justify-between">
        <p className="text-[14px] font-bold" style={{ color: "var(--navy)", fontFamily: "'DM Sans'" }}>Your Accommodation</p>
        <p className="font-mono text-[10px]" style={{ color: "var(--gold)" }}>Total: 12 nights</p>
      </div>
      <p className="font-arabic text-[12px]" dir="rtl" style={{ color: "var(--gray)" }}>إقامتك خلال رحلة العلاج</p>
      <div className="flex gap-2 mt-2">
        {["Berlin · 12 nights", "Checked in: Apr 5", "Check out: Apr 15"].map((c, i) => (
          <span key={c} className="font-mono text-[9px] px-2 py-1 rounded-full" style={{
            background: i === 0 ? "var(--teal-light)" : "var(--white)",
            color: i === 0 ? "var(--teal-deep)" : "var(--gray)",
            border: i === 0 ? "none" : "1px solid var(--gray-light)",
          }}>{c}</span>
        ))}
      </div>
    </div>

    {/* Hotel Card */}
    <div className="mx-4 mt-3 rounded-2xl overflow-hidden relative" style={{ boxShadow: "0 6px 24px rgba(0,0,0,0.1)" }}>
      <div className="absolute left-0 top-0 bottom-0 w-1" style={{ background: "var(--success)" }} />
      <div className="ml-1">
        {/* Header bar */}
        <div className="flex items-center justify-between px-5" style={{ height: 36, background: "linear-gradient(135deg, var(--header-dark-alt), var(--header-dark-from))" }}>
          <span className="font-mono text-[9px] tracking-widest" style={{ color: "rgba(255,255,255,0.7)" }}>🏨 HOTEL</span>
          <span className="font-mono text-[8px] px-2 py-0.5 rounded-full" style={{ background: "var(--success)", color: "white" }}>COMPLETED ✓</span>
        </div>
        {/* Image area */}
        <div className="relative flex items-center justify-center" style={{ height: 100, background: "linear-gradient(135deg, var(--header-dark-alt), var(--header-dark-from))" }}>
          <span className="text-[48px]">🏨</span>
          <span className="absolute top-2 right-3 font-mono text-[10px] px-2 py-0.5 rounded-full" style={{ background: "var(--gold)", color: "white" }}>★ 4.5</span>
          <span className="absolute bottom-2 right-3 text-[11px]" style={{ color: "rgba(255,255,255,0.7)", fontFamily: "'DM Sans'" }}>€185/night</span>
        </div>
        {/* Info */}
        <div className="px-5 pt-3 pb-4" style={{ background: "var(--white)" }}>
          <p className="text-[16px] font-bold" style={{ color: "var(--navy)", fontFamily: "'DM Sans'" }}>Hotel Berlin Mitte</p>
          <p className="text-[11px] mt-0.5" style={{ color: "var(--gray)" }}>📍 Auguststraße 12, 10117 Berlin</p>
          <p className="font-arabic text-[10px] mt-0.5" dir="rtl" style={{ color: "var(--gray)" }}>فندق برلين ميتي</p>
          <p className="text-[11px] mt-1" style={{ color: "var(--gold)" }}>★★★★☆</p>

          {/* Check-in/out */}
          <div className="flex mt-3">
            <div className="flex-1">
              <p className="font-mono text-[8px] tracking-wider" style={{ color: "var(--gray)" }}>CHECK-IN</p>
              <p className="text-[14px] font-bold" style={{ color: "var(--navy)" }}>Apr 5</p>
              <p className="text-[11px]" style={{ color: "var(--gray)" }}>14:00</p>
            </div>
            <div style={{ width: 1, background: "var(--gray-light)", margin: "0 12px" }} />
            <div className="flex-1 text-right">
              <p className="font-mono text-[8px] tracking-wider" style={{ color: "var(--gray)" }}>CHECK-OUT</p>
              <p className="text-[14px] font-bold" style={{ color: "var(--navy)" }}>Apr 8</p>
              <p className="text-[11px]" style={{ color: "var(--gray)" }}>07:00</p>
            </div>
          </div>

          {/* Room details */}
          <div className="mt-3 rounded-lg p-3" style={{ background: "var(--teal-light)" }}>
            <div className="grid grid-cols-2 gap-y-2">
              {[
                { label: "ROOM TYPE", value: "Deluxe Double — ♿" },
                { label: "CONFIRMATION", value: "HTL-4821" },
                { label: "INCLUDES", value: "Breakfast · Free Cancel" },
                { label: "SPECIAL", value: "🦽 Wheelchair accessible" },
              ].map((r) => (
                <div key={r.label}>
                  <p className="font-mono text-[8px] tracking-wider" style={{ color: "rgba(0,77,91,0.6)" }}>{r.label}</p>
                  <p className="text-[11px]" style={{ color: "var(--navy)", fontFamily: "'DM Sans'" }}>{r.value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Amenities */}
          <div className="flex gap-1.5 mt-3 overflow-x-auto">
            {["🛜 WiFi", "🍳 Breakfast", "♿ Accessible", "🅿️ Parking"].map((a) => (
              <span key={a} className="font-mono text-[9px] px-2 py-1 rounded-full whitespace-nowrap" style={{ background: "var(--off-white)", color: "var(--gray)", border: "1px solid var(--gray-light)" }}>{a}</span>
            ))}
          </div>

          {/* Actions */}
          <div className="flex gap-2 mt-3">
            <button className="flex-1 py-2 rounded-xl text-[11px] font-medium btn-press" style={{ border: "1px solid var(--gray-light)", color: "var(--teal-deep)" }}>📍 Directions</button>
            <button className="flex-1 py-2 rounded-xl text-[11px] font-bold text-white btn-press" style={{ background: "var(--gold)" }}>Open Booking</button>
          </div>
        </div>
      </div>
    </div>

    {/* Hospital Stay Card */}
    <div className="mx-4 mt-3 rounded-2xl overflow-hidden relative" style={{ boxShadow: "0 6px 24px rgba(0,0,0,0.1)" }}>
      <div className="absolute left-0 top-0 bottom-0 w-1" style={{ background: "var(--success)" }} />
      <div className="ml-1">
        <div className="flex items-center justify-between px-5" style={{ height: 36, background: "linear-gradient(135deg, var(--header-teal-from), var(--header-teal-to))" }}>
          <span className="font-mono text-[9px] tracking-widest" style={{ color: "rgba(255,255,255,0.7)" }}>🏥 HOSPITAL STAY</span>
          <span className="font-mono text-[8px] px-2 py-0.5 rounded-full" style={{ background: "var(--success)", color: "white" }}>COMPLETED ✓</span>
        </div>
        <div className="relative flex items-center justify-center" style={{ height: 80, background: "linear-gradient(135deg, var(--header-teal-from), var(--header-teal-to))" }}>
          <span className="text-[40px]">🏥</span>
          <span className="absolute bottom-2 left-3 font-mono text-[9px] px-2 py-0.5 rounded-full" style={{ background: "rgba(255,255,255,0.15)", color: "white" }}>MEDICAL STAY ⚕️</span>
        </div>
        <div className="px-5 pt-3 pb-4" style={{ background: "var(--white)" }}>
          <p className="text-[15px] font-bold" style={{ color: "var(--navy)", fontFamily: "'DM Sans'" }}>Charité — Universitätsmedizin Berlin</p>
          <p className="font-arabic text-[11px] mt-0.5" dir="rtl" style={{ color: "var(--gray)" }}>مستشفى شاريتيه — برلين</p>
          <p className="text-[11px] mt-0.5" style={{ color: "var(--gray)" }}>📍 Charitéplatz 1, 10117 Berlin</p>

          <div className="flex mt-3">
            <div className="flex-1">
              <p className="font-mono text-[8px] tracking-wider" style={{ color: "var(--gray)" }}>ADMITTED</p>
              <p className="text-[14px] font-bold" style={{ color: "var(--navy)" }}>Apr 8</p>
              <p className="text-[11px]" style={{ color: "var(--gray)" }}>07:00</p>
            </div>
            <div style={{ width: 1, background: "var(--gray-light)", margin: "0 12px" }} />
            <div className="flex-1 text-right">
              <p className="font-mono text-[8px] tracking-wider" style={{ color: "var(--gray)" }}>DISCHARGED</p>
              <p className="text-[14px] font-bold" style={{ color: "var(--success)" }}>Apr 10</p>
              <p className="text-[11px]" style={{ color: "var(--gray)" }}>16:00</p>
            </div>
          </div>

          <div className="mt-3 rounded-lg p-3" style={{ background: "var(--teal-light)" }}>
            <div className="grid grid-cols-2 gap-y-2">
              {[
                { label: "WARD", value: "Orthopedic — Station C4" },
                { label: "ROOM", value: "Room 412 — Bed A" },
                { label: "PATIENT ID", value: "CHB-2026-9823" },
                { label: "PHYSICIAN", value: "Dr. Klaus Mueller" },
              ].map((r) => (
                <div key={r.label}>
                  <p className="font-mono text-[8px] tracking-wider" style={{ color: "rgba(0,77,91,0.6)" }}>{r.label}</p>
                  <p className="text-[11px]" style={{ color: "var(--navy)", fontFamily: "'DM Sans'" }}>{r.value}</p>
                </div>
              ))}
            </div>
            <p className="font-arabic text-[10px] mt-1" dir="rtl" style={{ color: "var(--gray)" }}>د. كلاوس مولر</p>
          </div>

          <div className="mt-3 rounded-lg p-3" style={{ background: "var(--gold-pale)", border: "1px solid rgba(197,150,90,0.3)" }}>
            <p className="text-[11px] font-semibold" style={{ color: "var(--gold)" }}>📋 Discharge Plan Ready</p>
            <p className="font-arabic text-[10px] mt-0.5" dir="rtl" style={{ color: "var(--gray)" }}>خطة الخروج جاهزة</p>
            <p className="text-[11px] mt-1" style={{ color: "var(--teal-deep)" }}>View Discharge Pack →</p>
          </div>

          <div className="flex gap-2 mt-3">
            <button className="flex-1 py-2 rounded-xl text-[11px] font-medium btn-press" style={{ border: "1px solid var(--gray-light)", color: "var(--success)" }}>📞 Call Ward</button>
            <button className="flex-1 py-2 rounded-xl text-[11px] font-bold text-white btn-press" style={{ background: "var(--gold)" }}>📋 View Records</button>
          </div>
        </div>
      </div>
    </div>

    {/* Apartment Card */}
    <div className="mx-4 mt-3 rounded-2xl overflow-hidden relative" style={{ boxShadow: "0 6px 24px rgba(0,0,0,0.1)" }}>
      <div className="absolute left-0 top-0 bottom-0 w-1 shimmer-strip" style={{ background: "var(--gold)" }} />
      <div className="ml-1">
        <div className="flex items-center justify-between px-5" style={{ height: 36, background: "linear-gradient(135deg, #2A1A35, #1A0D24)" }}>
          <span className="font-mono text-[9px] tracking-widest" style={{ color: "rgba(255,255,255,0.7)" }}>🏢 APARTMENT</span>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.6)" }}>Airbnb</span>
            <span className="font-mono text-[8px] px-2 py-0.5 rounded-full pulse-gold" style={{ background: "var(--gold)", color: "white" }}>ACTIVE ●</span>
          </div>
        </div>
        <div className="relative flex items-center justify-center" style={{ height: 80, background: "linear-gradient(135deg, #2A1A35, #1A0D24)" }}>
          <span className="text-[40px]">🏢</span>
          <span className="absolute bottom-2 right-3 text-[11px]" style={{ color: "rgba(255,255,255,0.7)", fontFamily: "'DM Sans'" }}>€95/night</span>
        </div>
        <div className="px-5 pt-3 pb-4" style={{ background: "var(--white)" }}>
          <p className="text-[15px] font-bold" style={{ color: "var(--navy)", fontFamily: "'DM Sans'" }}>Mitte Recovery Apartment</p>
          <p className="font-arabic text-[11px] mt-0.5" dir="rtl" style={{ color: "var(--gray)" }}>شقة ميتي للتعافي</p>
          <p className="text-[11px] mt-0.5" style={{ color: "var(--gray)" }}>📍 Rosenthaler Str. 38, Ground Floor, 10178 Berlin</p>

          <div className="flex mt-3">
            <div className="flex-1">
              <p className="font-mono text-[8px] tracking-wider" style={{ color: "var(--gray)" }}>CHECK-IN</p>
              <p className="text-[14px] font-bold" style={{ color: "var(--navy)" }}>Apr 10</p>
              <p className="text-[11px]" style={{ color: "var(--gray)" }}>17:00</p>
            </div>
            <div style={{ width: 1, background: "var(--gray-light)", margin: "0 12px" }} />
            <div className="flex-1 text-right">
              <p className="font-mono text-[8px] tracking-wider" style={{ color: "var(--gray)" }}>CHECK-OUT</p>
              <p className="text-[14px] font-bold" style={{ color: "var(--navy)" }}>Apr 15</p>
              <p className="text-[11px]" style={{ color: "var(--gray)" }}>10:00</p>
            </div>
          </div>

          <div className="mt-3 rounded-lg p-3" style={{ background: "#F5F0FA" }}>
            <div className="grid grid-cols-2 gap-y-2">
              {[
                { label: "BOOKING REF", value: "AIRBNB-HM9KL2" },
                { label: "HOST", value: "Maria Schmidt" },
                { label: "HOST PHONE", value: "+491709876543" },
                { label: "NIGHTS", value: "5" },
              ].map((r) => (
                <div key={r.label}>
                  <p className="font-mono text-[8px] tracking-wider" style={{ color: "rgba(42,26,53,0.5)" }}>{r.label}</p>
                  <p className="text-[11px]" style={{ color: "var(--navy)", fontFamily: "'DM Sans'" }}>{r.value}</p>
                </div>
              ))}
            </div>
          </div>

          <p className="text-[10px] mt-2 italic" style={{ color: "var(--gray)" }}>Ground floor, wheelchair accessible, full kitchen</p>
          <p className="font-arabic text-[10px]" dir="rtl" style={{ color: "var(--gray)" }}>دور أرضي، مهيأ للكرسي المتحرك، مطبخ كامل</p>

          <div className="flex gap-1.5 mt-2 overflow-x-auto">
            {["🛜 WiFi", "🍳 Kitchen", "♿ Accessible", "🏠 Ground Floor", "🧺 Washing"].map((a) => (
              <span key={a} className="font-mono text-[9px] px-2 py-1 rounded-full whitespace-nowrap" style={{ background: "var(--off-white)", color: "var(--gray)", border: "1px solid var(--gray-light)" }}>{a}</span>
            ))}
          </div>

          <div className="flex gap-2 mt-3">
            <button className="flex-1 py-2 rounded-xl text-[11px] font-medium btn-press" style={{ border: "1px solid var(--gray-light)", color: "var(--teal-deep)" }}>📞 Contact Host</button>
            <button className="flex-1 py-2 rounded-xl text-[11px] font-bold text-white btn-press" style={{ background: "var(--gold)" }}>Open in Airbnb</button>
          </div>
        </div>
      </div>
    </div>

    {/* Stay Summary */}
    <div className="mx-4 mt-3 rounded-2xl p-4" style={{ background: "var(--white)", border: "1px solid var(--gray-light)" }}>
      <div className="flex items-center justify-between mb-3">
        <p className="font-mono text-[10px] tracking-widest" style={{ color: "var(--gold)" }}>STAY SUMMARY</p>
        <p className="font-arabic text-[11px]" dir="rtl" style={{ color: "var(--gray)" }}>ملخص الإقامة</p>
      </div>
      {[
        { label: "Total nights", value: "12" },
        { label: "Hotel (3 nights)", value: "€555" },
        { label: "Hospital (2 nights)", value: "Covered by insurance" },
        { label: "Apartment (5 nights)", value: "€475" },
        { label: "TOTAL", value: "~€1,030 + hospital", bold: true },
        { label: "Wheelchair accessible", value: "✓ All properties" },
      ].map((r) => (
        <div key={r.label} className="flex justify-between py-1.5" style={{ borderBottom: "1px solid var(--gray-light)" }}>
          <p className="text-[12px]" style={{ color: "var(--gray)", fontFamily: "'DM Sans'" }}>{r.label}</p>
          <p className={`text-[12px] ${r.bold ? "font-bold" : ""}`} style={{ color: r.bold ? "var(--navy)" : "var(--navy)", fontFamily: "'DM Sans'" }}>{r.value}</p>
        </div>
      ))}
    </div>

    {/* Add button */}
    <div className="px-4 mt-3 space-y-2">
      <AddButton labelEn="＋ Add Accommodation" labelAr="إضافة إقامة" onClick={onAdd} />
      {onScan && (
        <button onClick={onScan} className="w-full text-center text-[12px] py-1.5 btn-press" style={{ color: "var(--teal-mid)" }}>
          📸 Or scan a hotel booking confirmation
          <span className="block font-arabic text-[10px]" dir="rtl" style={{ color: "var(--gray)" }}>أو امسح تأكيد الحجز</span>
        </button>
      )}
    </div>
  </div>
);

/* ─── STEPS TAB ─── */
const StepsTab = ({
  expanded, setExpanded, activeTrip, trips, steps,
  flashStepId, flashTripId, dragStepId, setDragStepId, onReorderStep,
  onAddTrip, onEditTrip, onEditStep, onAddStep,
}: {
  expanded: number | null;
  setExpanded: (v: number | null) => void;
  activeTrip: TripData;
  trips: TripData[];
  steps: JourneyStep[];
  flashStepId: number | null;
  flashTripId: string | null;
  dragStepId: number | null;
  setDragStepId: (id: number | null) => void;
  onReorderStep: (sourceId: number, targetId: number) => void;
  onAddTrip: () => void;
  onEditTrip: () => void;
  onEditStep: (s: JourneyStep) => void;
  onAddStep: () => void;
}) => (
  <div>
    {/* PROMINENT ADD-TRIP CTA at top */}
    <div className="px-4 pt-3">
      <button
        onClick={onAddTrip}
        className="w-full flex items-center justify-center gap-2 btn-press"
        style={{ height: 48, borderRadius: 14, background: "linear-gradient(135deg, var(--gold), #B8884D)", color: "white", boxShadow: "0 6px 20px rgba(197,150,90,0.3)" }}
      >
        <Plus size={16} />
        <span className="text-[13px] font-bold" style={{ fontFamily: "'DM Sans'" }}>＋ Add New Trip</span>
        <span className="font-arabic text-[12px]" dir="rtl">إضافة رحلة جديدة</span>
      </button>
    </div>
    {/* Trips overview — current vs past */}
    {trips.length > 0 && (
      <div className="px-4 pt-3">
        <div className="flex items-center justify-between mb-1.5">
          <p className="font-mono text-[9px] tracking-widest" style={{ color: "var(--teal-deep)" }}>YOUR JOURNEYS<span className="font-arabic" dir="rtl"> · رحلاتك</span></p>
          <button onClick={onEditTrip} className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold btn-press" style={{ background: "var(--teal-light)", color: "var(--teal-deep)" }}>
            <Edit3 size={10} /> Edit Current Trip
          </button>
        </div>
        <div className="space-y-1.5">
          {trips.map((t) => (
            <div
              key={t.id}
              className={`flex items-center gap-2 rounded-xl px-3 py-2 transition-shadow ${flashTripId === t.id ? "animate-flash-gold" : ""}`}
              style={{
                background: t.status === "active" ? "var(--gold-pale)" : "var(--white)",
                border: t.status === "active" ? "1px solid var(--gold)" : "1px solid var(--gray-light)",
              }}
            >
              <span className="text-base">{t.specialtyEmoji || "🏥"}</span>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-semibold truncate" style={{ color: "var(--navy)" }}>{t.destination} · {t.specialty}</p>
                <p className="text-[10px]" style={{ color: "var(--gray)" }}>{t.hospital} · {t.departureDate}</p>
              </div>
              <button
                onClick={onEditTrip}
                className="w-7 h-7 rounded-full flex items-center justify-center btn-press shrink-0"
                style={{ background: "var(--white)", border: "1px solid var(--gray-light)" }}
                aria-label="Edit trip"
              >
                <Edit3 size={11} style={{ color: "var(--teal-deep)" }} />
              </button>
              <span className="font-mono text-[8px] px-1.5 py-0.5 rounded-full" style={{
                background: t.status === "active" ? "var(--gold)" : "var(--off-white)",
                color: t.status === "active" ? "white" : "var(--gray)",
              }}>{t.status === "active" ? "CURRENT" : "UPCOMING"}</span>
            </div>
          ))}
        </div>
      </div>
    )}
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
        const phaseSteps = steps.filter((s) => s.phase === phase.key);
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
                    <div
                      className={`relative mb-2.5 ${flashStepId === step.id ? "animate-flash-gold rounded-xl" : ""}`}
                      draggable
                      onDragStart={() => setDragStepId(step.id)}
                      onDragEnd={() => setDragStepId(null)}
                      onDragOver={(e) => { if (dragStepId != null && dragStepId !== step.id) e.preventDefault(); }}
                      onDrop={(e) => {
                        e.preventDefault();
                        if (dragStepId != null) onReorderStep(dragStepId, step.id);
                        setDragStepId(null);
                      }}
                      style={{
                        opacity: dragStepId === step.id ? 0.4 : 1,
                        transition: "opacity 0.15s",
                      }}
                    >
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
                          cursor: dragStepId === step.id ? "grabbing" : "grab",
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="text-[10px] select-none" style={{ color: "var(--gray-light)" }} aria-hidden>⋮⋮</span>
                            <div className="min-w-0">
                              <p className="text-[13px] font-semibold truncate" style={{ color: isPending ? "var(--gray)" : "var(--navy)" }}>{step.titleEn}</p>
                              <p className="font-arabic text-[10px] mt-0.5 truncate" dir="rtl" style={{ color: "var(--gray)" }}>{step.titleAr}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="font-mono text-[9px]" style={{ color: "var(--gray)" }}>{step.date}</span>
                            <button onClick={(e) => { e.stopPropagation(); onEditStep(step); }} className="w-6 h-6 rounded-full flex items-center justify-center btn-press" style={{ background: "var(--off-white)" }}>
                              <Edit3 size={10} style={{ color: "var(--teal-deep)" }} />
                            </button>
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

      <div className="mt-2">
        <button
          onClick={onAddTrip}
          className="w-full flex items-center justify-center gap-2 btn-press pulse-gold"
          style={{ height: 56, borderRadius: 16, background: "linear-gradient(135deg, var(--gold), #B8884D)", color: "white", boxShadow: "0 6px 20px rgba(197,150,90,0.35)" }}
        >
          <Sparkles size={16} />
          <span className="text-[14px] font-bold" style={{ fontFamily: "'DM Sans'" }}>＋ Add New Trip</span>
          <span className="font-arabic text-[12px]" dir="rtl">إضافة رحلة جديدة</span>
        </button>
        <p className="text-center font-mono text-[9px] mt-2" style={{ color: "var(--gray)" }}>
          Free tier: 1 trip · Pro: unlimited · <span className="font-arabic">الباقة المجانية: رحلة واحدة</span>
        </p>
      </div>
    </div>
  </div>
);

/* ─── APPOINTMENTS TAB ─── */
const AppointmentsTab = ({ onOpenScanner }: { onOpenScanner?: (cat?: string) => void }) => {
  const [showAddAppt, setShowAddAppt] = useState(false);
  const [localAppts, setLocalAppts] = useState<Appointment[]>(appointments);
  const upcomingAppts = localAppts.filter(a => a.status === "upcoming");
  const pastAppts = localAppts.filter(a => a.status === "completed" || a.status === "cancelled");

  const typeIcon = (type: Appointment["type"]) => {
    if (type === "telemedicine") return <Video size={14} style={{ color: "var(--teal-deep)" }} />;
    if (type === "clinic") return <Building2 size={14} style={{ color: "var(--gold)" }} />;
    return <MapPin size={14} style={{ color: "var(--success)" }} />;
  };

  const typeLabel = (type: Appointment["type"]) => {
    if (type === "telemedicine") return "Telemedicine";
    if (type === "clinic") return "Clinic";
    return "Hospital";
  };

  const statusBadge = (status: Appointment["status"]) => {
    if (status === "completed") return { label: "DONE ✓", bg: "rgba(61,170,110,0.1)", color: "var(--success)" };
    if (status === "cancelled") return { label: "CANCELLED", bg: "rgba(217,79,79,0.1)", color: "var(--error)" };
    return { label: "UPCOMING", bg: "rgba(197,150,90,0.1)", color: "var(--gold)" };
  };

  const handleAddAppointment = (data: AppointmentFormData) => {
    const newAppt: Appointment = {
      id: `apt-${Date.now()}`,
      doctorName: data.doctorName || "TBD",
      doctorNameAr: data.doctorNameAr || "لم يحدد",
      specialty: data.specialty || data.appointmentType,
      specialtyAr: data.specialty || data.appointmentType,
      location: data.location || data.hospital || "TBD",
      locationAr: data.locationAr || data.hospitalAr || "لم يحدد",
      type: data.visitType === "telemedicine" ? "telemedicine" : data.visitType === "clinic" ? "clinic" : "in-person",
      date: data.date ? new Date(data.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "TBD",
      time: data.time || "TBD",
      status: "upcoming",
      hospital: data.hospital,
      hospitalAr: data.hospitalAr,
      notes: data.notes,
      notesAr: data.notesAr,
    };
    setLocalAppts(prev => [...prev, newAppt]);
    toast.success("Appointment added · تم إضافة الموعد", { duration: 3000 });
  };

  const renderApptCard = (apt: Appointment) => {
    const sb = statusBadge(apt.status);
    return (
      <div key={apt.id} className="rounded-xl p-4 card-press" style={{ background: "var(--white)", border: "1px solid var(--gray-light)", boxShadow: "0 1px 6px rgba(0,0,0,0.04)" }}>
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: apt.type === "telemedicine" ? "var(--teal-light)" : apt.type === "clinic" ? "var(--gold-pale)" : "rgba(61,170,110,0.1)" }}>
            {typeIcon(apt.type)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <p className="text-[13px] font-semibold truncate" style={{ color: "var(--navy)" }}>{apt.doctorName}</p>
              <span className="font-mono text-[8px] px-1.5 py-0.5 rounded-full shrink-0 ml-2" style={{ background: sb.bg, color: sb.color }}>{sb.label}</span>
            </div>
            <p className="font-arabic text-[10px] truncate" dir="rtl" style={{ color: "var(--gray)" }}>{apt.doctorNameAr}</p>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="text-[9px] px-1.5 py-0.5 rounded-full" style={{ background: "var(--off-white)", color: "var(--navy)", border: "1px solid var(--gray-light)" }}>{apt.specialty}</span>
              <span className="text-[9px] px-1.5 py-0.5 rounded-full" style={{ background: "var(--off-white)", color: "var(--navy)", border: "1px solid var(--gray-light)" }}>{typeLabel(apt.type)}</span>
            </div>
            <div className="flex items-center gap-2 mt-1.5">
              <span className="font-mono text-[10px]" style={{ color: "var(--teal-deep)" }}>📅 {apt.date}</span>
              <span className="font-mono text-[10px]" style={{ color: "var(--gray)" }}>🕐 {apt.time}</span>
            </div>
            <p className="text-[10px] mt-1" style={{ color: "var(--gray)" }}>📍 {apt.location}</p>
            {apt.notes && <p className="text-[10px] mt-1 italic" style={{ color: "var(--gray)" }}>{apt.notes}</p>}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="px-4 pt-2 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-mono text-[9px] tracking-widest" style={{ color: "var(--teal-deep)" }}>YOUR APPOINTMENTS</p>
          <p className="font-arabic text-[10px]" dir="rtl" style={{ color: "var(--gray)" }}>مواعيدك الطبية</p>
        </div>
        <button onClick={() => setShowAddAppt(true)} className="flex items-center gap-1 px-3 py-1.5 rounded-full text-[11px] font-medium btn-press" style={{ background: "var(--teal-deep)", color: "#fff" }}>
          <Plus size={12} /> Add
        </button>
      </div>

      {/* Upcoming */}
      {upcomingAppts.length > 0 && (
        <>
          <p className="font-mono text-[9px] tracking-widest" style={{ color: "var(--gold)" }}>UPCOMING — {upcomingAppts.length}</p>
          {upcomingAppts.map(renderApptCard)}
        </>
      )}

      {/* Past */}
      {pastAppts.length > 0 && (
        <>
          <p className="font-mono text-[9px] tracking-widest mt-2" style={{ color: "var(--gray)" }}>PAST — {pastAppts.length}</p>
          {pastAppts.map(renderApptCard)}
        </>
      )}

      <AppointmentFormSheet
        open={showAddAppt}
        onClose={() => setShowAddAppt(false)}
        onSubmit={handleAddAppointment}
        onScan={() => onOpenScanner?.()}
      />
    </div>
  );
};

export default JourneyScreen;
