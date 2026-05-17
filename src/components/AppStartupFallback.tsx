/**
 * AppStartupFallback
 * ──────────────────
 * Branded loading screen shown during:
 *   - lazy route chunk loading
 *   - auth/session evaluation in AppAuthGuard
 *   - any full-screen Suspense fallback during cold start
 *
 * Replaces silent dark/blank fallbacks that previously looked exactly like
 * the "blacked out app" symptom on Android cold launch.
 *
 * Intentionally lightweight: no network images, no heavy deps, inline styles
 * so it renders even if the design-system CSS hasn't hydrated yet.
 */
import type { CSSProperties, ReactNode } from "react";

const BG = "#06101A";
const TEXT = "#E8ECF0";
const MUTED = "rgba(232,236,240,0.6)";
const GOLD = "#C5965A";
const TEAL = "#0FB5C9";

interface Props {
  title?: string;
  message?: string;
  messageAr?: string;
  children?: ReactNode;
}

const wrap: CSSProperties = {
  minHeight: "100vh",
  width: "100%",
  background: BG,
  color: TEXT,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexDirection: "column",
  gap: 18,
  fontFamily: "'DM Sans', system-ui, -apple-system, sans-serif",
  padding: 24,
  textAlign: "center",
};

const dot: CSSProperties = {
  width: 10,
  height: 10,
  borderRadius: "50%",
  background: TEAL,
  animation: "rufayqPulse 1.2s ease-in-out infinite",
};

const AppStartupFallback = ({
  title = "RufayQ",
  message = "Preparing your care experience…",
  messageAr,
  children,
}: Props) => {
  const isAr = typeof document !== "undefined" && document.documentElement.lang === "ar";
  const text = isAr && messageAr ? messageAr : message;

  return (
    <div role="status" aria-live="polite" style={wrap}>
      <style>{`
        @keyframes rufayqPulse {
          0%,100% { transform: scale(1); opacity: 0.6; }
          50%     { transform: scale(1.35); opacity: 1; }
        }
      `}</style>
      <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 36, letterSpacing: 0.5 }}>
        {title === "RufayQ" ? (
          <>
            <span>Rufay</span>
            <span style={{ color: GOLD, fontWeight: 700 }}>Q</span>
          </>
        ) : (
          <span>{title}</span>
        )}
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        <span style={{ ...dot, animationDelay: "0s" }} />
        <span style={{ ...dot, animationDelay: "0.15s" }} />
        <span style={{ ...dot, animationDelay: "0.3s" }} />
      </div>
      <div style={{ fontSize: 13, color: MUTED, maxWidth: 280 }}>{text}</div>
      {children ? <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>{children}</div> : null}
    </div>
  );
};

export default AppStartupFallback;
