import { FileText, Bot, Route, ClipboardList } from "lucide-react";
import Wordmark from "@/components/Wordmark";
import { medications } from "@/constants/data";

const HomeScreen = ({ onNavigate }: { onNavigate: (tab: string) => void }) => {
  const statusColor = (s: string) =>
    s === "taken" ? "var(--success)" : s === "upcoming" ? "var(--warning)" : "#E53E3E";

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 pt-3 pb-4" style={{ background: "linear-gradient(135deg, #004D5B, #006D7C)" }}>
        <div className="flex items-center justify-between mb-3">
          <Wordmark size="text-lg" />
          <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold" style={{ background: "var(--gold)", color: "#fff" }}>
            M
          </div>
        </div>
        <p className="text-sm font-body" style={{ color: "var(--teal-light)" }}>Good evening, Mohammed</p>
        <p className="font-arabic text-sm mt-0.5" dir="rtl" style={{ color: "var(--teal-light)" }}>مساء الخير، محمد</p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3" style={{ background: "var(--off-white)" }}>
        {/* Trip Card */}
        <div className="rounded-xl p-4" style={{ background: "#fff", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
          <div className="flex items-center justify-between mb-1">
            <div>
              <p className="text-sm font-semibold" style={{ color: "var(--navy)" }}>Berlin, DE</p>
              <p className="text-xs" style={{ color: "var(--gray)" }}>Orthopedic Surgery</p>
            </div>
            <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ background: "var(--teal-light)", color: "var(--teal-deep)" }}>
              Day 7/12
            </span>
          </div>
          <div className="w-full h-2 rounded-full mt-2 mb-3" style={{ background: "var(--gray-light)" }}>
            <div className="h-2 rounded-full" style={{ width: "58%", background: "var(--teal-bright)" }} />
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            {[
              { label: "Done", value: "6/10" },
              { label: "Days Left", value: "5" },
              { label: "Follow-ups", value: "2" },
            ].map((s) => (
              <div key={s.label} className="rounded-lg py-2" style={{ background: "var(--off-white)" }}>
                <p className="text-base font-semibold" style={{ color: "var(--teal-deep)" }}>{s.value}</p>
                <p className="text-[10px]" style={{ color: "var(--gray)" }}>{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Alert */}
        <div className="rounded-xl p-3 flex items-center gap-3" style={{ background: "var(--gold-pale)" }}>
          <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "var(--gold)" }}>
            <FileText size={16} color="#fff" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium" style={{ color: "var(--navy)" }}>Discharge Pack Ready</p>
            <p className="font-arabic text-xs" dir="rtl" style={{ color: "var(--gold)" }}>حزمة الخروج جاهزة</p>
          </div>
        </div>

        {/* Medications */}
        <div>
          <p className="text-sm font-semibold mb-2" style={{ color: "var(--navy)" }}>Today's Medications</p>
          {medications.map((med) => (
            <div key={med.name} className="flex items-center gap-3 py-2.5 border-b" style={{ borderColor: "var(--gray-light)" }}>
              <div className="w-2.5 h-2.5 rounded-full" style={{ background: statusColor(med.status) }} />
              <div className="flex-1">
                <p className="text-sm" style={{ color: "var(--navy)" }}>{med.name}</p>
                <p className="text-[11px]" style={{ color: "var(--gray)" }}>{med.dosage} · {med.time}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-2 pb-2">
          {[
            { icon: Bot, label: "Ask AI", labelAr: "اسأل الذكاء", tab: "chat" },
            { icon: Route, label: "My Journey", labelAr: "رحلتي", tab: "journey" },
            { icon: ClipboardList, label: "Records", labelAr: "ملفاتي", tab: "records" },
            { icon: FileText, label: "Discharge", labelAr: "الخروج", tab: "records" },
          ].map((a) => (
            <button
              key={a.label}
              onClick={() => onNavigate(a.tab)}
              className="rounded-xl p-3 flex flex-col items-center gap-1 transition-colors"
              style={{ background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}
            >
              <a.icon size={22} style={{ color: "var(--teal-deep)" }} />
              <span className="text-xs font-medium" style={{ color: "var(--navy)" }}>{a.label}</span>
              <span className="font-arabic text-[10px]" style={{ color: "var(--gray)" }}>{a.labelAr}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default HomeScreen;
