import { records } from "@/constants/data";
import { FileText, Share2 } from "lucide-react";

const RecordsScreen = () => {
  return (
    <div className="flex flex-col h-full">
      <div className="px-4 pt-4 pb-3" style={{ background: "linear-gradient(135deg, #004D5B, #006D7C)" }}>
        <p className="text-base font-semibold" style={{ color: "#fff" }}>Medical Records</p>
        <p className="font-arabic text-sm" dir="rtl" style={{ color: "var(--teal-light)" }}>ملفاتي الطبية</p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3" style={{ background: "var(--off-white)" }}>
        {/* Featured Discharge Card */}
        <div className="rounded-xl p-4 relative overflow-hidden" style={{ background: "linear-gradient(135deg, #0D1B2A, #1a2d42)" }}>
          <span className="absolute top-3 right-3 text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: "var(--gold)", color: "#fff" }}>
            NEW
          </span>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "rgba(197,150,90,0.2)" }}>
              <FileText size={20} style={{ color: "var(--gold)" }} />
            </div>
            <div>
              <p className="text-sm font-semibold" style={{ color: "#fff" }}>Discharge Pack</p>
              <p className="font-arabic text-xs" dir="rtl" style={{ color: "var(--gold)" }}>حزمة الخروج</p>
            </div>
          </div>
          <p className="text-xs mb-3 leading-relaxed" style={{ color: "rgba(255,255,255,0.6)" }}>
            Complete discharge summary translated to Arabic, medication schedule, and follow-up plan.
          </p>
          <div className="flex gap-2">
            <button className="flex-1 text-xs font-medium py-2 rounded-lg" style={{ background: "var(--gold)", color: "#fff" }}>
              View Arabic
            </button>
            <button className="flex-1 text-xs font-medium py-2 rounded-lg flex items-center justify-center gap-1" style={{ border: "1px solid rgba(255,255,255,0.3)", color: "#fff" }}>
              <Share2 size={12} /> Share to KSA
            </button>
          </div>
        </div>

        {/* Document List */}
        {records.map((doc) => (
          <button
            key={doc.titleEn}
            className="w-full flex items-center gap-3 p-3 rounded-xl text-left"
            style={{ background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
          >
            <span className="text-xl">{doc.emoji}</span>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium" style={{ color: "var(--navy)" }}>{doc.titleEn}</p>
                {doc.isNew && (
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: "var(--gold)", color: "#fff" }}>
                    NEW
                  </span>
                )}
              </div>
              <p className="font-arabic text-xs" dir="rtl" style={{ color: "var(--gray)" }}>{doc.titleAr}</p>
            </div>
            <span className="text-[10px]" style={{ color: "var(--gray)" }}>{doc.date}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default RecordsScreen;
