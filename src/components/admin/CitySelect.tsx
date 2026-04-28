import { useMemo, useState, useEffect } from "react";
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
 * City dropdown that derives its options from the selected country.
 * Falls back to a free-text input when no country is selected, when the country
 * has no curated cities, or when the user picks "Other".
 */
const CitySelect = ({ country, value, onChange, className = "", placeholder = "City", id }: Props) => {
  const cities = useMemo(() => getCitiesForCountry(country), [country]);
  const isKnown = !!value && cities.includes(value);
  const [mode, setMode] = useState<"select" | "custom">(
    cities.length === 0 || (value && !isKnown) ? "custom" : "select"
  );

  // Keep mode in sync if country changes (e.g. switch to a country with no preset list)
  useEffect(() => {
    if (cities.length === 0) setMode("custom");
    else if (value && !cities.includes(value)) setMode("custom");
    else setMode("select");
  }, [country]); // eslint-disable-line react-hooks/exhaustive-deps

  const baseCls = `bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-sm text-slate-200 ${className}`;

  if (mode === "custom" || cities.length === 0) {
    return (
      <div className="flex gap-1.5 items-center">
        <input
          id={id}
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={!country ? "Select a country first" : placeholder}
          disabled={!country}
          className={`${baseCls} flex-1 disabled:opacity-50`}
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
    <select
      id={id}
      value={value || ""}
      onChange={(e) => {
        const v = e.target.value;
        if (v === "__other__") { setMode("custom"); onChange(""); return; }
        onChange(v);
      }}
      className={baseCls}
    >
      <option value="">{placeholder}</option>
      {cities.map((c) => <option key={c} value={c}>{c}</option>)}
      <option value="__other__">Other…</option>
    </select>
  );
};

export default CitySelect;
