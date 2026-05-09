import { Fragment, useEffect, useState } from "react";
import { X, Plane, AlertTriangle, CheckCircle2, Eye, EyeOff } from "lucide-react";
import type { FlightInfo } from "./AddTripSheet";
import { validateFlight, type FlightValidationIssue } from "@/lib/flightParsing";

interface Props {
  open: boolean;
  outbound: FlightInfo | null;
  returnLeg: FlightInfo | null;
  /** Raw scanner output before normalization — used for the diff toggle. */
  rawOutbound?: any | null;
  rawReturn?: any | null;
  passengerName?: string;
  passportNumber?: string;
  onCancel: () => void;
  onConfirm: (out: FlightInfo | null, ret: FlightInfo | null) => void;
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
  const [d, t = ""] = iso.split("T");
  return [d, t.slice(0, 5)];
};
const joinDT = (d: string, t: string) => (d && t ? `${d}T${t}` : d || "");

const LegEditor = ({ title, value, onChange }: { title: string; value: FlightInfo; onChange: (v: FlightInfo) => void }) => {
  const [depD, depT] = splitDT(value.departureDateTime);
  const [arrD, arrT] = splitDT(value.arrivalDateTime);
  const set = (patch: Partial<FlightInfo>) => onChange({ ...value, ...patch });
  return (
    <div className="rounded-xl p-3 space-y-2.5" style={{ background: "var(--off-white)", border: "1px solid var(--gray-light)" }}>
      <p className="font-mono text-[10px] tracking-widest flex items-center gap-1.5" style={{ color: "var(--teal-deep)" }}>
        <Plane size={11} /> {title}
      </p>
      <div className="grid grid-cols-2 gap-2">
        <Field label="AIRLINE"><input style={ipt} value={value.airline} onChange={e => set({ airline: e.target.value })} /></Field>
        <Field label="FLIGHT #"><input style={ipt} value={value.flightNumber} onChange={e => set({ flightNumber: e.target.value.toUpperCase() })} /></Field>
      </div>
      <Field label="PNR"><input style={ipt} value={value.bookingRef} onChange={e => set({ bookingRef: e.target.value.toUpperCase() })} /></Field>
      <div className="grid grid-cols-3 gap-2">
        <Field label="FROM (IATA)"><input style={ipt} value={value.fromAirport} onChange={e => set({ fromAirport: e.target.value.toUpperCase().slice(0, 3) })} /></Field>
        <Field label="FROM CITY"><input style={ipt} value={value.fromCity} onChange={e => set({ fromCity: e.target.value })} /></Field>
        <Field label="FROM AIRPORT"><input style={ipt} value={value.fromAirportFull} onChange={e => set({ fromAirportFull: e.target.value })} /></Field>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <Field label="TO (IATA)"><input style={ipt} value={value.toAirport} onChange={e => set({ toAirport: e.target.value.toUpperCase().slice(0, 3) })} /></Field>
        <Field label="TO CITY"><input style={ipt} value={value.toCity} onChange={e => set({ toCity: e.target.value })} /></Field>
        <Field label="TO AIRPORT"><input style={ipt} value={value.toAirportFull} onChange={e => set({ toAirportFull: e.target.value })} /></Field>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Field label="DEPART DATE"><input type="date" style={ipt} value={depD} onChange={e => set({ departureDateTime: joinDT(e.target.value, depT) })} /></Field>
        <Field label="DEPART TIME"><input type="time" style={ipt} value={depT} onChange={e => set({ departureDateTime: joinDT(depD, e.target.value) })} /></Field>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Field label="ARRIVE DATE"><input type="date" style={ipt} value={arrD} onChange={e => set({ arrivalDateTime: joinDT(e.target.value, arrT) })} /></Field>
        <Field label="ARRIVE TIME"><input type="time" style={ipt} value={arrT} onChange={e => set({ arrivalDateTime: joinDT(arrD, e.target.value) })} /></Field>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Field label="CLASS"><input style={ipt} value={value.seatClass} onChange={e => set({ seatClass: e.target.value })} /></Field>
        <Field label="SEAT"><input style={ipt} value={value.seatNumber} onChange={e => set({ seatNumber: e.target.value.toUpperCase() })} /></Field>
      </div>
    </div>
  );
};

