/**
 * News & Articles page — admin-managed content rendered as a browsable
 * archive with individual article cards and detail view.
 *
 * Source: site_pages row with slug="landing-news". The markdown body is
 * split into articles by top-level "## " headings — each becomes a card.
 *
 * Routing:
 *   /news           → list view (English by default)
 *   /news/:slug     → single article
 *   /ar/news...     → Arabic mirror
 *
 * Admins edit the same `landing-news` row in the existing AdminPages screen.
 */
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ArrowLeft, ArrowRight, Calendar, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import RufayQLogo from "@/components/RufayQLogo";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { SeoLazy } from "@/seo/SeoLazy";

// Theme tokens (kept in sync with Landing for visual continuity)
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
  /** First paragraph used as the card excerpt. */
  excerpt: string;
}

/** Convert "Some Title 123!" → "some-title-123". */
const slugify = (s: string) =>
  s.toLowerCase().trim()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "article";

/** Split markdown into articles by top-level `## Heading` blocks. */
const parseArticles = (md: string): Article[] => {
  if (!md.trim()) return [];
  const lines = md.split("\n");
  const articles: Article[] = [];
  let current: { title: string; lines: string[] } | null = null;
  for (const line of lines) {
    const m = line.match(/^##\s+(.+?)\s*$/);
    if (m) {
      if (current) {
        const body = current.lines.join("\n").trim();
        articles.push({
          slug: slugify(current.title),
          title: current.title,
          body,
          excerpt: extractExcerpt(body),
        });
      }
      current = { title: m[1], lines: [] };
    } else if (current) {
      current.lines.push(line);
    }
  }
  if (current) {
    const body = current.lines.join("\n").trim();
    articles.push({
      slug: slugify(current.title),
      title: current.title,
      body,
      excerpt: extractExcerpt(body),
    });
  }
  // Fallback: no `## ` headings → wrap everything as a single article.
  if (articles.length === 0 && md.trim()) {
    articles.push({
      slug: "latest",
      title: "Latest Update",
      body: md,
      excerpt: extractExcerpt(md),
    });
  }
  return articles;
};

const extractExcerpt = (body: string): string => {
  const firstPara = body.split(/\n\s*\n/).find((p) => p.trim() && !p.startsWith("#"));
  if (!firstPara) return "";
  // Strip basic markdown for the excerpt
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

  const articles = useMemo(
    () => parseArticles(isAr ? bodyAr : bodyEn),
    [isAr, bodyEn, bodyAr],
  );

  const filtered = useMemo(() => {
    if (!query.trim()) return articles;
    const q = query.toLowerCase();
    return articles.filter(
      (a) => a.title.toLowerCase().includes(q) || a.body.toLowerCase().includes(q),
    );
  }, [articles, query]);

  const article = slug ? articles.find((a) => a.slug === slug) : null;
  const newsRoot = isAr ? "/ar/news" : "/news";
  const homeRoot = isAr ? "/ar" : "/";
  const formattedDate = updatedAt
    ? new Date(updatedAt).toLocaleDateString(isAr ? "ar-SA" : "en-US", {
        year: "numeric", month: "long", day: "numeric",
      })
    : "";

  return (
    <>
      <SeoLazy
        title={
          article
            ? `${article.title} — RufayQ News`
            : isAr ? "الأخبار والمقالات — رُفَيِّق" : "News & Articles — RufayQ"
        }
        description={
          article?.excerpt ||
          (isAr
            ? "آخر الأخبار والمقالات من رُفَيِّق — رفيقك الطبي ثنائي اللغة."
            : "Latest news and articles from RufayQ — your bilingual AI medical companion.")
        }
      />
      <div className="min-h-screen" style={{ background: BG_DARK, color: TEXT, fontFamily: "'DM Sans', system-ui" }} dir={isAr ? "rtl" : "ltr"}>
        {/* NAV (slim) */}
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
            {formattedDate && (
              <p className="text-xs mb-10 flex items-center gap-2" style={{ color: TEXT_MUTED }}>
                <Calendar size={12} />
                {isAr ? `آخر تحديث: ${formattedDate}` : `Updated: ${formattedDate}`}
              </p>
            )}
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

              {formattedDate && articles.length > 0 && (
                <p className="text-center text-[11px] mt-12 font-mono tracking-wider" style={{ color: TEXT_MUTED }}>
                  {isAr ? `آخر تحديث · ${formattedDate}` : `Last updated · ${formattedDate}`}
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
