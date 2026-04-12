import { useState, useRef, useCallback } from "react";
import { X, Bell, BellOff, StickyNote, Clock, AlertTriangle, Download, Share2 } from "lucide-react";
import { toast } from "sonner";
import html2canvas from "html2canvas";
import type { TransportSegment } from "./TransportCard";

function fmtDate(dt: string) {
  if (!dt) return "";
  const d = new Date(dt);
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
}

function fmtTime(dt: string) {
  if (!dt) return "";
  const d = new Date(dt);
  return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
}

/* ─── Fake barcode SVG ─── */
const BoardingBarcode = ({ code }: { code: string }) => {
  const bars = Array.from({ length: 48 }, (_, i) => ({
    w: [1, 2, 3, 1, 2][i % 5],
    h: 48,
    gap: [1, 1, 2, 1, 1][i % 5],
  }));
  let x = 0;
  return (
    <div className="flex flex-col items-center mt-4 mb-2">
      <svg width={220} height={52} viewBox="0 0 220 52">
        {bars.map((b, i) => {
          const cx = x;
          x += b.w + b.gap;
          return <rect key={i} x={cx} y={2} width={b.w} height={b.h} fill="var(--navy)" rx={0.5} />;
        })}
      </svg>
      <p className="font-mono text-[11px] tracking-[6px] mt-1" style={{ color: "var(--navy)" }}>{code}</p>
    </div>
  );
};

/* ─── Alarm Picker ─── */
const alarmOptions = [
  { label: "At departure", value: 0, icon: "🔔" },
  { label: "15 min before", value: 15, icon: "⏰" },
  { label: "30 min before", value: 30, icon: "⏰" },
  { label: "1 hour before", value: 60, icon: "⏰" },
  { label: "2 hours before", value: 120, icon: "⏰" },
  { label: "1 day before", value: 1440, icon: "📅" },
];

interface TicketDetailSheetProps {
  seg: TransportSegment;
  onClose: () => void;
  notes: string;
  onSaveNotes: (notes: string) => void;
  alarms: number[];
  onToggleAlarm: (minutes: number) => void;
}

