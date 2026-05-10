/**
 * Manual flight entry sheet (rebuilt for transit / connecting flights).
 *
 * Outputs a rich `outboundSegments[]` + `returnSegments[]` payload (preserves
 * DMM → SHJ → HBE chains, terminals, 24-hour times) AND a legacy
 * `outbound`/`return`/`legs` FlightInfo payload so the existing Step-4 OCR
 * fields display keeps working.
 */
import { useMemo, useState } from "react";
import { X, Plus, Trash2, ZoomIn, Lock, User, Users, ArrowDown, Link2, ChevronUp, ChevronDown } from "lucide-react";
import type { FlightInfo } from "@/components/AddTripSheet";
import { useTrial } from "@/hooks/useTrial";
import { useSubscription } from "@/hooks/useSubscription";
import UpgradePrompt from "@/components/UpgradePrompt";
import AirportSelect from "@/components/AirportSelect";
import { type Airport } from "@/data/airports";
import {
  type FlightSegment,
  type Direction,
  emptySegment,
  segmentToFlightInfo,
} from "@/lib/transportTickets";
import { isHHmm, normalizeTo24Hour } from "@/lib/time24";
import { normalizeTerminal } from "@/lib/terminal";

type TripMode = "one-way" | "round-trip";
export type TravelerKind = "patient" | "companion" | "family";

export interface ManualFlightPayload {
  // Legacy shape (kept for back-compat with Step 4 fields display)
  outbound: FlightInfo | null;
  return: FlightInfo | null;
  legs?: FlightInfo[];
  // Rich shape (preferred — preserves transit, terminals, 24h time)
  outboundSegments: FlightSegment[];
  returnSegments: FlightSegment[];
  passenger?: { name?: string; passport?: string };
  source: "manual";
  traveler: TravelerKind;
}

interface Props {
  initial?: { outbound?: FlightInfo | null; return?: FlightInfo | null; passenger?: { name?: string; passport?: string } } | null;
  documentImages?: string[];
  onClose: () => void;
  onSubmit: (payload: ManualFlightPayload) => void;
}

