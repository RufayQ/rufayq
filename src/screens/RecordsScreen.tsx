import { useState } from "react";
import { records, filterCategories } from "@/constants/data";
import { Share2, Upload } from "lucide-react";

const RecordsScreen = () => {
  const [activeFilter, setActiveFilter] = useState("All");
  const [selectedDoc, setSelectedDoc] = useState<number | null>(null);
  const [showUpload, setShowUpload] = useState(false);

  const filtered = activeFilter === "All" ? records : records.filter((r) => r.category === activeFilter);

  return (
    <div className="flex flex-col relative" style={{ height: 0, flex: 1, overflow: "hidden" }}>
      {/* Header */}
      <div className="relative px-5 pt-3 pb-4 overflow-hidden" style={{ background: "var(--teal-deep)" }}>
        <div className="flex items-center justify-between">
          <div>
            <p className="font-mono text-[10px] tracking-widest" style={{ color: "rgba(255,255,255,0.4)" }}>03 — MEDICAL RECORDS</p>
            <p className="font-display text-xl text-white" style={{ fontWeight: 300 }}>Your Documents</p>
            <p className="font-arabic text-sm" dir="rtl" style={{ color: "rgba(255,255,255,0.45)" }}>ملفاتك الطبية</p>
          </div>
          <button onClick={() => setShowUpload(true)} className="px-3 py-1.5 rounded-full text-[11px] font-medium btn-press" style={{ background: "var(--gold)", color: "#fff" }}>
            ＋ Upload
          </button>
        </div>
        <div className="flex gap-2 mt-3">
          {["5 Files", "3 Translated", "1 New"].map((s) => (
            <span key={s} className="font-mono text-[9px] px-2 py-1 rounded-full" style={{ background: "rgba(255,255,255,0.15)", color: "#fff" }}>{s}</span>
          ))}
        </div>
      </div>

      {/* Filter Pills */}
      <div className="flex gap-2 px-4 py-3 overflow-x-auto" style={{ background: "var(--off-white)" }}>
        {filterCategories.map((f) => (
          <button
            key={f}
            onClick={() => setActiveFilter(f)}
            className="text-[11px] px-3 py-1.5 rounded-full whitespace-nowrap btn-press transition-all"
            style={{
              background: activeFilter === f ? "var(--teal-deep)" : "var(--white)",
              color: activeFilter === f ? "#fff" : "var(--gray)",
              border: activeFilter === f ? "none" : "1px solid var(--gray-light)",
              boxShadow: activeFilter === f ? "0 2px 8px rgba(0,77,91,0.2)" : "none",
            }}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 pb-4 space-y-3" style={{ background: "var(--off-white)", WebkitOverflowScrolling: "touch" }}>
        {/* Featured Discharge Pack */}
        <div className="relative rounded-2xl p-5 overflow-hidden" style={{ background: "linear-gradient(135deg, #0D1B2A, #1A3A4A)" }}>
          <div className="absolute -top-4 -right-4 w-24 h-24 rounded-full" style={{ border: "1px solid rgba(197,150,90,0.2)" }} />
          <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full" style={{ border: "1px solid rgba(197,150,90,0.08)" }} />

          <div className="relative z-10">
            <div className="flex items-center justify-between mb-2">
              <p className="font-mono text-[9px] tracking-widest" style={{ color: "var(--gold)" }}>FEATURED · DISCHARGE PACK</p>
              <span className="font-mono text-[8px] px-2 py-0.5 rounded-full" style={{ background: "var(--gold)", color: "#fff" }}>NEW</span>
            </div>
            <p className="font-display text-lg text-white font-semibold">Post-Surgery Instructions</p>
            <p className="font-arabic text-xs" dir="rtl" style={{ color: "rgba(255,255,255,0.5)" }}>تعليمات ما بعد الجراحة</p>

            <div className="flex flex-wrap gap-1.5 mt-3">
              {["Arabic ✓", "English ✓", "5 pages", "Updated today", "Dr. Mueller"].map((c) => (
                <span key={c} className="font-mono text-[9px] px-2 py-0.5 rounded-full" style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.5)" }}>{c}</span>
              ))}
            </div>

            <div className="h-px my-4" style={{ background: "rgba(255,255,255,0.1)" }} />

            <div className="grid grid-cols-2 gap-2">
              <button className="py-2.5 rounded-xl text-[13px] font-semibold text-white btn-press" style={{ background: "var(--gold)" }}>
                View in Arabic
              </button>
              <button className="py-2.5 rounded-xl text-[13px] font-medium text-white flex items-center justify-center gap-1.5 btn-press" style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)" }}>
                <Share2 size={13} /> Share to KSA
              </button>
            </div>
          </div>
        </div>

        {/* Documents List */}
        <p className="font-mono text-[10px] tracking-widest mt-2" style={{ color: "var(--gray)" }}>ALL DOCUMENTS — {filtered.length} FILES</p>
        {filtered.map((doc, i) => (
          <button
            key={i}
            onClick={() => setSelectedDoc(i)}
            className="w-full flex items-center gap-3 p-3.5 rounded-xl text-left card-press"
            style={{ background: "var(--white)", border: "1px solid var(--gray-light)", boxShadow: "0 1px 6px rgba(0,0,0,0.04)" }}
          >
            <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl" style={{ background: doc.bgColor }}>
              {doc.emoji}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="text-[13px] font-semibold truncate" style={{ color: "var(--navy)" }}>{doc.titleEn}</p>
                {doc.isNew && (
                  <span className="font-mono text-[8px] px-1.5 py-0.5 rounded-full shrink-0" style={{ background: "var(--gold)", color: "#fff" }}>NEW</span>
                )}
              </div>
              <p className="font-arabic text-[10px]" dir="rtl" style={{ color: "var(--gray)" }}>{doc.titleAr}</p>
              <p className="text-[10px] mt-0.5 truncate" style={{ color: "var(--gray)" }}>{doc.meta}</p>
            </div>
            <span className="text-lg shrink-0" style={{ color: doc.accentColor }}>›</span>
          </button>
        ))}
      </div>

      {/* Document Detail Sheet */}
      {selectedDoc !== null && (
        <div className="absolute inset-0 z-20 flex flex-col justify-end" onClick={() => setSelectedDoc(null)}>
          <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.4)" }} />
          <div className="relative rounded-t-2xl p-5 pt-3 animate-slide-up" style={{ background: "var(--white)", maxHeight: "80%" }} onClick={(e) => e.stopPropagation()}>
            <div className="w-8 h-1 rounded-full mx-auto mb-4" style={{ background: "var(--gray-light)" }} />
            <div className="flex flex-col items-center mb-4">
              <div className="w-16 h-16 rounded-xl flex items-center justify-center text-3xl mb-3" style={{ background: filtered[selectedDoc].bgColor }}>
                {filtered[selectedDoc].emoji}
              </div>
              <p className="text-base font-semibold" style={{ color: "var(--navy)" }}>{filtered[selectedDoc].titleEn}</p>
              <p className="font-arabic text-sm" dir="rtl" style={{ color: "var(--gray)" }}>{filtered[selectedDoc].titleAr}</p>
              <p className="font-mono text-[10px] mt-2" style={{ color: "var(--gray)" }}>{filtered[selectedDoc].meta}</p>
            </div>
            <button className="w-full py-3 rounded-xl font-semibold text-white mb-2 btn-press" style={{ background: "var(--teal-deep)" }}>
              View Document · عرض المستند
            </button>
            <button className="w-full py-3 rounded-xl font-medium mb-2 btn-press" style={{ border: "1px solid var(--gray-light)", color: "var(--navy)" }}>
              Share · مشاركة
            </button>
            <button className="w-full py-2 text-sm font-medium btn-press" style={{ color: "var(--gold)" }}>
              Translate to Arabic · ترجمة للعربية
            </button>
          </div>
        </div>
      )}

      {/* Upload Sheet */}
      {showUpload && (
        <div className="absolute inset-0 z-20 flex flex-col justify-end" onClick={() => setShowUpload(false)}>
          <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.4)" }} />
          <div className="relative rounded-t-2xl p-5 pt-3 animate-slide-up" style={{ background: "var(--white)" }} onClick={(e) => e.stopPropagation()}>
            <div className="w-8 h-1 rounded-full mx-auto mb-4" style={{ background: "var(--gray-light)" }} />
            <p className="text-base font-semibold" style={{ color: "var(--navy)" }}>Upload Medical Document</p>
            <p className="font-arabic text-sm mb-4" dir="rtl" style={{ color: "var(--gray)" }}>رفع وثيقة طبية</p>
            <div className="grid grid-cols-3 gap-2 mb-4">
              {[
                { emoji: "📷", en: "Scan Document", ar: "مسح ضوئي" },
                { emoji: "📁", en: "From Files", ar: "من الملفات" },
                { emoji: "🖨️", en: "From DICOM", ar: "من DICOM" },
              ].map((o) => (
                <button key={o.en} className="rounded-xl p-3 flex flex-col items-center gap-1 card-press" style={{ background: "var(--off-white)", border: "1px solid var(--gray-light)" }}>
                  <span className="text-2xl">{o.emoji}</span>
                  <span className="text-[10px] font-medium" style={{ color: "var(--navy)" }}>{o.en}</span>
                  <span className="font-arabic text-[9px]" style={{ color: "var(--gray)" }}>{o.ar}</span>
                </button>
              ))}
            </div>
            <div className="border-2 border-dashed rounded-xl p-6 text-center" style={{ borderColor: "var(--gray-light)" }}>
              <Upload size={24} className="mx-auto mb-2" style={{ color: "var(--gray)" }} />
              <p className="text-xs" style={{ color: "var(--gray)" }}>Drag files here · اسحب الملفات هنا</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RecordsScreen;
