import { lazy, Suspense, forwardRef, type ComponentProps } from "react";

/**
 * Defers loading of react-helmet-async (~17 kB) until after first paint.
 * Head tags are appended once the chunk arrives — Google still picks them up,
 * because Googlebot waits for JS-rendered content. FCP/LCP no longer pay the cost.
 *
 * forwardRef wrapper avoids "Function components cannot be given refs" warnings
 * when a parent forwards a ref through SeoLazy.
 */
const SeoInner = lazy(() => import("./Seo").then((m) => ({ default: m.Seo })));

type Props = ComponentProps<typeof SeoInner>;

export const SeoLazy = forwardRef<unknown, Props>((props, _ref) => (
  <Suspense fallback={null}>
    <SeoInner {...props} />
  </Suspense>
));

SeoLazy.displayName = "SeoLazy";
