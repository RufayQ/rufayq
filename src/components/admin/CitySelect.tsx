import { useMemo, useState, useEffect, useRef } from "react";
import { Search, ChevronDown, Check } from "lucide-react";
import { getCitiesForCountry } from "@/data/cities";

interface Props {
  country: string | null | undefined;
  value: string | null | undefined;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
  id?: string;
}

/**
 * Searchable city combobox derived from the selected country.
 * - Falls back to free-text input when no country is selected, no curated list
 *   exists, or the user explicitly chooses "Other…".
 * - Filters cities as you type; large city lists become scannable.
 */
const CitySelect = ({ country, value, onChange, className = "", placeholder = "City", id }: Props) => {
  const cities = useMemo(() => getCitiesForCountry(country), [country]);
  const isKnown = !!value && cities.includes(value);
  const [mode, setMode] = useState<"select" | "custom">(
    cities.length === 0 || (value && !isKnown) ? "custom" : "select",
  );
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const wrapRef = useRef<HTMLDivElement>(null);

  // Reset mode when country switches
  useEffect(() => {
    if (cities.length === 0) setMode("custom");
    else if (value && !cities.includes(value)) setMode("custom");
    else setMode("select");
    setOpen(false);
    setQuery("");
  }, [country]); // eslint-disable-line react-hooks/exhaustive-deps

  // Click-outside to close dropdown
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const baseCls = `bg-slate-900 border border-slate-700 rounded text-sm text-slate-200 ${className}`;
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return cities;
    return cities.filter((c) => c.toLowerCase().includes(q));
  }, [cities, query]);

  if (mode === "custom" || cities.length === 0) {
    return (
      <div className="flex gap-1.5 items-center">
        <input
          id={id}
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={!country ? "Select a country first" : placeholder}
          disabled={!country}
          className={`${baseCls} flex-1 px-2 py-1.5 disabled:opacity-50`}
        />
        {cities.length > 0 && (
          <button
            type="button"
            onClick={() => { setMode("select"); onChange(""); }}
            className="text-[10px] text-slate-400 hover:text-amber-300 underline whitespace-nowrap"
          >
            Pick
          </button>
        )}
      </div>
    );
  }

  return (
    <div ref={wrapRef} className="relative">
      <button
        id={id}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`${baseCls} px-2 py-1.5 w-full flex items-center justify-between gap-2 text-left`}
      >
        <span className={value ? "" : "text-slate-500"}>{value || placeholder}</span>
        <ChevronDown size={12} className="text-slate-500 shrink-0" />
      </button>
      {open && (
        <div className="absolute z-30 mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 shadow-xl overflow-hidden">
          <div className="flex items-center gap-1.5 px-2 py-1.5 border-b border-slate-800">
            <Search size={12} className="text-slate-500" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search city…"
              className="flex-1 bg-transparent text-xs text-slate-200 outline-none"
            />
          </div>
          <ul className="max-h-56 overflow-y-auto py-1 text-xs">
            {filtered.length === 0 && (
              <li className="px-3 py-2 text-slate-500 italic">No matches</li>
            )}
            {filtered.map((c) => (
              <li key={c}>
                <button
                  type="button"
                  onClick={() => { onChange(c); setOpen(false); setQuery(""); }}
                  className="w-full text-left px-3 py-1.5 hover:bg-slate-800 text-slate-200 flex items-center justify-between"
                >
                  <span>{c}</span>
                  {value === c && <Check size={12} className="text-amber-300" />}
                </button>
              </li>
            ))}
            <li className="border-t border-slate-800 mt-1">
              <button
                type="button"
                onClick={() => { setMode("custom"); onChange(""); setOpen(false); setQuery(""); }}
                className="w-full text-left px-3 py-1.5 text-amber-300 hover:bg-amber-500/10"
              >
                Other… (type custom)
              </button>
            </li>
          </ul>
        </div>
      )}
    </div>
  );
};

export default CitySelect;
