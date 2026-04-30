/**
 * StaleDataBanner
 * ───────────────
 * Renders a small bilingual notice above a screen when data was loaded
 * from offline cache rather than the network. Use whenever you call
 * `cachedFetch` and `result.stale === true`.
 *
 * Tap "Retry" to re-fetch (the parent passes the handler).
 */
import { CloudOff, RefreshCw } from "lucide-react";

interface Props {
  ageMs: number;
  onRetry: () => void;
  retrying?: boolean;
}

const formatAge = (ms: number) => {
  const m = Math.floor(ms / 60_000);
  if (m < 1) return { en: "moments ago", ar: "قبل لحظات" };
  if (m < 60) return { en: `${m} min ago`, ar: `قبل ${m} دقيقة` };
  const h = Math.floor(m / 60);
  return { en: `${h} h ago`, ar: `قبل ${h} ساعة` };
};

const StaleDataBanner = ({ ageMs, onRetry, retrying }: Props) => {
  const age = formatAge(ageMs);
  return (
    <div
      role="status"
      aria-live="polite"
      className="mx-3 mt-2 rounded-xl px-3 py-2 flex items-center gap-3"
      style={{
        background: "color-mix(in oklab, var(--gold) 10%, var(--off-white))",
        border: "1px solid color-mix(in oklab, var(--gold) 30%, transparent)",
        color: "var(--ink)",
      }}
    >
      <CloudOff size={16} aria-hidden style={{ color: "var(--gold)" }} />
      <div className="flex-1 min-w-0 text-xs leading-tight">
        <div>Showing offline data · updated {age.en}</div>
        <div dir="rtl" style={{ opacity: 0.75 }}>
          عرض بيانات غير متصلة · آخر تحديث {age.ar}
        </div>
      </div>
      <button
        onClick={onRetry}
        disabled={retrying}
        className="shrink-0 rounded-lg px-2 py-1 text-xs font-medium flex items-center gap-1 disabled:opacity-50"
        style={{ background: "var(--teal-600)", color: "var(--off-white)" }}
        aria-label="Retry / إعادة المحاولة"
      >
        <RefreshCw size={12} className={retrying ? "animate-spin" : ""} />
        Retry
      </button>
    </div>
  );
};

export default StaleDataBanner;
