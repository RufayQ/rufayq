/**
 * Slice 3 — Manual flight entry fallback.
 *
 * Bottom sheet form opened from the failed-OCR card. User picks trip type,
 * fills outbound (and return / additional legs), and on submit we build the
 * same `{ outbound, return, legs?, passenger, source }` payload that OCR
 * produces — so the downstream pipeline (parseFlightJourney → Transport
 * Timeline) is identical.
 */
import { useState } from "react";
import { X, Plus, Trash2, ZoomIn, Lock, User, Users } from "lucide-react";
import type { FlightInfo } from "@/components/AddTripSheet";
import { useTrial } from "@/hooks/useTrial";
import { useSubscription } from "@/hooks/useSubscription";
import UpgradePrompt from "@/components/UpgradePrompt";

type TripMode = "one-way" | "round-trip" | "multi-city";
export type TravelerKind = "patient" | "companion" | "family";

const emptyLeg = (): FlightInfo => ({
  airline: "",
  flightNumber: "",
  bookingRef: "",
  fromAirport: "",
  fromCity: "",
  fromAirportFull: "",
  toAirport: "",
  toCity: "",
  toAirportFull: "",
  departureDateTime: "",
  arrivalDateTime: "",
  seatClass: "Economy",
  seatNumber: "",
});

export interface ManualFlightPayload {
  outbound: FlightInfo | null;
  return: FlightInfo | null;
  legs?: FlightInfo[];
  passenger?: { name?: string; passport?: string };
  source: "manual";
  traveler: TravelerKind;
}

interface Props {
  /** Optional pre-fill from a partial OCR payload. */
  initial?: { outbound?: FlightInfo | null; return?: FlightInfo | null; passenger?: { name?: string; passport?: string } } | null;
  /** Image data URLs of the page(s) the AI analyzed — rendered as a split-screen
   * preview so the user can read details directly from the document while typing. */
  documentImages?: string[];
  onClose: () => void;
  onSubmit: (payload: ManualFlightPayload) => void;
}

const Field = ({
  label,
  ar,
  value,
  onChange,
  type = "text",
  placeholder,
  required,
  testId,
}: {
  label: string;
  ar?: string;
  value: string;
  onChange: (v: string) => void;
  type?: "text" | "date" | "time";
  placeholder?: string;
  required?: boolean;
  testId?: string;
}) => (
  <label className="block">
    <span className="font-mono text-[8px] tracking-wider" style={{ color: "var(--gray)" }}>
      {label.toUpperCase()}
      {ar ? <span className="font-arabic ml-1" style={{ opacity: 0.7 }}>· {ar}</span> : null}
      {required ? <span style={{ color: "var(--error)" }}> *</span> : null}
    </span>
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      data-testid={testId}
      className="mt-1 w-full rounded-lg px-2 py-1.5 text-[13px] font-bold outline-none"
      style={{
        background: "var(--off-white)",
        color: "var(--navy)",
        border: "1px solid var(--gray-light)",
      }}
    />
  </label>
);

interface LegEditorProps {
  leg: FlightInfo;
  onChange: (next: FlightInfo) => void;
  onRemove?: () => void;
  title: string;
  titleAr: string;
  legIndex: number;
}

