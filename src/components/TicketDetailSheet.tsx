import { useState, useRef, useCallback } from "react";
import { X, Bell, BellOff, StickyNote, Clock, AlertTriangle, Download, Share2, Edit3, ToggleLeft, ToggleRight, Shield, ShieldOff, Trash2, Mail, MessageCircle, Image, Copy } from "lucide-react";
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

/* ─── Types ─── */
export interface OverrideAnnotation {
  id: string;
  field: string;
  value: string;
  timestamp: string;
  source: "user";
}

export interface SmartReminder {
  id: string;
  label: string;
  labelAr: string;
  minutesBefore: number;
  source: "system" | "user";
  enabled: boolean;
  icon: string;
}

/* ─── Alarm Options (user-created) ─── */
const userAlarmOptions = [
  { label: "At departure", value: 0, icon: "🔔" },
  { label: "15 min before", value: 15, icon: "⏰" },
  { label: "30 min before", value: 30, icon: "⏰" },
  { label: "1 hour before", value: 60, icon: "⏰" },
  { label: "2 hours before", value: 120, icon: "⏰" },
  { label: "1 day before", value: 1440, icon: "📅" },
];

/* ─── Override field options by type ─── */
function getOverrideFields(type: string): { key: string; label: string; labelAr: string; placeholder: string; icon: string }[] {
  const common = [
    { key: "note", label: "General Note", labelAr: "ملاحظة عامة", placeholder: "e.g. Changed pickup time", icon: "📝" },
  ];
  switch (type) {
    case "flight": return [
      { key: "gate", label: "Gate Change", labelAr: "تغيير البوابة", placeholder: "e.g. Gate B12", icon: "🚪" },
      { key: "departure_time", label: "New Departure Time", labelAr: "وقت المغادرة الجديد", placeholder: "e.g. 16:30", icon: "🕐" },
      { key: "terminal", label: "Terminal Change", labelAr: "تغيير الصالة", placeholder: "e.g. Terminal 2", icon: "🏢" },
      { key: "seat", label: "Seat Change", labelAr: "تغيير المقعد", placeholder: "e.g. 12B", icon: "💺" },
      { key: "status_note", label: "Flight Status", labelAr: "حالة الرحلة", placeholder: "e.g. Delayed 45 min", icon: "⚠️" },
      ...common,
    ];
    case "train": return [
      { key: "platform", label: "Platform Change", labelAr: "تغيير الرصيف", placeholder: "e.g. Platform 5", icon: "🚉" },
      { key: "departure_time", label: "New Departure Time", labelAr: "وقت المغادرة الجديد", placeholder: "e.g. 14:15", icon: "🕐" },
      { key: "car_seat", label: "Car/Seat Change", labelAr: "تغيير العربة/المقعد", placeholder: "e.g. Car 4, Seat 23", icon: "💺" },
      ...common,
    ];
    case "taxi": return [
      { key: "pickup_change", label: "Pickup Location", labelAr: "تغيير نقطة الالتقاط", placeholder: "e.g. Hospital main entrance", icon: "📍" },
      { key: "time_change", label: "New Pickup Time", labelAr: "وقت الالتقاط الجديد", placeholder: "e.g. 09:00", icon: "🕐" },
      { key: "driver_update", label: "Driver Update", labelAr: "تحديث السائق", placeholder: "e.g. New driver: Ahmed", icon: "🚕" },
      ...common,
    ];
    default: return [
      { key: "time_change", label: "Time Change", labelAr: "تغيير الوقت", placeholder: "e.g. 10:30", icon: "🕐" },
      { key: "location_change", label: "Location Change", labelAr: "تغيير الموقع", placeholder: "e.g. New pickup point", icon: "📍" },
      ...common,
    ];
  }
}

