import { Seo } from "./Seo";

/**
 * Previously lazy-loaded react-helmet-async to defer ~17 kB.
 * Switched to a direct re-export to avoid stale-chunk "Failed to fetch
 * dynamically imported module" errors after HMR / redeploys. The cost is
 * negligible compared to the blank-screen risk.
 */
export const SeoLazy = Seo;