const LegEditor = ({ leg, onChange, onRemove, title, titleAr, legIndex }: LegEditorProps) => {
  // Combine date+time into ISO-ish string for the model field
  const [dateStr, setDateStr] = useState(() => leg.departureDateTime?.split("T")[0] || "");
  const [timeStr, setTimeStr] = useState(() => (leg.departureDateTime?.split("T")[1] || "").slice(0, 5));

  const update = (patch: Partial<FlightInfo>) => onChange({ ...leg, ...patch });
  const updateDate = (d: string) => {
    setDateStr(d);
    const t = timeStr || "00:00";
    update({ departureDateTime: d ? `${d}T${t}` : "" });
  };
  const updateTime = (t: string) => {
    setTimeStr(t);
    if (dateStr) update({ departureDateTime: `${dateStr}T${t || "00:00"}` });
  };

  return (
    <div
      className="rounded-xl p-3 space-y-2.5"
      style={{ background: "var(--white)", border: "1px solid var(--gray-light)" }}
      data-testid={`leg-editor-${legIndex}`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[12px] font-bold" style={{ color: "var(--navy)" }}>{title}</p>
          <p className="font-arabic text-[10px]" dir="rtl" style={{ color: "var(--gray)" }}>{titleAr}</p>
        </div>
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="w-7 h-7 rounded-full flex items-center justify-center btn-press"
            style={{ background: "rgba(217,79,79,0.1)", color: "var(--error)" }}
            aria-label="Remove leg"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Field label="Airline" ar="الناقل" value={leg.airline} onChange={v => update({ airline: v })} placeholder="Saudia" testId={`leg-${legIndex}-airline`} />
        <Field label="Flight No." ar="رقم الرحلة" value={leg.flightNumber} onChange={v => update({ flightNumber: v.toUpperCase() })} placeholder="SV123" testId={`leg-${legIndex}-flight`} required />
        <Field label="From (code)" ar="من" value={leg.fromAirport} onChange={v => update({ fromAirport: v.toUpperCase() })} placeholder="JED" testId={`leg-${legIndex}-from`} required />
        <Field label="To (code)" ar="إلى" value={leg.toAirport} onChange={v => update({ toAirport: v.toUpperCase() })} placeholder="LHR" testId={`leg-${legIndex}-to`} required />
        <Field label="From city" ar="مدينة المغادرة" value={leg.fromCity} onChange={v => update({ fromCity: v })} placeholder="Jeddah" />
        <Field label="To city" ar="مدينة الوصول" value={leg.toCity} onChange={v => update({ toCity: v })} placeholder="London" />
        <Field label="Date" ar="التاريخ" type="date" value={dateStr} onChange={updateDate} testId={`leg-${legIndex}-date`} required />
        <Field label="Time" ar="الوقت" type="time" value={timeStr} onChange={updateTime} testId={`leg-${legIndex}-time`} />
        <Field label="Class" ar="الدرجة" value={leg.seatClass} onChange={v => update({ seatClass: v })} placeholder="Economy" />
        <Field label="PNR" ar="مرجع الحجز" value={leg.bookingRef} onChange={v => update({ bookingRef: v.toUpperCase() })} placeholder="ABC123" />
      </div>
    </div>
  );
};

const swapEnds = (l: FlightInfo): FlightInfo => ({
  ...emptyLeg(),
  airline: l.airline,
  fromAirport: l.toAirport,
  fromCity: l.toCity,
  fromAirportFull: l.toAirportFull,
  toAirport: l.fromAirport,
  toCity: l.fromCity,
  toAirportFull: l.fromAirportFull,
  bookingRef: l.bookingRef,
  seatClass: l.seatClass,
});

const ManualFlightEntrySheet = ({ initial, documentImages = [], onClose, onSubmit }: Props) => {
  const [mode, setMode] = useState<TripMode>(initial?.return ? "round-trip" : "one-way");
  const [outbound, setOutbound] = useState<FlightInfo>(initial?.outbound ? { ...emptyLeg(), ...initial.outbound } : emptyLeg());
  const [ret, setRet] = useState<FlightInfo>(initial?.return ? { ...emptyLeg(), ...initial.return } : swapEnds(initial?.outbound ?? emptyLeg()));
  const [extraLegs, setExtraLegs] = useState<FlightInfo[]>([]);
  const [passengerName, setPassengerName] = useState(initial?.passenger?.name || "");
  const [passengerPassport, setPassengerPassport] = useState(initial?.passenger?.passport || "");
  const [error, setError] = useState<string | null>(null);
  const [traveler, setTraveler] = useState<TravelerKind>("patient");
  const [zoomImage, setZoomImage] = useState<string | null>(null);
  const [showUpgrade, setShowUpgrade] = useState(false);

  // Subscription gating: companion / family entries require an ACTIVE paid
  // subscription. A trial alone is not enough — patients on free trial can
  // still file their own ticket but must upgrade to track loved-ones.
  const trial = useTrial();
  const sub = useSubscription();
  const hasActiveSubscription = !!sub.subscription && (sub.subscription as any).status === "active";
  const companionLocked = !hasActiveSubscription;

  const setMulti = (next: TripMode) => {
    setMode(next);
    setError(null);
    if (next === "multi-city" && extraLegs.length === 0) setExtraLegs([emptyLeg()]);
  };

  const addExtra = () => setExtraLegs(prev => (prev.length >= 4 ? prev : [...prev, emptyLeg()]));
  const updateExtra = (i: number, l: FlightInfo) => setExtraLegs(prev => prev.map((p, idx) => (idx === i ? l : p)));
  const removeExtra = (i: number) => setExtraLegs(prev => prev.filter((_, idx) => idx !== i));

  const isLegValid = (l: FlightInfo) =>
    !!l.fromAirport && !!l.toAirport && l.fromAirport !== l.toAirport && !!l.departureDateTime && !!l.flightNumber;

  const pickTraveler = (t: TravelerKind) => {
    if (t !== "patient" && companionLocked) {
      setShowUpgrade(true);
      return;
    }
    setTraveler(t);
  };

  const submit = () => {
    if (traveler !== "patient" && companionLocked) {
      setShowUpgrade(true);
      return;
    }
    if (!isLegValid(outbound)) {
      setError("Please fill the required fields (flight #, from, to, date) for the outbound leg.");
      return;
    }
    if (mode === "round-trip" && !isLegValid(ret)) {
      setError("Please fill the required fields for the return leg.");
      return;
    }
    if (mode === "multi-city") {
      for (let i = 0; i < extraLegs.length; i++) {
        if (!isLegValid(extraLegs[i])) {
          setError(`Please fill the required fields for leg ${i + 2}.`);
          return;
        }
      }
    }

    const payload: ManualFlightPayload = {
      outbound,
      return: mode === "round-trip" ? ret : null,
      legs: mode === "multi-city" ? [outbound, ...extraLegs] : undefined,
      passenger: passengerName || passengerPassport ? { name: passengerName || undefined, passport: passengerPassport || undefined } : undefined,
      source: "manual",
      traveler,
    };
    onSubmit(payload);
  };

  const TRAVELER_OPTIONS: { id: TravelerKind; label: string; ar: string; icon: React.ReactNode }[] = [
    { id: "patient",   label: "Patient",    ar: "المريض",    icon: <User size={14} /> },
    { id: "companion", label: "Companion",  ar: "المرافق",   icon: <Users size={14} /> },
    { id: "family",    label: "Family",     ar: "العائلة",   icon: <Users size={14} /> },
  ];

  return (
    <div
      className="absolute inset-0 z-[80] flex items-end"
      style={{ background: "rgba(13,27,42,0.55)" }}
      role="dialog"
      aria-label="Enter flight details manually"
      data-testid="manual-flight-sheet"
    >
      <div
        className="w-full rounded-t-3xl flex flex-col"
        style={{ background: "var(--off-white)", maxHeight: "96%" }}
      >
        <div className="flex items-center justify-between px-5 py-3 shrink-0" style={{ borderBottom: "1px solid var(--gray-light)" }}>
          <div>
            <p className="text-[16px] font-bold" style={{ color: "var(--navy)", fontFamily: "'DM Sans'" }}>
              Enter flight details
            </p>
            <p className="font-arabic text-[12px]" dir="rtl" style={{ color: "var(--gray)" }}>
              أدخل تفاصيل الرحلة يدويًا
            </p>
          </div>
          <button onClick={onClose} aria-label="Close" className="w-8 h-8 rounded-full flex items-center justify-center btn-press" style={{ background: "var(--gray-light)" }}>
            <X size={16} />
          </button>
        </div>

        {/* Split-screen document preview — shown when AI analyzed pages are
            attached so the user can read details directly while typing. */}
        {documentImages.length > 0 && (
          <div className="shrink-0 px-3 pt-3 pb-2" style={{ background: "var(--navy)" }} data-testid="manual-doc-preview">
            <div className="flex items-center justify-between mb-2 px-1">
              <p className="font-mono text-[9px] tracking-widest" style={{ color: "var(--gold)" }}>
                📎 ATTACHED PAGE{documentImages.length === 1 ? "" : "S"} · {documentImages.length}
              </p>
              <p className="text-[9px]" style={{ color: "rgba(255,255,255,0.55)" }}>Tap to zoom</p>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollSnapType: "x mandatory" }}>
              {documentImages.map((src, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setZoomImage(src)}
                  className="relative shrink-0 rounded-lg overflow-hidden btn-press"
                  style={{ width: 110, height: 140, background: "rgba(255,255,255,0.06)", scrollSnapAlign: "start", border: "1px solid rgba(255,255,255,0.12)" }}
                  data-testid={`manual-doc-thumb-${i}`}
                  aria-label={`Preview page ${i + 1}`}
                >
                  <img src={src} alt={`Page ${i + 1}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  <span className="absolute top-1 left-1 px-1.5 py-0.5 rounded text-[9px] font-bold" style={{ background: "rgba(0,0,0,0.65)", color: "#fff" }}>
                    {i + 1}/{documentImages.length}
                  </span>
                  <span className="absolute bottom-1 right-1 w-5 h-5 rounded-full flex items-center justify-center" style={{ background: "rgba(0,0,0,0.55)", color: "#fff" }}>
                    <ZoomIn size={11} />
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="px-5 py-4 overflow-y-auto flex-1 space-y-4">
          {/* Traveler selector — companion / family is subscription-gated */}
          <div className="rounded-xl p-3 space-y-2.5" style={{ background: "var(--white)", border: "1px solid var(--gray-light)" }} data-testid="traveler-selector">
            <div className="flex items-center justify-between">
              <p className="text-[12px] font-bold" style={{ color: "var(--navy)" }}>
                Who is this flight for? · <span className="font-arabic text-[10px]">لمن هذه الرحلة؟</span>
              </p>
              {companionLocked && (
                <span className="text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1" style={{ background: "rgba(197,150,90,0.15)", color: "var(--gold)" }}>
                  <Lock size={9} /> Premium
                </span>
              )}
            </div>
            <div className="grid grid-cols-3 gap-2">
              {TRAVELER_OPTIONS.map(opt => {
                const locked = opt.id !== "patient" && companionLocked;
                const active = traveler === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => pickTraveler(opt.id)}
                    data-testid={`traveler-${opt.id}`}
                    className="rounded-lg py-2 px-1 flex flex-col items-center gap-1 text-[11px] font-bold btn-press relative"
                    style={{
                      background: active ? "var(--teal-deep)" : "var(--off-white)",
                      color: active ? "#fff" : locked ? "var(--gray)" : "var(--teal-deep)",
                      border: active ? "none" : `1px solid ${locked ? "var(--gray-light)" : "var(--teal-deep)"}`,
                      opacity: locked && !active ? 0.65 : 1,
                    }}
                  >
                    <span className="flex items-center gap-1">
                      {locked ? <Lock size={11} /> : opt.icon}
                      {opt.label}
                    </span>
                    <span className="font-arabic text-[9px]" style={{ opacity: 0.85 }}>{opt.ar}</span>
                  </button>
                );
              })}
            </div>
            {companionLocked && traveler !== "patient" && (
              <button
                type="button"
                onClick={() => setShowUpgrade(true)}
                className="w-full rounded-lg py-2 text-[11px] font-bold btn-press"
                style={{ background: "linear-gradient(135deg, var(--gold), #b8843e)", color: "#fff" }}
              >
                Upgrade to add companions · ترقية
              </button>
            )}
          </div>

          {/* Trip type segmented */}
          <div className="flex rounded-full overflow-hidden" style={{ border: "1px solid var(--teal-deep)" }}>
            {(["one-way", "round-trip", "multi-city"] as TripMode[]).map(m => (
              <button
                key={m}
                type="button"
                onClick={() => setMulti(m)}
                className="flex-1 py-1.5 text-[11px] font-bold btn-press"
                style={{
                  background: mode === m ? "var(--teal-deep)" : "transparent",
                  color: mode === m ? "#fff" : "var(--teal-deep)",
                }}
                data-testid={`trip-mode-${m}`}
              >
                {m === "one-way" ? "One-way" : m === "round-trip" ? "Round-trip" : "Multi-city"}
              </button>
            ))}
          </div>

          <LegEditor leg={outbound} onChange={setOutbound} title="Outbound" titleAr="ذهاب" legIndex={0} />

          {mode === "round-trip" && (
            <LegEditor leg={ret} onChange={setRet} title="Return" titleAr="عودة" legIndex={1} />
          )}

          {mode === "multi-city" && extraLegs.map((l, i) => (
            <LegEditor
              key={i}
              leg={l}
              onChange={n => updateExtra(i, n)}
              onRemove={() => removeExtra(i)}
              title={`Leg ${i + 2}`}
              titleAr={`رحلة ${i + 2}`}
              legIndex={i + 1}
            />
          ))}

          {mode === "multi-city" && extraLegs.length < 4 && (
            <button
              type="button"
              onClick={addExtra}
              className="w-full rounded-xl py-2.5 text-[12px] font-bold flex items-center justify-center gap-1.5 btn-press"
              style={{ border: "1px dashed var(--teal-deep)", color: "var(--teal-deep)" }}
              data-testid="add-leg"
            >
              <Plus size={14} /> Add leg · <span className="font-arabic">إضافة رحلة</span>
            </button>
          )}

          <div className="rounded-xl p-3 space-y-2.5" style={{ background: "var(--white)", border: "1px solid var(--gray-light)" }}>
            <p className="text-[12px] font-bold" style={{ color: "var(--navy)" }}>
              Passenger (optional) · <span className="font-arabic text-[10px]">المسافر</span>
            </p>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Full name" ar="الاسم الكامل" value={passengerName} onChange={setPassengerName} placeholder="Mohammed Al-Rashidi" />
              <Field label="Passport" ar="جواز السفر" value={passengerPassport} onChange={setPassengerPassport} placeholder="K482916" />
            </div>
          </div>

          {error && (
            <p className="text-[11px] font-bold" style={{ color: "var(--error)" }} role="alert" data-testid="manual-error">
              {error}
            </p>
          )}
        </div>

        <div className="px-5 py-4 shrink-0" style={{ borderTop: "1px solid var(--gray-light)", background: "var(--white)" }}>
          <button
            type="button"
            onClick={submit}
            data-testid="submit-manual"
            className="w-full rounded-2xl text-[15px] font-bold text-white btn-press"
            style={{ background: "var(--gold)", height: 50 }}
          >
            Save flight · <span className="font-arabic text-[12px]">حفظ الرحلة</span>
          </button>
        </div>
      </div>

      {/* Tap-to-zoom doc preview */}
      {zoomImage && (
        <div
          className="absolute inset-0 z-[90] flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.92)" }}
          onClick={() => setZoomImage(null)}
          role="dialog"
          aria-label="Document preview"
          data-testid="manual-doc-zoom"
        >
          <img src={zoomImage} alt="Document page" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
          <button
            type="button"
            onClick={() => setZoomImage(null)}
            className="absolute top-3 right-3 w-9 h-9 rounded-full flex items-center justify-center"
            style={{ background: "rgba(255,255,255,0.15)", color: "#fff" }}
            aria-label="Close preview"
          >
            <X size={18} />
          </button>
        </div>
      )}

      <UpgradePrompt
        open={showUpgrade}
        variant="subscriber"
        plan={trial.hasTrial ? "trial" : undefined}
        onClose={() => setShowUpgrade(false)}
        onUpgrade={() => { setShowUpgrade(false); window.location.hash = "#/pricing"; }}
      />
    </div>
  );
};

export default ManualFlightEntrySheet;
