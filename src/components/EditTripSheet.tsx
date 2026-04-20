import { useState, useEffect } from "react";
import { X, MapPin, Plane, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { TripData, FlightInfo, Companion } from "./AddTripSheet";

interface EditTripSheetProps {
  open: boolean;
  trip: TripData | null;
  onClose: () => void;
  onSave: (trip: TripData) => void;
}

const SPECIALTIES = [
  { emoji: "🦴", en: "Orthopedics" }, { emoji: "❤️", en: "Cardiology" },
  { emoji: "🧠", en: "Neurology" }, { emoji: "🎗️", en: "Oncology" },
  { emoji: "👁️", en: "Ophthalmology" }, { emoji: "🦷", en: "Dental" },
  { emoji: "🔬", en: "General Surgery" }, { emoji: "💊", en: "Internal Medicine" },
  { emoji: "🧬", en: "Genetics" }, { emoji: "📋", en: "Other" },
];

const SEAT_CLASSES = ["Economy", "Business", "First"];
const RELATIONS = ["Wife", "Husband", "Son", "Daughter", "Father", "Mother", "Brother", "Sister", "Other"];

const splitDT = (iso: string): [string, string] => {
  if (!iso) return ["", ""];
  const [d, t = ""] = iso.split("T");
  return [d, t.slice(0, 5)];
};
const joinDT = (d: string, t: string) => (d && t ? `${d}T${t}` : d || "");

const emptyFlight = (): FlightInfo => ({
  airline: "", flightNumber: "", bookingRef: "",
  fromAirport: "", fromCity: "", fromAirportFull: "",
  toAirport: "", toCity: "", toAirportFull: "",
  departureDateTime: "", arrivalDateTime: "",
  seatClass: "Economy", seatNumber: "",
});

const inputStyle: React.CSSProperties = {
  background: "var(--off-white)", border: "1px solid var(--gray-light)",
  color: "var(--navy)", borderRadius: 12, padding: "10px 12px",
  fontSize: 13, width: "100%", outline: "none",
};

const Field = ({ label, labelAr, children }: { label: string; labelAr?: string; children: React.ReactNode }) => (
  <div>
    <label className="font-mono text-[9px] tracking-widest" style={{ color: "var(--gold)" }}>
      {label}{labelAr && <> · <span className="font-arabic">{labelAr}</span></>}
    </label>
    <div className="mt-1">{children}</div>
  </div>
);

const EditTripSheet = ({ open, trip, onClose, onSave }: EditTripSheetProps) => {
  const [tab, setTab] = useState<"basics" | "outbound" | "return" | "companions">("basics");

  const [destination, setDestination] = useState("");
  const [hospital, setHospital] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [specialtyEmoji, setSpecialtyEmoji] = useState("");
  const [doctor, setDoctor] = useState("");
  const [departureDate, setDepartureDate] = useState("");
  const [returnDate, setReturnDate] = useState("");
  const [companionName, setCompanionName] = useState("");
  const [insuranceRef, setInsuranceRef] = useState("");
  const [status, setStatus] = useState<TripData["status"]>("active");
  const [outFlight, setOutFlight] = useState<FlightInfo>(emptyFlight());
  const [retFlight, setRetFlight] = useState<FlightInfo | null>(null);
  const [companions, setCompanions] = useState<Companion[]>([]);

  useEffect(() => {
    if (!trip) return;
    setDestination(trip.destination);
    setHospital(trip.hospital);
    setSpecialty(trip.specialty);
    setSpecialtyEmoji(trip.specialtyEmoji || "");
    setDoctor(trip.treatingDoctor);
    setDepartureDate(trip.departureDate);
    setReturnDate(trip.returnDate);
    setCompanionName(trip.companionName);
    setInsuranceRef(trip.insuranceRef);
    setStatus(trip.status);
    setOutFlight(trip.outboundFlight ? { ...trip.outboundFlight } : emptyFlight());
    setRetFlight(trip.returnFlight ? { ...trip.returnFlight } : null);
    setCompanions(trip.companions ? [...trip.companions] : []);
    setTab("basics");
  }, [trip, open]);

  if (!open || !trip) return null;

  const handleSave = () => {
    if (!destination.trim() || !hospital.trim()) {
      toast.error("Destination and hospital are required");
      return;
    }
    const validCompanions = companions.filter((c) => c.name.trim());
    onSave({
      ...trip,
      destination: destination.trim(),
      hospital: hospital.trim(),
      specialty: specialty.trim(),
      specialtyEmoji,
      treatingDoctor: doctor.trim(),
      departureDate, returnDate,
      companionName: validCompanions[0]?.name || companionName.trim(),
      companion: !!(validCompanions.length || companionName.trim()),
      companions: validCompanions.length ? validCompanions : undefined,
      insuranceRef: insuranceRef.trim(),
      status,
      outboundFlight: outFlight.airline || outFlight.flightNumber ? outFlight : null,
      returnFlight: retFlight && (retFlight.airline || retFlight.flightNumber) ? retFlight : null,
    });
    toast.success("Trip updated · تم تحديث الرحلة");
    onClose();
  };

  const updateFlight = (which: "out" | "ret", patch: Partial<FlightInfo>) => {
    if (which === "out") setOutFlight({ ...outFlight, ...patch });
    else setRetFlight({ ...(retFlight || emptyFlight()), ...patch });
  };

  const addCompanion = () => setCompanions([...companions, { name: "", relation: "Wife", idOrPassport: "", dob: "", seatNumber: "" }]);
  const updateCompanion = (i: number, field: keyof Companion, val: string) => {
    const next = [...companions]; (next[i] as any)[field] = val; setCompanions(next);
  };
  const removeCompanion = (i: number) => setCompanions(companions.filter((_, idx) => idx !== i));

  const FlightEditor = ({ which, flight }: { which: "out" | "ret"; flight: FlightInfo }) => {
    const [depD, depT] = splitDT(flight.departureDateTime);
    const [arrD, arrT] = splitDT(flight.arrivalDateTime);
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <Field label="AIRLINE"><input style={inputStyle} value={flight.airline} onChange={e => updateFlight(which, { airline: e.target.value })} placeholder="Saudia" /></Field>
          <Field label="FLIGHT #"><input style={inputStyle} value={flight.flightNumber} onChange={e => updateFlight(which, { flightNumber: e.target.value.toUpperCase() })} placeholder="SV 301" /></Field>
        </div>
        <Field label="BOOKING REF / PNR"><input style={inputStyle} value={flight.bookingRef} onChange={e => updateFlight(which, { bookingRef: e.target.value.toUpperCase() })} placeholder="AB1234" /></Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="FROM (CODE)"><input style={inputStyle} value={flight.fromAirport} onChange={e => updateFlight(which, { fromAirport: e.target.value.toUpperCase() })} placeholder="RUH" /></Field>
          <Field label="FROM CITY"><input style={inputStyle} value={flight.fromCity} onChange={e => updateFlight(which, { fromCity: e.target.value })} placeholder="Riyadh" /></Field>
        </div>
        <Field label="FROM (FULL NAME)"><input style={inputStyle} value={flight.fromAirportFull} onChange={e => updateFlight(which, { fromAirportFull: e.target.value })} placeholder="King Khalid Intl" /></Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="TO (CODE)"><input style={inputStyle} value={flight.toAirport} onChange={e => updateFlight(which, { toAirport: e.target.value.toUpperCase() })} placeholder="BER" /></Field>
          <Field label="TO CITY"><input style={inputStyle} value={flight.toCity} onChange={e => updateFlight(which, { toCity: e.target.value })} placeholder="Berlin" /></Field>
        </div>
        <Field label="TO (FULL NAME)"><input style={inputStyle} value={flight.toAirportFull} onChange={e => updateFlight(which, { toAirportFull: e.target.value })} placeholder="Brandenburg Intl" /></Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="DEPART DATE"><input type="date" style={inputStyle} value={depD} onChange={e => updateFlight(which, { departureDateTime: joinDT(e.target.value, depT) })} /></Field>
          <Field label="DEPART TIME"><input type="time" style={inputStyle} value={depT} onChange={e => updateFlight(which, { departureDateTime: joinDT(depD, e.target.value) })} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Field label="ARRIVE DATE"><input type="date" style={inputStyle} value={arrD} onChange={e => updateFlight(which, { arrivalDateTime: joinDT(e.target.value, arrT) })} /></Field>
          <Field label="ARRIVE TIME"><input type="time" style={inputStyle} value={arrT} onChange={e => updateFlight(which, { arrivalDateTime: joinDT(arrD, e.target.value) })} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Field label="CLASS">
            <select style={inputStyle} value={flight.seatClass} onChange={e => updateFlight(which, { seatClass: e.target.value })}>
              {SEAT_CLASSES.map(c => <option key={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="SEAT"><input style={inputStyle} value={flight.seatNumber} onChange={e => updateFlight(which, { seatNumber: e.target.value.toUpperCase() })} placeholder="24A" /></Field>
        </div>
      </div>
    );
  };

  const tabs = [
    { k: "basics", label: "Basics", ar: "أساسيات" },
    { k: "outbound", label: "Outbound", ar: "الذهاب" },
    { k: "return", label: "Return", ar: "العودة" },
    { k: "companions", label: `Companions${companions.length ? ` (${companions.length})` : ""}`, ar: "المرافقون" },
  ] as const;

  return (
    <div className="absolute inset-0 z-50 flex flex-col justify-end" onClick={onClose}>
      <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.5)" }} />
      <div className="relative animate-slide-up rounded-t-3xl flex flex-col" style={{ background: "var(--white)", maxHeight: "92%" }} onClick={e => e.stopPropagation()}>
        <div className="flex justify-center pt-3 shrink-0">
          <div style={{ width: 36, height: 4, background: "#DEE4E9", borderRadius: 2 }} />
        </div>
        <div className="flex items-center justify-between px-5 pt-3 pb-2 shrink-0">
          <div>
            <p className="font-display text-xl flex items-center gap-2" style={{ color: "var(--navy)" }}>
              <MapPin size={18} style={{ color: "var(--teal-deep)" }} /> Edit Trip
            </p>
            <p className="font-arabic text-sm" dir="rtl" style={{ color: "var(--gray)" }}>تعديل الرحلة</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center btn-press" style={{ background: "var(--off-white)" }}>
            <X size={16} style={{ color: "var(--gray)" }} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1.5 px-5 pb-2 shrink-0 overflow-x-auto">
          {tabs.map(t => (
            <button
              key={t.k}
              onClick={() => setTab(t.k as any)}
              className="px-3 py-1.5 rounded-full text-[11px] font-bold whitespace-nowrap transition-all"
              style={{
                background: tab === t.k ? "var(--teal-deep)" : "var(--off-white)",
                color: tab === t.k ? "white" : "var(--gray)",
                border: tab === t.k ? "none" : "1px solid var(--gray-light)",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="overflow-y-auto px-5 pb-4 space-y-3" style={{ WebkitOverflowScrolling: "touch" }}>
          {tab === "basics" && (
            <>
              <Field label="DESTINATION" labelAr="الوجهة"><input style={inputStyle} value={destination} onChange={e => setDestination(e.target.value)} placeholder="Berlin, Germany" /></Field>
              <Field label="HOSPITAL" labelAr="المستشفى"><input style={inputStyle} value={hospital} onChange={e => setHospital(e.target.value)} placeholder="Charité Hospital" /></Field>
              <Field label="SPECIALTY" labelAr="التخصص">
                <select style={inputStyle} value={specialty} onChange={e => {
                  const m = SPECIALTIES.find(s => s.en === e.target.value);
                  setSpecialty(e.target.value); if (m) setSpecialtyEmoji(m.emoji);
                }}>
                  <option value="">Select…</option>
                  {SPECIALTIES.map(s => <option key={s.en} value={s.en}>{s.emoji} {s.en}</option>)}
                </select>
              </Field>
              <Field label="TREATING DOCTOR" labelAr="الطبيب المعالج"><input style={inputStyle} value={doctor} onChange={e => setDoctor(e.target.value)} placeholder="Dr. Mueller" /></Field>
              <div className="grid grid-cols-2 gap-2">
                <Field label="DEPARTURE" labelAr="المغادرة"><input type="date" style={inputStyle} value={departureDate} onChange={e => setDepartureDate(e.target.value)} /></Field>
                <Field label="RETURN" labelAr="العودة"><input type="date" style={inputStyle} value={returnDate} onChange={e => setReturnDate(e.target.value)} /></Field>
              </div>
              <Field label="INSURANCE REF" labelAr="مرجع التأمين"><input style={inputStyle} value={insuranceRef} onChange={e => setInsuranceRef(e.target.value)} placeholder="BUPA-2026-7823" /></Field>
              <Field label="STATUS" labelAr="الحالة">
                <div className="grid grid-cols-2 gap-2">
                  {(["active", "upcoming"] as const).map(s => (
                    <button key={s} onClick={() => setStatus(s)} className="py-2 rounded-lg text-[11px] font-bold uppercase btn-press"
                      style={{
                        background: status === s ? "var(--teal-deep)" : "var(--off-white)",
                        color: status === s ? "white" : "var(--navy)",
                        border: status === s ? "none" : "1px solid var(--gray-light)",
                      }}>{s}</button>
                  ))}
                </div>
              </Field>
            </>
          )}

          {tab === "outbound" && (
            <>
              <p className="text-[11px]" style={{ color: "var(--gray)" }}>
                <Plane size={12} className="inline mr-1" /> Outbound flight details · رحلة الذهاب
              </p>
              <FlightEditor which="out" flight={outFlight} />
            </>
          )}

          {tab === "return" && (
            <>
              <div className="flex items-center justify-between">
                <p className="text-[11px]" style={{ color: "var(--gray)" }}>
                  <Plane size={12} className="inline mr-1 rotate-180" /> Return flight · رحلة العودة
                </p>
                <button
                  onClick={() => setRetFlight(retFlight ? null : emptyFlight())}
                  className="text-[10px] font-bold px-2 py-1 rounded-full"
                  style={{
                    background: retFlight ? "rgba(217,79,79,0.1)" : "var(--teal-light)",
                    color: retFlight ? "var(--error)" : "var(--teal-deep)",
                  }}
                >
                  {retFlight ? "Remove return" : "+ Add return"}
                </button>
              </div>
              {retFlight ? <FlightEditor which="ret" flight={retFlight} /> : (
                <p className="text-[11px] italic text-center py-6" style={{ color: "var(--gray)" }}>
                  No return flight set · لا توجد رحلة عودة
                </p>
              )}
            </>
          )}

          {tab === "companions" && (
            <>
              <p className="text-[11px]" style={{ color: "var(--gray)" }}>Travelers accompanying you · المرافقون معك</p>
              {companions.map((c, i) => (
                <div key={i} className="rounded-xl p-3 space-y-2" style={{ background: "var(--off-white)", border: "1px solid var(--gray-light)" }}>
                  <div className="flex items-center justify-between">
                    <p className="font-mono text-[10px] tracking-widest" style={{ color: "var(--gold)" }}>COMPANION {i + 1}</p>
                    <button onClick={() => removeCompanion(i)} className="flex items-center gap-1 text-[10px]" style={{ color: "var(--error)" }}>
                      <Trash2 size={11} /> Remove
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input style={{ ...inputStyle, height: 38 }} value={c.name} onChange={e => updateCompanion(i, "name", e.target.value)} placeholder="Full name" />
                    <select style={{ ...inputStyle, height: 38 }} value={c.relation} onChange={e => updateCompanion(i, "relation", e.target.value)}>
                      {RELATIONS.map(r => <option key={r}>{r}</option>)}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input style={{ ...inputStyle, height: 38 }} value={c.idOrPassport} onChange={e => updateCompanion(i, "idOrPassport", e.target.value)} placeholder="ID / Passport" />
                    <input type="date" style={{ ...inputStyle, height: 38 }} value={c.dob} onChange={e => updateCompanion(i, "dob", e.target.value)} />
                  </div>
                  <input style={{ ...inputStyle, height: 38 }} value={c.seatNumber || ""} onChange={e => updateCompanion(i, "seatNumber", e.target.value)} placeholder="Seat (optional)" />
                </div>
              ))}
              <button onClick={addCompanion} className="w-full py-2.5 rounded-xl text-[12px] font-medium btn-press flex items-center justify-center gap-1" style={{ background: "var(--white)", border: "1px dashed var(--teal-deep)", color: "var(--teal-deep)" }}>
                <Plus size={13} /> Add companion · إضافة مرافق
              </button>
            </>
          )}
        </div>

        <div className="px-5 py-3 shrink-0" style={{ borderTop: "1px solid var(--gray-light)" }}>
          <button onClick={handleSave}
            className="w-full py-3 rounded-xl font-semibold text-white btn-press"
            style={{ background: "linear-gradient(135deg, var(--teal-deep), var(--teal-mid))" }}>
            Save Changes · حفظ التغييرات
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditTripSheet;
