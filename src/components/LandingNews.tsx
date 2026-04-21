import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";

interface Theme {
  BG_DARK: string;
  BG_DARK_2: string;
  BORDER: string;
  TEXT: string;
  TEXT_MUTED: string;
  GOLD: string;
}

/**
 * News & Articles section for the landing page.
 * Content is admin-managed via the AdminPages screen (slug = "landing-news").
 * Lazy-loaded so it never enters the LCP critical chain.
 */
const LandingNews = ({ theme }: { theme: Theme }) => {
  const { mode } = useLanguage();
  const isAr = mode === "ar";
  const isBoth = mode === "both";
  const [bodyEn, setBodyEn] = useState("");
  const [bodyAr, setBodyAr] = useState("");
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("site_pages")
        .select("body_md, body_md_ar, updated_at")
        .eq("slug", "landing-news")
        .maybeSingle();
      if (!cancelled && data) {
        setBodyEn(data.body_md || "");
        setBodyAr((data as { body_md_ar?: string }).body_md_ar || "");
        setUpdatedAt(data.updated_at);
      }
      if (!cancelled) setLoaded(true);
    })();
    return () => { cancelled = true; };
  }, []);

  if (!loaded) return <div style={{ minHeight: 200 }} />;

  const hasEn = bodyEn.trim().length > 10;
  const hasAr = bodyAr.trim().length > 10;
  if (!hasEn && !hasAr) return null;

  const showEn = (mode === "en" || isBoth) && hasEn;
  const showAr = (mode === "ar" || isBoth) && hasAr;

  return (
    <section id="news" className="lazy-section py-24 px-6" style={{ background: theme.BG_DARK }}>
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-10">
          <p className="font-mono text-[10px] tracking-[0.3em] mb-3" style={{ color: theme.GOLD }}>
            {isAr ? <span className="font-arabic" style={{ letterSpacing: 2 }}>الأخبار والمقالات</span> : "NEWS & ARTICLES"}
          </p>
          <h2 className="font-display text-3xl md:text-4xl tracking-tight" style={{ color: theme.TEXT, fontWeight: 300 }}>
            {isAr ? <span className="font-arabic">آخر التحديثات</span> : "Latest updates"}
          </h2>
          {updatedAt && (
            <p className="text-xs mt-3" style={{ color: theme.TEXT_MUTED }}>
              {isAr ? "آخر تحديث: " : "Updated: "}
              {new Date(updatedAt).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}
            </p>
          )}
        </div>

        <div className={`${isBoth && hasEn && hasAr ? "grid md:grid-cols-2 gap-5" : ""}`}>
          {showEn && (
            <article
              className="prose prose-invert max-w-none rounded-2xl p-7"
              style={{
                background: theme.BG_DARK_2,
                border: `1px solid ${theme.BORDER}`,
                // @ts-expect-error CSS vars
                "--tw-prose-body": theme.TEXT,
                "--tw-prose-headings": theme.TEXT,
                "--tw-prose-links": theme.GOLD,
                "--tw-prose-bold": theme.TEXT,
                "--tw-prose-bullets": theme.GOLD,
                color: theme.TEXT,
              }}
            >
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{bodyEn}</ReactMarkdown>
            </article>
          )}
          {showAr && (
            <article
              dir="rtl"
              className="prose prose-invert max-w-none rounded-2xl p-7 font-arabic"
              style={{
                background: theme.BG_DARK_2,
                border: `1px solid ${theme.BORDER}`,
                // @ts-expect-error CSS vars
                "--tw-prose-body": theme.TEXT,
                "--tw-prose-headings": theme.TEXT,
                "--tw-prose-links": theme.GOLD,
                "--tw-prose-bold": theme.TEXT,
                "--tw-prose-bullets": theme.GOLD,
                color: theme.TEXT,
              }}
            >
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{bodyAr}</ReactMarkdown>
            </article>
          )}
        </div>
      </div>
    </section>
  );
};

export default LandingNews;
