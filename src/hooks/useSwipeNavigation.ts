import { useEffect, useRef } from "react";

type SwipeOptions = {
  /** Called when user swipes left (finger moves right→left), i.e. wants the next tab. */
  onSwipeLeft?: () => void;
  /** Called when user swipes right (finger moves left→right), i.e. wants the previous tab. */
  onSwipeRight?: () => void;
  /** Minimum horizontal distance in px to count as a swipe. */
  threshold?: number;
  /** Maximum vertical drift before the gesture is rejected as a scroll. */
  maxVertical?: number;
  /** Maximum gesture duration in ms. */
  maxDuration?: number;
  /** Whether the hook is active. */
  enabled?: boolean;
};

/**
 * Attaches passive touch listeners to `targetRef` and triggers swipe callbacks.
 * Designed for horizontal tab navigation — rejects vertical scrolls and pinches.
 * Ignores gestures that start on interactive elements (buttons, inputs, links)
 * or any element marked with `data-no-swipe` to avoid hijacking carousels,
 * sliders, sheets, and drag handles inside screens.
 */
export function useSwipeNavigation(
  targetRef: React.RefObject<HTMLElement>,
  {
    onSwipeLeft,
    onSwipeRight,
    threshold = 60,
    maxVertical = 50,
    maxDuration = 500,
    enabled = true,
  }: SwipeOptions,
) {
  const stateRef = useRef<{
    startX: number;
    startY: number;
    startT: number;
    active: boolean;
  } | null>(null);

  useEffect(() => {
    const el = targetRef.current;
    if (!el || !enabled) return;

    const shouldIgnore = (target: EventTarget | null): boolean => {
      if (!(target instanceof Element)) return false;
      // Skip interactive surfaces and anything that opts out.
      return !!target.closest(
        'button, a, input, textarea, select, [role="slider"], [role="tab"], [data-no-swipe], [data-radix-scroll-area-viewport]',
      );
    };

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) {
        stateRef.current = null;
        return;
      }
      if (shouldIgnore(e.target)) {
        stateRef.current = null;
        return;
      }
      const t = e.touches[0];
      stateRef.current = {
        startX: t.clientX,
        startY: t.clientY,
        startT: Date.now(),
        active: true,
      };
    };

    const onTouchMove = (e: TouchEvent) => {
      const s = stateRef.current;
      if (!s || !s.active) return;
      const t = e.touches[0];
      const dy = Math.abs(t.clientY - s.startY);
      if (dy > maxVertical) {
        // User is scrolling vertically — abandon.
        s.active = false;
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      const s = stateRef.current;
      stateRef.current = null;
      if (!s || !s.active) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - s.startX;
      const dy = Math.abs(t.clientY - s.startY);
      const dt = Date.now() - s.startT;
      if (dt > maxDuration) return;
      if (dy > maxVertical) return;
      if (Math.abs(dx) < threshold) return;
      if (dx < 0) onSwipeLeft?.();
      else onSwipeRight?.();
    };

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: true });
    el.addEventListener("touchend", onTouchEnd, { passive: true });
    el.addEventListener("touchcancel", () => (stateRef.current = null), { passive: true });

    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
    };
  }, [targetRef, enabled, onSwipeLeft, onSwipeRight, threshold, maxVertical, maxDuration]);
}
