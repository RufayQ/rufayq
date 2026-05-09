/**
 * Shared section shell for EMR sub-modules. Renders a category-scoped slice
 * of the patient's records using the same visual language as RecordsScreen
 * but isolated to the categories the section owns.
 */
import { useMemo, useState } from "react";
import { records as demoRecords, type DocRecord } from "@/constants/data";
import { Search, FileText } from "lucide-react";
import { useGuestMode } from "@/hooks/useGuestMode";

interface Props {
  titleEn: string;
  titleAr: string;
  emoji: string;
  categories: string[];
  emptyHintEn: string;
  emptyHintAr: string;
  onOpenScanner?: () => void;
  onNavigate?: (tab: string, context?: string) => void;
}

const EmrSectionShell = ({
  titleEn,
  titleAr,
  emoji,
  categories,
  emptyHintEn,
  emptyHintAr,
  onOpenScanner,
}: Props) => {
  const isGuest = useGuestMode();
  const [q, setQ] = useState("");

  const records: DocRecord[] = useMemo(() => {
    const set = new Set(categories.map((c) => c.toLowerCase()));
    const base = isGuest ? demoRecords : [];
    return base.filter((r) => set.has((r.category || "").toLowerCase()));
  }, [isGuest, categories]);

  const filtered = useMemo(() => {
    if (!q.trim()) return records;
    const needle = q.toLowerCase();
    return records.filter(
      (r) =>
        r.titleEn.toLowerCase().includes(needle) ||
        r.titleAr.includes(q) ||
        (r.meta || "").toLowerCase().includes(needle),
    );
  }, [records, q]);

  return (
    <div
      className="h-full flex flex-col"
      role="tabpanel"
      aria-label={`${titleEn} section`}
    >
      <div className="px-4 pt-3 pb-2 shrink-0" style={{ background: "var(--white)" }}>
        <p className="font-display text-lg" style={{ color: "var(--navy)" }}>
          {emoji} {titleEn}
        </p>
        <p className="font-arabic text-xs" dir="rtl" style={{ color: "var(--gray)" }}>
          {titleAr}
        </p>

        <div
          className="mt-2 flex items-center gap-2 px-2.5 py-1.5 rounded-lg"
          style={{ background: "var(--off-white)", border: "1px solid var(--gray-light)" }}
        >
          <Search size={13} color="var(--gray)" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search records · بحث"
            className="flex-1 bg-transparent text-[12px] outline-none"
            style={{ color: "var(--navy)" }}
            aria-label={`Search ${titleEn}`}
          />
        </div>
      </div>

      <div className="flex-1 h-0 overflow-y-auto px-4 py-3 space-y-2">
        {filtered.length === 0 ? (
          <div
            className="rounded-xl p-5 text-center"
            style={{ background: "var(--white)", border: "1px dashed var(--gray-light)" }}
          >
            <FileText size={20} className="mx-auto mb-2" color="var(--gray)" />
            <p className="text-[12px]" style={{ color: "var(--navy)" }}>
              {emptyHintEn}
            </p>
            <p className="font-arabic text-[11px] mt-1" dir="rtl" style={{ color: "var(--gray)" }}>
              {emptyHintAr}
            </p>
            {onOpenScanner && (
              <button
                onClick={onOpenScanner}
                className="mt-3 px-3 py-1.5 rounded-full text-[11px] font-semibold text-white btn-press"
                style={{ background: "var(--teal-deep)" }}
              >
                + Scan a document
              </button>
            )}
          </div>
        ) : (
          filtered.map((r, idx) => (
            <div
              key={`${r.titleEn}-${idx}`}
              className="rounded-xl p-3 flex gap-3 items-start"
              style={{ background: r.bgColor || "var(--white)", border: "1px solid var(--gray-light)" }}
            >
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center text-lg shrink-0"
                style={{ background: "rgba(255,255,255,0.65)" }}
              >
                {r.emoji}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[12.5px] font-semibold truncate" style={{ color: "var(--navy)" }}>
                  {r.titleEn}
                </p>
                <p
                  className="font-arabic text-[11px] truncate"
                  dir="rtl"
                  style={{ color: "var(--gray)" }}
                >
                  {r.titleAr}
                </p>
                <p className="text-[10.5px] mt-1" style={{ color: r.accentColor || "var(--gray)" }}>
                  {r.category} · {r.date}
                </p>
                {r.meta && (
                  <p className="text-[10.5px] mt-0.5" style={{ color: "var(--gray)" }}>
                    {r.meta}
                  </p>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default EmrSectionShell;