const TicketDetailSheet = ({ seg, onClose, notes, onSaveNotes, alarms, onToggleAlarm }: TicketDetailSheetProps) => {
  const [activeTab, setActiveTab] = useState<"details" | "notes" | "alarms">("details");
  const [draftNotes, setDraftNotes] = useState(notes);
  const [isExporting, setIsExporting] = useState(false);
  const captureRef = useRef<HTMLDivElement>(null);

  const handleExport = useCallback(async () => {
    if (!captureRef.current) return;
    setIsExporting(true);
    try {
      // Force details tab for capture
      const el = captureRef.current;
      const canvas = await html2canvas(el, {
        backgroundColor: "#FFFFFF",
        scale: 2,
        useCORS: true,
        logging: false,
      });
      const dataUrl = canvas.toDataURL("image/png");
      const fileName = `${seg.type}-${seg.fromCode || seg.fromCity}-${seg.toCode || seg.toCity}-${seg.bookingRef || "ticket"}.png`;

      // Try native share first (mobile), fallback to download
      if (navigator.share && navigator.canShare) {
        try {
          const blob = await (await fetch(dataUrl)).blob();
          const file = new File([blob], fileName, { type: "image/png" });
          if (navigator.canShare({ files: [file] })) {
            await navigator.share({ files: [file], title: `Boarding Pass — ${seg.fromCode || seg.fromCity} → ${seg.toCode || seg.toCity}` });
            toast.success("Shared successfully ✓ · تمت المشاركة بنجاح");
            setIsExporting(false);
            return;
          }
        } catch (shareErr) {
          // User cancelled or share failed — fall through to download
        }
      }

      // Fallback: download
      const link = document.createElement("a");
      link.download = fileName;
      link.href = dataUrl;
      link.click();
      toast.success("Boarding pass saved ✓ · تم حفظ بطاقة الصعود");
    } catch (err) {
      toast.error("Export failed · فشل التصدير");
    }
    setIsExporting(false);
  }, [seg]);

  const typeLabels: Record<string, string> = {
    flight: "Flight Ticket", train: "Train Ticket", bus: "Bus Ticket",
    taxi: "Ride Details", rental: "Rental Agreement", medical: "Medical Transport",
  };

  const typeIcons: Record<string, string> = {
    flight: "✈️", train: "🚄", bus: "🚌", taxi: "🚕", rental: "🚗", medical: "🚑",
  };

  const hasBarcode = seg.type === "flight" || seg.type === "train";
  const barcodeCode = seg.bookingRef || seg.flightNumber || seg.trainNumber || "—";

  const handleSaveNotes = () => {
    onSaveNotes(draftNotes);
    toast.success("Notes saved ✓ · تم حفظ الملاحظات");
  };

  return (
    <div className="absolute inset-0 z-[70] flex flex-col justify-end" onClick={onClose}>
      <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.55)" }} />
      <div
        className="relative animate-slide-up rounded-t-3xl overflow-y-auto"
        style={{ background: "var(--white)", maxHeight: "92%" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3">
          <div style={{ width: 36, height: 4, background: "#DEE4E9", borderRadius: 2 }} />
        </div>

        {/* Header */}
        <div className="px-5 pt-3 pb-2 flex items-start justify-between">
          <div>
            <p className="text-[11px] font-mono tracking-widest" style={{ color: "var(--gold)" }}>
              {typeIcons[seg.type]} {typeLabels[seg.type]?.toUpperCase()}
            </p>
            <p className="font-display text-xl mt-0.5" style={{ color: "var(--navy)" }}>
              {seg.type === "flight" ? `${seg.fromCode} → ${seg.toCode}` :
               seg.type === "train" ? `${seg.fromCode || seg.fromCity} → ${seg.toCode || seg.toCity}` :
               `${seg.fromCity} → ${seg.toCity}`}
            </p>
            <p className="text-[12px] mt-0.5" style={{ color: "var(--gray)" }}>
              {seg.airline || seg.trainOperator || seg.busOperator || seg.taxiProvider || seg.rentalCompany || seg.arrangedBy || ""} {seg.flightNumber || seg.trainNumber || ""}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleExport}
              disabled={isExporting}
              className="w-8 h-8 rounded-full flex items-center justify-center btn-press"
              style={{ background: "var(--teal-light)", border: "1px solid rgba(0,77,91,0.15)" }}
              title="Save / Share"
            >
              {isExporting ? (
                <div className="w-4 h-4 border-2 rounded-full animate-spin" style={{ borderColor: "var(--teal-deep)", borderTopColor: "transparent" }} />
              ) : (
                <Share2 size={14} color="var(--teal-deep)" />
              )}
            </button>
            <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "#F0F2F5" }}>
              <X size={16} color="var(--gray)" />
            </button>
          </div>
        </div>

        {/* Tab pills */}
        <div className="flex gap-2 px-5 py-2">
          {([
            { key: "details" as const, label: "Details", icon: "📋" },
            { key: "notes" as const, label: "Notes", icon: "📝" },
            { key: "alarms" as const, label: "Alarms", icon: "⏰" },
          ]).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className="flex-1 flex items-center justify-center gap-1 rounded-full transition-all"
              style={{
                height: 34,
                background: activeTab === tab.key ? "var(--teal-deep)" : "var(--off-white)",
                color: activeTab === tab.key ? "white" : "var(--gray)",
                fontSize: 12, fontWeight: 700, fontFamily: "'DM Sans'",
                border: activeTab === tab.key ? "none" : "1px solid var(--gray-light)",
              }}
            >
              <span>{tab.icon}</span> {tab.label}
            </button>
          ))}
        </div>

        <div className="px-5 pb-8">
          {/* ─── DETAILS TAB ─── */}
          {activeTab === "details" && (
            <div className="space-y-4 pt-2" ref={captureRef}>
              {/* Barcode section */}
              {hasBarcode && (
                <div className="rounded-2xl p-4 text-center" style={{ background: "var(--off-white)", border: "1px solid var(--gray-light)" }}>
                  <p className="font-mono text-[9px] tracking-widest" style={{ color: "var(--gray)" }}>BOARDING PASS BARCODE</p>
                  <BoardingBarcode code={barcodeCode} />
                  <p className="text-[10px]" style={{ color: "var(--gray)" }}>Present this at the gate · <span className="font-arabic" dir="rtl">قدّم هذا عند البوابة</span></p>
                </div>
              )}

              {/* Route & Time */}
              <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid var(--gray-light)" }}>
                <div className="px-4 py-3" style={{ background: "var(--navy)" }}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-display text-[28px] text-white font-bold">{seg.fromCode || seg.fromCity}</p>
                      <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.6)" }}>{seg.fromCity}{seg.fromFull ? ` · ${seg.fromFull}` : ""}</p>
                    </div>
                    <div className="text-center">
                      <span className="text-lg">{typeIcons[seg.type]}</span>
                      {seg.duration && <p className="text-[9px]" style={{ color: "var(--gold)" }}>{seg.duration}</p>}
                    </div>
                    <div className="text-right">
                      <p className="font-display text-[28px] text-white font-bold">{seg.toCode || seg.toCity}</p>
                      <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.6)" }}>{seg.toCity}{seg.toFull ? ` · ${seg.toFull}` : ""}</p>
                    </div>
                  </div>
                </div>
                <div className="px-4 py-3" style={{ background: "var(--white)" }}>
                  <div className="flex justify-between">
                    <div>
                      <p className="font-mono text-[8px] tracking-wider" style={{ color: "var(--gray)" }}>DEPARTURE</p>
                      <p className="text-[14px] font-bold" style={{ color: "var(--navy)" }}>{fmtTime(seg.departureDateTime)}</p>
                      <p className="text-[11px]" style={{ color: "var(--gray)" }}>{fmtDate(seg.departureDateTime)}</p>
                    </div>
                    <div style={{ width: 1, background: "var(--gray-light)" }} />
                    <div className="text-right">
                      <p className="font-mono text-[8px] tracking-wider" style={{ color: "var(--gray)" }}>ARRIVAL</p>
                      <p className="text-[14px] font-bold" style={{ color: "var(--navy)" }}>{fmtTime(seg.arrivalDateTime)}</p>
                      <p className="text-[11px]" style={{ color: "var(--gray)" }}>{fmtDate(seg.arrivalDateTime)}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Ticket Details Grid */}
              <div className="rounded-2xl p-4" style={{ background: "var(--teal-light)", border: "1px solid rgba(0,77,91,0.12)" }}>
                <p className="font-mono text-[9px] tracking-widest mb-3" style={{ color: "var(--teal-deep)" }}>TICKET DETAILS</p>
                <div className="grid grid-cols-2 gap-3">
                  {seg.type === "flight" && (
                    <>
                      <DetailItem label="AIRLINE" value={seg.airline || "—"} />
                      <DetailItem label="FLIGHT NO." value={seg.flightNumber || "—"} />
                      <DetailItem label="BOOKING REF (PNR)" value={seg.bookingRef || "—"} gold />
                      <DetailItem label="CLASS" value={seg.seatClass || "—"} />
                      <DetailItem label="SEAT NUMBER" value={seg.seatNumber || "—"} highlight />
                      {seg.medicalAssistance && <DetailItem label="MEDICAL ASSIST" value={seg.medicalAssistance} />}
                    </>
                  )}
                  {seg.type === "train" && (
                    <>
                      <DetailItem label="OPERATOR" value={seg.trainOperator || "—"} />
                      <DetailItem label="TRAIN NO." value={seg.trainNumber || "—"} />
                      <DetailItem label="PNR" value={seg.bookingRef || "—"} gold />
                      <DetailItem label="CLASS" value={seg.seatClass || "—"} />
                      <DetailItem label="CAR" value={seg.carNumber || "—"} />
                      <DetailItem label="SEAT" value={seg.seatNumber || "—"} highlight />
                    </>
                  )}
                  {seg.type === "taxi" && (
                    <>
                      <DetailItem label="PROVIDER" value={seg.taxiProvider || "—"} />
                      <DetailItem label="BOOKING REF" value={seg.bookingRef || "—"} gold />
                      <DetailItem label="DISTANCE" value={seg.distance || "—"} />
                      <DetailItem label="FARE" value={seg.fare || "—"} />
                      {seg.driverName && <DetailItem label="DRIVER" value={seg.driverName} />}
                      {seg.driverPhone && <DetailItem label="PHONE" value={seg.driverPhone} />}
                    </>
                  )}
                  {seg.type === "bus" && (
                    <>
                      <DetailItem label="OPERATOR" value={seg.busOperator || "—"} />
                      <DetailItem label="BUS NO." value={seg.busNumber || "—"} />
                      <DetailItem label="BOOKING" value={seg.bookingRef || "—"} gold />
                      <DetailItem label="SEAT" value={seg.seatNumber || "—"} highlight />
                    </>
                  )}
                  {seg.type === "rental" && (
                    <>
                      <DetailItem label="COMPANY" value={seg.rentalCompany || "—"} />
                      <DetailItem label="CAR" value={seg.carModel || "—"} />
                      <DetailItem label="BOOKING" value={seg.bookingRef || "—"} gold />
                      <DetailItem label="CLASS" value={seg.carClass || "—"} />
                      <DetailItem label="DAYS" value={String(seg.rentalDays || "—")} />
                      <DetailItem label="INSURED" value={seg.insured ? "Yes ✓" : "No"} />
                    </>
                  )}
                  {seg.type === "medical" && (
                    <>
                      <DetailItem label="MOBILITY" value={seg.mobilityType || "—"} />
                      <DetailItem label="ARRANGED BY" value={seg.arrangedBy || "—"} />
                      <DetailItem label="COST" value={seg.costInfo || "—"} />
                      {seg.hospital && <DetailItem label="HOSPITAL" value={seg.hospital} />}
                    </>
                  )}
                </div>
              </div>

              {/* Seat highlight for flights */}
              {(seg.type === "flight" || seg.type === "train") && seg.seatNumber && (
                <div className="rounded-2xl p-4 text-center" style={{ background: "var(--gold-pale)", border: "1px solid rgba(197,150,90,0.3)" }}>
                  <p className="font-mono text-[9px] tracking-widest" style={{ color: "var(--gold)" }}>YOUR SEAT</p>
                  <p className="font-display text-[48px] font-bold mt-1" style={{ color: "var(--navy)" }}>{seg.seatNumber}</p>
                  <p className="text-[12px]" style={{ color: "var(--gray)" }}>{seg.seatClass} · <span className="font-arabic" dir="rtl">مقعدك</span></p>
                </div>
              )}

              {/* Notes preview */}
              {notes && (
                <div className="rounded-xl p-3" style={{ background: "#FFFBEF", border: "1px solid rgba(197,150,90,0.2)" }}>
                  <div className="flex items-center gap-1.5 mb-1">
                    <StickyNote size={12} color="var(--gold)" />
                    <p className="font-mono text-[9px] tracking-widest" style={{ color: "var(--gold)" }}>YOUR NOTES</p>
                  </div>
                  <p className="text-[12px] leading-relaxed" style={{ color: "var(--navy)", fontFamily: "'DM Sans'" }}>{notes}</p>
                </div>
              )}

              {/* Active alarms */}
              {alarms.length > 0 && (
                <div className="rounded-xl p-3" style={{ background: "var(--teal-light)", border: "1px solid rgba(0,77,91,0.12)" }}>
                  <div className="flex items-center gap-1.5 mb-1">
                    <Bell size={12} color="var(--teal-deep)" />
                    <p className="font-mono text-[9px] tracking-widest" style={{ color: "var(--teal-deep)" }}>
                      {alarms.length} ALARM{alarms.length > 1 ? "S" : ""} SET
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {alarms.map((m) => {
                      const opt = alarmOptions.find((o) => o.value === m);
                      return (
                        <span key={m} className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: "var(--white)", color: "var(--teal-deep)", border: "1px solid rgba(0,77,91,0.15)" }}>
                          {opt?.icon} {opt?.label}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Export / Save button */}
              <button
                onClick={handleExport}
                disabled={isExporting}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-[14px] font-bold text-white btn-press"
                style={{ background: "var(--teal-deep)" }}
              >
                {isExporting ? (
                  <div className="w-4 h-4 border-2 rounded-full animate-spin" style={{ borderColor: "white", borderTopColor: "transparent" }} />
                ) : (
                  <Download size={16} />
                )}
                {isExporting ? "Exporting..." : "Save Boarding Pass"} · <span className="font-arabic">{isExporting ? "جارٍ التصدير..." : "حفظ بطاقة الصعود"}</span>
              </button>
            </div>
          )}

          {/* ─── NOTES TAB ─── */}
          {activeTab === "notes" && (
            <div className="space-y-4 pt-2">
              <div className="rounded-2xl p-4" style={{ background: "var(--off-white)", border: "1px solid var(--gray-light)" }}>
                <div className="flex items-center gap-2 mb-3">
                  <StickyNote size={16} color="var(--gold)" />
                  <div>
                    <p className="text-[13px] font-bold" style={{ color: "var(--navy)", fontFamily: "'DM Sans'" }}>Travel Notes</p>
                    <p className="font-arabic text-[10px]" dir="rtl" style={{ color: "var(--gray)" }}>ملاحظات السفر</p>
                  </div>
                </div>

                <textarea
                  value={draftNotes}
                  onChange={(e) => setDraftNotes(e.target.value)}
                  placeholder="Add notes about this ticket... e.g. Gate info, wheelchair request, meal preference, luggage details"
                  className="w-full rounded-xl p-3 text-[13px] leading-relaxed resize-none focus:outline-none"
                  style={{
                    minHeight: 140,
                    background: "var(--white)",
                    border: "1px solid var(--gray-light)",
                    color: "var(--navy)",
                    fontFamily: "'DM Sans'",
                  }}
                />
                <p className="text-[10px] mt-1.5" style={{ color: "var(--gray)" }}>
                  💡 Tip: Add gate info, meal preferences, mobility needs, or luggage details
                </p>
                <p className="font-arabic text-[9px]" dir="rtl" style={{ color: "var(--gray)" }}>
                  أضف معلومات البوابة، تفضيلات الوجبات، الاحتياجات الخاصة، أو تفاصيل الأمتعة
                </p>
              </div>

              {/* Quick note suggestions */}
              <div>
                <p className="font-mono text-[9px] tracking-widest mb-2" style={{ color: "var(--teal-deep)" }}>QUICK ADD</p>
                <div className="flex flex-wrap gap-1.5">
                  {getQuickNotes(seg.type).map((q) => (
                    <button
                      key={q}
                      onClick={() => setDraftNotes((prev) => prev ? `${prev}\n${q}` : q)}
                      className="text-[11px] px-3 py-1.5 rounded-full btn-press"
                      style={{ background: "var(--white)", border: "1px solid var(--gray-light)", color: "var(--navy)", fontFamily: "'DM Sans'" }}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={handleSaveNotes}
                className="w-full py-3 rounded-xl text-[14px] font-bold text-white btn-press"
                style={{ background: "var(--teal-deep)" }}
              >
                Save Notes · <span className="font-arabic">حفظ الملاحظات</span>
              </button>
            </div>
          )}

          {/* ─── ALARMS TAB ─── */}
          {activeTab === "alarms" && (
            <div className="space-y-4 pt-2">
              <div className="rounded-2xl p-4" style={{ background: "var(--off-white)", border: "1px solid var(--gray-light)" }}>
                <div className="flex items-center gap-2 mb-1">
                  <Bell size={16} color="var(--teal-deep)" />
                  <div>
                    <p className="text-[13px] font-bold" style={{ color: "var(--navy)", fontFamily: "'DM Sans'" }}>Set Reminders</p>
                    <p className="font-arabic text-[10px]" dir="rtl" style={{ color: "var(--gray)" }}>ضبط التنبيهات</p>
                  </div>
                </div>
                <p className="text-[11px] mt-1" style={{ color: "var(--gray)" }}>
                  Get notified before your {seg.type === "flight" ? "flight" : seg.type === "train" ? "train" : "trip"} departs
                </p>
              </div>

              <div className="space-y-2">
                {alarmOptions.map((opt) => {
                  const isActive = alarms.includes(opt.value);
                  return (
                    <button
                      key={opt.value}
                      onClick={() => {
                        onToggleAlarm(opt.value);
                        toast.success(isActive
                          ? `Alarm removed · تم إزالة التنبيه`
                          : `Alarm set: ${opt.label} · تم ضبط التنبيه`
                        );
                      }}
                      className="w-full flex items-center justify-between px-4 py-3.5 rounded-xl transition-all btn-press"
                      style={{
                        background: isActive ? "var(--teal-light)" : "var(--white)",
                        border: isActive ? "1.5px solid var(--teal-deep)" : "1px solid var(--gray-light)",
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-lg">{opt.icon}</span>
                        <div className="text-left">
                          <p className="text-[13px] font-semibold" style={{ color: isActive ? "var(--teal-deep)" : "var(--navy)", fontFamily: "'DM Sans'" }}>
                            {opt.label}
                          </p>
                        </div>
                      </div>
                      <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{
                        background: isActive ? "var(--teal-deep)" : "var(--gray-light)",
                      }}>
                        {isActive ? <Bell size={12} color="white" /> : <BellOff size={10} color="var(--gray)" />}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Travel convenience tips */}
              <div className="rounded-xl p-3" style={{ background: "var(--gold-pale)", border: "1px solid rgba(197,150,90,0.2)" }}>
                <div className="flex items-center gap-1.5 mb-1">
                  <AlertTriangle size={12} color="var(--gold)" />
                  <p className="text-[11px] font-semibold" style={{ color: "var(--gold)" }}>Travel Tip</p>
                </div>
                <p className="text-[11px]" style={{ color: "var(--navy)" }}>
                  {seg.type === "flight"
                    ? "Arrive at the airport 2-3 hours before international flights. Check gate changes 30 min before boarding."
                    : seg.type === "train"
                    ? "Arrive at the station 15-20 minutes early. Check platform updates on departure boards."
                    : "Allow extra time for traffic. Keep your booking reference handy."}
                </p>
                <p className="font-arabic text-[10px] mt-1" dir="rtl" style={{ color: "var(--gray)" }}>
                  {seg.type === "flight"
                    ? "احضر للمطار قبل ٢-٣ ساعات للرحلات الدولية. تحقق من تغييرات البوابة."
                    : seg.type === "train"
                    ? "احضر للمحطة قبل ١٥-٢٠ دقيقة. تحقق من تحديثات الرصيف."
                    : "اترك وقتاً إضافياً للحركة المرورية."}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const DetailItem = ({ label, value, gold, highlight }: { label: string; value: string; gold?: boolean; highlight?: boolean }) => (
  <div>
    <p className="font-mono text-[8px] tracking-wider" style={{ color: "rgba(0,77,91,0.55)" }}>{label}</p>
    <p className="text-[13px] font-bold" style={{
      color: gold ? "var(--gold)" : highlight ? "var(--teal-deep)" : "var(--navy)",
      fontFamily: "'DM Sans'",
      fontSize: highlight ? 16 : 13,
    }}>{value}</p>
  </div>
);

function getQuickNotes(type: string): string[] {
  const common = ["🧳 Extra luggage", "♿ Wheelchair needed", "🍽️ Special meal"];
  switch (type) {
    case "flight": return ["🚪 Gate info: ", "💺 Window seat preferred", "🛄 Checked 2 bags", ...common, "🏥 Carry medical docs", "📱 Download boarding pass"];
    case "train": return ["🚉 Platform: ", "🎒 Light luggage only", "🔌 Power outlet seat", ...common];
    case "taxi": return ["📍 Pickup point: ", "📞 Driver contacted", "♿ Accessible vehicle", "🧳 Large luggage"];
    case "medical": return ["🏥 Hospital pickup", "♿ Wheelchair transport", "📋 Bring discharge papers", "💊 Medications in bag"];
    default: return common;
  }
}

export default TicketDetailSheet;
