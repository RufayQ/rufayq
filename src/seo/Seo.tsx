import { Helmet } from "react-helmet-async";
import { useLocation } from "react-router-dom";
import { absUrl, findRoutePair, SITE_ORIGIN } from "./routes";

interface SeoProps {
  /** Page title (en or ar — caller decides). Will be suffixed with " | RufayQ". */
  title: string;
  /** Meta description. */
  description: string;
  /** OG image absolute or root-relative path. Defaults to /og-image.jpg. */
  image?: string;
  /** Override canonical (defaults to current pathname under SITE_ORIGIN). */
  canonical?: string;
  /** Override language ("en" | "ar"). Defaults to detection from /ar/ prefix. */
  lang?: "en" | "ar";
  /** OpenGraph type. */
  type?: "website" | "article";
  /** JSON-LD structured data (single object or array). */
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
  /** Set to false for /admin, /provider/login, etc. */
  noindex?: boolean;
}

/**
 * Centralised SEO head — emits title, meta, canonical, hreflang pair, OG, Twitter, JSON-LD.
 * Place near the top of every page component.
 */
export const Seo = ({
  title,
  description,
  image = "/og-image.jpg",
  canonical,
  lang,
  type = "website",
  jsonLd,
  noindex = false,
}: SeoProps) => {
  const location = useLocation();
  const pair = findRoutePair(location.pathname);
  const detectedLang: "en" | "ar" = lang ?? pair?.lang ?? (location.pathname.startsWith("/ar") ? "ar" : "en");

  const canonicalUrl = canonical
    ? (canonical.startsWith("http") ? canonical : absUrl(canonical))
    : absUrl(location.pathname === "/" ? "/" : location.pathname.replace(/\/$/, ""));

  const ogImage = image.startsWith("http") ? image : `${SITE_ORIGIN}${image}`;
  const titleSuffix = " | RufayQ";
  const fullTitle = title.endsWith("RufayQ") ? title : `${title}${titleSuffix}`;
  const ldArray = Array.isArray(jsonLd) ? jsonLd : jsonLd ? [jsonLd] : [];

  return (
    <Helmet>
      <html lang={detectedLang} dir={detectedLang === "ar" ? "rtl" : "ltr"} />
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={canonicalUrl} />

      {/* hreflang pair — present on every bilingual page */}
      {pair && (
        <>
          <link rel="alternate" hrefLang="en" href={absUrl(pair.en)} />
          <link rel="alternate" hrefLang="en-SA" href={absUrl(pair.en)} />
          <link rel="alternate" hrefLang="ar" href={absUrl(pair.ar)} />
          <link rel="alternate" hrefLang="ar-SA" href={absUrl(pair.ar)} />
          <link rel="alternate" hrefLang="x-default" href={absUrl(pair.en)} />
        </>
      )}

      {noindex && <meta name="robots" content="noindex, nofollow" />}

      {/* Open Graph */}
      <meta property="og:type" content={type} />
      <meta property="og:site_name" content="RufayQ" />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:locale" content={detectedLang === "ar" ? "ar_SA" : "en_US"} />
      <meta property="og:locale:alternate" content={detectedLang === "ar" ? "en_US" : "ar_SA"} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:site" content="@RufayQ" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />

      {/* JSON-LD structured data */}
      {ldArray.map((ld, i) => (
        <script key={i} type="application/ld+json">
          {JSON.stringify(ld)}
        </script>
      ))}
    </Helmet>
  );
};
