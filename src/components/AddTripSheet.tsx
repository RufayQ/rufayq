import { useRef, useState } from "react";
import { X, ChevronDown, ExternalLink, Upload, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getDeviceId } from "@/hooks/useDeviceId";
import { pdfToImageDataUrls } from "@/lib/pdfToImages";

export interface FlightInfo {
  airline: string;
  flightNumber: string;
  bookingRef: string;
  fromAirport: string;
  fromCity: string;
  fromAirportFull: string;
  toAirport: string;
  toCity: string;
  toAirportFull: string;
  departureDateTime: string;
  arrivalDateTime: string;
  seatClass: string;
  seatNumber: string;
}

export interface Companion {
  name: string;
  relation: string; // Wife, Son, Daughter, Brother, Father, Mother, Other
  idOrPassport: string;
  dob: string;
  seatNumber?: string;
}

export interface TripData {
  id: string;
  destination: string;
  hospital: string;
  specialty: string;
  specialtyEmoji: string;
  departureDate: string;
  returnDate: string;
  treatingDoctor: string;
  companion: boolean;
  companionName: string;
  companions?: Companion[];
  insuranceRef: string;
  status: "active" | "upcoming";
  outboundFlight: FlightInfo | null;
  returnFlight: FlightInfo | null;
}

const specialties = [
  { emoji: "🦴", en: "Orthopedics", ar: "عظام وعمود فقري" },
  { emoji: "❤️", en: "Cardiology", ar: "قلب وأوعية دموية" },
  { emoji: "🧠", en: "Neurology", ar: "أعصاب" },
  { emoji: "🎗️", en: "Oncology", ar: "أورام" },
  { emoji: "👁️", en: "Ophthalmology", ar: "عيون" },
  { emoji: "🦷", en: "Dental", ar: "أسنان وفكوك" },
  { emoji: "🔬", en: "General Surgery", ar: "جراحة عامة" },
  { emoji: "💊", en: "Internal Medicine", ar: "باطنية" },
  { emoji: "🧬", en: "Genetics", ar: "جينات" },
  { emoji: "📋", en: "Other", ar: "أخرى" },
];

const airlines = [
  { emoji: "🇸🇦", en: "Saudia", ar: "الخطوط السعودية" },
  { emoji: "🟡", en: "flynas", ar: "فلاي ناس" },
  { emoji: "🟢", en: "flyadeal", ar: "فلاي ديل" },
  { emoji: "✈️", en: "Emirates", ar: "طيران الإمارات" },
  { emoji: "🔵", en: "Qatar Airways", ar: "القطرية" },
  { emoji: "⚪", en: "Lufthansa", ar: "لوفتهانزا" },
  { emoji: "🔴", en: "British Airways", ar: "الخطوط البريطانية" },
  { emoji: "🔵", en: "Air France", ar: "إير فرانس" },
  { emoji: "⭕", en: "Turkish Airlines", ar: "الخطوط التركية" },
  { emoji: "✏️", en: "Other", ar: "أخرى" },
];

const seatClasses = [
  { en: "Economy", ar: "اقتصادية" },
  { en: "Business", ar: "رجال أعمال" },
  { en: "First", ar: "أولى" },
];

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmit: (trip: TripData) => void;
}

