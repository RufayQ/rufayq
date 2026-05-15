import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Search } from "lucide-react";
import { COUNTRIES } from "@/data/countries";
import { useLanguage } from "@/contexts/LanguageContext";

interface Props {
  value: string;
  onChange: (name: string) => void;
  placeholder?: string;
  className?: string;
  style?: React.CSSProperties;
  required?: boolean;
  id?: string;
}

/** Searchable nationality dropdown. Stores the localized country name as `value`. */
const NationalityCombobox = ({ value, onChange, placeholder, className, style, required, id }: Props) => {
  const { mode } = useLanguage();
  const isAr = mode === "ar";
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return COUNTRIES;
    return COUNTRIES.filter(
      (c) => c.name.toLowerCase().includes(q) || c.nameAr.includes(q) || c.code.toLowerCase().includes(q),
    );
  }, [query]);

  const selectedCountry = useMemo(
    () =>
      COUNTRIES.find(
        (c) => value === c.name || value === c.nameAr || value === c.code,
      ),
    [value],
  );
  const selectedLabel = selectedCountry
    ? isAr ? selectedCountry.nameAr : selectedCountry.name
    : value || (placeholder ?? (isAr ? "اختر الجنسية" : "Select nationality"));

  return (
    <div ref={wrapRef} className="relative" style={{ width: "100%" }}>
      <button
        type="button"
        id={id}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-required={required}
        className={`w-full text-${isAr ? "right" : "left"} flex items-center justify-between gap-2 ${className ?? ""}`}
        style={style}
      >
        <span style={{ opacity: value ? 1 : 0.55 }}>{selectedLabel}</span>
        <ChevronDown size={16} style={{ opacity: 0.6 }} />
      </button>
      {open && (
        <div
          role="listbox"
          className="absolute z-50 mt-1 w-full rounded-xl shadow-xl overflow-hidden"
          style={{
            background: "#0B1A28",
            border: "1px solid rgba(197,150,90,0.25)",
            maxHeight: 280,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div className="flex items-center gap-2 px-3 py-2 border-b" style={{ borderColor: "rgba(197,150,90,0.18)" }}>
            <Search size={14} style={{ opacity: 0.6 }} />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={isAr ? "ابحث…" : "Search…"}
              className="w-full bg-transparent outline-none text-[13px]"
              style={{ color: "#E8ECF0" }}
            />
          </div>
          <ul className="overflow-y-auto" style={{ maxHeight: 232 }}>
            {filtered.length === 0 ? (
              <li className="px-3 py-2 text-[12px]" style={{ color: "rgba(232,236,240,0.55)" }}>
                {isAr ? "لا نتائج" : "No matches"}
              </li>
            ) : (
              filtered.map((c) => {
                const label = isAr ? c.nameAr : c.name;
                const isSel = value === label || value === c.name || value === c.nameAr;
                return (
                  <li key={c.code}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={isSel}
                      onClick={() => {
                        onChange(label);
                        setOpen(false);
                        setQuery("");
                      }}
                      className="w-full flex items-center justify-between gap-3 px-3 py-2 text-[13px] hover:bg-white/5"
                      style={{
                        color: "#E8ECF0",
                        background: isSel ? "rgba(197,150,90,0.12)" : "transparent",
                        textAlign: isAr ? "right" : "left",
                      }}
                    >
                      <span>{label}</span>
                      <span className="font-mono text-[10px]" style={{ opacity: 0.5 }}>{c.code}</span>
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}
    </div>
  );
};

export default NationalityCombobox;