const TextField = ({
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

interface SegmentEditorProps {
  segment: FlightSegment;
  onChange: (next: FlightSegment) => void;
  onRemove?: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  title: string;
  titleAr: string;
  testIdPrefix: string;
}

const SegmentEditor = ({ segment, onChange, onRemove, onMoveUp, onMoveDown, title, titleAr, testIdPrefix }: SegmentEditorProps) => {
  const update = (patch: Partial<FlightSegment>) => onChange({ ...segment, ...patch });

  return (
    <div
      className="rounded-xl p-3 space-y-2.5"
      style={{ background: "var(--white)", border: "1px solid var(--gray-light)" }}
      data-testid={testIdPrefix}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[12px] font-bold" style={{ color: "var(--navy)" }}>{title}</p>
          <p className="font-arabic text-[10px]" dir="rtl" style={{ color: "var(--gray)" }}>{titleAr}</p>
        </div>
        <div className="flex items-center gap-1">
          {(onMoveUp || onMoveDown) && (
            <div className="flex flex-col" data-testid={`${testIdPrefix}-reorder`}>
              <button
                type="button"
                onClick={onMoveUp}
                disabled={!onMoveUp}
                aria-label="Move leg up"
                data-testid={`${testIdPrefix}-move-up`}
                className="w-7 h-5 rounded-t-md flex items-center justify-center btn-press disabled:opacity-30"
                style={{ background: "var(--off-white)", color: "var(--teal-deep)", border: "1px solid var(--gray-light)" }}
              >
                <ChevronUp size={12} />
              </button>
              <button
                type="button"
                onClick={onMoveDown}
                disabled={!onMoveDown}
                aria-label="Move leg down"
                data-testid={`${testIdPrefix}-move-down`}
                className="w-7 h-5 rounded-b-md flex items-center justify-center btn-press disabled:opacity-30"
                style={{ background: "var(--off-white)", color: "var(--teal-deep)", border: "1px solid var(--gray-light)", borderTop: "none" }}
              >
                <ChevronDown size={12} />
              </button>
            </div>
          )}
          {onRemove && (
            <button
              type="button"
              onClick={onRemove}
              className="w-7 h-7 rounded-full flex items-center justify-center btn-press"
              style={{ background: "rgba(217,79,79,0.1)", color: "var(--error)" }}
              aria-label="Remove segment"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <TextField label="Airline" ar="الناقل" value={segment.airline} onChange={v => update({ airline: v })} placeholder="Saudia" testId={`${testIdPrefix}-airline`} />
        <TextField label="Flight No." ar="رقم الرحلة" value={segment.flightNumber} onChange={v => update({ flightNumber: v.toUpperCase() })} placeholder="SV123" testId={`${testIdPrefix}-flight`} required />
      </div>

      <AirportSelect
        label="From airport"
        ar="من"
        value={segment.fromAirport.code ? segment.fromAirport : null}
        onChange={(a) => update({ fromAirport: a ?? { code: "", city: "" } })}
        required
        testId={`${testIdPrefix}-from`}
      />
      <AirportSelect
        label="To airport"
        ar="إلى"
        value={segment.toAirport.code ? segment.toAirport : null}
        onChange={(a) => update({ toAirport: a ?? { code: "", city: "" } })}
        required
        testId={`${testIdPrefix}-to`}
      />

      <div className="grid grid-cols-2 gap-2">
        <TextField label="Departure date" ar="تاريخ المغادرة" type="date" value={segment.departureDate} onChange={v => update({ departureDate: v })} testId={`${testIdPrefix}-dep-date`} required />
        <TextField
          label="Departure time (24h)"
          ar="الوقت"
          type="time"
          value={segment.departureTime}
          onChange={v => update({ departureTime: normalizeTo24Hour(v) || v })}
          testId={`${testIdPrefix}-dep-time`}
          required
        />
        <TextField label="Arrival date" ar="تاريخ الوصول" type="date" value={segment.arrivalDate || ""} onChange={v => update({ arrivalDate: v || undefined })} testId={`${testIdPrefix}-arr-date`} />
        <TextField
          label="Arrival time (24h)"
          ar="وقت الوصول"
          type="time"
          value={segment.arrivalTime || ""}
          onChange={v => update({ arrivalTime: normalizeTo24Hour(v) || v || undefined })}
          testId={`${testIdPrefix}-arr-time`}
        />
        <TextField label="Departure terminal" ar="صالة المغادرة" value={segment.departureTerminal || ""} onChange={v => update({ departureTerminal: v || undefined })} placeholder="T1" testId={`${testIdPrefix}-dep-term`} />
        <TextField label="Arrival terminal" ar="صالة الوصول" value={segment.arrivalTerminal || ""} onChange={v => update({ arrivalTerminal: v || undefined })} placeholder="T2" testId={`${testIdPrefix}-arr-term`} />
        <TextField label="Class" ar="الدرجة" value={segment.cabinClass || ""} onChange={v => update({ cabinClass: v })} placeholder="Economy" />
        <TextField label="PNR" ar="مرجع الحجز" value={segment.pnr || ""} onChange={v => update({ pnr: v.toUpperCase() })} placeholder="ABC123" />
      </div>
    </div>
  );
};

const reverseAirport = (a: Airport): Airport => a;

const ManualFlightEntrySheet = ({ initial, documentImages = [], onClose, onSubmit }: Props) => {
  const [mode, setMode] = useState<TripMode>(initial?.return ? "round-trip" : "one-way");
  const [outboundSegs, setOutboundSegs] = useState<FlightSegment[]>(() => [emptySegment("outbound", 0)]);
  const [returnSegs, setReturnSegs] = useState<FlightSegment[]>(() =>
    initial?.return ? [emptySegment("return", 0)] : [],
  );
  const [passengerName, setPassengerName] = useState(initial?.passenger?.name || "");
  const [passengerPassport, setPassengerPassport] = useState(initial?.passenger?.passport || "");
  const [error, setError] = useState<string | null>(null);
  const [traveler, setTraveler] = useState<TravelerKind>("patient");
  const [zoomImage, setZoomImage] = useState<string | null>(null);
  const [showUpgrade, setShowUpgrade] = useState(false);

  const trial = useTrial();
  const sub = useSubscription();
  const hasActiveSubscription = !!sub.subscription && (sub.subscription as any).status === "active";
  const companionLocked = !hasActiveSubscription;

  const setMulti = (next: TripMode) => {
    setMode(next);
    setError(null);
    if (next === "round-trip" && returnSegs.length === 0) {
      // Seed return as the reverse of the LAST outbound segment
      const last = outboundSegs[outboundSegs.length - 1];
      const seed = emptySegment("return", 0);
      if (last.toAirport.code) seed.fromAirport = reverseAirport(last.toAirport);
      if (last.fromAirport.code) seed.toAirport = reverseAirport(last.fromAirport);
      seed.airline = last.airline;
      seed.pnr = last.pnr;
      seed.cabinClass = last.cabinClass;
      setReturnSegs([seed]);
    }
    if (next === "one-way") setReturnSegs([]);
  };

  const addTransit = (direction: Direction) => {
    const list = direction === "outbound" ? outboundSegs : returnSegs;
    if (list.length >= 5) return;
    const last = list[list.length - 1];
    const next = emptySegment(direction, list.length);
    // Chain: new segment departs from last segment's destination
    if (last?.toAirport.code) next.fromAirport = reverseAirport(last.toAirport);
    next.airline = last?.airline || "";
    next.pnr = last?.pnr || "";
    next.cabinClass = last?.cabinClass || "Economy";
    next.departureDate = last?.arrivalDate || last?.departureDate || "";
    if (direction === "outbound") setOutboundSegs([...list, next]);
    else setReturnSegs([...list, next]);
  };

  const updateSeg = (direction: Direction, i: number, s: FlightSegment) => {
    const setter = direction === "outbound" ? setOutboundSegs : setReturnSegs;
    setter(prev => prev.map((p, idx) => (idx === i ? { ...s, segmentOrder: idx, direction } : p)));
  };
  const removeSeg = (direction: Direction, i: number) => {
    const setter = direction === "outbound" ? setOutboundSegs : setReturnSegs;
    setter(prev => prev.filter((_, idx) => idx !== i).map((s, idx) => ({ ...s, segmentOrder: idx })));
  };

  const segValid = (s: FlightSegment) =>
    !!s.flightNumber.trim() &&
    !!s.fromAirport.code && !!s.toAirport.code &&
    s.fromAirport.code !== s.toAirport.code &&
    !!s.departureDate && isHHmm(s.departureTime);

  const chainErrors = useMemo(() => {
    const errs: string[] = [];
    const checkChain = (list: FlightSegment[], label: string) => {
      for (let i = 1; i < list.length; i++) {
        if (list[i - 1].toAirport.code && list[i].fromAirport.code &&
            list[i - 1].toAirport.code !== list[i].fromAirport.code) {
          errs.push(`${label}: leg ${i + 1} departs from ${list[i].fromAirport.code} but the previous leg arrives at ${list[i - 1].toAirport.code}.`);
        }
      }
    };
    checkChain(outboundSegs, "Outbound");
    checkChain(returnSegs, "Return");
    return errs;
  }, [outboundSegs, returnSegs]);

  const pickTraveler = (t: TravelerKind) => {
    if (t !== "patient" && companionLocked) { setShowUpgrade(true); return; }
    setTraveler(t);
  };

  const submit = () => {
    if (traveler !== "patient" && companionLocked) { setShowUpgrade(true); return; }
    for (let i = 0; i < outboundSegs.length; i++) {
      if (!segValid(outboundSegs[i])) {
        setError(`Outbound leg ${i + 1}: fill flight #, From, To, date and 24h time.`);
        return;
      }
    }
    if (mode === "round-trip") {
      if (returnSegs.length === 0) { setError("Add at least one return leg or switch to One-way."); return; }
      for (let i = 0; i < returnSegs.length; i++) {
        if (!segValid(returnSegs[i])) {
          setError(`Return leg ${i + 1}: fill flight #, From, To, date and 24h time.`);
          return;
        }
      }
    }
    if (chainErrors.length > 0) { setError(chainErrors[0]); return; }

    const normalizeSegTerminals = (s: FlightSegment): FlightSegment => ({
      ...s,
      departureTerminal: normalizeTerminal(s.departureTerminal) || undefined,
      arrivalTerminal: normalizeTerminal(s.arrivalTerminal) || undefined,
    });
    const out = outboundSegs.map((s, i) => normalizeSegTerminals({ ...s, segmentOrder: i, direction: "outbound" as const }));
    const ret = mode === "round-trip"
      ? returnSegs.map((s, i) => normalizeSegTerminals({ ...s, segmentOrder: i, direction: "return" as const }))
      : [];

    const legacyOutbound = out.length > 0 ? segmentToFlightInfo(out[0]) : null;
    const legacyReturn = ret.length > 0 ? segmentToFlightInfo(ret[0]) : null;
    const legacyLegs = out.length > 1 || ret.length > 1
      ? [...out, ...ret].map(segmentToFlightInfo)
      : undefined;

    onSubmit({
      outbound: legacyOutbound,
      return: legacyReturn,
      legs: legacyLegs,
      outboundSegments: out,
      returnSegments: ret,
      passenger: passengerName || passengerPassport
        ? { name: passengerName || undefined, passport: passengerPassport || undefined }
        : undefined,
      source: "manual",
      traveler,
    });
  };

  const TRAVELER_OPTIONS: { id: TravelerKind; label: string; ar: string; icon: React.ReactNode }[] = [
    { id: "patient",   label: "Patient",    ar: "المريض",    icon: <User size={14} /> },
    { id: "companion", label: "Companion",  ar: "المرافق",   icon: <Users size={14} /> },
    { id: "family",    label: "Family",     ar: "العائلة",   icon: <Users size={14} /> },
  ];

  const renderChain = (list: FlightSegment[], direction: Direction, label: string, labelAr: string) => (
    <div className="space-y-2.5" data-testid={`chain-${direction}`}>
      <div className="flex items-center justify-between px-1">
        <p className="font-mono text-[10px] tracking-widest" style={{ color: "var(--teal-deep)" }}>
          {direction === "outbound" ? "✈️ OUTBOUND" : "🛬 RETURN"} · <span className="font-arabic">{labelAr}</span>
        </p>
        {list.length > 1 && (
          <span className="text-[10px] font-bold flex items-center gap-1" style={{ color: "var(--gold)" }}>
            <Link2 size={10} /> {list.length}-leg journey
          </span>
        )}
      </div>
      {list.map((s, i) => (
        <div key={s.id}>
          <SegmentEditor
            segment={s}
            onChange={n => updateSeg(direction, i, n)}
            onRemove={list.length > 1 ? () => removeSeg(direction, i) : undefined}
            title={list.length === 1 ? label : `${label} · Leg ${i + 1}`}
            titleAr={list.length === 1 ? labelAr : `${labelAr} · رحلة ${i + 1}`}
            testIdPrefix={`seg-${direction}-${i}`}
          />
          {i < list.length - 1 && (
            <div className="flex items-center justify-center my-1.5" aria-hidden>
              <div className="px-3 py-1 rounded-full flex items-center gap-1.5" style={{ background: "var(--gold-pale)", border: "1px dashed var(--gold)" }}>
                <ArrowDown size={11} style={{ color: "var(--gold)" }} />
                <span className="font-mono text-[9px]" style={{ color: "var(--gold)" }}>
                  TRANSIT at {list[i].toAirport.code || "—"}
                </span>
              </div>
            </div>
          )}
        </div>
      ))}
      {list.length < 5 && (
        <button
          type="button"
          onClick={() => addTransit(direction)}
          className="w-full rounded-xl py-2 text-[12px] font-bold flex items-center justify-center gap-1.5 btn-press"
          style={{ border: "1px dashed var(--teal-deep)", color: "var(--teal-deep)" }}
          data-testid={`add-transit-${direction}`}
        >
          <Plus size={14} /> Add transit / connecting leg · <span className="font-arabic">إضافة محطة عبور</span>
        </button>
      )}
    </div>
  );

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
            <p className="text-[16px] font-bold" style={{ color: "var(--navy)", fontFamily: "'DM Sans'" }}>Enter flight details</p>
            <p className="font-arabic text-[12px]" dir="rtl" style={{ color: "var(--gray)" }}>أدخل تفاصيل الرحلة يدويًا</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="w-8 h-8 rounded-full flex items-center justify-center btn-press" style={{ background: "var(--gray-light)" }}>
            <X size={16} />
          </button>
        </div>

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
          </div>

          {/* Trip type segmented */}
          <div className="flex rounded-full overflow-hidden" style={{ border: "1px solid var(--teal-deep)" }}>
            {(["one-way", "round-trip"] as TripMode[]).map(m => (
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
                {m === "one-way" ? "One-way" : "Round-trip"}
              </button>
            ))}
          </div>

          {renderChain(outboundSegs, "outbound", "Outbound", "ذهاب")}
          {mode === "round-trip" && renderChain(returnSegs, "return", "Return", "عودة")}

          {chainErrors.length > 0 && (
            <div className="rounded-lg p-2" style={{ background: "rgba(197,150,90,0.1)", border: "1px solid var(--gold)" }}>
              {chainErrors.map((e, i) => (
                <p key={i} className="text-[10px]" style={{ color: "var(--gold)" }}>⚠️ {e}</p>
              ))}
            </div>
          )}

          <div className="rounded-xl p-3 space-y-2.5" style={{ background: "var(--white)", border: "1px solid var(--gray-light)" }}>
            <p className="text-[12px] font-bold" style={{ color: "var(--navy)" }}>
              Passenger (optional) · <span className="font-arabic text-[10px]">المسافر</span>
            </p>
            <div className="grid grid-cols-2 gap-2">
              <TextField label="Full name" ar="الاسم الكامل" value={passengerName} onChange={setPassengerName} placeholder="Mohammed Al-Rashidi" />
              <TextField label="Passport" ar="جواز السفر" value={passengerPassport} onChange={setPassengerPassport} placeholder="K482916" />
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
