<<<<<<< ours
<<<<<<< ours
/**
 * TicketsFilterBar — refined search + filter UX for the Journey Tickets tab.
 *
 * - Debounced search input with leading icon and inline clear.
 * - Quick chips: All / Upcoming / In progress / Past / Family / Scanned / Manual
 *   (each with live count).
 * - Collapsible Advanced section: date range + transport type chips.
 * - Persists state to sessionStorage so navigating away preserves filters.
 * - Bilingual EN + AR labels.
 */
import { useEffect, useMemo, useState } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";
import type { TransportSegment } from "./TransportCard";

export type QuickFilter = "all" | "upcoming" | "current" | "past" | "family" | "scanned" | "manual";

export interface TicketFilterState {
  search: string;
  dateFrom: string;
  dateTo: string;
  quick: QuickFilter;
  types: TransportSegment["type"][];
}

const DEFAULTS: TicketFilterState = {
  search: "",
  dateFrom: "",
  dateTo: "",
  quick: "all",
  types: [],
};

const STORAGE_KEY = "rufayq.tickets.filters";

const readPersisted = (): TicketFilterState => {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return DEFAULTS;
  }
};

const writePersisted = (state: TicketFilterState) => {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
};

export interface AnnotatedSegment {
  seg: TransportSegment;
  group: "current" | "upcoming" | "past";
}

export function annotateSegments(segments: TransportSegment[], now = Date.now()): AnnotatedSegment[] {
  return segments.map((s) => {
    const dep = new Date(s.departureDateTime).getTime();
    const arr = new Date(s.arrivalDateTime).getTime();
    let group: AnnotatedSegment["group"];
    if (now >= dep && now <= arr) group = "current";
    else if (dep > now) group = "upcoming";
    else group = "past";
    return { seg: s, group };
  });
}

