import { useState, useEffect, useRef, useCallback, useId } from "react";
import { createPortal } from "react-dom";
import { MoreVertical, Copy, Share2, Download, Trash2, RefreshCw, FileText, Bell, Settings, HelpCircle, X } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

export interface HeaderMenuItem {
  icon: React.ReactNode;
  label: string;
  labelAr?: string;
  onClick: () => void;
  danger?: boolean;
}

interface HeaderMenuProps {
  items: HeaderMenuItem[];
  /** Optional title shown at the top of the sheet. */
  title?: string;
  titleAr?: string;
}

/**
 * Header overflow menu. Renders as a LinkedIn-style pull-up bottom sheet
 * for a consistent, scrollable, easy-to-reach UX across all screens.
 *
 * A11y:
 * - role="dialog" + aria-modal + aria-labelledby on the sheet
 * - Esc closes; focus is trapped inside the sheet while open
 * - Opens focused on the close button; restores focus to the trigger on close
 *
 * Gestures:
 * - Swipe down (touch or mouse) anywhere on the drag zone dismisses the sheet
 * - Backdrop tap also dismisses
 */
const haptic = (ms = 8) => {
  try {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      (navigator as Navigator).vibrate(ms);
    }
  } catch { /* no-op */ }
};

const HeaderMenu = ({ items, title = "Menu", titleAr = "القائمة" }: HeaderMenuProps) => {
  const [open, setOpen] = useState(false);
  const { showEn, showAr } = useLanguage();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const dragStartY = useRef<number | null>(null);
  const dragPointerId = useRef<number | null>(null);
  const [dragY, setDragY] = useState(0);
  const [closing, setClosing] = useState(false);
  const titleId = useId();

  const close = useCallback(() => {
    haptic(6);
    setClosing(true);
    window.setTimeout(() => {
      setOpen(false);
      setClosing(false);
      setDragY(0);
      // Restore focus to the trigger for screen readers / keyboard users.
      triggerRef.current?.focus();
    }, 180);
  }, []);

  const openSheet = () => {
    haptic(10);
    setOpen(true);
  };

  // Lock body scroll, Esc-to-close, and focus trap while sheet is open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // Initial focus
    const focusTimer = window.setTimeout(() => {
      closeBtnRef.current?.focus();
    }, 0);

    const getFocusable = (): HTMLElement[] => {
      if (!sheetRef.current) return [];
      return Array.from(
        sheetRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((el) => !el.hasAttribute("aria-hidden"));
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
        return;
      }
      if (e.key !== "Tab") return;
      const f = getFocusable();
      if (f.length === 0) return;
      const first = f[0];
      const last = f[f.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(focusTimer);
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [open, close]);

  // Unified pointer-based drag (touch + mouse + pen)
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    dragStartY.current = e.clientY;
    dragPointerId.current = e.pointerId;
    try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); } catch { /* ignore */ }
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (dragStartY.current == null || dragPointerId.current !== e.pointerId) return;
    const dy = e.clientY - dragStartY.current;
    if (dy > 0) setDragY(dy);
  };
  const endDrag = () => {
    const dy = dragY;
    dragStartY.current = null;
    dragPointerId.current = null;
    if (dy > 90) close();
    else setDragY(0);
  };
  const onPointerUp = () => endDrag();
  const onPointerCancel = () => endDrag();

  return (
    <>
      <button
        ref={triggerRef}
        onClick={openSheet}
        className="w-9 h-9 rounded-full flex items-center justify-center btn-press"
        style={{ background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.10)" }}
        aria-label="Open menu"
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <MoreVertical size={18} color="white" aria-hidden="true" />
      </button>

      {open && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-end justify-center"
          style={{
            background: `rgba(0,0,0,${closing ? 0 : Math.max(0.48 - dragY / 600, 0.1)})`,
            backdropFilter: "blur(2px)",
            transition: closing ? "background 180ms ease" : (dragStartY.current == null ? "background 200ms ease" : "none"),
          }}
          onClick={close}
        >
          <div
            ref={sheetRef}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-[420px] rounded-t-3xl pt-2 pb-3"
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            style={{
              background: "var(--white)",
              boxShadow: "0 -20px 60px rgba(0,0,0,0.25)",
              maxHeight: "85vh",
              display: "flex",
              flexDirection: "column",
              transform: closing
                ? "translateY(100%)"
                : `translateY(${dragY}px)`,
              transition: closing
                ? "transform 200ms cubic-bezier(0.4,0,1,1)"
                : (dragStartY.current == null ? "transform 260ms cubic-bezier(0.22,0.61,0.36,1)" : "none"),
              animation: !closing && dragStartY.current == null && dragY === 0 ? "slide-up 280ms cubic-bezier(0.22,0.61,0.36,1)" : undefined,
            }}
          >
            {/* Drag zone: handle + header (swipe down anywhere here to dismiss) */}
            <div
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerCancel}
              style={{ touchAction: "none", cursor: "grab" }}
            >
              {/* Grab handle */}
              <div
                role="presentation"
                aria-hidden="true"
                className="mx-auto mb-2 mt-1 h-1.5 w-12 rounded-full"
                style={{ background: "var(--gray-light)" }}
              />

              {/* Header */}
              <div className="flex items-center justify-between px-5 pb-2 shrink-0">
                <div id={titleId}>
                  {showEn && (
                    <p className="text-[15px] font-bold" style={{ color: "var(--navy)", fontFamily: "'DM Sans'" }}>{title}</p>
                  )}
                  {showAr && (
                    <p className="font-arabic text-[11px]" dir="rtl" style={{ color: "var(--gray)" }}>{titleAr}</p>
                  )}
                </div>
                <button
                  ref={closeBtnRef}
                  onClick={(e) => { e.stopPropagation(); close(); }}
                  onPointerDown={(e) => e.stopPropagation()}
                  className="w-8 h-8 rounded-full flex items-center justify-center btn-press"
                  style={{ background: "var(--off-white)" }}
                  aria-label={showAr && !showEn ? "إغلاق القائمة" : "Close menu"}
                >
                  <X size={16} style={{ color: "var(--navy)" }} aria-hidden="true" />
                </button>
              </div>
            </div>

            {/* Items (scrollable) */}
            <div
              className="overflow-y-auto px-3 pt-1"
              role="menu"
              aria-labelledby={titleId}
              style={{ paddingBottom: "max(env(safe-area-inset-bottom), 14px)" }}
            >
              {items.map((item, i) => {
                const ariaLabel = [item.label, item.labelAr].filter(Boolean).join(" · ");
                return (
                  <button
                    key={i}
                    role="menuitem"
                    aria-label={ariaLabel}
                    onClick={() => { haptic(8); item.onClick(); close(); }}
                    className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left btn-press"
                    style={{
                      color: item.danger ? "var(--error)" : "var(--navy)",
                    }}
                  >
                    <span
                      className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
                      aria-hidden="true"
                      style={{
                        background: item.danger ? "rgba(220,53,69,0.10)" : "var(--off-white)",
                        color: item.danger ? "var(--error)" : "var(--teal-deep)",
                      }}
                    >
                      {item.icon}
                    </span>
                    <span className="flex-1 min-w-0">
                      {showEn && (
                        <span className="block text-[13.5px] font-semibold truncate" style={{ fontFamily: "'DM Sans'" }}>
                          {item.label}
                        </span>
                      )}
                      {showAr && item.labelAr && (
                        <span className="block font-arabic text-[11px] truncate" dir="rtl" style={{ color: "var(--gray)" }}>
                          {item.labelAr}
                        </span>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};

export { Copy, Share2, Download, Trash2, RefreshCw, FileText, Bell, Settings, HelpCircle };
export default HeaderMenu;