const AddTripSheet = ({ open, onClose, onSubmit }: Props) => {
  const [destination, setDestination] = useState("");
  const [hospital, setHospital] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [specialtyEmoji, setSpecialtyEmoji] = useState("");
  const [showSpecialtyDrop, setShowSpecialtyDrop] = useState(false);
  const [departureDate, setDepartureDate] = useState("");
  const [returnDate, setReturnDate] = useState("");
  const [doctor, setDoctor] = useState("");
  const [companion, setCompanion] = useState<boolean | null>(null);
  const [companionName, setCompanionName] = useState("");
  const [companions, setCompanions] = useState<Companion[]>([]);
  const [insuranceRef, setInsuranceRef] = useState("");

  const addCompanion = () => setCompanions([...companions, { name: "", relation: "Wife", idOrPassport: "", dob: "", seatNumber: "" }]);
  const updateCompanion = (i: number, field: keyof Companion, val: string) => {
    const next = [...companions]; (next[i] as any)[field] = val; setCompanions(next);
  };
  const removeCompanion = (i: number) => setCompanions(companions.filter((_, idx) => idx !== i));

  // Flight fields
  const [showReturnFlight, setShowReturnFlight] = useState(false);
  const [outAirline, setOutAirline] = useState("");
  const [showAirlineDrop, setShowAirlineDrop] = useState(false);
  const [outFlightNum, setOutFlightNum] = useState("");
  const [outPNR, setOutPNR] = useState("");
  const [outFrom, setOutFrom] = useState("");
  const [outTo, setOutTo] = useState("");
  const [outDepDate, setOutDepDate] = useState("");
  const [outDepTime, setOutDepTime] = useState("");
  const [outArrDate, setOutArrDate] = useState("");
  const [outArrTime, setOutArrTime] = useState("");
  const [outClass, setOutClass] = useState("");
  const [outSeat, setOutSeat] = useState("");

  const [retAirline, setRetAirline] = useState("");
  const [showRetAirlineDrop, setShowRetAirlineDrop] = useState(false);
  const [retFlightNum, setRetFlightNum] = useState("");
  const [retPNR, setRetPNR] = useState("");
  const [retFrom, setRetFrom] = useState("");
  const [retTo, setRetTo] = useState("");
  const [retDepDate, setRetDepDate] = useState("");
  const [retDepTime, setRetDepTime] = useState("");
  const [retArrDate, setRetArrDate] = useState("");
  const [retArrTime, setRetArrTime] = useState("");
  const [retClass, setRetClass] = useState("");
  const [retSeat, setRetSeat] = useState("");

  const [errors, setErrors] = useState<string[]>([]);
  const [scanning, setScanning] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!open) return null;

  const fileToDataUrl = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result as string);
      r.onerror = reject;
      r.readAsDataURL(file);
    });

  const applyLeg = (leg: any, target: "out" | "ret") => {
    if (!leg) return;
    const set = target === "out"
      ? { airline: setOutAirline, num: setOutFlightNum, pnr: setOutPNR, from: setOutFrom, to: setOutTo, dD: setOutDepDate, dT: setOutDepTime, aD: setOutArrDate, aT: setOutArrTime, cls: setOutClass, seat: setOutSeat }
      : { airline: setRetAirline, num: setRetFlightNum, pnr: setRetPNR, from: setRetFrom, to: setRetTo, dD: setRetDepDate, dT: setRetDepTime, aD: setRetArrDate, aT: setRetArrTime, cls: setRetClass, seat: setRetSeat };
    if (leg.airline) set.airline(String(leg.airline));
    if (leg.flightNumber) set.num(String(leg.flightNumber).toUpperCase());
    if (leg.bookingRef) set.pnr(String(leg.bookingRef).toUpperCase());
    const fromLabel = [leg.fromAirport, leg.fromCity].filter(Boolean).join(" — ");
    const toLabel = [leg.toAirport, leg.toCity].filter(Boolean).join(" — ");
    if (fromLabel) set.from(fromLabel);
    if (toLabel) set.to(toLabel);
    if (leg.departureDateTime) {
      const [d, t] = String(leg.departureDateTime).split("T");
      if (d) set.dD(d); if (t) set.dT(t.slice(0, 5));
    }
    if (leg.arrivalDateTime) {
      const [d, t] = String(leg.arrivalDateTime).split("T");
      if (d) set.aD(d); if (t) set.aT(t.slice(0, 5));
    }
    if (leg.seatClass) set.cls(String(leg.seatClass).replace(/^./, (c: string) => c.toUpperCase()));
    if (leg.seatNumber) set.seat(String(leg.seatNumber));
  };

  const handleItineraryUpload = async (file: File) => {
    try {
      setScanning(true);
      if (file.size > 15 * 1024 * 1024) {
        toast.error("File too large (max 15 MB)");
        return;
      }

      // Convert PDF → images client-side. The AI gateway only accepts image content.
      let files: string[] = [];
      const isPdf = file.type === "application/pdf" || /\.pdf$/i.test(file.name);
      if (isPdf) {
        try {
          files = await pdfToImageDataUrls(file, { maxPages: 3, scale: 2 });
        } catch (err) {
          console.error("PDF render failed", err);
          toast.error("Could not open PDF. Try a screenshot of the ticket instead.");
          return;
        }
        if (files.length === 0) {
          toast.error("No pages found in PDF.");
          return;
        }
      } else {
        files = [await fileToDataUrl(file)];
      }

      const { data, error } = await supabase.functions.invoke("scan-itinerary", {
        body: { files },
        headers: { "x-device-id": getDeviceId() },
      });
      if (error) throw error;
      const parsed = (data as any)?.data ?? {};
      console.debug("[scan-itinerary] parsed payload", parsed);

      if (!parsed.outboundFlight && !parsed.returnFlight) {
        toast.error("We couldn't read flight details. Try a clearer image or a higher-quality PDF.");
        return;
      }

      applyLeg(parsed.outboundFlight, "out");
      if (parsed.returnFlight) {
        setShowReturnFlight(true);
        applyLeg(parsed.returnFlight, "ret");
      }
      // Pre-fill destination + departure date if still empty
      if (!destination && parsed.outboundFlight?.toCity) setDestination(String(parsed.outboundFlight.toCity).split(",")[0]);
      if (!departureDate && parsed.outboundFlight?.departureDateTime) {
        setDepartureDate(String(parsed.outboundFlight.departureDateTime).split("T")[0]);
      }
      if (!returnDate && parsed.returnFlight?.departureDateTime) {
        setReturnDate(String(parsed.returnFlight.departureDateTime).split("T")[0]);
      }
      const passenger = [parsed.passengerFirstName, parsed.passengerLastName].filter(Boolean).join(" ");
      const passportPart = parsed.passportNumber ? ` · Passport ${parsed.passportNumber}` : "";
      toast.success(
        `Itinerary scanned${passenger ? ` for ${passenger}` : ""}${passportPart} · review the fields below before saving.`,
        { duration: 7000 },
      );
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Could not read itinerary. Try a clearer photo or PDF.");
    } finally {
      setScanning(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };


  const validate = () => {
    const e: string[] = [];
    if (!destination) e.push("destination");
    if (!hospital) e.push("hospital");
    if (!specialty) e.push("specialty");
    if (!departureDate) e.push("departureDate");
    setErrors(e);
    return e.length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) {
      toast.error("Please fill in all required fields / يرجى تعبئة الحقول المطلوبة");
      return;
    }

    const buildFlight = (airline: string, num: string, pnr: string, from: string, to: string, depD: string, depT: string, arrD: string, arrT: string, cls: string, seat: string): FlightInfo | null => {
      if (!airline && !num) return null;
      return {
        airline, flightNumber: num, bookingRef: pnr,
        fromAirport: from.split(" ")[0] || from, fromCity: from, fromAirportFull: from,
        toAirport: to.split(" ")[0] || to, toCity: to, toAirportFull: to,
        departureDateTime: depD && depT ? `${depD}T${depT}` : depD,
        arrivalDateTime: arrD && arrT ? `${arrD}T${arrT}` : arrD,
        seatClass: cls, seatNumber: seat,
      };
    };

    const validCompanions = companions.filter((c) => c.name.trim());
    const trip: TripData = {
      id: `trip-${Date.now()}`,
      destination, hospital, specialty, specialtyEmoji,
      departureDate, returnDate,
      treatingDoctor: doctor,
      companion: companion === true || validCompanions.length > 0,
      companionName: validCompanions[0]?.name || companionName,
      companions: validCompanions.length > 0 ? validCompanions : undefined,
      insuranceRef,
      status: "active",
      outboundFlight: buildFlight(outAirline, outFlightNum, outPNR, outFrom, outTo, outDepDate, outDepTime, outArrDate, outArrTime, outClass, outSeat),
      returnFlight: showReturnFlight ? buildFlight(retAirline, retFlightNum, retPNR, retFrom, retTo, retDepDate, retDepTime, retArrDate, retArrTime, retClass, retSeat) : null,
    };

    onSubmit(trip);
    toast.success(`✓ Trip added${validCompanions.length ? ` with ${validCompanions.length} companion(s)` : ""}!`);
    onClose();
  };

  const inputStyle = (field: string) => ({
    background: "var(--white)",
    border: `1px solid ${errors.includes(field) ? "var(--error)" : "var(--gray-light)"}`,
    borderRadius: 12, height: 52, padding: "0 16px",
    fontFamily: "'DM Sans', system-ui", fontSize: 14, color: "var(--ink)",
    width: "100%", outline: "none",
  });

  const renderDropdown = (items: { emoji: string; en: string; ar: string }[], show: boolean, setShow: (v: boolean) => void, selected: string, onSelect: (en: string, emoji: string) => void) => (
    <div className="relative">
      <button onClick={() => setShow(!show)} className="w-full text-left flex items-center justify-between" style={inputStyle("")}>
        <span>{selected || <span style={{ color: "var(--gray)" }}>Select...</span>}</span>
        <ChevronDown size={16} color="var(--gray)" />
      </button>
      {show && (
        <div className="absolute z-50 w-full mt-1 rounded-xl overflow-y-auto" style={{ background: "var(--white)", border: "1px solid var(--gray-light)", maxHeight: 200, boxShadow: "0 8px 24px rgba(0,0,0,0.12)" }}>
          {items.map((item) => (
            <button key={item.en} onClick={() => { onSelect(item.en, item.emoji); setShow(false); }} className="w-full text-left px-4 flex items-center gap-2 hover:bg-gray-50" style={{ height: 44, fontFamily: "'DM Sans', system-ui", fontSize: 13 }}>
              <span>{item.emoji}</span>
              <span style={{ color: "var(--navy)" }}>{item.en}</span>
              <span className="font-arabic text-[11px] ml-auto" style={{ color: "var(--gray)" }}>{item.ar}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );

  const Label = ({ en, ar }: { en: string; ar: string }) => (
    <div className="mb-1.5">
      <span className="text-[11px]" style={{ color: "var(--gray)", fontFamily: "'DM Sans', system-ui" }}>{en}</span>
      <span className="font-arabic text-[10px] mr-2 float-right" dir="rtl" style={{ color: "var(--gray)" }}>{ar}</span>
    </div>
  );

  const PillSelect = ({ options, value, onChange }: { options: { en: string; ar: string }[]; value: string; onChange: (v: string) => void }) => (
    <div className="flex gap-2">
      {options.map((o) => (
        <button key={o.en} onClick={() => onChange(o.en)} className="flex-1 py-2.5 rounded-xl text-center transition-all" style={{
          background: value === o.en ? "var(--teal-deep)" : "var(--white)",
          color: value === o.en ? "var(--white)" : "var(--gray)",
          border: `1px solid ${value === o.en ? "var(--teal-deep)" : "var(--gray-light)"}`,
          fontSize: 12, fontFamily: "'DM Sans', system-ui",
          boxShadow: value === o.en ? "0 2px 8px rgba(0,77,91,0.2)" : "none",
        }}>
          <span>{o.en}</span>
          <br />
          <span className="font-arabic text-[10px]">{o.ar}</span>
        </button>
      ))}
    </div>
  );

  const renderFlightFields = ({ prefix, airline, setAirline, showDrop, setShowDrop, flightNum, setFlightNum, pnr, setPNR, from, setFrom, to, setTo, depDate, setDepDate, depTime, setDepTime, arrDate, setArrDate, arrTime, setArrTime, cls, setCls, seat, setSeat }: any) => (
    <div className="space-y-3">
      <Label en="Airline" ar="شركة الطيران" />
      {renderDropdown(airlines, showDrop, setShowDrop, airline, (en) => setAirline(en))}

      <div className="flex gap-3">
        <div className="flex-1">
          <Label en="Flight Number" ar="رقم الرحلة" />
          <input value={flightNum} onChange={(e) => setFlightNum(e.target.value.toUpperCase())} placeholder="e.g. SV 301" style={{ ...inputStyle(""), width: "100%" }} />
        </div>
        <div className="flex-1">
          <Label en="Booking Ref / PNR" ar="رقم الحجز" />
          <input value={pnr} onChange={(e) => setPNR(e.target.value.toUpperCase())} placeholder="e.g. AB1234" style={{ ...inputStyle(""), width: "100%" }} />
        </div>
      </div>

      <Label en="From" ar="من" />
      <input value={from} onChange={(e) => setFrom(e.target.value)} placeholder="RUH — King Khalid International" style={inputStyle("")} />

      <Label en="To" ar="إلى" />
      <input value={to} onChange={(e) => setTo(e.target.value)} placeholder="BER — Berlin Brandenburg" style={inputStyle("")} />

      <div className="flex gap-3">
        <div style={{ flex: "65%" }}>
          <Label en="Departure Date" ar="تاريخ الإقلاع" />
          <input type="date" value={depDate} onChange={(e) => setDepDate(e.target.value)} style={inputStyle("")} />
        </div>
        <div style={{ flex: "35%" }}>
          <Label en="Time" ar="الوقت" />
          <input type="time" value={depTime} onChange={(e) => setDepTime(e.target.value)} style={inputStyle("")} />
        </div>
      </div>

      <div className="flex gap-3">
        <div style={{ flex: "65%" }}>
          <Label en="Arrival Date" ar="تاريخ الوصول" />
          <input type="date" value={arrDate} onChange={(e) => setArrDate(e.target.value)} style={inputStyle("")} />
        </div>
        <div style={{ flex: "35%" }}>
          <Label en="Time" ar="الوقت" />
          <input type="time" value={arrTime} onChange={(e) => setArrTime(e.target.value)} style={inputStyle("")} />
        </div>
      </div>

      <Label en="Class" ar="الدرجة" />
      <PillSelect options={seatClasses} value={cls} onChange={setCls} />

      <Label en="Seat (optional)" ar="المقعد (اختياري)" />
      <input value={seat} onChange={(e) => setSeat(e.target.value)} placeholder="e.g. 24A" style={{ ...inputStyle(""), width: "40%" }} />
    </div>
  );

  return (
    <div className="absolute inset-0 z-50 flex flex-col justify-end" onClick={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.5)" }} />

      {/* Sheet */}
      <div className="relative animate-slide-up rounded-t-3xl overflow-y-auto" style={{ background: "var(--white)", maxHeight: "92%" }} onClick={(e) => e.stopPropagation()}>
        {/* Handle */}
        <div className="flex justify-center pt-3"><div style={{ width: 36, height: 4, background: "#DEE4E9", borderRadius: 2 }} /></div>

        {/* Header */}
        <div className="px-5 pt-4 flex items-start justify-between">
          <div>
            <p className="font-display text-[22px]" style={{ color: "var(--navy)" }}>New Treatment Trip</p>
            <p className="font-arabic text-sm" dir="rtl" style={{ color: "var(--gray)" }}>رحلة علاج جديدة</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "#F0F2F5" }}>
            <X size={18} color="var(--gray)" />
          </button>
        </div>

        <div className="mx-5 my-3" style={{ height: 2, background: "linear-gradient(90deg, var(--gold), transparent)" }} />

        {/* Form */}
        <div className="px-5 pb-8 space-y-4">
          <div>
            <Label en="Destination Country *" ar="بلد الوجهة" />
            <input value={destination} onChange={(e) => setDestination(e.target.value)} placeholder="e.g. Germany, USA, UK" style={inputStyle("destination")} />
          </div>

          <div>
            <Label en="City & Hospital *" ar="المدينة والمستشفى" />
            <input value={hospital} onChange={(e) => setHospital(e.target.value)} placeholder="e.g. Berlin — Charité Hospital" style={inputStyle("hospital")} />
          </div>

          <div>
            <Label en="Medical Specialty *" ar="التخصص الطبي" />
            {renderDropdown(specialties, showSpecialtyDrop, setShowSpecialtyDrop, specialty ? `${specialtyEmoji} ${specialty}` : "", (en, emoji) => { setSpecialty(en); setSpecialtyEmoji(emoji); })}
          </div>

          <div>
            <Label en="Departure Date *" ar="تاريخ المغادرة" />
            <input type="date" value={departureDate} onChange={(e) => setDepartureDate(e.target.value)} style={inputStyle("departureDate")} />
          </div>

          <div>
            <Label en="Expected Return Date" ar="تاريخ العودة المتوقع" />
            <input type="date" value={returnDate} onChange={(e) => setReturnDate(e.target.value)} style={inputStyle("")} />
            <p className="text-[10px] mt-1" style={{ color: "var(--gray)" }}>You can update this later · <span className="font-arabic" dir="rtl">يمكنك تعديله لاحقاً</span></p>
          </div>

          <div>
            <Label en="Treating Doctor (optional)" ar="الطبيب المعالج (اختياري)" />
            <input value={doctor} onChange={(e) => setDoctor(e.target.value)} placeholder="Dr. Full Name / د. الاسم الكامل" style={inputStyle("")} />
          </div>

          {/* Legacy single-companion question removed — replaced by Companions array below */}

          <div>
            <Label en="Companions traveling with you" ar="المرافقون معك" />
            <p className="text-[10px] mb-2" style={{ color: "var(--gray)" }}>e.g. wife + 2 children for treatment in Turkey · أضف كل مرافق</p>
            {companions.map((c, i) => (
              <div key={i} className="rounded-xl p-3 mb-2 space-y-2" style={{ background: "var(--off-white)", border: "1px solid var(--gray-light)" }}>
                <div className="flex items-center justify-between">
                  <p className="font-mono text-[10px] tracking-widest" style={{ color: "var(--gold)" }}>COMPANION {i + 1}</p>
                  <button onClick={() => removeCompanion(i)} className="text-[10px]" style={{ color: "var(--error)" }}>Remove</button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input value={c.name} onChange={(e) => updateCompanion(i, "name", e.target.value)} placeholder="Full name" style={{ ...inputStyle(""), height: 40 }} />
                  <select value={c.relation} onChange={(e) => updateCompanion(i, "relation", e.target.value)} style={{ ...inputStyle(""), height: 40 }}>
                    {["Wife", "Husband", "Son", "Daughter", "Father", "Mother", "Brother", "Sister", "Other"].map((r) => <option key={r}>{r}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input value={c.idOrPassport} onChange={(e) => updateCompanion(i, "idOrPassport", e.target.value)} placeholder="ID / Passport" style={{ ...inputStyle(""), height: 40 }} />
                  <input type="date" value={c.dob} onChange={(e) => updateCompanion(i, "dob", e.target.value)} style={{ ...inputStyle(""), height: 40 }} />
                </div>
                <input value={c.seatNumber || ""} onChange={(e) => updateCompanion(i, "seatNumber", e.target.value)} placeholder="Seat (optional, e.g. 24B)" style={{ ...inputStyle(""), height: 40 }} />
              </div>
            ))}
            <button onClick={addCompanion} className="w-full py-2.5 rounded-xl text-[12px] font-medium btn-press" style={{ background: "var(--white)", border: "1px dashed var(--teal-deep)", color: "var(--teal-deep)" }}>
              + Add companion · إضافة مرافق
            </button>
          </div>

          <div>
            <Label en="Insurance Reference No. (optional)" ar="رقم التأمين (اختياري)" />
            <input value={insuranceRef} onChange={(e) => setInsuranceRef(e.target.value)} placeholder="e.g. BUPA-2026-XXXX" style={inputStyle("")} />
          </div>

          {/* Flight Section */}
          <div style={{ borderTop: "1px dashed var(--gray-light)", paddingTop: 16, marginTop: 8 }}>
            <p className="font-mono text-[11px] tracking-widest mb-0.5" style={{ color: "var(--gold)" }}>✈️ FLIGHT DETAILS</p>
            <p className="text-[11px]" style={{ color: "var(--gray)" }}>Optional — fill in for full journey tracking</p>
            <p className="font-arabic text-[10px]" dir="rtl" style={{ color: "var(--gray)" }}>اختياري — أضفها لتتبع رحلتك بالكامل</p>
          </div>

          {/* Upload itinerary (PDF or image) — auto-fills round-trip / one-way fields */}
          <div className="rounded-xl p-3" style={{ background: "var(--off-white)", border: "1px dashed var(--teal-deep)" }}>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,application/pdf"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleItineraryUpload(f); }}
            />
            <button
              type="button"
              disabled={scanning}
              onClick={() => fileInputRef.current?.click()}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg btn-press"
              style={{ background: "var(--teal-deep)", color: "var(--white)", fontFamily: "'DM Sans'", fontSize: 13, opacity: scanning ? 0.7 : 1 }}
            >
              {scanning ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
              {scanning ? "Reading itinerary…" : "Upload itinerary (PDF / photo)"}
            </button>
            <p className="text-[10px] mt-2 text-center" style={{ color: "var(--gray)" }}>
              We'll auto-fill airline, flight number, PNR, dates, traveler name & passport.
            </p>
            <p className="font-arabic text-[10px] text-center" dir="rtl" style={{ color: "var(--gray)" }}>
              نقرأ التذكرة تلقائياً ونعبئ التفاصيل
            </p>
          </div>


          <p className="font-mono text-[10px] tracking-widest" style={{ color: "var(--teal-deep)" }}>OUTBOUND FLIGHT · رحلة الذهاب</p>
          <FlightFields
            prefix="out" airline={outAirline} setAirline={setOutAirline}
            showDrop={showAirlineDrop} setShowDrop={setShowAirlineDrop}
            flightNum={outFlightNum} setFlightNum={setOutFlightNum}
            pnr={outPNR} setPNR={setOutPNR}
            from={outFrom} setFrom={setOutFrom} to={outTo} setTo={setOutTo}
            depDate={outDepDate} setDepDate={setOutDepDate} depTime={outDepTime} setDepTime={setOutDepTime}
            arrDate={outArrDate} setArrDate={setOutArrDate} arrTime={outArrTime} setArrTime={setOutArrTime}
            cls={outClass} setCls={setOutClass} seat={outSeat} setSeat={setOutSeat}
          />

          {/* Return Flight Toggle */}
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-[12px]" style={{ color: "var(--navy)", fontFamily: "'DM Sans'" }}>Add return flight details</p>
              <p className="font-arabic text-[10px]" dir="rtl" style={{ color: "var(--gray)" }}>إضافة تفاصيل رحلة العودة</p>
            </div>
            <button onClick={() => setShowReturnFlight(!showReturnFlight)} className="w-11 h-6 rounded-full relative transition-all" style={{ background: showReturnFlight ? "var(--teal-deep)" : "var(--gray-light)" }}>
              <div className="absolute w-5 h-5 rounded-full bg-white top-0.5 transition-all shadow" style={{ left: showReturnFlight ? 22 : 2 }} />
            </button>
          </div>

          {showReturnFlight && (
            <>
              <p className="font-mono text-[10px] tracking-widest" style={{ color: "var(--teal-deep)" }}>RETURN FLIGHT · رحلة العودة</p>
              <FlightFields
                prefix="ret" airline={retAirline} setAirline={setRetAirline}
                showDrop={showRetAirlineDrop} setShowDrop={setShowRetAirlineDrop}
                flightNum={retFlightNum} setFlightNum={setRetFlightNum}
                pnr={retPNR} setPNR={setRetPNR}
                from={retFrom} setFrom={setRetFrom} to={retTo} setTo={setRetTo}
                depDate={retDepDate} setDepDate={setRetDepDate} depTime={retDepTime} setDepTime={setRetDepTime}
                arrDate={retArrDate} setArrDate={setRetArrDate} arrTime={retArrTime} setArrTime={setRetArrTime}
                cls={retClass} setCls={setRetClass} seat={retSeat} setSeat={setRetSeat}
              />
            </>
          )}

          {/* Submit */}
          <button onClick={handleSubmit} className="w-full btn-press" style={{
            height: 52, borderRadius: 14,
            background: "linear-gradient(135deg, var(--teal-deep), var(--teal-mid))",
            boxShadow: "0 6px 20px rgba(0,77,91,0.35)",
            color: "white", fontFamily: "'DM Sans'", fontSize: 16, fontWeight: 700,
          }}>
            Start My Journey
            <br />
            <span className="font-arabic text-[13px]" style={{ opacity: 0.8 }}>ابدأ رحلتي</span>
          </button>

          <button onClick={onClose} className="w-full text-center py-2 text-[13px]" style={{ color: "var(--gray)", fontFamily: "'DM Sans'" }}>
            Cancel · <span className="font-arabic">إلغاء</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddTripSheet;
