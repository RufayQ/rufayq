import { useEffect, useRef, useState } from "react";
import { MessageCircle, Stethoscope, X } from "lucide-react";
import { useActiveChatHead } from "@/hooks/useActiveChatHead";
import { useResolvedContact } from "@/hooks/useResolvedContact";

interface Props {
  /** Thread currently open in the chat tab — used to suppress its own bubble. */
  suppressThreadId?: string | null;
  /** Tap → open this thread. */
  onOpenThread: (threadId: string) => void;
}

/**
 * Messenger-style floating chat-head bubble. Sits inside the 390px mobile
 * shell (not over OS apps — true system bubbles require a native Capacitor
 * plugin and aren't built here). Shows the most recent unread human thread
 * (or a user-pinned thread). Drag vertically to reposition; X snaps to
 * either edge. Long-press for menu.
 */
export default function ChatHeadBubble({ suppressThreadId, onOpenThread }: Props) {
  const { active, unread, pos, setPos, dismiss, isPinned, unpin } = useActiveChatHead({
    suppressThreadId,
  });
  const [menuOpen, setMenuOpen] = useState(false);
  const [dragging, setDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragInfo = useRef<{ startY: number; startYNorm: number; moved: boolean } | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Close menu when active thread changes
  useEffect(() => { setMenuOpen(false); }, [active?.id]);

  // Resolver gives us Unicode-aware initials + uploaded/google avatar for
  // direct chats. MUST be called unconditionally (before any early return)
  // to satisfy React's rules of hooks — otherwise the hook count changes
  // between renders and React throws minified error #310 in production,
  // which AppErrorBoundary catches as "We hit a startup error".
  const resolved = useResolvedContact(
    active?.kind === "direct" ? active.id : null,
    "direct",
  );

  // Broadcast bubble visibility so the heads-up overlay can suppress
  // duplicate cards for the same thread (Option C coexistence).
  useEffect(() => {
    window.dispatchEvent(new CustomEvent("rufayq:chathead-visible", {
      detail: { threadId: active?.id ?? null },
    }));
    return () => {
      window.dispatchEvent(new CustomEvent("rufayq:chathead-visible", {
        detail: { threadId: null },
      }));
    };
  }, [active?.id]);

  if (!active) return null;

  const SIZE = 56;
  const MARGIN = 12;
  const BOTTOM_NAV_RESERVE = 84; // bottom nav (64) + spacing
  const TOP_RESERVE = 60;

  // Compute pixel position from normalized y (0..1 within drag area)
  const computeTop = (yNorm: number, height: number) => {
    const min = TOP_RESERVE;
    const max = Math.max(min, height - BOTTOM_NAV_RESERVE - SIZE);
    return min + Math.max(0, Math.min(1, yNorm)) * (max - min);
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (!containerRef.current) return;
    const parent = containerRef.current.parentElement;
    if (!parent) return;
    setDragging(true);
    setMenuOpen(false);
    dragInfo.current = {
      startY: e.clientY,
      startYNorm: pos.y,
      moved: false,
    };
    longPressTimer.current = setTimeout(() => {
      if (dragInfo.current && !dragInfo.current.moved) {
        setMenuOpen(true);
      }
    }, 500);
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
  };
  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragInfo.current || !containerRef.current) return;
    const parent = containerRef.current.parentElement;
    if (!parent) return;
    const dy = e.clientY - dragInfo.current.startY;
    if (Math.abs(dy) > 4) {
      dragInfo.current.moved = true;
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
        longPressTimer.current = null;
      }
    }
    const h = parent.clientHeight;
    const range = h - BOTTOM_NAV_RESERVE - TOP_RESERVE - SIZE;
    if (range <= 0) return;
    const newYNorm = Math.max(0, Math.min(1, dragInfo.current.startYNorm + dy / range));
    setPos({ ...pos, y: newYNorm });
  };
  const handlePointerUp = (e: React.PointerEvent) => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    const wasDrag = dragInfo.current?.moved ?? false;
    dragInfo.current = null;
    setDragging(false);
    if (!wasDrag && !menuOpen) {
      // Treat as tap
      onOpenThread(active.id);
    }
    (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);
  };

  const parentHeight = containerRef.current?.parentElement?.clientHeight ?? 700;
  const top = computeTop(pos.y, parentHeight);

  const sideStyle =
    pos.side === "right" ? { right: MARGIN } : { left: MARGIN };

  const fallbackInitial = (() => {
    const m = (active.title ?? "").match(/\p{L}/u);
    return m ? m[0].toUpperCase() : "";
  })();
  const initials = resolved?.initials || fallbackInitial || "?";
  const avatarUrl = resolved?.avatarUrl ?? null;

  return (
    <div
      ref={containerRef}
      className="absolute z-40 select-none"
      style={{ top, ...sideStyle, touchAction: "none" }}
    >
      {menuOpen && (
        <div
          className={`absolute ${pos.side === "right" ? "right-[64px]" : "left-[64px]"} top-0 rounded-xl py-1 min-w-[150px] animate-fade-in-up`}
          style={{
            background: "var(--white)",
            border: "1px solid var(--gray-light)",
            boxShadow: "0 10px 30px rgba(0,0,0,0.18)",
          }}
        >
          <MenuItem
            label="Open chat · فتح"
            onClick={() => { setMenuOpen(false); onOpenThread(active.id); }}
          />
          {isPinned ? (
            <MenuItem
              label="Unpin · إلغاء التثبيت"
              onClick={() => { setMenuOpen(false); unpin(); }}
            />
          ) : null}
          <MenuItem
            label="Dismiss · إخفاء"
            onClick={() => { setMenuOpen(false); dismiss(active.id); }}
            danger
          />
        </div>
      )}
      <button
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className="relative flex items-center justify-center rounded-full transition-transform"
        style={{
          width: SIZE,
          height: SIZE,
          background: active.kind === "provider" ? "var(--teal-deep)" : "var(--navy)",
          color: "#fff",
          border: "2px solid var(--gold)",
          boxShadow: dragging
            ? "0 12px 28px rgba(0,0,0,0.35), 0 0 0 6px rgba(197,150,90,0.18)"
            : "0 8px 22px rgba(0,0,0,0.28)",
          transform: dragging ? "scale(1.08)" : "scale(1)",
          fontFamily: "'DM Sans'",
          fontWeight: 700,
          fontSize: 18,
        }}
        aria-label={`Open chat with ${active.title ?? "contact"}`}
      >
        {active.kind === "provider" ? (
          <Stethoscope size={22} />
        ) : avatarUrl ? (
          <img
            src={avatarUrl}
            alt=""
            className="absolute inset-0 w-full h-full rounded-full object-cover"
            draggable={false}
          />
        ) : (
          <span>{initials || <MessageCircle size={22} />}</span>
        )}
        {unread > 0 && (
          <span
            className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 rounded-full flex items-center justify-center text-[10px] font-bold"
            style={{
              background: "var(--gold)",
              color: "var(--navy)",
              border: "2px solid var(--off-white)",
              fontFamily: "'DM Sans'",
            }}
          >
            {unread > 99 ? "99+" : unread}
          </span>
        )}
        {isPinned && unread === 0 && (
          <span
            className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full"
            style={{ background: "var(--gold)", border: "2px solid var(--off-white)" }}
            aria-hidden
          />
        )}
      </button>
      {menuOpen && (
        <button
          onClick={() => setMenuOpen(false)}
          className="absolute inset-0 -m-2 rounded-full"
          aria-label="Close menu"
          style={{ background: "transparent" }}
        >
          <X size={1} className="opacity-0" />
        </button>
      )}
    </div>
  );
}

function MenuItem({
  label,
  onClick,
  danger,
}: {
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left px-3 py-2 text-[12px] btn-press"
      style={{
        color: danger ? "var(--error, #d33)" : "var(--navy)",
        fontFamily: "'DM Sans'",
      }}
    >
      {label}
    </button>
  );
}