export function applyTicketFilters(
  segments: TransportSegment[],
  state: TicketFilterState,
): TransportSegment[] {
  return segments.filter((s) => {
    if (state.types.length > 0 && !state.types.includes(s.type)) return false;
    if (state.dateFrom && new Date(s.departureDateTime) < new Date(state.dateFrom)) return false;
    if (state.dateTo && new Date(s.departureDateTime) > new Date(`${state.dateTo}T23:59:59`)) return false;
    if (state.quick === "family" && !(s.companions && s.companions.length > 0)) return false;
    if (state.quick === "scanned" && s.documentSource !== "OCR Scanned") return false;
    if (state.quick === "manual" && s.documentSource !== "Manual Entry") return false;
    if (state.quick === "upcoming" || state.quick === "current" || state.quick === "past") {
      const ann = annotateSegments([s])[0];
      if (ann.group !== state.quick) return false;
    }
    if (state.search.trim()) {
      const q = state.search.trim().toLowerCase();
      const hay = [
        s.airline, s.flightNumber, s.trainNumber, s.busNumber,
        s.fromCity, s.toCity, s.fromCode, s.toCode, s.bookingRef,
      ].filter(Boolean).join(" ").toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

const transportTypes: { key: TransportSegment["type"]; icon: string; label: string }[] = [
  { key: "flight", icon: "✈️", label: "Flight" },
  { key: "train", icon: "🚄", label: "Train" },
  { key: "bus", icon: "🚌", label: "Bus" },
  { key: "taxi", icon: "🚕", label: "Taxi" },
  { key: "rental", icon: "🚗", label: "Rental" },
  { key: "medical", icon: "🚑", label: "Medical" },
];

interface Props {
  segments: TransportSegment[];
  onChange: (filtered: TransportSegment[], state: TicketFilterState) => void;
}

const TicketsFilterBar = ({ segments, onChange }: Props) => {
  const [state, setState] = useState<TicketFilterState>(readPersisted);
  const [search, setSearch] = useState(state.search);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Debounce search input.
  useEffect(() => {
    const t = setTimeout(() => setState((s) => ({ ...s, search })), 200);
    return () => clearTimeout(t);
  }, [search]);

  // Persist + emit
  useEffect(() => {
    writePersisted(state);
    onChange(applyTicketFilters(segments, state), state);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, segments]);

  const counts = useMemo(() => {
    const annotated = annotateSegments(segments);
    return {
      all: segments.length,
      upcoming: annotated.filter((a) => a.group === "upcoming").length,
      current: annotated.filter((a) => a.group === "current").length,
      past: annotated.filter((a) => a.group === "past").length,
      family: segments.filter((s) => (s.companions?.length || 0) > 0).length,
      scanned: segments.filter((s) => s.documentSource === "OCR Scanned").length,
      manual: segments.filter((s) => s.documentSource === "Manual Entry").length,
    };
  }, [segments]);

  const filteredCount = useMemo(
    () => applyTicketFilters(segments, state).length,
    [segments, state],
  );

  const hasFilters =
    state.search || state.dateFrom || state.dateTo || state.quick !== "all" || state.types.length > 0;

  const quickChips: { key: QuickFilter; label: string; labelAr: string; count: number }[] = [
    { key: "all", label: "All", labelAr: "الكل", count: counts.all },
    { key: "current", label: "In progress", labelAr: "حالياً", count: counts.current },
    { key: "upcoming", label: "Upcoming", labelAr: "قادم", count: counts.upcoming },
    { key: "past", label: "Past", labelAr: "سابقة", count: counts.past },
    { key: "family", label: "Family", labelAr: "عائلة", count: counts.family },
    { key: "scanned", label: "Scanned", labelAr: "ممسوحة", count: counts.scanned },
    { key: "manual", label: "Manual", labelAr: "يدوية", count: counts.manual },
  ];

  const toggleType = (t: TransportSegment["type"]) =>
    setState((s) => ({
      ...s,
      types: s.types.includes(t) ? s.types.filter((x) => x !== t) : [...s.types, t],
    }));

  const clearAll = () => {
    setSearch("");
    setState(DEFAULTS);
  };

  return (
    <div className="px-4 mb-3" data-testid="tickets-filter-bar">
      {/* Search */}
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--gray)" }} />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search airline, flight #, city, PNR…"
          aria-label="Search tickets"
          className="w-full pl-9 pr-9 py-2 rounded-lg text-[12px] outline-none"
          style={{ background: "var(--white)", border: "1px solid var(--gray-light)", color: "var(--navy)" }}
        />
        {search && (
          <button
            onClick={() => setSearch("")}
            aria-label="Clear search"
            className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full flex items-center justify-center"
            style={{ background: "var(--gray-light)" }}
          >
            <X size={12} color="var(--gray)" />
=======
=======
>>>>>>> theirs
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
<<<<<<< ours
>>>>>>> theirs
=======
>>>>>>> theirs
          </button>
        )}
      </div>

<<<<<<< ours
<<<<<<< ours
      {/* Quick chips */}
      <div className="flex gap-1.5 mt-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
        {quickChips.map((c) => {
          const active = state.quick === c.key;
          return (
            <button
              key={c.key}
              onClick={() => setState((s) => ({ ...s, quick: c.key }))}
              className="shrink-0 text-[11px] font-bold px-2.5 py-1 rounded-full btn-press whitespace-nowrap"
              style={{
                background: active ? "var(--teal-deep)" : "var(--white)",
                color: active ? "white" : "var(--navy)",
                border: `1px solid ${active ? "var(--teal-deep)" : "var(--gray-light)"}`,
              }}
            >
              {c.label} <span className="font-arabic text-[9px]" dir="rtl">{c.labelAr}</span>
              {c.count > 0 && (
                <span className="ml-1 font-mono text-[9px] opacity-80">· {c.count}</span>
              )}
=======
=======
>>>>>>> theirs
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
<<<<<<< ours
>>>>>>> theirs
=======
>>>>>>> theirs
            </button>
          );
        })}
      </div>

<<<<<<< ours
<<<<<<< ours
      {/* Advanced toggle + active summary */}
      <div className="flex items-center gap-2 mt-2">
        <button
          onClick={() => setShowAdvanced((v) => !v)}
          className="flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-full btn-press"
          style={{
            background: showAdvanced ? "var(--teal-light)" : "transparent",
            color: "var(--teal-deep)",
            border: "1px solid var(--teal-mid)",
          }}
          aria-expanded={showAdvanced}
        >
          <SlidersHorizontal size={11} /> Advanced · <span className="font-arabic">متقدم</span>
        </button>
        <span className="font-mono text-[9px]" style={{ color: "var(--gray)" }}>
          {filteredCount} / {segments.length}
        </span>
        {hasFilters && (
          <button
            onClick={clearAll}
            className="ml-auto text-[10px] px-2 py-1 rounded-full btn-press"
            style={{ color: "var(--teal-deep)" }}
          >
            ✕ Clear · <span className="font-arabic">مسح</span>
          </button>
        )}
      </div>

      {showAdvanced && (
        <div className="mt-2 rounded-xl p-3 space-y-2" style={{ background: "var(--white)", border: "1px solid var(--gray-light)" }}>
          <div className="flex gap-2">
            <div className="flex-1">
              <p className="font-mono text-[8px] tracking-wider mb-0.5" style={{ color: "var(--gray)" }}>FROM</p>
              <input
                type="date"
                value={state.dateFrom}
                onChange={(e) => setState((s) => ({ ...s, dateFrom: e.target.value }))}
                className="w-full px-2 py-1.5 rounded-lg text-[11px] outline-none"
                style={{ background: "var(--off-white)", border: "1px solid var(--gray-light)", color: "var(--navy)" }}
              />
            </div>
            <div className="flex-1">
              <p className="font-mono text-[8px] tracking-wider mb-0.5" style={{ color: "var(--gray)" }}>TO</p>
              <input
                type="date"
                value={state.dateTo}
                onChange={(e) => setState((s) => ({ ...s, dateTo: e.target.value }))}
                className="w-full px-2 py-1.5 rounded-lg text-[11px] outline-none"
                style={{ background: "var(--off-white)", border: "1px solid var(--gray-light)", color: "var(--navy)" }}
              />
            </div>
          </div>
          <div>
            <p className="font-mono text-[8px] tracking-wider mb-1" style={{ color: "var(--gray)" }}>TRANSPORT TYPE</p>
            <div className="flex flex-wrap gap-1.5">
              {transportTypes.map((t) => {
                const active = state.types.includes(t.key);
                return (
                  <button
                    key={t.key}
                    onClick={() => toggleType(t.key)}
                    className="text-[11px] px-2 py-1 rounded-full btn-press"
                    style={{
                      background: active ? "var(--gold)" : "var(--off-white)",
                      color: active ? "white" : "var(--navy)",
                      border: `1px solid ${active ? "var(--gold)" : "var(--gray-light)"}`,
                    }}
                  >
                    {t.icon} {t.label}
                  </button>
                );
              })}
            </div>
          </div>
=======
=======
>>>>>>> theirs
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
<<<<<<< ours
>>>>>>> theirs
=======
>>>>>>> theirs
        </div>
      )}
    </div>
  );
};

export default TicketsFilterBar;
