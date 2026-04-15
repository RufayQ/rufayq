import { useState, useMemo, useCallback } from "react";
import { records, filterCategories, type DocRecord } from "@/constants/data";
import { Share2, Download, ChevronDown, Search, X, ArrowUpDown, Globe, FileText, Clock, Copy, RefreshCw } from "lucide-react";
import HeaderMenu, { type HeaderMenuItem } from "@/components/HeaderMenu";
import { toast } from "sonner";
import RufayQLogo from "@/components/RufayQLogo";

type SortMode = "newest" | "oldest" | "category";

const RecordsScreen = ({ onOpenScanner, onNavigate }: { onOpenScanner?: () => void; onNavigate?: (tab: string) => void }) => {
  const [activeFilter, setActiveFilter] = useState("All");
  const [selectedDoc, setSelectedDoc] = useState<DocRecord | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("newest");
  const [showSortMenu, setShowSortMenu] = useState(false);

  // Dynamic stats
  const totalFiles = records.length;
  const translatedCount = records.filter(r => r.translationStatus === "translated").length;
  const newCount = records.filter(r => r.isNew).length;

  // Filter + search + sort
  const filtered = useMemo(() => {
    let result = activeFilter === "All" ? [...records] : records.filter(r => r.category === activeFilter);

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(r =>
        r.titleEn.toLowerCase().includes(q) || r.titleAr.includes(searchQuery) ||
        r.category.toLowerCase().includes(q) || r.meta.toLowerCase().includes(q) ||
        r.source?.toLowerCase().includes(q)
      );
    }

    if (sortMode === "oldest") result.reverse();
    if (sortMode === "category") result.sort((a, b) => a.category.localeCompare(b.category));

    return result;
  }, [activeFilter, searchQuery, sortMode]);

  const translationBadge = (status?: string) => {
    if (status === "translated") return { label: "AR ✓", bg: "rgba(61,170,110,0.1)", color: "var(--success)" };
    if (status === "partial") return { label: "Partial", bg: "rgba(224,160,48,0.1)", color: "var(--warning)" };
    return { label: "EN only", bg: "rgba(107,122,138,0.1)", color: "var(--gray)" };
  };

  const handleCopyAllRecords = () => {
    const text = records.map(r => `${r.titleEn} — ${r.category} — ${r.meta}`).join("\n");
    navigator.clipboard.writeText(`Medical Records Summary\n\n${text}`);
    toast.success("Records copied · تم نسخ السجلات", { duration: 2000 });
  };

  const handleExportRecords = () => {
    const text = records.map(r => `${r.titleEn}\t${r.category}\t${r.meta}\t${r.source || ""}`).join("\n");
    const blob = new Blob([`Title\tCategory\tMeta\tSource\n${text}`], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "medical-records.txt"; a.click();
    URL.revokeObjectURL(url);
    toast.success("Records exported · تم تصدير السجلات", { duration: 2000 });
  };

  const handleShareRecords = () => {
    const text = `Medical Records Summary\n\n${records.map(r => `📄 ${r.titleEn} — ${r.category} — ${r.date}`).join("\n")}`;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
  };

  const recordsMenuItems: HeaderMenuItem[] = [
    { icon: <Copy size={14} />, label: "Copy All", labelAr: "نسخ الكل", onClick: handleCopyAllRecords },
    { icon: <Download size={14} />, label: "Export Records", labelAr: "تصدير السجلات", onClick: handleExportRecords },
    { icon: <Share2 size={14} />, label: "Share Records", labelAr: "مشاركة السجلات", onClick: handleShareRecords },
  ];

  return (
    <div className="flex flex-col relative" style={{ height: 0, flex: 1, overflow: "hidden" }}>
      {/* Header */}
      <div className="relative px-5 pt-3 pb-4 overflow-hidden shrink-0" style={{ background: "var(--teal-deep)" }}>
        <div className="flex items-center justify-between">
          <div>
            <p className="font-mono text-[10px] tracking-widest" style={{ color: "rgba(255,255,255,0.4)" }}>03 — MEDICAL RECORDS</p>
            <p className="font-display text-xl text-white" style={{ fontWeight: 300 }}>Your Documents</p>
            <p className="font-arabic text-sm" dir="rtl" style={{ color: "rgba(255,255,255,0.45)" }}>ملفاتك الطبية</p>
          </div>
          <div className="flex items-center gap-2">
            <HeaderMenu items={recordsMenuItems} />
            <button onClick={() => onNavigate?.("medications")} className="px-3 py-1.5 rounded-full text-[11px] font-medium btn-press" style={{ background: "var(--teal-deep)", color: "#fff" }}>
              ＋ Meds
            </button>
            <button onClick={() => onOpenScanner?.()} className="px-3 py-1.5 rounded-full text-[11px] font-medium btn-press" style={{ background: "var(--gold)", color: "#fff" }}>
              ＋ Scan
            </button>
          </div>
        </div>
        <div className="flex gap-2 mt-3">
          {[`${totalFiles} Files`, `${translatedCount} Translated`, newCount > 0 ? `${newCount} New` : null].filter(Boolean).map((s) => (
            <span key={s} className="font-mono text-[9px] px-2 py-1 rounded-full" style={{ background: "rgba(255,255,255,0.15)", color: "#fff" }}>{s}</span>
          ))}
        </div>
      </div>

      {/* Search bar */}
      <div className="px-4 pt-3 pb-1 shrink-0" style={{ background: "var(--off-white)" }}>
        <div className="rounded-xl px-3 py-2.5 flex items-center gap-2" style={{ background: "var(--white)", border: searchQuery ? "1.5px solid var(--teal-deep)" : "1px solid var(--gray-light)", transition: "border 200ms" }}>
          <Search size={15} style={{ color: "var(--gray)", flexShrink: 0 }} />
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="flex-1 text-[13px] bg-transparent outline-none"
            placeholder="Search records..."
            style={{ color: "var(--navy)" }}
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery("")}><X size={14} style={{ color: "var(--gray)" }} /></button>
          )}
        </div>
      </div>

      {/* Filter Pills + Sort */}
      <div className="shrink-0 px-4 py-2 flex items-center gap-2" style={{ background: "var(--off-white)" }}>
        <div className="flex-1 flex gap-2 overflow-x-auto" style={{ WebkitOverflowScrolling: "touch" }}>
          {filterCategories.map((f) => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              className="text-[10px] px-2.5 py-1.5 rounded-full whitespace-nowrap btn-press transition-all shrink-0"
              style={{
                background: activeFilter === f ? "var(--teal-deep)" : "var(--white)",
                color: activeFilter === f ? "#fff" : "var(--gray)",
                border: activeFilter === f ? "none" : "1px solid var(--gray-light)",
              }}
            >
              {f}
            </button>
          ))}
        </div>
        {/* Sort button */}
        <div className="relative shrink-0">
          <button onClick={() => setShowSortMenu(!showSortMenu)} className="w-8 h-8 rounded-lg flex items-center justify-center btn-press" style={{ background: "var(--white)", border: "1px solid var(--gray-light)" }}>
            <ArrowUpDown size={14} style={{ color: "var(--teal-deep)" }} />
          </button>
          {showSortMenu && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setShowSortMenu(false)} />
              <div className="absolute right-0 top-10 z-40 rounded-xl py-1 w-36" style={{ background: "var(--white)", boxShadow: "0 8px 24px rgba(0,0,0,0.15)", border: "1px solid var(--gray-light)" }}>
                {([["newest", "Newest first"], ["oldest", "Oldest first"], ["category", "By category"]] as const).map(([k, label]) => (
                  <button key={k} onClick={() => { setSortMode(k); setShowSortMenu(false); }}
                    className="w-full px-3 py-2 text-left text-[11px] btn-press"
                    style={{ color: sortMode === k ? "var(--teal-deep)" : "var(--navy)", fontWeight: sortMode === k ? 700 : 400, background: sortMode === k ? "var(--teal-light)" : "transparent" }}>
                    {label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 pb-4 space-y-3" style={{ background: "var(--off-white)", WebkitOverflowScrolling: "touch" }}>
        {/* Featured Discharge Pack */}
        {activeFilter === "All" && !searchQuery && (
          <div className="relative rounded-2xl p-5 overflow-hidden" style={{ background: "linear-gradient(135deg, var(--header-dark-from), var(--header-dark-alt))" }}>
            <div className="absolute -top-4 -right-4 w-24 h-24 rounded-full" style={{ border: "1px solid rgba(197,150,90,0.2)" }} />
            <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full" style={{ border: "1px solid rgba(197,150,90,0.08)" }} />
            <div className="absolute bottom-3 right-3 z-0" style={{ opacity: 0.25 }}>
              <RufayQLogo size={20} variant="dark" />
            </div>
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
                <button onClick={() => setSelectedDoc(records[0])} className="py-2.5 rounded-xl text-[13px] font-semibold text-white btn-press" style={{ background: "var(--gold)" }}>
                  View Details
                </button>
                <button className="py-2.5 rounded-xl text-[13px] font-medium text-white flex items-center justify-center gap-1.5 btn-press" style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)" }}>
                  <Share2 size={13} /> Share to KSA
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Results count */}
        <div className="flex items-center justify-between mt-1">
          <p className="font-mono text-[10px] tracking-widest" style={{ color: "var(--gray)" }}>
            {searchQuery ? `SEARCH RESULTS — ${filtered.length}` : `ALL DOCUMENTS — ${filtered.length} FILES`}
          </p>
        </div>

        {/* Empty state */}
        {filtered.length === 0 && (
          <div className="text-center py-10">
            <span className="text-4xl">📂</span>
            <p className="text-[14px] font-semibold mt-3" style={{ color: "var(--navy)" }}>No documents found</p>
            <p className="font-arabic text-[12px]" dir="rtl" style={{ color: "var(--gray)" }}>لا توجد مستندات مطابقة</p>
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} className="mt-3 px-4 py-2 rounded-full text-[12px] font-medium btn-press" style={{ background: "var(--teal-light)", color: "var(--teal-deep)" }}>
                Clear search
              </button>
            )}
          </div>
        )}

        {/* Documents List */}
        {filtered.map((doc, i) => {
          const tb = translationBadge(doc.translationStatus);
          return (
            <button
              key={`${doc.titleEn}-${i}`}
              onClick={() => setSelectedDoc(doc)}
              className="w-full flex items-center gap-3 p-3.5 rounded-xl text-left card-press"
              style={{ background: "var(--white)", border: "1px solid var(--gray-light)", boxShadow: "0 1px 6px rgba(0,0,0,0.04)" }}
            >
              <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl shrink-0" style={{ background: doc.bgColor }}>
                {doc.emoji}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-[13px] font-semibold truncate" style={{ color: "var(--navy)" }}>{doc.titleEn}</p>
                  {doc.isNew && (
                    <span className="font-mono text-[8px] px-1.5 py-0.5 rounded-full shrink-0" style={{ background: "var(--gold)", color: "#fff" }}>NEW</span>
                  )}
                </div>
                <p className="font-arabic text-[10px] truncate" dir="rtl" style={{ color: "var(--gray)" }}>{doc.titleAr}</p>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full" style={{ background: tb.bg, color: tb.color }}>{tb.label}</span>
                  <span className="font-mono text-[9px]" style={{ color: "var(--gray)" }}>{doc.date}</span>
                  {doc.pages && <span className="font-mono text-[9px]" style={{ color: "var(--gray)" }}>· {doc.pages}p</span>}
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onNavigate?.("chat", `📄 اسأل عن: "${doc.titleEn}" — ${doc.titleAr}\n\nأريد معرفة تفاصيل هذا السجل الطبي. ما هي النتائج الرئيسية؟`);
                  }}
                  className="w-7 h-7 rounded-full flex items-center justify-center btn-press"
                  style={{ background: "linear-gradient(135deg, var(--navy), var(--teal-deep))" }}
                  title="Ask RufayQ about this record"
                >
                  <RufayQLogo size={13} variant="dark" />
                </button>
                <ChevronDown size={16} className="-rotate-90" style={{ color: doc.accentColor }} />
              </div>
            </button>
          );
        })}

        <div style={{ height: 24 }} />
      </div>

      {/* Document Detail Sheet — Full Enhanced */}
      {selectedDoc && (
        <div className="absolute inset-0 z-20 flex flex-col justify-end" onClick={() => setSelectedDoc(null)}>
          <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.5)" }} />
          <div className="relative rounded-t-3xl animate-slide-up overflow-y-auto" style={{ background: "var(--white)", maxHeight: "85%" }} onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 z-10 flex justify-center pt-3 pb-1" style={{ background: "var(--white)" }}>
              <div style={{ width: 36, height: 4, background: "#DEE4E9", borderRadius: 2 }} />
            </div>

            {/* Doc header */}
            <div className="px-5 pt-2 pb-4">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl shrink-0" style={{ background: selectedDoc.bgColor }}>
                  {selectedDoc.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-[16px] font-bold" style={{ color: "var(--navy)" }}>{selectedDoc.titleEn}</p>
                    {selectedDoc.isNew && (
                      <span className="font-mono text-[8px] px-1.5 py-0.5 rounded-full shrink-0" style={{ background: "var(--gold)", color: "#fff" }}>NEW</span>
                    )}
                  </div>
                  <p className="font-arabic text-[13px]" dir="rtl" style={{ color: "var(--gray)" }}>{selectedDoc.titleAr}</p>
                </div>
              </div>

              {/* Meta chips */}
              <div className="flex flex-wrap gap-1.5 mt-3">
                {selectedDoc.source && (
                  <span className="text-[9px] px-2 py-1 rounded-full flex items-center gap-1" style={{ background: "var(--off-white)", color: "var(--navy)", border: "1px solid var(--gray-light)" }}>
                    <FileText size={10} /> {selectedDoc.source}
                  </span>
                )}
                <span className="text-[9px] px-2 py-1 rounded-full flex items-center gap-1" style={{ background: "var(--off-white)", color: "var(--navy)", border: "1px solid var(--gray-light)" }}>
                  <Clock size={10} /> {selectedDoc.date}
                </span>
                {selectedDoc.pages && (
                  <span className="text-[9px] px-2 py-1 rounded-full" style={{ background: "var(--off-white)", color: "var(--navy)", border: "1px solid var(--gray-light)" }}>
                    {selectedDoc.pages} pages
                  </span>
                )}
                {selectedDoc.fileSize && (
                  <span className="text-[9px] px-2 py-1 rounded-full" style={{ background: "var(--off-white)", color: "var(--navy)", border: "1px solid var(--gray-light)" }}>
                    {selectedDoc.fileSize}
                  </span>
                )}
                {(() => {
                  const tb = translationBadge(selectedDoc.translationStatus);
                  return (
                    <span className="text-[9px] px-2 py-1 rounded-full flex items-center gap-1" style={{ background: tb.bg, color: tb.color }}>
                      <Globe size={10} /> {tb.label}
                    </span>
                  );
                })()}
                <span className="text-[9px] px-2 py-1 rounded-full" style={{ background: `${selectedDoc.accentColor}15`, color: selectedDoc.accentColor }}>
                  {selectedDoc.category}
                </span>
              </div>
            </div>

            {/* Key extracted fields */}
            {selectedDoc.keyFields && selectedDoc.keyFields.length > 0 && (
              <div className="px-5 pb-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-mono text-[9px] tracking-widest" style={{ color: "var(--gold)" }}>KEY INFORMATION</p>
                  <button
                    onClick={() => {
                      const text = selectedDoc.keyFields!.map(kf => `${kf.label}: ${kf.value}`).join("\n");
                      navigator.clipboard.writeText(text).then(() => toast.success("Key info copied · تم نسخ المعلومات"));
                    }}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg btn-press"
                    style={{ background: "var(--teal-light)" }}
                  >
                    <Copy size={11} style={{ color: "var(--teal-deep)" }} />
                    <span className="text-[9px] font-medium" style={{ color: "var(--teal-deep)" }}>Copy All</span>
                  </button>
                </div>
                <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--gray-light)" }}>
                  {selectedDoc.keyFields.map((kf, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        navigator.clipboard.writeText(kf.value).then(() => toast.success(`${kf.label} copied · تم النسخ`));
                      }}
                      className="w-full flex items-center justify-between px-3 py-2.5 btn-press"
                      style={{ background: idx % 2 === 0 ? "var(--white)" : "var(--off-white)", borderBottom: idx < selectedDoc.keyFields!.length - 1 ? "1px solid var(--gray-light)" : "none" }}
                    >
                      <span className="text-[11px]" style={{ color: "var(--gray)" }}>{kf.label}</span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-semibold text-right" style={{ color: "var(--navy)" }}>{kf.value}</span>
                        <Copy size={10} style={{ color: "var(--gray)", opacity: 0.4 }} />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Source info */}
            {selectedDoc.source && (
              <div className="px-5 pb-4">
                <div className="rounded-xl p-3 flex items-center gap-3" style={{ background: "var(--off-white)", border: "1px solid var(--gray-light)" }}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "var(--teal-light)" }}>
                    <FileText size={14} style={{ color: "var(--teal-deep)" }} />
                  </div>
                  <div className="flex-1">
                    <p className="text-[11px] font-semibold" style={{ color: "var(--navy)" }}>{selectedDoc.source}</p>
                    <p className="font-arabic text-[9px]" dir="rtl" style={{ color: "var(--gray)" }}>{selectedDoc.sourceAr}</p>
                  </div>
                  <span className="font-mono text-[9px]" style={{ color: "var(--gray)" }}>{selectedDoc.addedDate || selectedDoc.date}</span>
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="px-5 pb-2 space-y-2">
              <button className="w-full py-3 rounded-xl font-semibold text-white flex items-center justify-center gap-2 btn-press" style={{ background: "var(--teal-deep)" }}>
                <FileText size={16} /> View Document · عرض المستند
              </button>
              <div className="grid grid-cols-2 gap-2">
                <button className="py-3 rounded-xl font-medium flex items-center justify-center gap-1.5 btn-press" style={{ border: "1px solid var(--gray-light)", color: "var(--navy)" }}>
                  <Share2 size={14} /> Share
                </button>
                <button className="py-3 rounded-xl font-medium flex items-center justify-center gap-1.5 btn-press" style={{ border: "1px solid var(--gray-light)", color: "var(--navy)" }}>
                  <Download size={14} /> Download
                </button>
              </div>
              {selectedDoc.translationStatus !== "translated" && (
                <button className="w-full py-3 rounded-xl font-medium flex items-center justify-center gap-2 btn-press" style={{ background: "var(--gold-pale)", color: "var(--gold)", border: "1px solid rgba(197,150,90,0.3)" }}>
                  <Globe size={14} /> Translate to Arabic · ترجمة للعربية
                </button>
              )}
            </div>

            {/* Ask AI */}
            <div className="px-5 pt-2 pb-6">
              <button className="w-full py-3 rounded-xl font-semibold text-white flex items-center justify-center gap-2 btn-press" style={{ background: "linear-gradient(135deg, var(--navy), var(--teal-deep))" }}>
                <RufayQLogo size={14} variant="dark" />
                Ask RufayQ about this · اسأل رُفَيِّق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RecordsScreen;
