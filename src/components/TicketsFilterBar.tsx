import { useEffect, useMemo, useRef, useState } from "react";
import { Search, X, SlidersHorizontal, Crown, Sparkles } from "lucide-react";
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
  /** Optional count of lounge memberships — shown on the Lounges chip. */
  loungeCount?: number;
  /** Optional callback fired when the user taps the Lounges chip. */
  onJumpToLounges?: () => void;
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

const TicketsFilterBar = ({ value, onChange, segments, filteredCount, onClear, loungeCount, onJumpToLounges }: Props) => {
  const [draftSearch, setDraftSearch] = useState(value.search);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

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

  // Close menu on outside click / escape
  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  const counts = useMemo(() => {
    const next = new Map<TicketQuickFilter, number>();
    quickFilters.forEach((q) => next.set(q.key, segments.filter((segment) => matchesQuick(segment, q.key)).length));
    return next;
  }, [segments]);

  const activeCount =
    (value.quick !== "all" ? 1 : 0) +
    (value.dateFrom || value.dateTo ? 1 : 0) +
    (value.transportTypes.length ? 1 : 0) +
    (value.familyOnly ? 1 : 0);

  const update = (patch: Partial<TicketsFilterState>) => onChange({ ...value, ...patch });
  const toggleType = (type: TransportSegment["type"]) =>
    update({ transportTypes: value.transportTypes.includes(type) ? value.transportTypes.filter((t) => t !== type) : [...value.transportTypes, type] });

  const handleClear = () => {
    onClear();
    setMenuOpen(false);
  };

  // Visible quick-chip subset (the rest live inside the advanced menu).
  const visibleChips: TicketQuickFilter[] = ["all", "upcoming", "current", "past"];

  return (
    <div
      className="sticky top-0 z-20 px-4 pt-3 pb-3"
      style={{
        background: "linear-gradient(180deg, rgba(248,246,241,0.98) 0%, rgba(248,246,241,0.94) 100%)",
        borderBottom: "1px solid rgba(197,150,90,0.18)",
        backdropFilter: "blur(14px)",
        WebkitBackdropFilter: "blur(14px)",
      }}
    >
      {/* Elite eyebrow */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <Sparkles size={10} style={{ color: "var(--gold)" }} />
          <p className="font-mono text-[8px] tracking-[0.22em]" style={{ color: "var(--teal-deep)" }}>
            CURATE YOUR JOURNEY
          </p>
        </div>
        <p className="font-mono text-[8px] tracking-widest" style={{ color: "var(--gray)" }}>
          {filteredCount}/{segments.length}
        </p>
      </div>

      {/* Search + advanced trigger */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" color="var(--teal-deep)" />
          <input
            value={draftSearch}
            onChange={(e) => setDraftSearch(e.target.value)}
            placeholder="Search airline, flight #, city, PNR…"
            className="w-full rounded-full py-2.5 pl-9 pr-9 text-[12px] outline-none transition-shadow"
            style={{
              background: "var(--white)",
              border: "1px solid rgba(15,46,61,0.10)",
              color: "var(--navy)",
              boxShadow: "0 1px 2px rgba(15,46,61,0.04), inset 0 0 0 0 transparent",
            }}
          />
          {draftSearch && (
            <button onClick={() => setDraftSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1" aria-label="Clear search">
              <X size={14} color="var(--gray)" />
            </button>
          )}
        </div>

        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((v) => !v)}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            aria-label="Advanced filters"
            className="relative flex h-10 items-center gap-1.5 rounded-full px-3 btn-press transition-all"
            style={{
              background: activeCount
                ? "linear-gradient(135deg, var(--teal-deep) 0%, #0a4a5e 100%)"
                : "var(--white)",
              border: `1px solid ${activeCount ? "var(--teal-deep)" : "rgba(15,46,61,0.10)"}`,
              color: activeCount ? "white" : "var(--navy)",
              boxShadow: activeCount
                ? "0 4px 14px rgba(15,46,61,0.22)"
                : "0 1px 2px rgba(15,46,61,0.04)",
            }}
          >
            <SlidersHorizontal size={13} />
            <span className="text-[10px] font-bold tracking-wider uppercase">Refine</span>
            {activeCount > 0 && (
              <span
                className="flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-bold"
                style={{ background: "var(--gold)", color: "white" }}
              >
                {activeCount}
              </span>
            )}
          </button>

          {menuOpen && (
            <div
              role="menu"
              className="absolute right-0 top-full mt-2 w-[19rem] rounded-2xl p-3.5 space-y-3.5"
              style={{
                background: "var(--white)",
                border: "1px solid rgba(197,150,90,0.25)",
                boxShadow: "0 18px 48px rgba(15,46,61,0.22), 0 2px 6px rgba(15,46,61,0.08)",
              }}
            >
              {/* Status */}
              <div>
                <p className="font-mono text-[8px] tracking-[0.18em] mb-1.5" style={{ color: "var(--teal-deep)" }}>
                  STATUS · <span className="font-arabic">الحالة</span>
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {quickFilters.map((q) => {
                    const active = value.quick === q.key;
                    return (
                      <button
                        key={q.key}
                        onClick={() => update({ quick: q.key, familyOnly: q.key === "family" })}
                        className="rounded-full px-2.5 py-1 text-[10px] font-bold btn-press"
                        style={{
                          background: active ? "var(--teal-deep)" : "var(--off-white)",
                          color: active ? "white" : "var(--navy)",
                          border: `1px solid ${active ? "var(--teal-deep)" : "var(--gray-light)"}`,
                        }}
                      >
                        {q.en} <span className="font-arabic">{q.ar}</span>
                        <span
                          className="ml-1 rounded-full px-1.5 py-0.5"
                          style={{ background: active ? "rgba(255,255,255,0.18)" : "var(--white)" }}
                        >
                          {counts.get(q.key) || 0}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Date range */}
              <div>
                <p className="font-mono text-[8px] tracking-[0.18em] mb-1.5" style={{ color: "var(--teal-deep)" }}>
                  DATE · <span className="font-arabic">التاريخ</span>
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <label className="block">
                    <span className="font-mono text-[8px]" style={{ color: "var(--gray)" }}>FROM · من</span>
                    <input
                      type="date"
                      value={value.dateFrom}
                      onChange={(e) => update({ dateFrom: e.target.value })}
                      className="mt-1 w-full rounded-lg px-2 py-1.5 text-[11px] outline-none"
                      style={{ border: "1px solid var(--gray-light)" }}
                    />
                  </label>
                  <label className="block">
                    <span className="font-mono text-[8px]" style={{ color: "var(--gray)" }}>TO · إلى</span>
                    <input
                      type="date"
                      value={value.dateTo}
                      onChange={(e) => update({ dateTo: e.target.value })}
                      className="mt-1 w-full rounded-lg px-2 py-1.5 text-[11px] outline-none"
                      style={{ border: "1px solid var(--gray-light)" }}
                    />
                  </label>
                </div>
              </div>

              {/* Transport types */}
              <div>
                <p className="font-mono text-[8px] tracking-[0.18em] mb-1.5" style={{ color: "var(--teal-deep)" }}>
                  TYPE · <span className="font-arabic">النوع</span>
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {typeOptions.map((type) => {
                    const active = value.transportTypes.includes(type.key);
                    return (
                      <button
                        key={type.key}
                        onClick={() => toggleType(type.key)}
                        className="rounded-full px-2.5 py-1 text-[10px] font-semibold btn-press"
                        style={{
                          background: active ? "var(--gold)" : "var(--off-white)",
                          color: active ? "white" : "var(--navy)",
                        }}
                      >
                        {type.icon} {type.label} <span className="font-arabic">{type.ar}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 pt-1">
                <button
                  onClick={handleClear}
                  className="flex-1 rounded-xl py-2 text-[11px] font-bold btn-press"
                  style={{ color: "var(--teal-deep)", background: "var(--teal-light)" }}
                >
                  Clear · <span className="font-arabic">مسح</span>
                </button>
                <button
                  onClick={() => setMenuOpen(false)}
                  className="flex-1 rounded-xl py-2 text-[11px] font-bold btn-press"
                  style={{ color: "white", background: "var(--teal-deep)" }}
                >
                  Done · <span className="font-arabic">تم</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Quick chip rail — elite segmented row + Lounges entry */}
      <div className="mt-2.5 -mx-1 flex items-center gap-1.5 overflow-x-auto pb-1 px-1" style={{ scrollbarWidth: "none" }}>
        {visibleChips.map((key) => {
          const q = quickFilters.find((x) => x.key === key)!;
          const active = value.quick === key;
          const count = counts.get(key) || 0;
          return (
            <button
              key={key}
              onClick={() => update({ quick: key })}
              className="shrink-0 rounded-full px-3 py-1.5 text-[11px] font-semibold btn-press transition-all"
              style={{
                background: active
                  ? "linear-gradient(135deg, var(--teal-deep) 0%, #0a4a5e 100%)"
                  : "var(--white)",
                color: active ? "white" : "var(--navy)",
                border: `1px solid ${active ? "var(--teal-deep)" : "rgba(15,46,61,0.10)"}`,
                boxShadow: active
                  ? "0 4px 12px rgba(15,46,61,0.18)"
                  : "0 1px 2px rgba(15,46,61,0.04)",
              }}
            >
              {q.en}
              <span
                className="ml-1.5 rounded-full px-1.5 py-0.5 text-[9px] font-bold"
                style={{
                  background: active ? "rgba(255,255,255,0.20)" : "var(--off-white)",
                  color: active ? "white" : "var(--gray)",
                }}
              >
                {count}
              </span>
            </button>
          );
        })}

        {/* Elite divider */}
        <div className="shrink-0 mx-1 h-5 w-px" style={{ background: "rgba(197,150,90,0.30)" }} />

        {/* Lounges chip — gold accent for premium feel */}
        {onJumpToLounges && (
          <button
            onClick={onJumpToLounges}
            aria-label="Jump to lounge cards"
            className="shrink-0 group flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold btn-press transition-all"
            style={{
              background: "linear-gradient(135deg, #c5965a 0%, #b07f43 100%)",
              color: "white",
              border: "1px solid rgba(197,150,90,0.55)",
              boxShadow: "0 4px 14px rgba(197,150,90,0.32)",
            }}
          >
            <Crown size={12} />
            Lounges <span className="font-arabic font-normal opacity-90">صالات</span>
            <span
              className="rounded-full px-1.5 py-0.5 text-[9px] font-bold"
              style={{ background: "rgba(255,255,255,0.22)" }}
            >
              {loungeCount ?? 0}
            </span>
          </button>
        )}
      </div>
    </div>
  );
};

export default TicketsFilterBar;
