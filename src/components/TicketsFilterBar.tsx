import { useEffect, useMemo, useState } from "react";
import { Search, X, SlidersHorizontal } from "lucide-react";
import type { TransportSegment } from "@/components/TransportCard";

export type TicketQuickFilter = "all" | "upcoming" | "current" | "past" | "family" | "scanned" | "manual";

export interface TicketsFilterState {
  search: string;
  dateFrom: string;
  dateTo: string;
  familyOnly: boolean;
  transportTypes: TransportSegment["type"][];
  quick: TicketQuickFilter;
}

interface Props {
  value: TicketsFilterState;
  onChange: (value: TicketsFilterState) => void;
  segments: TransportSegment[];
  filteredCount: number;
  onClear: () => void;
}

const storageKey = "rufayq.tickets.filters";

export const defaultTicketsFilterState: TicketsFilterState = {
  search: "",
  dateFrom: "",
  dateTo: "",
  familyOnly: false,
  transportTypes: [],
  quick: "all",
};

export function loadTicketsFilterState(): TicketsFilterState {
  if (typeof window === "undefined") return defaultTicketsFilterState;
  try {
    const raw = window.sessionStorage.getItem(storageKey);
    if (!raw) return defaultTicketsFilterState;
    return { ...defaultTicketsFilterState, ...JSON.parse(raw) };
  } catch {
    return defaultTicketsFilterState;
  }
}

const statusFor = (segment: TransportSegment): TicketQuickFilter => {
  const now = Date.now();
  const dep = new Date(segment.departureDateTime).getTime();
  const arr = new Date(segment.arrivalDateTime).getTime();
  if (now >= dep && now <= arr) return "current";
  return dep > now ? "upcoming" : "past";
};

const matchesQuick = (segment: TransportSegment, quick: TicketQuickFilter) => {
  if (quick === "all") return true;
  if (quick === "family") return (segment.companions?.length || 0) > 0;
  if (quick === "scanned") return segment.documentSource === "OCR Scanned";
  if (quick === "manual") return segment.documentSource === "Manual Entry";
  return statusFor(segment) === quick;
};

const quickFilters: { key: TicketQuickFilter; en: string; ar: string }[] = [
  { key: "all", en: "All", ar: "الكل" },
  { key: "upcoming", en: "Upcoming", ar: "قادم" },
  { key: "current", en: "In progress", ar: "حالياً" },
  { key: "past", en: "Past", ar: "سابق" },
  { key: "family", en: "Family", ar: "العائلة" },
  { key: "scanned", en: "Scanned", ar: "ممسوح" },
  { key: "manual", en: "Manual", ar: "يدوي" },
];

const typeOptions: { key: TransportSegment["type"]; label: string; ar: string; icon: string }[] = [
  { key: "flight", label: "Flight", ar: "طيران", icon: "✈️" },
  { key: "train", label: "Train", ar: "قطار", icon: "🚄" },
  { key: "bus", label: "Bus", ar: "باص", icon: "🚌" },
  { key: "taxi", label: "Taxi", ar: "تاكسي", icon: "🚕" },
  { key: "rental", label: "Rental", ar: "إيجار", icon: "🚗" },
  { key: "medical", label: "Medical", ar: "طبي", icon: "🚑" },
];

