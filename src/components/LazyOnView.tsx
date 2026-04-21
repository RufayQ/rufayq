import { forwardRef, ReactNode, Ref, Suspense, useEffect, useImperativeHandle, useRef, useState } from "react";

interface LazyOnViewProps {
  children: ReactNode;
  fallback?: ReactNode;
  /** Root margin for IntersectionObserver — start loading before fully in view. */
  rootMargin?: string;
  /** Min height reserved while not yet loaded — prevents layout shift (CLS). */
  minHeight?: number | string;
}

/**
 * Renders children only after the placeholder scrolls near the viewport.
 * Combine with React.lazy() so the chunk + render are both deferred,
 * cutting initial JS evaluation cost on the Landing page.
 *
 * forwardRef so parents (Helmet, Suspense, motion) that probe for refs
 * don't warn about "Function components cannot be given refs".
 */
const LazyOnView = forwardRef<HTMLDivElement, LazyOnViewProps>(({
  children,
  fallback = null,
  rootMargin = "300px",
  minHeight = 200,
}, forwardedRef) => {
  const ref = useRef<HTMLDivElement>(null);
  useImperativeHandle(forwardedRef, () => ref.current as HTMLDivElement);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (visible) return;
    const node = ref.current;
    if (!node) return;
    if (typeof IntersectionObserver === "undefined") {
      // SSR / very old browsers: render immediately.
      setVisible(true);
      return;
    }
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { rootMargin },
    );
    obs.observe(node);
    return () => obs.disconnect();
  }, [visible, rootMargin]);

  return (
    <div ref={ref} style={!visible ? { minHeight } : undefined}>
      {visible ? <Suspense fallback={fallback}>{children}</Suspense> : fallback}
    </div>
  );
});

LazyOnView.displayName = "LazyOnView";

export default LazyOnView;
