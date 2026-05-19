import { useState, useMemo, useCallback, useEffect } from "react";
import { listScannedRecords, removeScannedRecord, subscribeToScannedRecords, type ScannedRecord } from "@/lib/scannedRecordsStore";
import { records as demoRecords, filterCategories, type DocRecord } from "@/constants/data";
import { Share2, Download, Search, X, ArrowUpDown, Globe, FileText, Clock, Copy, Stethoscope, Plane, MoreVertical, Pill, ScanLine } from "lucide-react";
import HeaderMenu, { type HeaderMenuItem } from "@/components/HeaderMenu";
import NotificationCenter from "@/components/NotificationCenter";
import { toast } from "sonner";
import RufayQLogo from "@/components/RufayQLogo";
import { useGuestMode } from "@/hooks/useGuestMode";
import { useGuestCategories } from "@/hooks/useGuestCategories";
import { useAuthUserId, useAuthSession } from "@/hooks/useAuthUserId";
import RecordsContentSkeleton from "@/components/records/RecordsContentSkeleton";
import { useArtifactCount } from "@/hooks/useArtifactCount";
import TravelRecordsList, { CAT_DEFS, classify, type TravelCat } from "@/components/records/TravelRecordsList";
import type { TransportAttachment } from "@/components/RelatedDocumentsCard";
import RecordActionsSheet, { type RecordTarget } from "@/components/records/RecordActionsSheet";
import TravelSummaryLanguageSheet, { type SummaryLang } from "@/components/records/TravelSummaryLanguageSheet";
import TravelDocsPreviewSheet from "@/components/records/TravelDocsPreviewSheet";
import { linkRecordToMilestone } from "@/lib/records/linkRecordToMilestone";
import { stashChatAttachment } from "@/lib/records/chatAttachmentHandoff";
import { getDeviceId } from "@/hooks/useDeviceId";

type RecordsSegment = "medical" | "travel";

type SortMode = "newest" | "oldest" | "category";

