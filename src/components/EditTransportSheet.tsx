import { useEffect, useState } from "react";
import { X, AlertTriangle, CheckCircle2 } from "lucide-react";
import type { TransportSegment } from "./TransportCard";

interface Props {
  open: boolean;
  segment: TransportSegment | null;
  onCancel: () => void;
  onSave: (seg: TransportSegment) => void;
  onDelete?: (id: string) => void;
}

const ipt: React.CSSProperties = {
  background: "var(--white)", border: "1px solid var(--gray-light)",
  color: "var(--navy)", borderRadius: 10, padding: "8px 10px",
  fontSize: 12, width: "100%", outline: "none",
};

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div>
    <p className="font-mono text-[9px] tracking-widest mb-1" style={{ color: "var(--gold)" }}>{label}</p>
    {children}
  </div>
);

const splitDT = (iso: string): [string, string] => {
  if (!iso) return ["", ""];
  const safe = iso.includes("T") ? iso : new Date(iso).toISOString();
  const [d, t = ""] = safe.split("T");
  return [d, t.slice(0, 5)];
};
const joinDT = (d: string, t: string) => (d && t ? `${d}T${t}:00` : d || "");

interface Issue { field: string; message: string; level: "error" | "warning" }

function validate(s: TransportSegment): Issue[] {
  const out: Issue[] = [];
  if (!s.fromCity?.trim()) out.push({ field: "fromCity", message: "Departure city is required", level: "error" });
  if (!s.toCity?.trim()) out.push({ field: "toCity", message: "Arrival city is required", level: "error" });
  if (s.fromCity && s.toCity && s.fromCity.trim().toLowerCase() === s.toCity.trim().toLowerCase()) {
    out.push({ field: "route", message: "From and To must be different", level: "error" });
  }
  if (!s.departureDateTime) out.push({ field: "departureDateTime", message: "Departure date/time required", level: "error" });
  if (!s.arrivalDateTime) out.push({ field: "arrivalDateTime", message: "Arrival date/time required", level: "error" });
  if (s.departureDateTime && s.arrivalDateTime) {
    const dep = new Date(s.departureDateTime).getTime();
    const arr = new Date(s.arrivalDateTime).getTime();
    if (!isNaN(dep) && !isNaN(arr) && arr <= dep) {
      out.push({ field: "arrivalDateTime", message: "Arrival must be after departure", level: "error" });
    }
  }
  if (s.type === "train" && !s.trainNumber) out.push({ field: "trainNumber", message: "Train number missing", level: "warning" });
  if (s.type === "bus" && !s.busNumber) out.push({ field: "busNumber", message: "Bus number missing", level: "warning" });
  if (s.type === "taxi" && !s.taxiProvider) out.push({ field: "taxiProvider", message: "Taxi provider missing", level: "warning" });
  if (s.type === "rental" && !s.rentalCompany) out.push({ field: "rentalCompany", message: "Rental company missing", level: "warning" });
  if (s.type === "medical" && !s.mobilityType) out.push({ field: "mobilityType", message: "Mobility / transfer type missing", level: "warning" });
  return out;
}

const titles: Record<TransportSegment["type"], { en: string; ar: string; icon: string }> = {
  flight:  { en: "Flight",   ar: "رحلة",   icon: "✈️" },
  train:   { en: "Train",    ar: "قطار",  icon: "🚄" },
  bus:     { en: "Bus",      ar: "باص",   icon: "🚌" },
  taxi:    { en: "Taxi",     ar: "تاكسي", icon: "🚕" },
  rental:  { en: "Rental",   ar: "إيجار", icon: "🚗" },
  medical: { en: "Medical",  ar: "طبي",   icon: "🚑" },
};

