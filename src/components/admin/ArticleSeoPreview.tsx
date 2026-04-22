/**
 * ArticleSeoPreview — admin-side preview of the exact head tags + JSON-LD that
 * will render on /news/:slug. Mirrors the logic in src/pages/News.tsx so editors
 * can verify SEO without leaving the editor.
 */
import { useMemo } from "react";
import type { ArticleMeta } from "@/lib/articleMeta";
import { SITE_ORIGIN } from "@/seo/routes";

interface Props {
  slug: string;
  titleEn: string;
  titleAr: string;
  metaEn: ArticleMeta;
  metaAr: ArticleMeta;
  excerptEn?: string;
  excerptAr?: string;
}

const Pill = ({ label, ok }: { label: string; ok: boolean }) => (
  <span
    className={`text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded ${
      ok ? "bg-emerald-500/15 text-emerald-400" : "bg-rose-500/15 text-rose-400"
    }`}
  >
    {label} {ok ? "✓" : "✗"}
  </span>
);

const Row = ({ label, value }: { label: string; value: string }) => (
  <div className="grid grid-cols-[110px_1fr] gap-3 text-[11px] py-1">
    <span className="text-slate-500 uppercase tracking-wider text-[9px] mt-0.5">{label}</span>
    <code className="text-slate-300 font-mono break-all">{value}</code>
  </div>
);

const ArticleSeoPreview = ({ slug, titleEn, titleAr, metaEn, metaAr, excerptEn, excerptAr }: Props) => {
  const enUrl = `${SITE_ORIGIN}/news/${slug}`;
  const arUrl = `${SITE_ORIGIN}/ar/news/${slug}`;
  const desc = metaEn.description?.trim() || excerptEn || "";
  const descAr = metaAr.description?.trim() || excerptAr || "";

  const jsonLd = useMemo(
    () => ({
      "@context": "https://schema.org",
      "@type": "Article",
      headline: titleEn || "Untitled",
      description: desc,
      inLanguage: "en-SA",
      url: enUrl,
      mainEntityOfPage: enUrl,
      image: metaEn.image?.startsWith("http")
        ? metaEn.image
        : `${SITE_ORIGIN}${metaEn.image || "/og-image.jpg"}`,
      author: { "@type": "Person", name: metaEn.author || "RufayQ Editorial" },
      publisher: {
        "@type": "Organization",
        name: "RufayQ",
        url: SITE_ORIGIN,
        logo: { "@type": "ImageObject", url: `${SITE_ORIGIN}/og-image.jpg` },
      },
      datePublished: metaEn.publishedAt || undefined,
      dateModified: metaEn.publishedAt || undefined,
      keywords: metaEn.keywords,
    }),
    [enUrl, titleEn, desc, metaEn],
  );

  const breadcrumbLd = useMemo(
    () => ({
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: `${SITE_ORIGIN}/` },
        { "@type": "ListItem", position: 2, name: "News", item: `${SITE_ORIGIN}/news` },
        { "@type": "ListItem", position: 3, name: titleEn || "Untitled", item: enUrl },
      ],
    }),
    [titleEn, enUrl],
  );

  const checks = {
    slug: !!slug && slug !== "article",
    titleEn: !!titleEn.trim(),
    titleAr: !!titleAr.trim(),
    descEn: desc.length >= 50 && desc.length <= 160,
    descAr: descAr.length >= 50,
    image: !!metaEn.image,
    pair: !!titleEn.trim() && !!titleAr.trim(),
  };

  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[10px] uppercase tracking-widest text-amber-400 font-semibold">
          SEO preview · /news/{slug}
        </p>
        <div className="flex flex-wrap gap-1">
          <Pill label="slug" ok={checks.slug} />
          <Pill label="EN/AR pair" ok={checks.pair} />
          <Pill label="meta" ok={checks.descEn} />
          <Pill label="OG image" ok={checks.image} />
        </div>
      </div>

      <div className="rounded-md bg-slate-900/60 p-3 border border-slate-800">
        <p className="text-[9px] uppercase tracking-wider text-slate-500 mb-1">Google preview</p>
        <p className="text-[12px] text-blue-400 truncate">{enUrl}</p>
        <p className="text-[14px] text-slate-200 leading-tight mt-0.5 line-clamp-1">
          {(titleEn || "Untitled") + " | RufayQ"}
        </p>
        <p className="text-[11px] text-slate-400 leading-snug mt-1 line-clamp-2">{desc || "(no description)"}</p>
      </div>

      <div className="rounded-md bg-slate-900/60 p-3 border border-slate-800">
        <p className="text-[9px] uppercase tracking-wider text-slate-500 mb-1">Head tags that will render</p>
        <Row label="Canonical" value={enUrl} />
        <Row label="hreflang en" value={enUrl} />
        <Row label="hreflang ar" value={arUrl} />
        <Row label="x-default" value={enUrl} />
        <Row label="og:title" value={`${titleEn || "Untitled"} | RufayQ`} />
        <Row label="og:type" value="article" />
        <Row label="og:image" value={metaEn.image || "/og-image.jpg"} />
      </div>

      <div className="rounded-md bg-slate-900/60 p-3 border border-slate-800">
        <p className="text-[9px] uppercase tracking-wider text-slate-500 mb-1">Breadcrumbs</p>
        <p className="text-[11px] text-slate-400">
          Home <span className="text-slate-600">›</span> News{" "}
          <span className="text-slate-600">›</span> <span className="text-slate-200">{titleEn || "Untitled"}</span>
        </p>
      </div>

      <details className="rounded-md bg-slate-900/60 p-3 border border-slate-800 group">
        <summary className="text-[9px] uppercase tracking-wider text-slate-500 cursor-pointer">
          JSON-LD Article schema
        </summary>
        <pre className="mt-2 text-[10px] text-slate-400 overflow-x-auto leading-relaxed">
          {JSON.stringify([jsonLd, breadcrumbLd], null, 2)}
        </pre>
      </details>
    </div>
  );
};

export default ArticleSeoPreview;