const RAW_TOGGLE_KEY = "rufayq_itinerary_show_raw";
const ONLY_CHANGED_KEY = "rufayq_itinerary_only_changed";

const ItineraryConfirmSheet = ({ open, outbound, returnLeg, rawOutbound, rawReturn, passengerName, passportNumber, onCancel, onConfirm }: Props) => {
  const [out, setOut] = useState<FlightInfo | null>(outbound);
  const [ret, setRet] = useState<FlightInfo | null>(returnLeg);
  const [showRaw, setShowRaw] = useState<boolean>(() => {
    try { return localStorage.getItem(RAW_TOGGLE_KEY) === "1"; } catch { return false; }
  });
  const [onlyChanged, setOnlyChanged] = useState<boolean>(() => {
    try { return localStorage.getItem(ONLY_CHANGED_KEY) === "1"; } catch { return false; }
  });

  useEffect(() => { setOut(outbound); setRet(returnLeg); }, [outbound, returnLeg, open]);
  useEffect(() => { try { localStorage.setItem(RAW_TOGGLE_KEY, showRaw ? "1" : "0"); } catch { /* noop */ } }, [showRaw]);
  useEffect(() => { try { localStorage.setItem(ONLY_CHANGED_KEY, onlyChanged ? "1" : "0"); } catch { /* noop */ } }, [onlyChanged]);

  if (!open) return null;

  const issues: FlightValidationIssue[] = [
    ...(out ? validateFlight(out, "Outbound") : []),
    ...(ret ? validateFlight(ret, "Return") : []),
  ];
  const errors = issues.filter(i => i.level === "error");
  const warnings = issues.filter(i => i.level === "warning");

  const renderDiff = (raw: any, norm: FlightInfo | null, label: string) => {
    if (!raw || !norm) return null;
    const allRows = [
      { k: "From IATA", raw: String(raw.fromAirport ?? ""), norm: norm.fromAirport },
      { k: "From city", raw: String(raw.fromCity ?? ""), norm: norm.fromCity },
      { k: "From airport", raw: String(raw.fromAirportFull ?? ""), norm: norm.fromAirportFull },
      { k: "To IATA", raw: String(raw.toAirport ?? ""), norm: norm.toAirport },
      { k: "To city", raw: String(raw.toCity ?? ""), norm: norm.toCity },
      { k: "To airport", raw: String(raw.toAirportFull ?? ""), norm: norm.toAirportFull },
      { k: "Flight #", raw: String(raw.flightNumber ?? ""), norm: norm.flightNumber },
      { k: "PNR", raw: String(raw.bookingRef ?? ""), norm: norm.bookingRef },
    ].map(r => ({ ...r, changed: r.raw.trim() !== r.norm.trim() }));
    const rows = onlyChanged ? allRows.filter(r => r.changed) : allRows;
    const changedCount = allRows.filter(r => r.changed).length;
    return (
      <div className="rounded-xl p-2.5 space-y-1" style={{ background: "var(--off-white)", border: "1px dashed var(--gray-light)" }}>
        <p className="font-mono text-[10px] tracking-widest" style={{ color: "var(--teal-deep)" }}>
          {label} — RAW vs NORMALIZED · {changedCount} changed
        </p>
        {rows.length === 0 ? (
          <p className="text-[10px] italic py-1" style={{ color: "var(--gray)" }}>No differences — scanner output matched the normalized values.</p>
        ) : (
          <div className="grid grid-cols-[90px_1fr_1fr] gap-1 text-[10px]">
            <span className="font-mono" style={{ color: "var(--gray)" }}>FIELD</span>
            <span className="font-mono" style={{ color: "var(--gray)" }}>SCANNED</span>
            <span className="font-mono" style={{ color: "var(--gray)" }}>NORMALIZED</span>
            {rows.map(r => (
              <Fragment key={r.k}>
                <span style={{ color: "var(--navy)" }}>{r.k}</span>
                <span style={{ color: r.changed ? "var(--gray)" : "var(--navy)", textDecoration: r.changed ? "line-through" : "none" }}>{r.raw || "—"}</span>
                <span style={{ color: r.changed ? "var(--success)" : "var(--navy)", fontWeight: r.changed ? 600 : 400 }}>{r.norm || "—"}</span>
              </Fragment>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="absolute inset-0 z-[60] flex flex-col justify-end" onClick={onCancel}>
      <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.55)" }} />
      <div className="relative animate-slide-up rounded-t-3xl flex flex-col" style={{ background: "var(--white)", maxHeight: "92%" }} onClick={e => e.stopPropagation()}>
        <div className="flex justify-center pt-3 shrink-0"><div style={{ width: 36, height: 4, background: "#DEE4E9", borderRadius: 2 }} /></div>

        <div className="flex items-start justify-between px-5 pt-3 pb-2 shrink-0">
          <div>
            <p className="font-display text-xl" style={{ color: "var(--navy)" }}>Confirm itinerary</p>
            <p className="font-arabic text-sm" dir="rtl" style={{ color: "var(--gray)" }}>تأكيد تفاصيل الرحلة</p>
            {(passengerName || passportNumber) && (
              <p className="text-[11px] mt-1" style={{ color: "var(--gray)" }}>
                {passengerName && <>👤 {passengerName}</>}{passengerName && passportNumber ? " · " : ""}{passportNumber && <>Passport {passportNumber}</>}
              </p>
            )}
          </div>
          <button onClick={onCancel} className="w-8 h-8 rounded-full flex items-center justify-center btn-press" style={{ background: "var(--off-white)" }}>
            <X size={16} color="var(--gray)" />
          </button>
        </div>

        <div className="overflow-y-auto px-5 pb-4 space-y-3" style={{ WebkitOverflowScrolling: "touch" }}>
          <p className="text-[11px]" style={{ color: "var(--gray)" }}>
            Review what we read from your ticket. Edit anything that's wrong before applying.
            <br />
            <span className="font-arabic" dir="rtl">راجع التفاصيل وعدّل قبل الحفظ.</span>
          </p>

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

          {(rawOutbound || rawReturn) && (
            <button
              onClick={() => setShowRaw(s => !s)}
              className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-[11px] btn-press"
              style={{ background: "var(--off-white)", border: "1px solid var(--gray-light)", color: "var(--teal-deep)" }}
            >
              {showRaw ? <EyeOff size={12} /> : <Eye size={12} />}
              {showRaw ? "Hide raw scan" : "Compare raw scan vs normalized"}
              <span className="font-arabic text-[10px]" dir="rtl"> · مقارنة المسح الأصلي</span>
            </button>
          )}
          {showRaw && (rawOutbound || rawReturn) && (
            <label className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg cursor-pointer btn-press"
                   style={{ background: "var(--white)", border: "1px solid var(--gray-light)" }}>
              <span className="text-[11px]" style={{ color: "var(--navy)" }}>
                Show only changed · <span className="font-arabic" dir="rtl">إظهار المتغيّرات فقط</span>
              </span>
              <input type="checkbox" checked={onlyChanged} onChange={e => setOnlyChanged(e.target.checked)} />
            </label>
          )}
          {showRaw && renderDiff(rawOutbound, out, "Outbound · ذهاب")}
          {showRaw && renderDiff(rawReturn, ret, "Return · عودة")}

          {out && <LegEditor title="OUTBOUND · رحلة الذهاب" value={out} onChange={setOut} />}
          {ret && <LegEditor title="RETURN · رحلة العودة" value={ret} onChange={setRet} />}

          {!out && !ret && (
            <p className="text-center text-[12px] italic py-6" style={{ color: "var(--gray)" }}>
              No flight details detected.
            </p>
          )}
        </div>

        <div className="px-5 py-3 shrink-0 space-y-2" style={{ borderTop: "1px solid var(--gray-light)" }}>
          <button
            onClick={() => onConfirm(out, ret)}
            disabled={errors.length > 0 || (!out && !ret)}
            className="w-full py-3 rounded-xl font-semibold text-white btn-press flex items-center justify-center gap-2"
            style={{
              background: errors.length > 0 || (!out && !ret) ? "var(--gray-light)" : "linear-gradient(135deg, var(--teal-deep), var(--teal-mid))",
              opacity: errors.length > 0 || (!out && !ret) ? 0.7 : 1,
            }}
          >
            <CheckCircle2 size={16} />
            Apply to trip · تطبيق على الرحلة
          </button>
          <button onClick={onCancel} className="w-full py-2 text-[12px]" style={{ color: "var(--gray)" }}>
            Cancel · <span className="font-arabic">إلغاء</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ItineraryConfirmSheet;
