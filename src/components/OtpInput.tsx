import { useEffect, useRef, KeyboardEvent, ClipboardEvent } from "react";

interface OtpInputProps {
  value: string[];
  onChange: (next: string[]) => void;
  onComplete?: (code: string) => void;
  length?: number;
  disabled?: boolean;
  autoFocus?: boolean;
  /** When true, slots shake + flash red. Parent should toggle off after ~500ms. */
  error?: boolean;
}

/**
 * Polished OTP input with auto-advance, backspace navigation,
 * paste-to-fill, numeric-only enforcement, and onComplete trigger.
 */
const OtpInput = ({ value, onChange, onComplete, length = 6, disabled, autoFocus = true, error = false }: OtpInputProps) => {
  const refs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    if (autoFocus) refs.current[0]?.focus();
  }, [autoFocus]);

  const setAt = (i: number, v: string) => {
    const next = [...value];
    next[i] = v;
    onChange(next);
    if (next.every((d) => d !== "") && next.length === length) {
      onComplete?.(next.join(""));
    }
  };

  const handleChange = (i: number, raw: string) => {
    const cleaned = raw.replace(/\D/g, "");
    if (!cleaned) { setAt(i, ""); return; }
    // Multi-char paste at this slot: distribute
    if (cleaned.length > 1) {
      const next = [...value];
      for (let j = 0; j < cleaned.length && i + j < length; j++) next[i + j] = cleaned[j];
      onChange(next);
      const nextFocus = Math.min(i + cleaned.length, length - 1);
      refs.current[nextFocus]?.focus();
      if (next.every((d) => d !== "")) onComplete?.(next.join(""));
      return;
    }
    setAt(i, cleaned);
    if (i < length - 1) refs.current[i + 1]?.focus();
  };

  const handleKey = (i: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      if (value[i]) { setAt(i, ""); return; }
      if (i > 0) { refs.current[i - 1]?.focus(); setAt(i - 1, ""); }
    } else if (e.key === "ArrowLeft" && i > 0) refs.current[i - 1]?.focus();
    else if (e.key === "ArrowRight" && i < length - 1) refs.current[i + 1]?.focus();
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
    if (!text) return;
    e.preventDefault();
    const next = Array(length).fill("");
    for (let j = 0; j < text.length; j++) next[j] = text[j];
    onChange(next);
    refs.current[Math.min(text.length, length - 1)]?.focus();
    if (text.length === length) onComplete?.(text);
  };

  return (
    <div className={`flex justify-center gap-2 ${error ? "animate-shake" : ""}`} dir="ltr">
      {Array.from({ length }).map((_, i) => {
        const filled = !!value[i];
        const borderColor = error
          ? "var(--error)"
          : filled
            ? "var(--teal-deep)"
            : "var(--gray-light)";
        const ringColor = error
          ? "0 0 0 3px rgba(217,79,79,0.18)"
          : filled
            ? "0 0 0 3px rgba(0,128,128,0.12)"
            : undefined;
        return (
          <input
            key={i}
            ref={(el) => (refs.current[i] = el)}
            value={value[i] || ""}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKey(i, e)}
            onPaste={handlePaste}
            onFocus={(e) => e.target.select()}
            disabled={disabled}
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={1}
            className="w-11 text-center text-xl font-semibold rounded-xl outline-none transition-all"
            style={{
              border: `1.5px solid ${borderColor}`,
              background: disabled ? "var(--gray-light)" : "var(--white)",
              color: error ? "var(--error)" : "var(--navy)",
              boxShadow: ringColor,
              height: 52,
            }}
          />
        );
      })}
    </div>
  );
};

export default OtpInput;