const EditTransportSheet = ({ open, segment, onCancel, onSave, onDelete }: Props) => {
  const [s, setS] = useState<TransportSegment | null>(segment);
  useEffect(() => { setS(segment); }, [segment, open]);
  if (!open || !s) return null;
  const set = (patch: Partial<TransportSegment>) => setS({ ...s, ...patch });

  const [depD, depT] = splitDT(s.departureDateTime);
  const [arrD, arrT] = splitDT(s.arrivalDateTime);
  const issues = validate(s);
  const errors = issues.filter(i => i.level === "error");
  const warnings = issues.filter(i => i.level === "warning");
  const t = titles[s.type];

  return (
    <div className="absolute inset-0 z-[60] flex flex-col justify-end" onClick={onCancel}>
      <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.55)" }} />
      <div className="relative animate-slide-up rounded-t-3xl flex flex-col" style={{ background: "var(--white)", maxHeight: "92%" }} onClick={e => e.stopPropagation()}>
        <div className="flex justify-center pt-3 shrink-0"><div style={{ width: 36, height: 4, background: "#DEE4E9", borderRadius: 2 }} /></div>

        <div className="flex items-start justify-between px-5 pt-3 pb-2 shrink-0">
          <div>
            <p className="font-display text-xl" style={{ color: "var(--navy)" }}>{t.icon} Edit {t.en}</p>
            <p className="font-arabic text-sm" dir="rtl" style={{ color: "var(--gray)" }}>تعديل {t.ar}</p>
          </div>
          <button onClick={onCancel} className="w-8 h-8 rounded-full flex items-center justify-center btn-press" style={{ background: "var(--off-white)" }}>
            <X size={16} color="var(--gray)" />
          </button>
        </div>

        <div className="overflow-y-auto px-5 pb-4 space-y-3" style={{ WebkitOverflowScrolling: "touch" }}>
          {errors.length > 0 && (
            <div className="rounded-xl p-2.5 flex gap-2" style={{ background: "rgba(217,79,79,0.08)", border: "1px solid rgba(217,79,79,0.3)" }}>
              <AlertTriangle size={14} style={{ color: "var(--error)", flexShrink: 0, marginTop: 2 }} />
              <div>
                {errors.map((e, i) => (
                  <p key={i} className="text-[11px]" style={{ color: "var(--error)" }}>• {e.message}</p>
                ))}
              </div>
            </div>
          )}
          {warnings.length > 0 && (
            <div className="rounded-xl p-2.5" style={{ background: "rgba(197,150,90,0.08)", border: "1px solid rgba(197,150,90,0.3)" }}>
              {warnings.map((w, i) => (
                <p key={i} className="text-[11px]" style={{ color: "var(--gold)" }}>⚠ {w.message}</p>
              ))}
            </div>
          )}

          <div className="rounded-xl p-3 space-y-2.5" style={{ background: "var(--off-white)", border: "1px solid var(--gray-light)" }}>
            <div className="grid grid-cols-2 gap-2">
              <Field label="FROM CITY"><input style={ipt} value={s.fromCity || ""} onChange={e => set({ fromCity: e.target.value })} /></Field>
              <Field label="TO CITY"><input style={ipt} value={s.toCity || ""} onChange={e => set({ toCity: e.target.value })} /></Field>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Field label="DEPART DATE"><input type="date" style={ipt} value={depD} onChange={e => set({ departureDateTime: joinDT(e.target.value, depT || "00:00") })} /></Field>
              <Field label="DEPART TIME"><input type="time" style={ipt} value={depT} onChange={e => set({ departureDateTime: joinDT(depD || new Date().toISOString().split("T")[0], e.target.value) })} /></Field>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Field label="ARRIVE DATE"><input type="date" style={ipt} value={arrD} onChange={e => set({ arrivalDateTime: joinDT(e.target.value, arrT || "00:00") })} /></Field>
              <Field label="ARRIVE TIME"><input type="time" style={ipt} value={arrT} onChange={e => set({ arrivalDateTime: joinDT(arrD || new Date().toISOString().split("T")[0], e.target.value) })} /></Field>
            </div>
            <Field label="BOOKING REF"><input style={ipt} value={s.bookingRef || ""} onChange={e => set({ bookingRef: e.target.value.toUpperCase() })} /></Field>

            {s.type === "train" && (
              <div className="grid grid-cols-2 gap-2">
                <Field label="OPERATOR"><input style={ipt} value={s.trainOperator || ""} onChange={e => set({ trainOperator: e.target.value })} /></Field>
                <Field label="TRAIN #"><input style={ipt} value={s.trainNumber || ""} onChange={e => set({ trainNumber: e.target.value })} /></Field>
              </div>
            )}
            {s.type === "bus" && (
              <div className="grid grid-cols-2 gap-2">
                <Field label="OPERATOR"><input style={ipt} value={s.busOperator || ""} onChange={e => set({ busOperator: e.target.value })} /></Field>
                <Field label="BUS #"><input style={ipt} value={s.busNumber || ""} onChange={e => set({ busNumber: e.target.value })} /></Field>
              </div>
            )}
            {s.type === "taxi" && (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <Field label="PROVIDER"><input style={ipt} value={s.taxiProvider || ""} onChange={e => set({ taxiProvider: e.target.value })} /></Field>
                  <Field label="DRIVER"><input style={ipt} value={s.driverName || ""} onChange={e => set({ driverName: e.target.value })} /></Field>
                </div>
                <Field label="DRIVER PHONE"><input style={ipt} value={s.driverPhone || ""} onChange={e => set({ driverPhone: e.target.value })} /></Field>
              </>
            )}
            {s.type === "rental" && (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <Field label="COMPANY"><input style={ipt} value={s.rentalCompany || ""} onChange={e => set({ rentalCompany: e.target.value })} /></Field>
                  <Field label="MODEL"><input style={ipt} value={s.carModel || ""} onChange={e => set({ carModel: e.target.value })} /></Field>
                </div>
                <Field label="PICKUP LOCATION"><input style={ipt} value={s.pickupLocation || ""} onChange={e => set({ pickupLocation: e.target.value })} /></Field>
              </>
            )}
            {s.type === "medical" && (
              <>
                <Field label="MOBILITY / TRANSFER"><input style={ipt} value={s.mobilityType || ""} onChange={e => set({ mobilityType: e.target.value })} /></Field>
                <div className="grid grid-cols-2 gap-2">
                  <Field label="ARRANGED BY"><input style={ipt} value={s.arrangedBy || ""} onChange={e => set({ arrangedBy: e.target.value })} /></Field>
                  <Field label="HOSPITAL PHONE"><input style={ipt} value={s.hospitalPhone || ""} onChange={e => set({ hospitalPhone: e.target.value })} /></Field>
                </div>
              </>
            )}
            {s.type === "flight" && (
              <div className="grid grid-cols-2 gap-2">
                <Field label="AIRLINE"><input style={ipt} value={s.airline || ""} onChange={e => set({ airline: e.target.value })} /></Field>
                <Field label="FLIGHT #"><input style={ipt} value={s.flightNumber || ""} onChange={e => set({ flightNumber: e.target.value.toUpperCase() })} /></Field>
              </div>
            )}
          </div>
        </div>

        <div className="px-5 py-3 shrink-0 space-y-2" style={{ borderTop: "1px solid var(--gray-light)" }}>
          <button
            onClick={() => onSave(s)}
            disabled={errors.length > 0}
            className="w-full py-3 rounded-xl font-semibold text-white btn-press flex items-center justify-center gap-2"
            style={{
              background: errors.length > 0 ? "var(--gray-light)" : "linear-gradient(135deg, var(--teal-deep), var(--teal-mid))",
              opacity: errors.length > 0 ? 0.7 : 1,
            }}
          >
            <CheckCircle2 size={16} /> Save · <span className="font-arabic">حفظ</span>
          </button>
          {onDelete && (
            <button onClick={() => onDelete(s.id)} className="w-full py-2 text-[12px]" style={{ color: "var(--error)" }}>
              Delete · <span className="font-arabic">حذف</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default EditTransportSheet;
