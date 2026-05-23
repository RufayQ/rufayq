import { ReactNode, useCallback, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useBodyScrollLock, useOverlayBack } from "./useOverlayBack";
import { useBackHandler } from "@/hooks/useBackHandler";

export type OverlayLayerType = "picker" | "sheet" | "preview" | "scanner";

interface Props {
  open: boolean;
  onClose: () => void;
  /** Layer determines z-index via canonical CSS tokens. */
  layer?: OverlayLayerType;
  /** Click-on-backdrop closes the overlay. Default true. */
  closeOnBackdrop?: boolean;
  /** Accessible label for the dialog region. */
  ariaLabel?: string;
  /** Backdrop styling override (defaults to dark scrim). */
  backdropClassName?: string;
  /** Content container className. Defaults to full viewport. */
  className?: string;
  children: ReactNode;
}

const Z_VAR: Record<OverlayLayerType, string> = {
  picker: "var(--z-overlay-picker)",
  sheet: "var(--z-overlay-sheet)",
  preview: "var(--z-overlay-preview)",
  scanner: "var(--z-overlay-scanner)",
};

/**
 * Canonical overlay primitive.
 *
 * Single source of truth for:
 *   - Portal mount to document.body (escapes parent transforms/overflow)
 *   - Standard z-index layering via CSS tokens
 *   - Body-scroll lock
 *   - Back-button / Escape close
 *   - Focus trap with focus-restore on close
 *
 * All preview/picker/sheet overlays in the app MUST use this component.
 * Section-local `fixed inset-0` + `createPortal` modals are forbidden.
 */
export default function OverlayLayer({
  open,
  onClose,
  layer = "sheet",
  closeOnBackdrop = true,
  ariaLabel,
  backdropClassName,
  className,
  children,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const openerRef = useRef<HTMLElement | null>(null);

  useBodyScrollLock(open);
  useOverlayBack(open, onClose);

  // Also register in the global LIFO back-handler stack so the native Android
  // hardware back button (which doesn't emit `popstate`) pops THIS overlay
  // first instead of falling through to the parent screen's handler. On web
  // this is a harmless second close — onClose is idempotent in practice.
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);
  const backHandler = useCallback(() => {
    onCloseRef.current();
    return true;
  }, []);
  useBackHandler(backHandler, open, `overlay:${layer}${ariaLabel ? `:${ariaLabel}` : ""}`);

  // Capture the element that opened us, restore focus on close.
  useEffect(() => {
    if (!open) return;
    openerRef.current = (document.activeElement as HTMLElement) ?? null;
    // Focus first focusable inside the overlay (or the container itself).
    const node = containerRef.current;
    if (node) {
      const focusable = node.querySelector<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      (focusable ?? node).focus();
    }
    return () => {
      try { openerRef.current?.focus(); } catch { /* noop */ }
    };
  }, [open]);

  // Simple focus trap.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const node = containerRef.current;
      if (!node) return;
      const items = Array.from(
        node.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
      ).filter((el) => !el.hasAttribute("disabled"));
      if (items.length === 0) { e.preventDefault(); return; }
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (e.shiftKey && active === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && active === last) { e.preventDefault(); first.focus(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel}
      ref={containerRef}
      tabIndex={-1}
      className={`fixed inset-0 outline-none ${className ?? ""}`}
      style={{ zIndex: Z_VAR[layer] }}
      data-overlay-layer={layer}
    >
      <div
        aria-hidden="true"
        onClick={closeOnBackdrop ? onClose : undefined}
        className={`absolute inset-0 ${backdropClassName ?? "bg-black/70"}`}
      />
      <div className="relative h-full w-full">{children}</div>
    </div>,
    document.body
  );
}
