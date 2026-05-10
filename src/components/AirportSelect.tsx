/**
 * Searchable airport dropdown.
 *
 * Replaces the old free-text "From code / From city / To code / To city"
 * inputs in the manual flight entry sheet. Picking an airport always fills
 * code + city together so DMM can never be paired with Sharjah.
 */
import { useEffect, useRef, useState } from "react";
import { Plane, Search, X } from "lucide-react";
import { type Airport, searchAirports } from "@/data/airports";

interface Props {
  label: string;
  ar?: string;
  value?: Airport | null;
  onChange: (airport: Airport | null) => void;
  required?: boolean;
  testId?: string;
  placeholder?: string;
}

const AirportSelect = ({ label, ar, value, onChange, required, testId, placeholder }: Props) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("mousedown", handler);
    return () => window.removeEventListener("mousedown", handler);
  }, [open]);

  const results = searchAirports(query, 30);

  const display = value ? `${value.code} — ${value.city}` : "";

  return (
    <div ref={wrapRef} className="relative">
      <label className="block">
        <span className="font-mono text-[8px] tracking-wider" style={{ color: "var(--gray)" }}>
          {label.toUpperCase()}
          {ar ? <span className="font-arabic ml-1" style={{ opacity: 0.7 }}>· {ar}</span> : null}
          {required ? <span style={{ color: "var(--error)" }}> *</span> : null}
        </span>
        <button
          type="button"
          onClick={() => { setOpen(true); setQuery(""); }}
          data-testid={testId}
          className="mt-1 w-full rounded-lg px-2 py-1.5 text-[13px] font-bold outline-none text-left flex items-center gap-1.5"
          style={{
            background: "var(--off-white)",
            color: value ? "var(--navy)" : "var(--gray)",
            border: "1px solid var(--gray-light)",
            minHeight: 34,
          }}
        >
          <Plane size={11} style={{ color: value ? "var(--teal-deep)" : "var(--gray)" }} />
          <span className="flex-1 truncate">{display || placeholder || "Search code, city, or airport"}</span>
          {value && (
            <span
              role="button"
              aria-label="Clear airport"
              onClick={(e) => { e.stopPropagation(); onChange(null); }}
              className="ml-1 rounded-full"
              style={{ padding: 2 }}
            >
              <X size={11} />
            </span>
          )}
        </button>
      </label>

      {open && (
        <div
          className="absolute z-50 left-0 right-0 mt-1 rounded-xl shadow-xl overflow-hidden"
          style={{ background: "var(--white)", border: "1px solid var(--gray-light)", maxHeight: 280 }}
        >
          <div className="flex items-center gap-1.5 px-2 py-2" style={{ borderBottom: "1px solid var(--gray-light)" }}>
            <Search size={12} style={{ color: "var(--gray)" }} />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Type code, city, or airport name"
              className="flex-1 outline-none text-[12px]"
              style={{ background: "transparent", color: "var(--navy)" }}
              data-testid={testId ? `${testId}-search` : undefined}
            />
          </div>
          <div className="overflow-y-auto" style={{ maxHeight: 240 }}>
            {results.length === 0 ? (
              <p className="text-[11px] text-center px-3 py-4" style={{ color: "var(--gray)" }}>
                No matching airport. Pick the closest hub or contact support to add it.
              </p>
            ) : (
              results.map((a) => (
                <button
                  type="button"
                  key={a.code}
                  onClick={() => { onChange(a); setOpen(false); }}
                  className="w-full text-left px-3 py-2 flex items-baseline gap-2 hover:bg-[color:var(--off-white)]"
                  data-testid={testId ? `${testId}-option-${a.code}` : undefined}
                >
                  <span className="font-mono text-[11px] font-bold" style={{ color: "var(--teal-deep)", minWidth: 36 }}>{a.code}</span>
                  <span className="text-[12px] font-bold" style={{ color: "var(--navy)" }}>{a.city}</span>
                  <span className="text-[10px] truncate" style={{ color: "var(--gray)" }}>
                    {a.name}{a.country ? ` · ${a.country}` : ""}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AirportSelect;
