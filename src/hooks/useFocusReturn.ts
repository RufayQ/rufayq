import { useCallback, useEffect, useRef, type DependencyList } from "react";

/**
 * Restores keyboard focus to a previously-tapped row when the user returns
 * to a list view (e.g. back from a conversation or profile screen).
 *
 * Usage:
 *   const { containerRef, remember } = useFocusReturn("chat-inbox", [loading, items.length]);
 *   <div ref={containerRef}>
 *     {items.map(it => (
 *       <button
 *         data-focus-key={it.id}
 *         onClick={() => { remember(it.id); navigate(it); }}
 *       />
 *     ))}
 *   </div>
 *
 * Focus key is persisted in sessionStorage so it survives full re-mounts
 * (the chat inbox unmounts when a thread/profile screen takes over). After
 * the matching element is focused once, the key is cleared so navigating
 * around elsewhere doesn't keep yanking focus on every mount.
 *
 * `group` namespaces keys so multiple lists on different screens don't
 * collide. `deps` should change when the list finishes loading or its
 * rows mount — typically `[loading, items.length]`.
 */
export function useFocusReturn<T extends HTMLElement = HTMLDivElement>(
  group: string,
  deps: DependencyList,
) {
  const containerRef = useRef<T | null>(null);
  const restoredRef = useRef(false);
  const storageKey = `focus-return:${group}`;

  const remember = useCallback(
    (key: string) => {
      try {
        sessionStorage.setItem(storageKey, key);
      } catch {
        /* private mode or quota — best-effort only */
      }
    },
    [storageKey],
  );

  useEffect(() => {
    if (restoredRef.current) return;
    let saved: string | null = null;
    try {
      saved = sessionStorage.getItem(storageKey);
    } catch {
      return;
    }
    if (!saved || !containerRef.current) return;

    // CSS.escape may be missing in very old test envs; fall back to a basic escape.
    const escaped =
      typeof CSS !== "undefined" && typeof CSS.escape === "function"
        ? CSS.escape(saved)
        : saved.replace(/["\\]/g, "\\$&");

    const el = containerRef.current.querySelector<HTMLElement>(
      `[data-focus-key="${escaped}"]`,
    );
    if (!el) return;

    // Defer one frame so layout settles after async data fetches.
    const raf = requestAnimationFrame(() => {
      try {
        el.focus({ preventScroll: false });
        el.scrollIntoView({ block: "nearest" });
      } catch {
        /* element may have been removed in the same frame */
      }
    });
    restoredRef.current = true;
    try {
      sessionStorage.removeItem(storageKey);
    } catch {
      /* ignore */
    }
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { containerRef, remember };
}