const TicketsFilterBar = ({ value, onChange, segments, filteredCount, onClear }: Props) => {
  const [draftSearch, setDraftSearch] = useState(value.search);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  useEffect(() => setDraftSearch(value.search), [value.search]);
  useEffect(() => {
    const id = window.setTimeout(() => {
      if (draftSearch !== value.search) onChange({ ...value, search: draftSearch });
    }, 200);
    return () => window.clearTimeout(id);
  }, [draftSearch, onChange, value]);

  useEffect(() => {
    try {
      window.sessionStorage.setItem(storageKey, JSON.stringify(value));
    } catch {
      // best-effort UX persistence only
    }
  }, [value]);

  const counts = useMemo(() => {
    const next = new Map<TicketQuickFilter, number>();
    quickFilters.forEach((q) => next.set(q.key, segments.filter((segment) => matchesQuick(segment, q.key)).length));
    return next;
  }, [segments]);

  const activeLabels = [
    value.quick !== "all" ? quickFilters.find((q) => q.key === value.quick)?.en : null,
    value.dateFrom || value.dateTo ? [value.dateFrom, value.dateTo].filter(Boolean).join(" → ") : null,
    value.transportTypes.length ? `${value.transportTypes.length} types` : null,
  ].filter(Boolean);

  const update = (patch: Partial<TicketsFilterState>) => onChange({ ...value, ...patch });
  const toggleType = (type: TransportSegment["type"]) =>
    update({ transportTypes: value.transportTypes.includes(type) ? value.transportTypes.filter((t) => t !== type) : [...value.transportTypes, type] });

  return (
    <div className="sticky top-0 z-20 px-4 py-3 space-y-2" style={{ background: "rgba(248,246,241,0.96)", borderBottom: "1px solid var(--gray-light)", backdropFilter: "blur(10px)" }}>
      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" color="var(--gray)" />
        <input
          value={draftSearch}
          onChange={(e) => setDraftSearch(e.target.value)}
          placeholder="Search airline, flight #, city, PNR… · بحث"
          className="w-full rounded-xl py-2 pl-9 pr-9 text-[12px] outline-none"
          style={{ background: "var(--white)", border: "1px solid var(--gray-light)", color: "var(--navy)" }}
        />
        {draftSearch && (
          <button onClick={() => setDraftSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1" aria-label="Clear search">
            <X size={14} color="var(--gray)" />
          </button>
        )}
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-1" style={{ scrollSnapType: "x proximity" }}>
        {quickFilters.map((filter) => {
          const active = value.quick === filter.key;
          return (
            <button
              key={filter.key}
              onClick={() => update({ quick: filter.key, familyOnly: filter.key === "family" })}
              className="shrink-0 rounded-full px-3 py-1.5 text-[10px] font-bold btn-press"
              style={{ background: active ? "var(--teal-deep)" : "var(--white)", color: active ? "white" : "var(--navy)", border: `1px solid ${active ? "var(--teal-deep)" : "var(--gray-light)"}` }}
            >
              {filter.en} <span className="font-arabic">{filter.ar}</span>
              <span className="ml-1 rounded-full px-1.5 py-0.5" style={{ background: active ? "rgba(255,255,255,0.18)" : "var(--off-white)" }}>{counts.get(filter.key) || 0}</span>
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-2">
        <button onClick={() => setAdvancedOpen((v) => !v)} className="flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold btn-press" style={{ background: "var(--white)", color: "var(--teal-deep)", border: "1px solid var(--gray-light)" }}>
          <SlidersHorizontal size={12} /> Advanced filters · <span className="font-arabic">فلاتر متقدمة</span>
        </button>
        <span className="ml-auto font-mono text-[9px]" style={{ color: "var(--gray)" }}>
          Showing {filteredCount} of {segments.length}{activeLabels.length ? ` · ${activeLabels.join(" · ")}` : ""}
        </span>
      </div>

      {advancedOpen && (
        <div className="rounded-2xl p-3 space-y-3" style={{ background: "var(--white)", border: "1px solid var(--gray-light)" }}>
          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              <span className="font-mono text-[8px] tracking-widest" style={{ color: "var(--gray)" }}>FROM · من</span>
              <input type="date" value={value.dateFrom} onChange={(e) => update({ dateFrom: e.target.value })} className="mt-1 w-full rounded-lg px-2 py-1.5 text-[11px] outline-none" style={{ border: "1px solid var(--gray-light)" }} />
            </label>
            <label className="block">
              <span className="font-mono text-[8px] tracking-widest" style={{ color: "var(--gray)" }}>TO · إلى</span>
              <input type="date" value={value.dateTo} onChange={(e) => update({ dateTo: e.target.value })} className="mt-1 w-full rounded-lg px-2 py-1.5 text-[11px] outline-none" style={{ border: "1px solid var(--gray-light)" }} />
            </label>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {typeOptions.map((type) => {
              const active = value.transportTypes.includes(type.key);
              return (
                <button key={type.key} onClick={() => toggleType(type.key)} className="rounded-full px-2.5 py-1 text-[10px] font-semibold btn-press" style={{ background: active ? "var(--gold)" : "var(--off-white)", color: active ? "white" : "var(--navy)" }}>
                  {type.icon} {type.label} <span className="font-arabic">{type.ar}</span>
                </button>
              );
            })}
          </div>
          <button onClick={onClear} className="w-full rounded-xl py-2 text-[11px] font-bold btn-press" style={{ color: "var(--teal-deep)", background: "var(--teal-light)" }}>
            Clear filters · <span className="font-arabic">مسح الفلاتر</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default TicketsFilterBar;