/* ─── System-generated reminders by type ─── */
export function getSystemReminders(seg: TransportSegment): SmartReminder[] {
  const base: SmartReminder[] = [];
  if (seg.type === "flight") {
    base.push(
      { id: "sys-checkin", label: "Online check-in opens", labelAr: "فتح تسجيل الوصول الإلكتروني", minutesBefore: 1440, source: "system", enabled: true, icon: "✅" },
      { id: "sys-pack", label: "Pack medical documents", labelAr: "جهّز المستندات الطبية", minutesBefore: 720, source: "system", enabled: true, icon: "📋" },
      { id: "sys-airport", label: "Head to airport", labelAr: "توجه إلى المطار", minutesBefore: 180, source: "system", enabled: true, icon: "🚗" },
      { id: "sys-boarding", label: "Boarding starts soon", labelAr: "الصعود يبدأ قريباً", minutesBefore: 45, source: "system", enabled: true, icon: "🛫" },
    );
    if (seg.medicalAssistance) {
      base.push({ id: "sys-wheelchair", label: "Confirm wheelchair at gate", labelAr: "تأكيد الكرسي المتحرك عند البوابة", minutesBefore: 60, source: "system", enabled: true, icon: "♿" });
    }
  } else if (seg.type === "train") {
    base.push(
      { id: "sys-station", label: "Head to station", labelAr: "توجه إلى المحطة", minutesBefore: 60, source: "system", enabled: true, icon: "🚶" },
      { id: "sys-platform", label: "Check platform number", labelAr: "تحقق من رقم الرصيف", minutesBefore: 20, source: "system", enabled: true, icon: "🚉" },
    );
  } else if (seg.type === "taxi") {
    base.push(
      { id: "sys-ready", label: "Be ready for pickup", labelAr: "كن جاهزاً للالتقاط", minutesBefore: 15, source: "system", enabled: true, icon: "🚕" },
      { id: "sys-confirm", label: "Confirm ride with driver", labelAr: "تأكيد الرحلة مع السائق", minutesBefore: 30, source: "system", enabled: true, icon: "📞" },
    );
  } else if (seg.type === "medical") {
    base.push(
      { id: "sys-docs", label: "Prepare discharge papers", labelAr: "جهّز أوراق الخروج", minutesBefore: 120, source: "system", enabled: true, icon: "📄" },
      { id: "sys-meds", label: "Pack medications", labelAr: "جهّز الأدوية", minutesBefore: 60, source: "system", enabled: true, icon: "💊" },
    );
  }
  return base;
}

interface TicketDetailSheetProps {
  seg: TransportSegment;
  onClose: () => void;
  notes: string;
  onSaveNotes: (notes: string) => void;
  alarms: number[];
  onToggleAlarm: (minutes: number) => void;
  overrides: OverrideAnnotation[];
  onSaveOverrides: (overrides: OverrideAnnotation[]) => void;
  systemReminders: SmartReminder[];
  onUpdateSystemReminders: (reminders: SmartReminder[]) => void;
  systemAlertsMuted: boolean;
  onToggleSystemAlertsMuted: () => void;
  /** When provided, renders a "Re-scan ticket" button in the Scan info
   *  section. Should re-run AI extraction on stored source images. */
  onRescan?: () => Promise<void> | void;
  /** Optional edit handler — surfaces an "Edit" action in the header. */
  onEdit?: () => void;
  /** Optional delete handler — surfaces a "Delete" action that calls
   *  this with the ticket/group id. The dialog confirmation is handled
   *  by the parent. */
  onDelete?: () => void;
}

