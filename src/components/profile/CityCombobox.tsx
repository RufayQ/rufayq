/**
 * CityCombobox — accessible city-of-residence autocomplete with loading,
 * empty, error and keyboard-navigable states. Suggestions are sourced from
 * the local CITIES_BY_COUNTRY map keyed on the active nationality.
 *
 * Keyboard: ArrowUp/Down to move highlight, Enter to select, Escape to close.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, Loader2, MapPin } from "lucide-react";
import { CITIES_BY_COUNTRY } from "@/data/cities";

interface Props {
  value: string;
  onChange: (v: string) => void;
  country: string;
}

type LookupState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "ready"; matches: string[] }
  | { kind: "empty" }
  | { kind: "error"; message: string };

const lookupCities = (country: string, query: string): Promise<string[]> =>
  new Promise((resolve, reject) => {
    // Tiny async hop so the UI surfaces a loading state and any future remote
    // lookup can drop in without re-architecting the component.
    setTimeout(() => {
      try {
        const list = CITIES_BY_COUNTRY[country] || [];
        const q = query.trim().toLowerCase();
        const filtered = q
          ? list.filter((c) => c.toLowerCase().includes(q))
          : list;
        resolve(filtered);
      } catch (e) {
        reject(e instanceof Error ? e : new Error(String(e)));
      }
    }, 120);
  });

const CityCombobox = ({ value, onChange, country }: Props) => {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [state, setState] = useState<LookupState>({ kind: "idle" });
  const wrapRef = useRef<HTMLDivElement>(null);
  const knownCountry = !!CITIES_BY_COUNTRY[country];

  // Run lookup whenever the query, country, or open-state changes.
  useEffect(() => {
    if (!open || !knownCountry) { setState({ kind: "idle" }); return; }
    let cancelled = false;
    setState({ kind: "loading" });
    lookupCities(country, value)
      .then((matches) => {
        if (cancelled) return;
        if (matches.length === 0) setState({ kind: "empty" });
        else setState({ kind: "ready", matches });
      })
      .catch((e) => {
        if (cancelled) return;
        setState({ kind: "error", message: e.message || "Lookup failed" });
      });
    return () => { cancelled = true; };
  }, [country, value, open, knownCountry]);

  // Click outside to close.
  useEffect(() => {
    if (!open) return;
    const onDown = (ev: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(ev.target as Node)) {
        setOpen(false);
      }
    };
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [open]);

  const matches = state.kind === "ready" ? state.matches : [];
  const listboxId = "city-combobox-listbox";

  const commit = (v: string) => {
    onChange(v);
    setOpen(false);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActive((i) => Math.min(matches.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(0, i - 1));
    } else if (e.key === "Enter") {
      if (open && matches[active]) {
        e.preventDefault();
        commit(matches[active]);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  // Reset highlight on new matches.
  useEffect(() => { setActive(0); }, [state.kind, country]);

  return (
    <div className="mb-3.5" ref={wrapRef}>
      <div className="flex items-baseline justify-between mb-1.5 px-0.5">
        <p className="font-mono text-[9.5px] tracking-[0.18em] font-bold" style={{ color: "var(--gold)" }}>CITY OF RESIDENCE</p>
        <p className="font-arabic text-[10.5px]" dir="rtl" style={{ color: "var(--gray)" }}>مدينة الإقامة</p>
      </div>
      <div className="relative">
        <input
          value={value}
          onChange={(e) => { onChange(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          role="combobox"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-activedescendant={open && matches[active] ? `city-opt-${active}` : undefined}
          placeholder={country ? `City in ${country}` : "Your city"}
          className="w-full px-3.5 py-3 rounded-xl text-[14px] outline-none transition-all"
          style={{
            background: "#ffffff",
            border: "1.5px solid rgba(11,26,42,0.18)",
            color: "var(--navy)",
            minHeight: 46,
            boxShadow: "0 1px 2px rgba(11,26,42,0.04)",
          }}
        />
        {open && knownCountry && (
          <div
            id={listboxId}
            role="listbox"
            className="absolute z-20 left-0 right-0 mt-1 rounded-xl overflow-hidden max-h-56 overflow-y-auto"
            style={{ background: "var(--white)", border: "1px solid var(--gray-light)", boxShadow: "0 8px 24px rgba(11,26,42,0.12)" }}
          >
            {state.kind === "loading" && (
              <div className="flex items-center gap-2 px-3 py-2.5 text-[12px]" style={{ color: "var(--gray)" }}>
                <Loader2 size={13} className="animate-spin" />
                Loading suggestions… · جارٍ التحميل
              </div>
            )}
            {state.kind === "empty" && (
              <div className="px-3 py-2.5 text-[12px]" style={{ color: "var(--gray)" }}>
                No matches — press Enter to use “{value || "—"}”.
                <span className="block font-arabic" dir="rtl">لا توجد نتائج — استخدم ما كتبت</span>
              </div>
            )}
            {state.kind === "error" && (
              <div className="flex items-start gap-2 px-3 py-2.5 text-[12px]" style={{ color: "var(--error)" }}>
                <AlertCircle size={13} className="mt-0.5 shrink-0" />
                <span>
                  Couldn’t load cities: {state.message}. You can still type your city.
                  <span className="block font-arabic" dir="rtl">تعذّر تحميل المدن — يمكنك الكتابة يدويًا</span>
                </span>
              </div>
            )}
            {state.kind === "ready" && matches.map((c, i) => (
              <button
                key={c}
                id={`city-opt-${i}`}
                role="option"
                aria-selected={i === active}
                type="button"
                onMouseEnter={() => setActive(i)}
                onMouseDown={(e) => { e.preventDefault(); commit(c); }}
                className="w-full flex items-center gap-2 text-left px-3 py-2 text-[13px] transition-colors"
                style={{
                  background: i === active ? "var(--teal-light)" : "transparent",
                  color: "var(--navy)",
                }}
              >
                <MapPin size={12} style={{ color: "var(--teal-deep)" }} />
                {c}
              </button>
            ))}
          </div>
        )}
      </div>
      <p className="mt-1.5 px-1 text-[10.5px]" style={{ color: "var(--gray)" }}>
        {knownCountry
          ? "Pick from suggestions or type your own · اختر أو اكتب"
          : "Free text — based on your nationality · إدخال يدوي"}
      </p>
    </div>
  );
};

export default CityCombobox;
