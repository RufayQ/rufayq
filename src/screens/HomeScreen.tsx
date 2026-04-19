import { useState } from "react";
import RufayQWordmark from "@/components/RufayQWordmark";
import HeaderMenu, { Copy, Share2, RefreshCw, Bell, Settings, HelpCircle } from "@/components/HeaderMenu";
import NotificationBell from "@/components/NotificationBell";
import { CreditCard } from "lucide-react";
import { toast } from "sonner";
import { medications, appointments } from "@/constants/data";
import { Plus, MapPin, Video, Building2 } from "lucide-react";

interface HomeScreenProps {
  onNavigate: (tab: string, context?: string) => void;
  onProfile: () => void;
}

const HomeScreen = ({ onNavigate, onProfile }: HomeScreenProps) => {
  const statusColor = (s: string) =>
    s === "taken" ? "var(--success)" : s === "due" ? "var(--warning)" : s === "upcoming" ? "var(--gray)" : "var(--error)";

  const todayMeds = medications.filter((_, i) => i < 3);
  const dateStr = new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" }).toUpperCase();

  const homeMenuItems = [
    {
      icon: <RefreshCw size={14} />, label: "Refresh", labelAr: "تحديث",
      onClick: () => { window.location.reload(); },
    },
    {
      icon: <Bell size={14} />, label: "Notifications", labelAr: "الإشعارات",
      onClick: () => { toast("Notifications · الإشعارات", { description: "All notifications are up to date · جميع الإشعارات محدّثة" }); },
    },
    {
      icon: <Copy size={14} />, label: "Copy Summary", labelAr: "نسخ الملخص",
      onClick: () => {
        const text = `RufayQ – Trip Summary\nActive Trip: Berlin, DE – Orthopedic Surgery\nProgress: Day 7/12 (58%)\nMedications: ${todayMeds.map(m => `${m.name} (${m.status})`).join(", ")}\n\nرُفَيِّق – ملخص الرحلة\nالرحلة: برلين، ألمانيا – جراحة العظام\nالتقدم: يوم ٧ / ١٢`;
        navigator.clipboard.writeText(text);
        toast("Copied · تم النسخ");
      },
    },
    {
      icon: <Share2 size={14} />, label: "Share App", labelAr: "مشاركة التطبيق",
      onClick: () => {
        const url = window.location.origin;
        const msg = encodeURIComponent(`Check out RufayQ – your medical travel companion!\nجرّب رُفَيِّق – رفيقك في الرحلة العلاجية\n${url}`);
        window.open(`https://wa.me/?text=${msg}`, "_blank");
      },
    },
    {
      icon: <CreditCard size={14} />, label: "Subscriptions & Payment", labelAr: "الاشتراكات والدفع",
      onClick: () => { onNavigate("pricing"); },
    },
    {
      icon: <Settings size={14} />, label: "Settings", labelAr: "الإعدادات",
      onClick: () => { onNavigate("settings"); },
    },
    {
      icon: <HelpCircle size={14} />, label: "Help & Support", labelAr: "المساعدة",
      onClick: () => { onNavigate("support"); },
    },
  ];

  return (
    <div className="flex flex-col" style={{ height: 0, flex: 1, overflow: "hidden" }}>
      {/* Header */}
      <div className="relative px-5 pt-3 pb-16 overflow-hidden" style={{ background: "linear-gradient(145deg, var(--header-teal-from), var(--header-teal-to))" }}>
        <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full" style={{ border: "1px solid rgba(197,150,90,0.15)" }} />
        <div className="absolute -top-20 -right-20 w-60 h-60 rounded-full" style={{ border: "1px solid rgba(197,150,90,0.08)" }} />

        <div className="relative z-10">
          <div className="flex items-center justify-between mb-3">
            <RufayQWordmark size="sm" variant="light" />
            <div className="flex items-center gap-2">
              <HeaderMenu items={homeMenuItems} />
              <button onClick={onProfile} className="w-9 h-9 rounded-full flex items-center justify-center font-arabic text-sm font-bold btn-press" style={{ background: "var(--gold)", color: "#fff" }}>
                م
              </button>
            </div>
          </div>
          <p className="font-mono text-[10px] tracking-widest mb-1" style={{ color: "rgba(255,255,255,0.5)" }}>{dateStr}</p>
          <p className="font-display text-xl italic text-white" style={{ fontWeight: 300 }}>Good evening, Mohammed</p>
          <p className="font-arabic text-sm mt-0.5" dir="rtl" style={{ color: "rgba(255,255,255,0.55)" }}>مساء الخير، محمد</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 -mt-8 pb-6 space-y-3 relative z-10" style={{ background: "transparent", WebkitOverflowScrolling: "touch" }}>
        {/* Trip Card */}
        <div className="rounded-2xl p-5 animate-fade-in-up" style={{ background: "var(--white)", boxShadow: "0 8px 32px rgba(0,77,91,0.14)" }}>
          <div className="flex items-center justify-between mb-1">
            <div>
              <p className="font-mono text-[9px] tracking-widest" style={{ color: "var(--gold)" }}>ACTIVE TRIP — BERLIN, DE</p>
              <p className="font-display text-lg mt-0.5" style={{ color: "var(--navy)" }}>Orthopedic Surgery</p>
              <p className="font-arabic text-xs" dir="rtl" style={{ color: "var(--gray)" }}>رحلة جراحة العظام</p>
            </div>
            <span className="font-mono text-[11px] px-3 py-1 rounded-full" style={{ background: "var(--teal-light)", color: "var(--teal-deep)" }}>
              DAY 7 / 12
            </span>
          </div>

          <div className="w-full h-1.5 rounded-full mt-3 mb-3" style={{ background: "var(--gray-light)" }}>
            <div className="h-1.5 rounded-full animate-progress" style={{ width: "58%", background: "linear-gradient(90deg, var(--teal-deep), var(--teal-bright))" }} />
          </div>

          <div className="grid grid-cols-3 text-center">
            {[
              { val: "6", sub: "/10 Done", subAr: "مكتملة", color: "var(--success)" },
              { val: "5", sub: "Days Left", subAr: "أيام متبقية", color: "var(--teal-deep)" },
              { val: "2", sub: "Follow-ups", subAr: "متابعات", color: "var(--gold)" },
            ].map((s, i) => (
              <div key={i} className="relative">
                {i > 0 && <div className="absolute left-0 top-1 bottom-1 w-px" style={{ background: "var(--gray-light)" }} />}
                <p className="font-display text-2xl" style={{ color: s.color }}>{s.val}</p>
                <p className="text-[10px]" style={{ color: "var(--gray)" }}>{s.sub}</p>
                <p className="font-arabic text-[9px]" dir="rtl" style={{ color: "var(--gray)" }}>{s.subAr}</p>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between mt-2">
            <button onClick={() => onNavigate("journey")} className="text-xs btn-press" style={{ color: "var(--teal-mid)" }}>
              View full journey →
            </button>
            <button onClick={() => onNavigate("journey")} className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold btn-press" style={{ background: "var(--teal-deep)", color: "#fff" }}>
              <Plus size={10} /> New Trip
            </button>
          </div>
        </div>

        {/* Past Journeys */}
        <div className="stagger-2">
          <p className="font-mono text-[10px] tracking-widest mb-2" style={{ color: "var(--gray)" }}>PAST JOURNEYS</p>
          <div className="space-y-2">
            {[
              { dest: "Istanbul, Turkey", specialty: "Dental Implants", date: "Jan 2026", emoji: "🦷", status: "completed" },
              { dest: "Bangkok, Thailand", specialty: "Cardiac Check-up", date: "Sep 2025", emoji: "❤️", status: "completed" },
            ].map((trip, i) => (
              <button key={i} onClick={() => onNavigate("journey")} className="w-full rounded-xl p-3 flex items-center gap-3 text-left card-press" style={{ background: "var(--white)", border: "1px solid var(--gray-light)" }}>
                <div className="w-10 h-10 rounded-lg flex items-center justify-center text-xl shrink-0" style={{ background: "var(--off-white)" }}>{trip.emoji}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-semibold truncate" style={{ color: "var(--navy)" }}>{trip.dest}</p>
                  <p className="text-[10px]" style={{ color: "var(--gray)" }}>{trip.specialty} · {trip.date}</p>
                </div>
                <span className="font-mono text-[8px] px-1.5 py-0.5 rounded-full" style={{ background: "rgba(61,170,110,0.1)", color: "var(--success)" }}>DONE ✓</span>
              </button>
            ))}
          </div>
        </div>

        {/* Alert Banner */}
        <button
          onClick={() => onNavigate("records")}
          className="w-full rounded-xl p-3.5 flex items-center gap-3 text-left stagger-2 card-press"
          style={{ background: "var(--gold-pale)", borderLeft: "3px solid var(--gold)" }}
        >
          <span className="text-xl">📋</span>
          <div className="flex-1">
            <p className="text-[13px] font-semibold" style={{ color: "var(--navy)" }}>Discharge Pack Ready</p>
            <p className="font-arabic text-[11px]" dir="rtl" style={{ color: "var(--gray)" }}>حزمة الخروج جاهزة — اضغط لعرضها</p>
          </div>
          <span className="text-lg" style={{ color: "var(--gold)" }}>›</span>
        </button>

        {/* Upcoming Appointments */}
        <div className="stagger-3">
          <div className="flex items-center justify-between mb-2">
            <p className="font-mono text-[10px] tracking-widest" style={{ color: "var(--gray)" }}>UPCOMING APPOINTMENTS</p>
            <button onClick={() => onNavigate("journey")} className="text-[10px] btn-press" style={{ color: "var(--teal-mid)" }}>View all →</button>
          </div>
          <div className="space-y-2">
            {appointments.filter(a => a.status === "upcoming").slice(0, 2).map((apt) => (
              <button key={apt.id} onClick={() => onNavigate("journey")} className="w-full rounded-xl p-3 flex items-center gap-3 text-left card-press" style={{ background: "var(--white)", border: "1px solid var(--gray-light)" }}>
                <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: apt.type === "telemedicine" ? "var(--teal-light)" : "var(--gold-pale)" }}>
                  {apt.type === "telemedicine" ? <Video size={16} style={{ color: "var(--teal-deep)" }} /> : apt.type === "clinic" ? <Building2 size={16} style={{ color: "var(--gold)" }} /> : <MapPin size={16} style={{ color: "var(--success)" }} />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-semibold truncate" style={{ color: "var(--navy)" }}>{apt.doctorName}</p>
                  <p className="text-[10px]" style={{ color: "var(--gray)" }}>{apt.specialty} · {apt.date}</p>
                </div>
                <span className="font-mono text-[10px] font-semibold" style={{ color: "var(--teal-deep)" }}>{apt.time}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Today's Medications */}
        <div className="stagger-4">
          <p className="font-mono text-[10px] tracking-widest mb-2" style={{ color: "var(--gray)" }}>TODAY'S MEDICATIONS</p>
          <div className="space-y-2">
            {todayMeds.map((med, i) => (
              <div key={i} className="rounded-xl p-3 flex items-center gap-3" style={{ background: "var(--white)", boxShadow: "0 1px 6px rgba(0,0,0,0.04)" }}>
                <div className="w-2 h-2 rounded-full" style={{ background: statusColor(med.status), boxShadow: med.status === "due" ? "0 0 0 3px rgba(224,160,48,0.2)" : "none" }} />
                <div className="flex-1">
                  <p className="text-[13px] font-semibold" style={{ color: "var(--navy)" }}>{med.name}</p>
                  <p className="font-arabic text-[10px]" dir="rtl" style={{ color: "var(--gray)" }}>{med.nameAr}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-semibold" style={{ color: statusColor(med.status) }}>{med.time}</p>
                  <p className="font-mono text-[10px]" style={{ color: "var(--gray)" }}>{med.frequency}</p>
                </div>
              </div>
            ))}
          </div>
          <button onClick={() => onNavigate("medications")} className="block ml-auto mt-2 text-[11px] btn-press" style={{ color: "var(--teal-mid)" }}>
            View all medications →
          </button>
        </div>

        {/* Quick Actions */}
        <div className="stagger-4">
          <p className="font-mono text-[10px] tracking-widest mb-2" style={{ color: "var(--gray)" }}>QUICK ACTIONS</p>
          <div className="grid grid-cols-2 gap-2">
            {[
              { emoji: "🤖", label: "Ask RufayQ AI", labelAr: "اسأل رُفَيِّق", tab: "chat" },
              { emoji: "📸", label: "Scan Document", labelAr: "امسح وثيقة", tab: "scanner" },
              { emoji: "📁", label: "All Records", labelAr: "جميع الملفات", tab: "records" },
              { emoji: "💎", label: "Plans & Pricing", labelAr: "الأسعار والباقات", tab: "pricing" },
              { emoji: "🎫", label: "Customer Support", labelAr: "الدعم الفني", tab: "support" },
              { emoji: "💊", label: "Medications", labelAr: "الأدوية", tab: "medications" },
            ].map((a) => (
              <button
                key={a.label}
                onClick={() => onNavigate(a.tab)}
                className="rounded-xl p-3.5 flex flex-col items-center gap-1 card-press"
                style={{ background: "var(--white)", border: "1px solid var(--gray-light)" }}
              >
                <span className="text-xl">{a.emoji}</span>
                <span className="text-[13px] font-semibold" style={{ color: "var(--navy)" }}>{a.label}</span>
                <span className="font-arabic text-[10px]" dir="rtl" style={{ color: "var(--gray)" }}>{a.labelAr}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Upcoming Reminders */}
        <div className="stagger-5">
          <p className="font-mono text-[10px] tracking-widest mb-2" style={{ color: "var(--gray)" }}>UPCOMING REMINDERS</p>
          <div className="rounded-xl overflow-hidden" style={{ background: "var(--white)", border: "1px solid var(--gray-light)" }}>
            {[
              { emoji: "📅", en: "30-Day Follow-up — Riyadh", ar: "متابعة ٣٠ يوم — الرياض", date: "May 15", color: "var(--gold)" },
              { emoji: "✈️", en: "Return Flight — Berlin → Riyadh", ar: "رحلة العودة", date: "Apr 15", color: "var(--teal-deep)" },
              { emoji: "💊", en: "Next Medication Due", ar: "الجرعة القادمة", date: "8:00 PM", color: "var(--warning)" },
            ].map((r, i) => (
              <div key={i}>
                {i > 0 && <div className="mx-4 h-px" style={{ background: "var(--gray-light)" }} />}
                <div className="flex items-center gap-3 px-4 py-3">
                  <span className="text-base">{r.emoji}</span>
                  <div className="flex-1">
                    <p className="text-xs font-medium" style={{ color: "var(--navy)" }}>{r.en}</p>
                    <p className="font-arabic text-[10px]" dir="rtl" style={{ color: "var(--gray)" }}>{r.ar}</p>
                  </div>
                  <span className="text-xs font-semibold" style={{ color: r.color }}>{r.date}</span>
                </div>
              </div>
            ))}
          </div>
          <button className="w-full mt-2 py-2.5 rounded-xl text-xs font-medium btn-press" style={{ border: "1px solid var(--gray-light)", color: "var(--gray)" }}>
            + Add reminder · إضافة تذكير
          </button>
        </div>
      </div>
    </div>
  );
};

export default HomeScreen;
