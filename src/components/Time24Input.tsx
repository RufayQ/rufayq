/**
 * Time24Input — strict 24-hour HH:mm picker.
 *
 * Native <input type="time"> falls back to AM/PM in some browser/OS locales,
 * which is not acceptable for flight tickets. This is a fully controlled
 * dropdown picker that always renders 00–23 hours and 00–55 minutes
 * (5-minute increments).
 */
import { useMemo } from "react";

export interface Time24InputProps {
  label: string;
  ar?: string;
  value: string; // HH:mm or ""
  onChange: (value: string) => void;
  required?: boolean;
  testId?: string;
  /** Minute step (default 5). Set to 1 for full 0-59 list. */
  step?: number;
}

const pad2 = (n: number) => String(n).padStart(2, "0");

const Time24Input = ({
  label,
  ar,
  value,
  onChange,
  required,
  testId,
  step = 5,
}: Time24InputProps) => {
  const [hh = "", mm = ""] = value && /^\d{2}:\d{2}$/.test(value)
    ? value.split(":")
    : ["", ""];

  const hours = useMemo(
    () => Array.from({ length: 24 }, (_, i) => pad2(i)),
    [],
  );
  const minutes = useMemo(() => {
    const out: string[] = [];
    for (let m = 0; m < 60; m += Math.max(1, Math.min(30, step))) out.push(pad2(m));
    // Make sure the current value's minute is selectable even if not on step.
    if (mm && !out.includes(mm)) out.push(mm);
    return out.sort();
  }, [step, mm]);

  const update = (nextHH: string, nextMM: string) => {
    if (!nextHH && !nextMM) {
      onChange("");
      return;
    }
    const h = nextHH || (nextMM ? "00" : "");
    const m = nextMM || (nextHH ? "00" : "");
    if (!h || !m) return;
    onChange(`${h}:${m}`);
  };

  const selectStyle: React.CSSProperties = {
    background: "var(--off-white)",
    color: "var(--navy)",
    border: "1px solid var(--gray-light)",
  };

  return (
    <label className="block">
      <span className="font-mono text-[8px] tracking-wider" style={{ color: "var(--gray)" }}>
        {label.toUpperCase()}
        {ar ? <span className="font-arabic ml-1" style={{ opacity: 0.7 }}>· {ar}</span> : null}
        {required ? <span style={{ color: "var(--error)" }}> *</span> : null}
      </span>
      <div className="mt-1 grid grid-cols-2 gap-1.5">
        <select
          value={hh}
          onChange={(e) => update(e.target.value, mm)}
          data-testid={testId ? `${testId}-hh` : undefined}
          aria-label={`${label} hour`}
          className="w-full rounded-lg px-2 py-1.5 text-[13px] font-bold outline-none"
          style={selectStyle}
        >
          <option value="">HH</option>
          {hours.map((h) => (
            <option key={h} value={h}>{h}</option>
          ))}
        </select>
        <select
          value={mm}
          onChange={(e) => update(hh, e.target.value)}
          data-testid={testId ? `${testId}-mm` : undefined}
          aria-label={`${label} minute`}
          className="w-full rounded-lg px-2 py-1.5 text-[13px] font-bold outline-none"
          style={selectStyle}
        >
          <option value="">mm</option>
          {minutes.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
      </div>
    </label>
  );
};

export default Time24Input;
