/**
 * News & Articles page — admin-managed content rendered as a browsable
 * archive with individual article cards and detail view.
 *
 * Routing:
 *   /news           → list view (English by default)
 *   /news/:slug     → single article with full SEO scaffolding
 *   /ar/news...     → Arabic mirror (hreflang paired)
 */
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ArrowLeft, ArrowRight, Calendar, Clock, Search, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import RufayQLogo from "@/components/RufayQLogo";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { SeoLazy } from "@/seo/SeoLazy";
import { SITE_ORIGIN } from "@/seo/routes";
import {
  ArticleMeta,
  estimateReadingTime,
  extractMeta,
  resolveAuthor,
  resolveSlug,
} from "@/lib/articleMeta";

const BG_DARK = "#06101A";
const BG_DARK_2 = "#0B1A28";
const BORDER = "rgba(197,150,90,0.12)";
const TEXT = "#E8ECF0";
const TEXT_MUTED = "rgba(232,236,240,0.55)";
const GOLD = "#C5965A";

interface Article {
  slug: string;
  title: string;
  body: string;
  excerpt: string;
  meta: ArticleMeta;
  readingTime: number;
}

/** Split markdown into articles by top-level `## Heading` blocks + parse meta. */
const parseArticles = (md: string): Article[] => {
  if (!md.trim()) return [];
  const lines = md.split("\n");
  const articles: Article[] = [];
  let current: { title: string; lines: string[] } | null = null;
  const flush = () => {
    if (!current) return;
    const rawBody = current.lines.join("\n").trim();
    const { meta, body } = extractMeta(rawBody);
    articles.push({
      slug: resolveSlug(current.title, meta),
      title: current.title,
      body,
      excerpt: meta.description?.trim() || extractExcerpt(body),
      meta,
      readingTime: meta.readingTime || estimateReadingTime(body),
    });
  };
  for (const line of lines) {
    const m = line.match(/^##\s+(.+?)\s*$/);
    if (m) {
      flush();
      current = { title: m[1], lines: [] };
    } else if (current) {
      current.lines.push(line);
    }
  }
  flush();
  if (articles.length === 0 && md.trim()) {
    const { meta, body } = extractMeta(md);
    articles.push({
      slug: meta.slug || "latest",
      title: "Latest Update",
      body,
      excerpt: meta.description || extractExcerpt(body),
      meta,
      readingTime: meta.readingTime || estimateReadingTime(body),
    });
  }
  return articles;
};

const extractExcerpt = (body: string): string => {
  const firstPara = body.split(/\n\s*\n/).find((p) => p.trim() && !p.startsWith("#"));
  if (!firstPara) return "";
  return firstPara
    .replace(/!\[[^\]]*\]\([^)]+\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[*_`>#-]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 200);
};

const News = () => {
  const navigate = useNavigate();
  const { slug } = useParams<{ slug?: string }>();
  const { mode } = useLanguage();
  const isAr = mode === "ar";

  const [bodyEn, setBodyEn] = useState("");
  const [bodyAr, setBodyAr] = useState("");
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("site_pages")
        .select("body_md, body_md_ar, updated_at")
        .eq("slug", "landing-news")
        .maybeSingle();
      if (cancelled) return;
      if (data) {
        setBodyEn(data.body_md || "");
        setBodyAr((data as { body_md_ar?: string }).body_md_ar || "");
        setUpdatedAt(data.updated_at);
      }
      setLoaded(true);
    })();
    return () => { cancelled = true; };
  }, []);

  const articlesEn = useMemo(() => parseArticles(bodyEn), [bodyEn]);
  const articlesAr = useMemo(() => parseArticles(bodyAr), [bodyAr]);
  const articles = isAr ? articlesAr : articlesEn;

  const filtered = useMemo(() => {
    if (!query.trim()) return articles;
    const q = query.toLowerCase();
    return articles.filter(
      (a) => a.title.toLowerCase().includes(q) || a.body.toLowerCase().includes(q),
    );
  }, [articles, query]);

  const article = slug ? articles.find((a) => a.slug === slug) : null;
  /** Pair article: same slug in the other language (for hreflang). */
  const pairArticle = useMemo(() => {
    if (!article) return null;
    const other = isAr ? articlesEn : articlesAr;
    return other.find((a) => a.slug === article.slug) || null;
  }, [article, isAr, articlesEn, articlesAr]);

  const newsRoot = isAr ? "/ar/news" : "/news";
  const homeRoot = isAr ? "/ar" : "/";
  const formattedUpdated = updatedAt
    ? new Date(updatedAt).toLocaleDateString(isAr ? "ar-SA" : "en-US", {
        year: "numeric", month: "long", day: "numeric",
      })
    : "";
  const formattedPublished = article?.meta.publishedAt
    ? new Date(article.meta.publishedAt).toLocaleDateString(isAr ? "ar-SA" : "en-US", {
        year: "numeric", month: "long", day: "numeric",
      })
    : formattedUpdated;

  // ---------- SEO inputs (per-article when on detail) ----------
  const seoTitle = article
    ? article.title
    : isAr ? "الأخبار والمقالات — رُفَيِّق" : "News & Articles — RufayQ";
  const seoDesc = article?.excerpt
    || (isAr
      ? "آخر الأخبار والمقالات من رُفَيِّق — رفيقك الطبي ثنائي اللغة."
      : "Latest news and articles from RufayQ — your bilingual AI medical companion.");
  const canonicalPath = article ? `${newsRoot}/${article.slug}` : newsRoot;
  const seoImage = article?.meta.image || "/og-image.jpg";

  /** JSON-LD: Article + BreadcrumbList when on detail page. */
  const jsonLd = useMemo(() => {
    if (!article) {
      return {
        "@context": "https://schema.org",
        "@type": "Blog",
        name: seoTitle,
        url: `${SITE_ORIGIN}${canonicalPath}`,
        inLanguage: isAr ? "ar-SA" : "en-SA",
        publisher: { "@type": "Organization", name: "RufayQ", url: SITE_ORIGIN },
      };
    }
    const articleLd: Record<string, unknown> = {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: article.title,
      description: article.excerpt,
      inLanguage: isAr ? "ar-SA" : "en-SA",
      url: `${SITE_ORIGIN}${canonicalPath}`,
      mainEntityOfPage: `${SITE_ORIGIN}${canonicalPath}`,
      image: seoImage.startsWith("http") ? seoImage : `${SITE_ORIGIN}${seoImage}`,
      author: {
        "@type": "Person",
        name: resolveAuthor(article.meta.author, isAr ? "ar" : "en"),
      },
      publisher: {
        "@type": "Organization",
        name: "RufayQ",
        url: SITE_ORIGIN,
        logo: { "@type": "ImageObject", url: `${SITE_ORIGIN}/og-image.jpg` },
      },
      datePublished: article.meta.publishedAt || updatedAt || undefined,
      dateModified: updatedAt || article.meta.publishedAt || undefined,
      keywords: article.meta.keywords,
    };
    const breadcrumbLd = {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: isAr ? "الرئيسية" : "Home", item: `${SITE_ORIGIN}${homeRoot}` },
        { "@type": "ListItem", position: 2, name: isAr ? "الأخبار" : "News", item: `${SITE_ORIGIN}${newsRoot}` },
        { "@type": "ListItem", position: 3, name: article.title, item: `${SITE_ORIGIN}${canonicalPath}` },
      ],
    };
    return [articleLd, breadcrumbLd];
  }, [article, canonicalPath, homeRoot, isAr, newsRoot, seoImage, seoTitle, updatedAt]);

  return (
    <>
      <SeoLazy
        title={seoTitle}
        description={seoDesc}
        image={seoImage}
        canonical={canonicalPath}
        type={article ? "article" : "website"}
        jsonLd={jsonLd}
      />
      <div className="min-h-screen" style={{ background: BG_DARK, color: TEXT, fontFamily: "'DM Sans', system-ui" }} dir={isAr ? "rtl" : "ltr"}>
        {/* NAV */}
        <nav className="sticky top-0 z-50 backdrop-blur-xl" style={{ background: "rgba(6,16,26,0.75)", borderBottom: `1px solid ${BORDER}` }}>
          <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
            <Link to={homeRoot} className="flex items-center gap-2.5">
              <RufayQLogo size={28} variant="light" />
              <span className="font-display text-lg tracking-tight">
                <span style={{ color: TEXT }}>Rufay</span>
                <span className="font-bold" style={{ color: GOLD }}>Q</span>
              </span>
            </Link>
            <div className="flex items-center gap-3">
              <LanguageSwitcher compact />
              <Link to={homeRoot} className="text-[12px] font-medium hidden md:inline" style={{ color: TEXT_MUTED }}>
                {isAr ? "← العودة للرئيسية" : "← Back to home"}
              </Link>
            </div>
          </div>
        </nav>

        {/* DETAIL VIEW */}
        {article ? (
          <article className="max-w-3xl mx-auto px-6 py-12 md:py-16">
            {/* Breadcrumbs (visual) */}
            <nav aria-label="Breadcrumb" className="mb-8">
              <ol className="flex flex-wrap items-center gap-2 text-[11px]" style={{ color: TEXT_MUTED }}>
                <li><Link to={homeRoot} className="hover:underline">{isAr ? "الرئيسية" : "Home"}</Link></li>
                <li aria-hidden>/</li>
                <li><Link to={newsRoot} className="hover:underline">{isAr ? "الأخبار" : "News"}</Link></li>
                <li aria-hidden>/</li>
                <li className="truncate max-w-[260px]" style={{ color: TEXT }}>{article.title}</li>
              </ol>
            </nav>

            <button
              onClick={() => navigate(newsRoot)}
              className="inline-flex items-center gap-2 text-[12px] font-medium mb-8 transition-colors hover:text-white"
              style={{ color: TEXT_MUTED }}
            >
              {isAr ? <ArrowRight size={14} /> : <ArrowLeft size={14} />}
              {isAr ? "كل الأخبار" : "All articles"}
            </button>

            <p className="font-mono text-[10px] tracking-[0.3em] mb-3" style={{ color: GOLD }}>
              {isAr ? "الأخبار والمقالات" : "NEWS & ARTICLE"}
            </p>
            <h1 className="font-display text-3xl md:text-5xl tracking-tight mb-6 leading-tight" style={{ color: TEXT, fontWeight: 300 }}>
              {article.title}
            </h1>

            {/* Byline + meta */}
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs mb-10" style={{ color: TEXT_MUTED }}>
              {article.meta.author && (
                <span className="flex items-center gap-1.5"><User size={12} />{resolveAuthor(article.meta.author, isAr ? "ar" : "en")}</span>
              )}
              {formattedPublished && (
                <span className="flex items-center gap-1.5"><Calendar size={12} />{formattedPublished}</span>
              )}
              <span className="flex items-center gap-1.5">
                <Clock size={12} />
                {isAr ? `${article.readingTime} دقيقة قراءة` : `${article.readingTime} min read`}
              </span>
              {pairArticle && (
                <Link
                  to={`${isAr ? "/news" : "/ar/news"}/${pairArticle.slug}`}
                  className="hover:underline"
                  style={{ color: GOLD }}
                >
                  {isAr ? "Read in English →" : "اقرأ بالعربية →"}
                </Link>
              )}
            </div>

            <div
              className="prose prose-invert max-w-none"
              style={{
                // @ts-expect-error CSS vars
                "--tw-prose-body": TEXT,
                "--tw-prose-headings": TEXT,
                "--tw-prose-links": GOLD,
                "--tw-prose-bold": TEXT,
                "--tw-prose-bullets": GOLD,
                color: TEXT,
              }}
            >
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{article.body}</ReactMarkdown>
            </div>
          </article>
        ) : (
          <>
            {/* HEADER */}
            <header className="max-w-5xl mx-auto px-6 pt-16 pb-10 text-center">
              <p className="font-mono text-[10px] tracking-[0.3em] mb-4" style={{ color: GOLD }}>
                {isAr ? "الأخبار والمقالات" : "NEWS & ARTICLES"}
              </p>
              <h1 className="font-display text-4xl md:text-6xl tracking-tight mb-5" style={{ color: TEXT, fontWeight: 300 }}>
                {isAr ? "آخر التحديثات" : "Latest from RufayQ"}
              </h1>
              <p className="text-base max-w-xl mx-auto" style={{ color: TEXT_MUTED }}>
                {isAr
                  ? "قصص، أدلة، وتحديثات للمرضى المسافرين للعلاج."
                  : "Stories, guides, and updates for patients travelling for treatment."}
              </p>

              {articles.length > 0 && (
                <div className="max-w-md mx-auto mt-8 relative">
                  <Search size={14} className="absolute top-1/2 -translate-y-1/2" style={{ color: TEXT_MUTED, [isAr ? "right" : "left"]: 14 }} />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={isAr ? "ابحث في المقالات…" : "Search articles…"}
                    className="w-full py-3 rounded-full text-sm outline-none focus:ring-2"
                    style={{
                      background: BG_DARK_2,
                      border: `1px solid ${BORDER}`,
                      color: TEXT,
                      paddingInlineStart: 40,
                      paddingInlineEnd: 16,
                    }}
                  />
                </div>
              )}
            </header>

            {/* ARTICLE GRID */}
            <main className="max-w-5xl mx-auto px-6 pb-24">
              {!loaded ? (
                <div className="grid md:grid-cols-2 gap-5">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="rounded-2xl p-7" style={{ background: BG_DARK_2, border: `1px solid ${BORDER}`, minHeight: 200 }}>
                      <div className="h-4 w-1/3 mb-4 rounded" style={{ background: "rgba(255,255,255,0.05)" }} />
                      <div className="h-6 w-3/4 mb-3 rounded" style={{ background: "rgba(255,255,255,0.07)" }} />
                      <div className="h-3 w-full rounded" style={{ background: "rgba(255,255,255,0.04)" }} />
                    </div>
                  ))}
                </div>
              ) : filtered.length === 0 ? (
                <div className="text-center py-20">
                  <p className="text-base" style={{ color: TEXT_MUTED }}>
                    {query
                      ? (isAr ? "لا نتائج للبحث." : "No articles match your search.")
                      : (isAr ? "لا توجد مقالات بعد. ترقّبوا التحديثات قريباً." : "No articles yet — check back soon.")}
                  </p>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 gap-5">
                  {filtered.map((a, i) => (
                    <Link
                      key={a.slug}
                      to={`${newsRoot}/${a.slug}`}
                      className="group rounded-2xl p-7 transition-all hover:-translate-y-1 hover:shadow-2xl flex flex-col"
                      style={{ background: BG_DARK_2, border: `1px solid ${BORDER}` }}
                    >
                      <p className="font-mono text-[10px] tracking-widest mb-3" style={{ color: GOLD }}>
                        {String(i + 1).padStart(2, "0")} · {isAr ? "مقال" : "ARTICLE"}
                        <span className="opacity-60"> · {a.readingTime} {isAr ? "د" : "min"}</span>
                      </p>
                      <h2 className="font-display text-xl md:text-2xl mb-3 tracking-tight transition-colors group-hover:text-white" style={{ color: TEXT, fontWeight: 400 }}>
                        {a.title}
                      </h2>
                      <p className="text-sm leading-relaxed mb-5 flex-1" style={{ color: TEXT_MUTED }}>
                        {a.excerpt || (isAr ? "اقرأ المزيد…" : "Read more…")}
                      </p>
                      <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold" style={{ color: GOLD }}>
                        {isAr ? "اقرأ المقال" : "Read article"}
                        {isAr ? <ArrowLeft size={13} /> : <ArrowRight size={13} />}
                      </span>
                    </Link>
                  ))}
                </div>
              )}

              {formattedUpdated && articles.length > 0 && (
                <p className="text-center text-[11px] mt-12 font-mono tracking-wider" style={{ color: TEXT_MUTED }}>
                  {isAr ? `آخر تحديث · ${formattedUpdated}` : `Last updated · ${formattedUpdated}`}
                </p>
              )}
            </main>
          </>
        )}

        {/* FOOTER */}
        <footer className="border-t" style={{ borderColor: BORDER, background: BG_DARK_2 }}>
          <div className="max-w-5xl mx-auto px-6 py-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-[11px] font-mono" style={{ color: TEXT_MUTED }}>
              © {new Date().getFullYear()} RufayQ
            </p>
            <Link to={homeRoot} className="text-[12px] font-semibold" style={{ color: GOLD }}>
              {isAr ? "العودة إلى rufayq.com →" : "← Back to rufayq.com"}
            </Link>
          </div>
        </footer>
      </div>
    </>
  );
};

export default News;