const TicketDetailSheet = ({
  seg, onClose, notes, onSaveNotes, alarms, onToggleAlarm,
  overrides, onSaveOverrides, systemReminders, onUpdateSystemReminders,
  systemAlertsMuted, onToggleSystemAlertsMuted, onRescan, onEdit, onDelete,
}: TicketDetailSheetProps) => {
  const [activeTab, setActiveTab] = useState<"details" | "notes" | "overrides" | "alarms">("details");
  const [draftNotes, setDraftNotes] = useState(notes);
  const [isExporting, setIsExporting] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [isRescanning, setIsRescanning] = useState(false);
  const captureRef = useRef<HTMLDivElement>(null);

  const buildShareText = useCallback(() => {
    const icon = seg.type === "flight" ? "✈️" : seg.type === "train" ? "🚄" : seg.type === "bus" ? "🚌" : seg.type === "taxi" ? "🚕" : seg.type === "rental" ? "🚗" : "🚑";
    const route = `${seg.fromCode || seg.fromCity} → ${seg.toCode || seg.toCity}`;
    const carrier = seg.airline || seg.trainOperator || seg.busOperator || seg.taxiProvider || seg.rentalCompany || "";
    const number = seg.flightNumber || seg.trainNumber || seg.busNumber || "";
    const dep = new Date(seg.departureDateTime);
    const arr = new Date(seg.arrivalDateTime);
    const dateFmt = (d: Date) => d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
    const timeFmt = (d: Date) => d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });

    let lines = [
      `${icon} ${route}`,
      `${carrier} ${number}`.trim(),
      ``,
      `📅 ${dateFmt(dep)}`,
      `🛫 Departure: ${timeFmt(dep)}`,
      `🛬 Arrival: ${timeFmt(arr)}`,
    ];
    if (seg.bookingRef) lines.push(`📋 Booking Ref: ${seg.bookingRef}`);
    if (seg.seatClass) lines.push(`💺 Class: ${seg.seatClass}`);
    if (seg.seatNumber) lines.push(`🪑 Seat: ${seg.seatNumber}`);
    if (seg.duration) lines.push(`⏱ Duration: ${seg.duration}`);
    if (seg.medicalAssistance) lines.push(`⚕️ ${seg.medicalAssistance}`);
    lines.push(``, `— Shared via RufayQ`);
    return lines.filter((l, i) => !(l === "" && lines[i - 1] === "")).join("\n");
  }, [seg]);

  const handleShareWhatsApp = useCallback(() => {
    const text = buildShareText();
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
    setShowShareMenu(false);
    toast.success("Opening WhatsApp… · جارٍ فتح واتساب");
  }, [buildShareText]);

  const handleShareEmail = useCallback(() => {
    const text = buildShareText();
    const route = `${seg.fromCode || seg.fromCity} → ${seg.toCode || seg.toCity}`;
    const subject = `Travel Details: ${route} — ${seg.airline || seg.trainOperator || ""} ${seg.flightNumber || seg.trainNumber || ""}`.trim();
    window.open(`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`, "_self");
    setShowShareMenu(false);
    toast.success("Opening email… · جارٍ فتح البريد");
  }, [buildShareText, seg]);

  // Override form state
  const [selectedField, setSelectedField] = useState("");
  const [overrideValue, setOverrideValue] = useState("");

  const handleExport = useCallback(async () => {
    if (!captureRef.current) return;
    setIsExporting(true);
    try {
      const el = captureRef.current;
      const canvas = await html2canvas(el, { backgroundColor: "#FFFFFF", scale: 2, useCORS: true, logging: false });
      const dataUrl = canvas.toDataURL("image/png");
      const fileName = `${seg.type}-${seg.fromCode || seg.fromCity}-${seg.toCode || seg.toCity}-${seg.bookingRef || "ticket"}.png`;
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
        } catch { /* fall through */ }
      }
      const link = document.createElement("a");
      link.download = fileName;
      link.href = dataUrl;
      link.click();
      toast.success("Boarding pass saved ✓ · تم حفظ بطاقة الصعود");
    } catch {
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

  const handleAddOverride = () => {
    if (!selectedField || !overrideValue.trim()) {
      toast.error("Please select a field and enter a value · اختر حقلاً وأدخل قيمة");
      return;
    }
    const fields = getOverrideFields(seg.type);
    const fieldConfig = fields.find((f) => f.key === selectedField);
    const newOverride: OverrideAnnotation = {
      id: `ovr-${Date.now()}`,
      field: fieldConfig?.label || selectedField,
      value: overrideValue.trim(),
      timestamp: new Date().toISOString(),
      source: "user",
    };
    onSaveOverrides([...overrides, newOverride]);
    setSelectedField("");
    setOverrideValue("");
    toast.success("Override added ✓ · تمت إضافة التعديل", {
      description: `${fieldConfig?.label}: ${overrideValue.trim()}`,
    });
  };

  const handleRemoveOverride = (id: string) => {
    onSaveOverrides(overrides.filter((o) => o.id !== id));
    toast.info("Override removed · تمت إزالة التعديل");
  };

  const handleToggleSystemReminder = (reminderId: string) => {
    const updated = systemReminders.map((r) =>
      r.id === reminderId ? { ...r, enabled: !r.enabled } : r
    );
    onUpdateSystemReminders(updated);
    const reminder = updated.find((r) => r.id === reminderId);
    if (reminder) {
      toast.success(
        reminder.enabled
          ? `Reminder enabled: ${reminder.label} · تم تفعيل التنبيه`
          : `Reminder disabled: ${reminder.label} · تم تعطيل التنبيه`
      );
    }
  };

  const tabs = [
    { key: "details" as const, label: "Details", icon: "📋" },
    { key: "overrides" as const, label: "Updates", icon: "✏️" },
    { key: "notes" as const, label: "Notes", icon: "📝" },
    { key: "alarms" as const, label: "Reminders", icon: "⏰" },
  ];

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
          <div className="flex items-center gap-2 shrink-0 relative">
            <button
              onClick={() => setShowShareMenu(!showShareMenu)}
              className="w-8 h-8 rounded-full flex items-center justify-center btn-press"
              style={{ background: "var(--teal-light)", border: "1px solid rgba(0,77,91,0.15)" }}
              title="Share"
            >
              <Share2 size={14} color="var(--teal-deep)" />
            </button>
            {showShareMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowShareMenu(false)} />
                <div
                  className="absolute right-0 top-10 z-50 rounded-xl overflow-hidden shadow-lg"
                  style={{ background: "white", border: "1px solid var(--gray-light)", minWidth: 200 }}
                >
                <button
                  onClick={handleShareWhatsApp}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left btn-press hover:bg-gray-50 transition-colors"
                >
                  <MessageCircle size={16} color="#25D366" />
                  <div>
                    <p className="text-[13px] font-semibold" style={{ color: "var(--navy)", fontFamily: "'DM Sans'" }}>WhatsApp</p>
                    <p className="text-[10px]" style={{ color: "var(--gray)" }}>Share flight details · مشاركة عبر واتساب</p>
                  </div>
                </button>
                <div style={{ height: 1, background: "var(--gray-light)" }} />
                <button
                  onClick={handleShareEmail}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left btn-press hover:bg-gray-50 transition-colors"
                >
                  <Mail size={16} color="var(--teal-deep)" />
                  <div>
                    <p className="text-[13px] font-semibold" style={{ color: "var(--navy)", fontFamily: "'DM Sans'" }}>Email</p>
                    <p className="text-[10px]" style={{ color: "var(--gray)" }}>Send via email · إرسال بالبريد</p>
                  </div>
                </button>
                <div style={{ height: 1, background: "var(--gray-light)" }} />
                <button
                  onClick={() => {
                    const text = buildShareText();
                    navigator.clipboard.writeText(text).then(() => {
                      toast.success("Copied to clipboard · تم النسخ");
                    }).catch(() => {
                      toast.error("Failed to copy · فشل النسخ");
                    });
                    setShowShareMenu(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left btn-press hover:bg-gray-50 transition-colors"
                >
                  <Copy size={16} color="var(--teal-deep)" />
                  <div>
                    <p className="text-[13px] font-semibold" style={{ color: "var(--navy)", fontFamily: "'DM Sans'" }}>Copy Text</p>
                    <p className="text-[10px]" style={{ color: "var(--gray)" }}>Copy to clipboard · نسخ النص</p>
                  </div>
                </button>
                <div style={{ height: 1, background: "var(--gray-light)" }} />
                <button
                  onClick={() => { handleExport(); setShowShareMenu(false); }}
                  disabled={isExporting}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left btn-press hover:bg-gray-50 transition-colors"
                >
                  <Image size={16} color="var(--gold)" />
                  <div>
                    <p className="text-[13px] font-semibold" style={{ color: "var(--navy)", fontFamily: "'DM Sans'" }}>Save as Image</p>
                    <p className="text-[10px]" style={{ color: "var(--gray)" }}>Download boarding pass · حفظ كصورة</p>
                  </div>
                </button>
                </div>
              </>
            )}
            {onEdit && (
              <button
                onClick={onEdit}
                aria-label="Edit ticket"
                className="w-8 h-8 rounded-full flex items-center justify-center btn-press"
                style={{ background: "var(--teal-light)" }}
              >
                <Edit3 size={14} color="var(--teal-deep)" />
              </button>
            )}
            {onDelete && (
              <button
                onClick={onDelete}
                aria-label="Delete ticket"
                className="w-8 h-8 rounded-full flex items-center justify-center btn-press"
                style={{ background: "rgba(217,79,79,0.1)" }}
              >
                <Trash2 size={14} color="var(--error)" />
              </button>
            )}
            <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "#F0F2F5" }}>
              <X size={16} color="var(--gray)" />
            </button>
          </div>
        </div>

        {/* Override banner on details tab */}
        {overrides.length > 0 && activeTab === "details" && (
          <div className="mx-5 mb-2 rounded-xl px-3 py-2" style={{ background: "#FFF3E0", border: "1px solid rgba(255,152,0,0.3)" }}>
            <div className="flex items-center gap-1.5 mb-1">
              <Edit3 size={11} color="#E65100" />
              <p className="font-mono text-[9px] tracking-widest" style={{ color: "#E65100" }}>
                {overrides.length} MANUAL UPDATE{overrides.length > 1 ? "S" : ""} NOTED
              </p>
            </div>
            {overrides.map((o) => (
              <p key={o.id} className="text-[11px]" style={{ color: "#BF360C", fontFamily: "'DM Sans'" }}>
                ⚡ {o.field}: <strong>{o.value}</strong>
              </p>
            ))}
            <p className="font-arabic text-[9px] mt-0.5" dir="rtl" style={{ color: "#E65100" }}>
              هذه تعديلات يدوية — غير رسمية
            </p>
          </div>
        )}

        {/* Tab pills */}
        <div className="flex gap-1.5 px-5 py-2">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className="flex-1 flex items-center justify-center gap-1 rounded-full transition-all"
              style={{
                height: 34,
                background: activeTab === tab.key ? "var(--teal-deep)" : "var(--off-white)",
                color: activeTab === tab.key ? "white" : "var(--gray)",
                fontSize: 11, fontWeight: 700, fontFamily: "'DM Sans'",
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
              {seg.extraction?.provider && (
                <div className="rounded-2xl p-3" style={{ background: "var(--off-white)", border: "1px solid var(--gray-light)" }}>
                  <p className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: "var(--navy)" }}>
                    🔍 Scan info · <span className="font-arabic">معلومات المسح</span>
                  </p>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: "var(--navy)", color: "white" }}>
                      {seg.extraction.provider === "openai" ? "OpenAI" : "Gemini"}
                    </span>
                    {typeof seg.extraction.confidence === "number" && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-mono" style={{
                        background: seg.extraction.confidence >= 0.85 ? "#3DAA6E" : seg.extraction.confidence >= 0.6 ? "#C5965A" : "#D94F4F",
                        color: "white",
                      }}>
                        {Math.round(seg.extraction.confidence * 100)}%
                      </span>
                    )}
                    {seg.extraction.detectedLanguage && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: "var(--gray-light)", color: "var(--navy)" }}>
                        {seg.extraction.detectedLanguage.slice(0, 2).toUpperCase()}
                      </span>
                    )}
                    {seg.extraction.translated && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: "var(--teal-mid)", color: "white" }}>
                        Translated · مترجم
                      </span>
                    )}
                  </div>
                  {seg.extraction.runAt && (
                    <p className="text-[10px] mb-2" style={{ color: "var(--gray)" }}>
                      Last scan: {new Date(seg.extraction.runAt).toLocaleString()}
                    </p>
                  )}
                  {onRescan && (
                    <button
                      onClick={async () => {
                        if (isRescanning) return;
                        setIsRescanning(true);
                        try { await onRescan(); } finally { setIsRescanning(false); }
                      }}
                      disabled={isRescanning}
                      className="w-full text-[12px] py-2 rounded-xl font-semibold btn-press disabled:opacity-50"
                      style={{ background: "var(--teal-mid)", color: "white" }}
                    >
                      {isRescanning ? "Re-scanning…" : "🔄 Re-scan ticket · إعادة المسح"}
                    </button>
                  )}
                </div>
              )}
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

              {/* Seat highlight */}
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

              {/* Active alarms summary */}
              {(alarms.length > 0 || systemReminders.filter((r) => r.enabled).length > 0) && (
                <div className="rounded-xl p-3" style={{ background: "var(--teal-light)", border: "1px solid rgba(0,77,91,0.12)" }}>
                  <div className="flex items-center gap-1.5 mb-1">
                    <Bell size={12} color="var(--teal-deep)" />
                    <p className="font-mono text-[9px] tracking-widest" style={{ color: "var(--teal-deep)" }}>ACTIVE REMINDERS</p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {!systemAlertsMuted && systemReminders.filter((r) => r.enabled).map((r) => (
                      <span key={r.id} className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: "rgba(0,77,91,0.08)", color: "var(--teal-deep)", border: "1px solid rgba(0,77,91,0.15)" }}>
                        {r.icon} {r.label}
                      </span>
                    ))}
                    {alarms.map((m) => {
                      const opt = userAlarmOptions.find((o) => o.value === m);
                      return (
                        <span key={m} className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: "var(--white)", color: "var(--teal-deep)", border: "1px solid rgba(0,77,91,0.15)" }}>
                          {opt?.icon} {opt?.label}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Export button */}
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

          {/* ─── OVERRIDES TAB ─── */}
          {activeTab === "overrides" && (
            <div className="space-y-4 pt-2">
              {/* Explanation */}
              <div className="rounded-2xl p-4" style={{ background: "#FFF8E1", border: "1px solid rgba(255,152,0,0.2)" }}>
                <div className="flex items-center gap-2 mb-2">
                  <Edit3 size={16} color="#E65100" />
                  <div>
                    <p className="text-[13px] font-bold" style={{ color: "#BF360C", fontFamily: "'DM Sans'" }}>Manual Updates</p>
                    <p className="font-arabic text-[10px]" dir="rtl" style={{ color: "#E65100" }}>تعديلات يدوية</p>
                  </div>
                </div>
                <p className="text-[11px] leading-relaxed" style={{ color: "#5D4037" }}>
                  If you know about a gate, time, or seat change that isn't reflected in the official system yet, 
                  note it here. These are <strong>your personal annotations</strong> — clearly marked as unofficial.
                </p>
                <p className="font-arabic text-[10px] mt-1 leading-relaxed" dir="rtl" style={{ color: "#795548" }}>
                  إذا علمت بتغيير في البوابة أو الوقت أو المقعد لم يظهر بعد في النظام الرسمي، سجّله هنا. هذه ملاحظاتك الشخصية — موضح أنها غير رسمية.
                </p>
              </div>

              {/* Existing overrides */}
              {overrides.length > 0 && (
                <div className="space-y-2">
                  <p className="font-mono text-[9px] tracking-widest" style={{ color: "#E65100" }}>
                    YOUR UPDATES ({overrides.length})
                  </p>
                  {overrides.map((o) => (
                    <div key={o.id} className="flex items-start justify-between rounded-xl px-3 py-2.5" style={{ background: "#FFF3E0", border: "1px solid rgba(255,152,0,0.2)" }}>
                      <div className="flex-1">
                        <p className="text-[12px] font-bold" style={{ color: "#BF360C", fontFamily: "'DM Sans'" }}>
                          ⚡ {o.field}
                        </p>
                        <p className="text-[13px] font-semibold mt-0.5" style={{ color: "#E65100" }}>{o.value}</p>
                        <p className="text-[9px] mt-0.5" style={{ color: "#795548" }}>
                          Noted {new Date(o.timestamp).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })} · You
                        </p>
                      </div>
                      <button
                        onClick={() => handleRemoveOverride(o.id)}
                        className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 btn-press"
                        style={{ background: "rgba(217,79,79,0.1)" }}
                      >
                        <Trash2 size={13} color="#D94F4F" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add new override */}
              <div className="rounded-2xl p-4" style={{ background: "var(--off-white)", border: "1px solid var(--gray-light)" }}>
                <p className="font-mono text-[9px] tracking-widest mb-3" style={{ color: "var(--teal-deep)" }}>ADD UPDATE</p>

                {/* Field selector */}
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {getOverrideFields(seg.type).map((f) => (
                    <button
                      key={f.key}
                      onClick={() => setSelectedField(f.key)}
                      className="text-[11px] px-3 py-1.5 rounded-full btn-press transition-all"
                      style={{
                        background: selectedField === f.key ? "var(--teal-deep)" : "var(--white)",
                        color: selectedField === f.key ? "white" : "var(--navy)",
                        border: selectedField === f.key ? "none" : "1px solid var(--gray-light)",
                        fontFamily: "'DM Sans'", fontWeight: selectedField === f.key ? 700 : 500,
                      }}
                    >
                      {f.icon} {f.label}
                    </button>
                  ))}
                </div>

                {/* Value input */}
                {selectedField && (
                  <>
                    <input
                      type="text"
                      value={overrideValue}
                      onChange={(e) => setOverrideValue(e.target.value)}
                      placeholder={getOverrideFields(seg.type).find((f) => f.key === selectedField)?.placeholder || "Enter value..."}
                      className="w-full rounded-xl px-3 py-2.5 text-[13px] focus:outline-none mb-2"
                      style={{
                        background: "var(--white)",
                        border: "1.5px solid var(--teal-mid)",
                        color: "var(--navy)",
                        fontFamily: "'DM Sans'",
                      }}
                    />
                    <p className="font-arabic text-[10px] mb-3" dir="rtl" style={{ color: "var(--gray)" }}>
                      {getOverrideFields(seg.type).find((f) => f.key === selectedField)?.labelAr}
                    </p>
                  </>
                )}

                <button
                  onClick={handleAddOverride}
                  disabled={!selectedField || !overrideValue.trim()}
                  className="w-full py-2.5 rounded-xl text-[13px] font-bold text-white btn-press transition-opacity"
                  style={{
                    background: selectedField && overrideValue.trim() ? "#E65100" : "var(--gray-light)",
                    opacity: selectedField && overrideValue.trim() ? 1 : 0.5,
                  }}
                >
                  Add Update · <span className="font-arabic">إضافة تعديل</span>
                </button>
              </div>

              {/* Disclaimer */}
              <div className="rounded-xl p-3" style={{ background: "rgba(217,79,79,0.06)", border: "1px solid rgba(217,79,79,0.15)" }}>
                <div className="flex items-center gap-1.5 mb-1">
                  <AlertTriangle size={12} color="#D94F4F" />
                  <p className="text-[11px] font-semibold" style={{ color: "#D94F4F" }}>Important</p>
                </div>
                <p className="text-[11px]" style={{ color: "var(--navy)" }}>
                  These are your personal annotations only. Always confirm changes at the airport/station information board or official airline app.
                </p>
                <p className="font-arabic text-[10px] mt-1" dir="rtl" style={{ color: "var(--gray)" }}>
                  هذه ملاحظاتك الشخصية فقط. تأكد دائماً من التغييرات من لوحة المعلومات بالمطار أو تطبيق شركة الطيران.
                </p>
              </div>
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
                  style={{ minHeight: 140, background: "var(--white)", border: "1px solid var(--gray-light)", color: "var(--navy)", fontFamily: "'DM Sans'" }}
                />
                <p className="text-[10px] mt-1.5" style={{ color: "var(--gray)" }}>
                  💡 Tip: Add gate info, meal preferences, mobility needs, or luggage details
                </p>
                <p className="font-arabic text-[9px]" dir="rtl" style={{ color: "var(--gray)" }}>
                  أضف معلومات البوابة، تفضيلات الوجبات، الاحتياجات الخاصة، أو تفاصيل الأمتعة
                </p>
              </div>
              {/* Quick notes */}
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
              <button onClick={handleSaveNotes} className="w-full py-3 rounded-xl text-[14px] font-bold text-white btn-press" style={{ background: "var(--teal-deep)" }}>
                Save Notes · <span className="font-arabic">حفظ الملاحظات</span>
              </button>
            </div>
          )}

          {/* ─── REMINDERS TAB (combined system + user) ─── */}
          {activeTab === "alarms" && (
            <div className="space-y-4 pt-2">
              {/* System alerts section */}
              <div className="rounded-2xl p-4" style={{ background: "var(--off-white)", border: "1px solid var(--gray-light)" }}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <Shield size={16} color="var(--teal-deep)" />
                    <div>
                      <p className="text-[13px] font-bold" style={{ color: "var(--navy)", fontFamily: "'DM Sans'" }}>Smart Reminders</p>
                      <p className="font-arabic text-[10px]" dir="rtl" style={{ color: "var(--gray)" }}>تنبيهات ذكية من التطبيق</p>
                    </div>
                  </div>
                  {/* Master mute toggle */}
                  <button
                    onClick={() => {
                      onToggleSystemAlertsMuted();
                      toast.success(
                        systemAlertsMuted
                          ? "System alerts enabled · تم تفعيل التنبيهات"
                          : "System alerts muted · تم كتم التنبيهات"
                      );
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full btn-press"
                    style={{
                      background: systemAlertsMuted ? "rgba(217,79,79,0.1)" : "var(--teal-light)",
                      border: systemAlertsMuted ? "1px solid rgba(217,79,79,0.2)" : "1px solid rgba(0,77,91,0.15)",
                    }}
                  >
                    {systemAlertsMuted ? <ShieldOff size={12} color="#D94F4F" /> : <Shield size={12} color="var(--teal-deep)" />}
                    <span className="text-[10px] font-bold" style={{ color: systemAlertsMuted ? "#D94F4F" : "var(--teal-deep)" }}>
                      {systemAlertsMuted ? "Muted" : "Active"}
                    </span>
                  </button>
                </div>
                <p className="text-[11px] mt-1" style={{ color: "var(--gray)" }}>
                  Auto-generated based on your {seg.type}. Mute if airport systems haven't updated yet.
                </p>
                <p className="font-arabic text-[9px]" dir="rtl" style={{ color: "var(--gray)" }}>
                  تُنشأ تلقائياً. أوقفها إذا لم يتم تحديث أنظمة المطار بعد.
                </p>
              </div>

              {/* System reminders list */}
              <div className="space-y-2">
                <p className="font-mono text-[9px] tracking-widest" style={{ color: "var(--teal-deep)" }}>
                  APP-GENERATED ({systemReminders.filter((r) => r.enabled && !systemAlertsMuted).length} active)
                </p>
                {systemReminders.map((reminder) => {
                  const isDisabled = systemAlertsMuted;
                  const isActive = reminder.enabled && !isDisabled;
                  return (
                    <button
                      key={reminder.id}
                      onClick={() => !isDisabled && handleToggleSystemReminder(reminder.id)}
                      disabled={isDisabled}
                      className="w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all btn-press"
                      style={{
                        background: isDisabled ? "rgba(0,0,0,0.03)" : isActive ? "var(--teal-light)" : "var(--white)",
                        border: isActive ? "1.5px solid var(--teal-deep)" : "1px solid var(--gray-light)",
                        opacity: isDisabled ? 0.5 : 1,
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-lg">{reminder.icon}</span>
                        <div className="text-left">
                          <p className="text-[12px] font-semibold" style={{ color: isActive ? "var(--teal-deep)" : "var(--navy)", fontFamily: "'DM Sans'" }}>
                            {reminder.label}
                          </p>
                          <p className="font-arabic text-[9px]" dir="rtl" style={{ color: "var(--gray)" }}>{reminder.labelAr}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {isDisabled && <span className="text-[9px]" style={{ color: "#D94F4F" }}>Muted</span>}
                        {isActive ? <ToggleRight size={20} color="var(--teal-deep)" /> : <ToggleLeft size={20} color="var(--gray-light)" />}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Divider */}
              <div className="flex items-center gap-3">
                <div className="flex-1 border-t" style={{ borderColor: "var(--gray-light)" }} />
                <span className="text-[10px] font-bold" style={{ color: "var(--gray)" }}>YOUR REMINDERS</span>
                <div className="flex-1 border-t" style={{ borderColor: "var(--gray-light)" }} />
              </div>

              {/* User alarm options */}
              <div className="space-y-2">
                {userAlarmOptions.map((opt) => {
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
                      className="w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all btn-press"
                      style={{
                        background: isActive ? "var(--gold-pale)" : "var(--white)",
                        border: isActive ? "1.5px solid var(--gold)" : "1px solid var(--gray-light)",
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-lg">{opt.icon}</span>
                        <p className="text-[12px] font-semibold" style={{ color: isActive ? "var(--gold)" : "var(--navy)", fontFamily: "'DM Sans'" }}>
                          {opt.label}
                        </p>
                      </div>
                      <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{
                        background: isActive ? "var(--gold)" : "var(--gray-light)",
                      }}>
                        {isActive ? <Bell size={12} color="white" /> : <BellOff size={10} color="var(--gray)" />}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Mute explanation */}
              <div className="rounded-xl p-3" style={{ background: systemAlertsMuted ? "rgba(217,79,79,0.06)" : "var(--gold-pale)", border: systemAlertsMuted ? "1px solid rgba(217,79,79,0.15)" : "1px solid rgba(197,150,90,0.2)" }}>
                <div className="flex items-center gap-1.5 mb-1">
                  {systemAlertsMuted ? <ShieldOff size={12} color="#D94F4F" /> : <AlertTriangle size={12} color="var(--gold)" />}
                  <p className="text-[11px] font-semibold" style={{ color: systemAlertsMuted ? "#D94F4F" : "var(--gold)" }}>
                    {systemAlertsMuted ? "System Alerts Muted" : "Travel Tip"}
                  </p>
                </div>
                <p className="text-[11px]" style={{ color: "var(--navy)" }}>
                  {systemAlertsMuted
                    ? "System-generated reminders are muted. You'll still receive your personal alarms. Use this when flight changes aren't yet reflected in airport displays."
                    : seg.type === "flight"
                    ? "Arrive at the airport 2-3 hours before international flights. Check gate changes 30 min before boarding."
                    : "Allow extra time and keep your booking reference handy."}
                </p>
                <p className="font-arabic text-[10px] mt-1" dir="rtl" style={{ color: "var(--gray)" }}>
                  {systemAlertsMuted
                    ? "تم كتم التنبيهات التلقائية. ستظل تتلقى تنبيهاتك الشخصية. استخدم هذا عندما لا تنعكس تغييرات الرحلة بعد على شاشات المطار."
                    : seg.type === "flight"
                    ? "احضر للمطار قبل ٢-٣ ساعات للرحلات الدولية."
                    : "اترك وقتاً إضافياً واحتفظ بمرجع الحجز."}
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