const RecordsScreen = ({ onOpenScanner, onNavigate }: { onOpenScanner?: () => void; onNavigate?: (tab: string, context?: string) => void }) => {
  const isGuest = useGuestMode();
  const { categories: guestCats } = useGuestCategories();
  const [scannedTick, setScannedTick] = useState(0);
  useEffect(() => subscribeToScannedRecords(() => setScannedTick((n) => n + 1)), []);
  const records: DocRecord[] = useMemo(() => {
    const scanned = listScannedRecords();
    const demo = isGuest
      ? demoRecords.filter((r) => {
          const cat = (r.category || "").toLowerCase();
          if (cat === "imaging" || cat === "ecg / echo") return guestCats.radiology;
          if (cat === "lab results") return guestCats.lab;
          if (cat === "prescriptions") return guestCats.meds;
          return true;
        })
      : [];
    return [...scanned, ...demo];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isGuest, guestCats, scannedTick]);
  const [activeFilter, setActiveFilter] = useState("All");
  const [selectedDoc, setSelectedDoc] = useState<DocRecord | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("newest");
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [segment, setSegment] = useState<RecordsSegment>(() => {
    try {
      const pending = sessionStorage.getItem("rufayq_records_segment");
      if (pending === "medical" || pending === "travel") {
        sessionStorage.removeItem("rufayq_records_segment");
        return pending;
      }
    } catch { /* noop */ }
    return "travel";
  });
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail === "medical" || detail === "travel") setSegment(detail);
    };
    window.addEventListener("rufayq:records-segment", handler);
    return () => window.removeEventListener("rufayq:records-segment", handler);
  }, []);
  const userId = useAuthUserId();
  const { isReady: authReady } = useAuthSession();
  const showAuthSkeleton = !isGuest && !authReady;
  const travelCount = useArtifactCount({ userId });
  const [travelStats, setTravelStats] = useState({ total: 0, translated: 0, newCount: 0 });
  const [visibleTravelDocs, setVisibleTravelDocs] = useState<TransportAttachment[]>([]);

  // Local-only edits for demo (medical) records — they don't live in DB yet.
  const [renames, setRenames] = useState<Record<string, string>>({});
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [menuTarget, setMenuTarget] = useState<{ doc: DocRecord; key: string } | null>(null);

  const keyFor = (d: DocRecord, i: number) => `${d.titleEn}-${i}`;

  // Dynamic stats
  const totalFiles = records.length;
  const translatedCount = records.filter(r => r.translationStatus === "translated").length;
  const newCount = records.filter(r => r.isNew).length;
  const travelTabCount = Math.max(travelStats.total, travelCount);
  const headerTotalFiles = segment === "travel" ? travelTabCount : totalFiles;
  const headerTranslatedCount = segment === "travel" ? travelStats.translated : translatedCount;
  const headerNewCount = segment === "travel" ? travelStats.newCount : newCount;

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

  // ── Travel-specific handlers (operate on the visible travel rows so search/category filter is honoured) ──
  const [travelAction, setTravelAction] = useState<null | "copy" | "export" | "share">(null);

  const buildTravelSummary = (lang: SummaryLang) => {
    const fmtEn = (d: Date) =>
      d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
    const fmtAr = (d: Date) =>
      d.toLocaleDateString("ar-SA", { day: "2-digit", month: "long", year: "numeric" });

    // Group visible docs by category, preserving CAT_DEFS order.
    const groups = new Map<TravelCat, TransportAttachment[]>();
    for (const def of CAT_DEFS) {
      if (def.key === "all") continue;
      groups.set(def.key, []);
    }
    for (const d of visibleTravelDocs) {
      const cat = classify(d);
      groups.get(cat)?.push(d);
    }

    const total = visibleTravelDocs.length;
    const now = new Date();

    const renderBlock = (l: "en" | "ar") => {
      const isAr = l === "ar";
      const title = isAr ? "ملخص وثائق السفر" : "Travel Documents Summary";
      const genLabel = isAr ? "تاريخ الإنشاء" : "Generated";
      const totalLabel = isAr ? "الإجمالي" : "Total";
      const itemsWord = isAr ? (total === 1 ? "عنصر" : "عناصر") : total === 1 ? "item" : "items";
      const addedLabel = isAr ? "أُضيفت" : "Added";
      const mark = isAr ? "[✓]" : "[x]";
      const fmt = isAr ? fmtAr : fmtEn;

      const out: string[] = [];
      out.push(title);
      out.push(`${genLabel}: ${fmt(now)}`);
      out.push(`${totalLabel}: ${total} ${itemsWord}`);

      for (const def of CAT_DEFS) {
        if (def.key === "all") continue;
        const items = groups.get(def.key) ?? [];
        if (items.length === 0) continue;
        const heading = isAr ? def.ar : def.en;
        out.push("");
        out.push(`${heading} (${items.length})`);
        for (const it of items) {
          const date = it.created_at ? new Date(it.created_at) : null;
          const when = date ? ` — ${addedLabel} ${fmt(date)}` : "";
          out.push(`  ${mark} ${it.label} — ${it.file_name}${when}`);
        }
      }
      return out.join("\n");
    };

    if (lang === "en") return renderBlock("en");
    if (lang === "ar") return renderBlock("ar");
    return `${renderBlock("en")}\n\n────────────────────\n\n${renderBlock("ar")}`;
  };

  const runTravelAction = async (action: "copy" | "export" | "share", lang: SummaryLang) => {
    const summary = buildTravelSummary(lang);
    const suffix = lang === "en" ? "" : lang === "ar" ? "-ar" : "-bilingual";
    const shareTitle = lang === "en" ? "Travel Documents" : lang === "ar" ? "وثائق السفر" : "Travel Documents · وثائق السفر";

    if (action === "copy") {
      try {
        await navigator.clipboard.writeText(summary);
        toast.success("Travel summary copied · تم نسخ ملخص السفر", { duration: 2000 });
      } catch {
        toast.error("Could not copy travel summary · تعذر نسخ ملخص السفر");
      }
      return;
    }
    if (action === "export") {
      try {
        const blob = new Blob([summary], { type: "text/plain;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url; a.download = `travel-documents${suffix}.txt`; a.click();
        URL.revokeObjectURL(url);
        toast.success("Travel docs exported · تم تصدير وثائق السفر", { duration: 2000 });
      } catch {
        toast.error("Could not export travel docs · تعذر تصدير وثائق السفر");
      }
      return;
    }
    // share
    try {
      if (typeof navigator !== "undefined" && (navigator as Navigator & { share?: (d: ShareData) => Promise<void> }).share) {
        await (navigator as Navigator & { share: (d: ShareData) => Promise<void> }).share({ title: shareTitle, text: summary });
        return;
      }
    } catch { /* user cancelled or unsupported */ }
    window.open(`https://wa.me/?text=${encodeURIComponent(summary)}`, "_blank");
  };

  const [travelPreviewAction, setTravelPreviewAction] = useState<null | "copy" | "export" | "share">(null);

  const openTravelAction = (action: "copy" | "export" | "share") => {
    setTravelPreviewAction(action);
  };

  // Tab-aware kebab: shared items + medical-only quick actions (+ Meds).
  const recordsMenuItems: HeaderMenuItem[] = segment === "medical"
    ? [
        { icon: <ScanLine size={14} />, label: "Scan / Upload Record", labelAr: "مسح أو رفع سجل", onClick: () => onOpenScanner?.() },
        { icon: <Pill size={14} />, label: "Add Medication", labelAr: "إضافة دواء", onClick: () => onNavigate?.("medications") },
        { icon: <Copy size={14} />, label: "Copy All Records", labelAr: "نسخ كل السجلات", onClick: handleCopyAllRecords },
        { icon: <Download size={14} />, label: "Export Records (.txt)", labelAr: "تصدير السجلات", onClick: handleExportRecords },
        { icon: <Share2 size={14} />, label: "Share Records", labelAr: "مشاركة السجلات", onClick: handleShareRecords },
      ]
    : [
        { icon: <ScanLine size={14} />, label: "Scan Travel Document", labelAr: "مسح وثيقة سفر", onClick: () => onOpenScanner?.() },
        { icon: <Copy size={14} />, label: "Copy Travel Summary", labelAr: "نسخ ملخص السفر", onClick: () => openTravelAction("copy") },
        { icon: <Download size={14} />, label: "Export Travel Docs (.txt)", labelAr: "تصدير وثائق السفر", onClick: () => openTravelAction("export") },
        { icon: <Share2 size={14} />, label: "Share Travel Docs", labelAr: "مشاركة وثائق السفر", onClick: () => openTravelAction("share") },
      ];

  return (
    <div className="flex flex-col relative" style={{ height: 0, flex: 1, overflow: "hidden" }}>
      {/* Header */}
      <div className="relative px-5 pt-6 pb-4 overflow-hidden shrink-0" style={{ background: "var(--teal-deep)" }}>
        <div className="flex items-center justify-between">
          <div>
            <p className="font-mono text-[10px] tracking-widest" style={{ color: "rgba(255,255,255,0.4)" }}>03 — {segment === "medical" ? "MEDICAL RECORDS" : "TRAVEL RECORDS"}</p>
            <p className="font-display text-xl text-white" style={{ fontWeight: 300 }}>Your Documents</p>
            <p className="font-arabic text-sm" dir="rtl" style={{ color: "rgba(255,255,255,0.45)" }}>ملفاتك {segment === "medical" ? "الطبية" : "للسفر"}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onOpenScanner?.()}
              className="w-9 h-9 rounded-full flex items-center justify-center btn-press"
              style={{ background: "var(--gold)", color: "var(--navy)" }}
              aria-label="Scan document · مسح وثيقة"
              title="Scan document · مسح وثيقة"
            >
              <ScanLine size={18} aria-hidden="true" />
            </button>
            <NotificationCenter color="#fff" />
            <HeaderMenu items={recordsMenuItems} />
          </div>
        </div>
        <div className="flex gap-2 mt-3">
          {[`${headerTotalFiles} Files`, `${headerTranslatedCount} Translated`, headerNewCount > 0 ? `${headerNewCount} New` : null].filter(Boolean).map((s) => (
            <span key={s} className="font-mono text-[9px] px-2 py-1 rounded-full" style={{ background: "rgba(255,255,255,0.15)", color: "#fff" }}>{s}</span>
          ))}
        </div>
      </div>

      {/* Segmented switcher: Medical | Travel */}
      <div className="shrink-0 px-4 pt-3" style={{ background: "var(--off-white)" }}>
        <div
          role="tablist"
          aria-label="Records segment"
          className="flex p-1 rounded-xl"
          style={{ background: "var(--white)", border: "1px solid var(--gray-light)" }}
        >
          {([
            { key: "travel" as const, icon: <Plane size={13} />, en: "Travel", ar: "سفر", count: travelTabCount },
            { key: "medical" as const, icon: <Stethoscope size={13} />, en: "Medical", ar: "طبية", count: totalFiles },
          ]).map((s) => {
            const active = segment === s.key;
            return (
              <button
                key={s.key}
                role="tab"
                aria-selected={active}
                onClick={() => setSegment(s.key)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[12px] font-semibold btn-press transition-all"
                style={{
                  background: active ? "var(--teal-deep)" : "transparent",
                  color: active ? "#fff" : "var(--gray)",
                }}
              >
                {s.icon}
                <span>{s.en}</span>
                <span className="font-arabic text-[10px] opacity-80" dir="rtl">· {s.ar}</span>
                <span
                  className="font-mono text-[10px] px-1.5 py-0.5 rounded-full"
                  style={{
                    background: active ? "rgba(255,255,255,0.18)" : "var(--off-white)",
                    color: active ? "#fff" : "var(--navy)",
                    minWidth: 22,
                    textAlign: "center",
                  }}
                >
                  {s.count}
                </span>
              </button>
            );
          })}
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

      {/* Filter Pills + Sort (Medical only) */}
      {segment === "medical" && (
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
      )}


      <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 pb-4 space-y-3" style={{ background: "var(--off-white)", WebkitOverflowScrolling: "touch" }}>
        {showAuthSkeleton ? (
          <RecordsContentSkeleton />
        ) : segment === "travel" ? (
          <TravelRecordsList userId={userId} searchQuery={searchQuery} onCountsChange={setTravelStats} onVisibleItemsChange={setVisibleTravelDocs} onNavigate={onNavigate} />
        ) : (<>
        {/* Featured Discharge Pack */}
        {activeFilter === "All" && !searchQuery && records.length > 0 && (
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
        {filtered.filter((d, i) => !hidden.has(keyFor(d, i))).map((doc, i) => {
          const tb = translationBadge(doc.translationStatus);
          const k = keyFor(doc, i);
          const displayName = renames[k] ?? doc.titleEn;
          return (
            <div
              key={k}
              className="w-full flex flex-col gap-2 p-3.5 rounded-xl text-left card-press"
              style={{ background: "var(--white)", border: "1px solid var(--gray-light)", boxShadow: "0 1px 6px rgba(0,0,0,0.04)" }}
            >
              <div className="flex items-center gap-3">
                <button onClick={() => setSelectedDoc({ ...doc, titleEn: displayName })} className="flex items-center gap-3 flex-1 min-w-0 text-left">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl shrink-0" style={{ background: doc.bgColor }}>
                    {doc.emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-[13px] font-semibold truncate" style={{ color: "var(--navy)" }}>{displayName}</p>
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
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setMenuTarget({ doc, key: k }); }}
                  className="w-7 h-7 rounded-full flex items-center justify-center btn-press shrink-0"
                  style={{ background: "var(--off-white)" }}
                  aria-label="More actions"
                >
                  <MoreVertical size={14} style={{ color: "var(--gray)" }} />
                </button>
              </div>

              {/* AI Buddy quick-ask row — opens RufayQ medical persona pre-loaded
                  with this record as context. Three preset prompts cover the
                  most common questions patients want answered on a card. */}
              <div className="flex items-center gap-1.5 pt-2" style={{ borderTop: "1px dashed var(--gray-light)" }}>
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
                  style={{ background: "linear-gradient(135deg, var(--navy), var(--teal-deep))" }}
                  aria-hidden
                >
                  <RufayQLogo size={11} variant="dark" />
                </div>
                <span className="text-[10px] font-bold tracking-wide shrink-0" style={{ color: "var(--navy)", fontFamily: "'DM Sans'" }}>AI Buddy</span>
                <div className="flex-1 overflow-x-auto no-scrollbar flex items-center gap-1.5">
                  {[
                    { en: "Explain", ar: "اشرح",   prompt: `أريد شرحاً مبسطاً لهذا السجل الطبي:\n📄 "${displayName}" — ${doc.titleAr}\n(${doc.category}${doc.pages ? `, ${doc.pages} pages` : ""})\nاشرح النتائج الرئيسية ومعناها بلغة بسيطة.` },
                    { en: "Key findings", ar: "أهم النتائج", prompt: `لخّص أهم النتائج والأرقام غير الطبيعية من هذا السجل:\n📄 "${displayName}" — ${doc.titleAr}\nاذكر التشخيصات والقيم الحرجة إن وُجدت.` },
                    { en: "What to ask my doctor", ar: "أسئلة لطبيبي", prompt: `بناءً على هذا السجل:\n📄 "${displayName}" — ${doc.titleAr}\nاقترح 5 أسئلة مهمة يجب أن أطرحها على طبيبي في الزيارة القادمة.` },
                  ].map((q) => (
                    <button
                      key={q.en}
                      onClick={(e) => { e.stopPropagation(); onNavigate?.("chat", q.prompt); }}
                      className="shrink-0 px-2.5 py-1 rounded-full text-[10.5px] font-semibold btn-press"
                      style={{ background: "var(--teal-light)", color: "var(--teal-deep)", border: "1px solid rgba(15,181,201,0.25)" }}
                    >
                      {q.en}
                    </button>
                  ))}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onNavigate?.("chat", `📄 لدي سؤال عن: "${displayName}" — ${doc.titleAr}\n(${doc.category})\n\n`);
                    }}
                    className="shrink-0 px-2.5 py-1 rounded-full text-[10.5px] font-semibold btn-press flex items-center gap-1"
                    style={{ background: "var(--gold)", color: "#fff" }}
                  >
                    Ask…
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        <div style={{ height: 24 }} />
        </>)}
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

      <RecordActionsSheet
        open={!!menuTarget}
        target={menuTarget ? { id: menuTarget.key, name: renames[menuTarget.key] ?? menuTarget.doc.titleEn, subtitle: menuTarget.doc.category, mutable: true } : null}
        onClose={() => setMenuTarget(null)}
        onPreview={() => menuTarget && setSelectedDoc({ ...menuTarget.doc, titleEn: renames[menuTarget.key] ?? menuTarget.doc.titleEn })}
        onRename={(newName) => {
          if (!menuTarget) return;
          setRenames((r) => ({ ...r, [menuTarget.key]: newName }));
        }}
        onShare={() => {
          if (!menuTarget) return;
          const name = renames[menuTarget.key] ?? menuTarget.doc.titleEn;
          const text = `📄 ${name} — ${menuTarget.doc.category} — ${menuTarget.doc.date}`;
          if (navigator.share) {
            navigator.share({ title: name, text }).catch(() => {});
          } else {
            window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
          }
        }}
        onSendToChat={() => {
          if (!menuTarget) return;
          const name = renames[menuTarget.key] ?? menuTarget.doc.titleEn;
          const scanned = menuTarget.doc as Partial<ScannedRecord>;
          stashChatAttachment({
            kind: "medical",
            label: name,
            file_name: scanned.fileName || menuTarget.doc.category || `${name}.pdf`,
            sourceLabelEn: "Medical",
            sourceLabelAr: "طبي",
            signedUrl: scanned.fileUrl,
            mime_type: scanned.mimeType ?? null,
          });
          onNavigate?.("chat");
          toast.success("Sent to chat · أُرسل إلى المحادثة", { duration: 1800 });
        }}
        onApplyToMilestone={async (m) => {
          if (!menuTarget) return;
          const name = renames[menuTarget.key] ?? menuTarget.doc.titleEn;
          const scanned = menuTarget.doc as Partial<ScannedRecord>;
          const scannedId = scanned.id;
          if (!scanned.fileUrl || !scannedId) {
            toast.error("No file to link · لا يوجد ملف", { description: "Demo records can't be linked yet." });
            return;
          }
          try {
            await linkRecordToMilestone(
              {
                id: `medical-scan:${scannedId}`,
                origin: "medical-scan",
                label: name,
                fileName: scanned.fileName || `${name}.pdf`,
                mimeType: scanned.mimeType ?? null,
                dateLabel: "",
                createdAt: scanned.createdAt || new Date().toISOString(),
                sourceLabelEn: "Medical",
                sourceLabelAr: "طبي",
                linkableToMilestone: true,
                sendableToChat: true,
                previewable: true,
                medicalScan: scanned as ScannedRecord,
              },
              m,
              { userId: userId ?? null, deviceId: getDeviceId(), sourceDocumentId: null },
            );
            toast.success(`Linked to ${m.title}`, { description: "تم الربط بالخطوة", duration: 2000 });
          } catch (e: any) {
            toast.error("Could not link · تعذّر الربط", { description: e?.message });
          }
        }}
        onDelete={() => {
          if (!menuTarget) return;
          // If this is a scanner-created record (has a stable id), remove it
          // from the persisted store so it doesn't reappear on refresh. For
          // demo records we still fall back to local hide.
          const scannedId = (menuTarget.doc as Partial<ScannedRecord>).id;
          if (scannedId && listScannedRecords().some((r) => r.id === scannedId)) {
            removeScannedRecord(scannedId);
          } else {
            setHidden((s) => new Set(s).add(menuTarget.key));
          }
        }}
      />

      <TravelDocsPreviewSheet
        open={!!travelPreviewAction}
        action={travelPreviewAction}
        docs={visibleTravelDocs}
        onClose={() => setTravelPreviewAction(null)}
        onContinue={() => {
          const a = travelPreviewAction;
          setTravelPreviewAction(null);
          if (a) setTravelAction(a);
        }}
      />

      <TravelSummaryLanguageSheet
        open={!!travelAction}
        action={travelAction}
        onClose={() => setTravelAction(null)}
        onPick={(lang) => {
          const a = travelAction;
          setTravelAction(null);
          if (a) runTravelAction(a, lang);
        }}
      />
    </div>
  );
};

export default RecordsScreen;
