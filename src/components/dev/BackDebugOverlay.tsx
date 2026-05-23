/**
 * BackDebugOverlay — developer-only floating chip that surfaces:
 *   • the current LIFO back-handler stack (top entry handles next press),
 *   • the layer that consumed the most recent back press,
 *   • the shell's computed "next step" (sub-view / tab / exit-prompt).
 *
 * Gated by `import.meta.env.DEV` OR `localStorage.rufayq_debug_back === "1"`.
 * Long-press the chip to hide for the session.
 */
import { useEffect, useState } from "react";
import { getBackStackLabels, getLastBackEvent, type BackDebugEvent } from "@/hooks/useBackHandler";

interface Props {
  /** A short human label of what the shell would do next if consumeBack returned false. */
  nextShellStep: string;
}

export default function BackDebugOverlay({ nextShellStep }: Props) {
  const enabled =
    (typeof import.meta !== "undefined" && (import.meta as any).env?.DEV) ||
    (typeof window !== "undefined" && localStorage.getItem("rufayq_debug_back") === "1");

  const [hidden, setHidden] = useState(false);
  const [stack, setStack] = useState<string[]>(() => getBackStackLabels());
  const [last, setLast] = useState<BackDebugEvent | null>(() => getLastBackEvent());

  useEffect(() => {
    if (!enabled) return;
    const onEvt = (e: Event) => {
      const detail = (e as CustomEvent<BackDebugEvent>).detail;
      setStack(detail?.remainingStack ?? getBackStackLabels());
      setLast(detail ?? null);
      if (detail?.consumedBy) {
        // eslint-disable-next-line no-console
        console.info(`[back] consumed by "${detail.consumedBy}" · remaining=[${detail.remainingStack.join(", ") || "—"}]`);
      } else if (detail && detail.consumedBy === null && detail.at) {
        // stack mutation only
      }
    };
    window.addEventListener("rufayq:back-debug", onEvt as EventListener);
    return () => window.removeEventListener("rufayq:back-debug", onEvt as EventListener);
  }, [enabled]);

  if (!enabled || hidden) return null;

  const top = stack[stack.length - 1];
  const nextResolved = top ? `consumeBack → ${top}` : nextShellStep;

  return (
    <div
      onContextMenu={(e) => { e.preventDefault(); setHidden(true); }}
      onDoubleClick={() => setHidden(true)}
      className="fixed left-2 bottom-2 z-[9999] pointer-events-auto select-none"
      style={{
        background: "rgba(6,16,26,0.92)",
        color: "#fff",
        borderRadius: 10,
        padding: "6px 10px",
        fontFamily: "ui-monospace, Menlo, monospace",
        fontSize: 10,
        lineHeight: 1.35,
        maxWidth: 240,
        boxShadow: "0 6px 20px rgba(0,0,0,0.4)",
        border: "1px solid rgba(197,150,90,0.35)",
      }}
      title="Double-click or right-click to hide"
      aria-hidden
    >
      <div style={{ color: "#C5965A", letterSpacing: 1 }}>← BACK DEBUG</div>
      <div style={{ marginTop: 2 }}>
        <span style={{ opacity: 0.6 }}>next:</span> {nextResolved}
      </div>
      <div style={{ marginTop: 2 }}>
        <span style={{ opacity: 0.6 }}>stack[{stack.length}]:</span>{" "}
        {stack.length ? stack.slice().reverse().join(" › ") : "—"}
      </div>
      {last?.consumedBy && (
        <div style={{ marginTop: 2, opacity: 0.75 }}>
          last: <span style={{ color: "#7BD7A6" }}>{last.consumedBy}</span>
        </div>
      )}
    </div>
  );
}
