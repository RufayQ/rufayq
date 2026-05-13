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
          </button>
        )}
      </div>

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
            </button>
          );
        })}
      </div>

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
        </div>
      )}
    </div>
  );
};

export default TicketsFilterBar;
