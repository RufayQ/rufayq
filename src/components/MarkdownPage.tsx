import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { supabase } from "@/integrations/supabase/client";
import RufayQLogo from "@/components/RufayQLogo";

interface MarkdownPageProps {
  slug: string;
  defaultTitle: string;
  defaultTitleAr: string;
  fallback: ReactNode;
  otherLink: { to: string; label: string };
}

type Mode = "en" | "ar" | "both";

const MarkdownPage = ({ slug, defaultTitle, defaultTitleAr, fallback, otherLink }: MarkdownPageProps) => {
  const BG = "#06101A", BG2 = "#0B1A28", BORDER = "rgba(197,150,90,0.12)";
  const TEXT = "#E8ECF0", MUTED = "rgba(232,236,240,0.6)", GOLD = "#C5965A";

  const [bodyEn, setBodyEn] = useState<string>("");
  const [bodyAr, setBodyAr] = useState<string>("");
  const [title, setTitle] = useState(defaultTitle);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [mode, setMode] = useState<Mode>(() => (localStorage.getItem("rufayq_lang_mode") as Mode) || "both");

  useEffect(() => { localStorage.setItem("rufayq_lang_mode", mode); }, [mode]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("site_pages")
        .select("title, body_md, body_md_ar, updated_at")
        .eq("slug", slug)
        .maybeSingle();
      if (data) {
        setBodyEn(data.body_md || "");
        setBodyAr((data as any).body_md_ar || "");
        setTitle(data.title || defaultTitle);
        setUpdatedAt(data.updated_at);
      }
      setLoaded(true);
    })();
  }, [slug, defaultTitle]);

  const hasEn = bodyEn.trim().length > 30;
  const hasAr = bodyAr.trim().length > 30;
  const hasAny = hasEn || hasAr;

  const showEn = (mode === "en" || mode === "both") && hasEn;
  const showAr = (mode === "ar" || mode === "both") && hasAr;

  return (
    <div className="min-h-screen" style={{ background: BG, color: TEXT, fontFamily: "'DM Sans', system-ui" }}>
      <nav className="sticky top-0 z-50 backdrop-blur-xl" style={{ background: "rgba(6,16,26,0.85)", borderBottom: `1px solid ${BORDER}` }}>
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between gap-3">
          <Link to={mode === "ar" ? "/ar" : "/"} className="flex items-center gap-2.5">
            <ArrowLeft size={16} color={TEXT} />
            <RufayQLogo size={28} variant="light" />
            <span className="font-display text-lg"><span style={{ color: TEXT }}>Rufay</span><span className="font-bold" style={{ color: GOLD }}>Q</span></span>
          </Link>
          <div className="flex items-center gap-3">
            <div className="flex rounded-full p-0.5" style={{ background: BG2, border: `1px solid ${BORDER}` }}>
              {(["en","ar","both"] as Mode[]).map(m => (
                <button key={m} onClick={() => setMode(m)}
                  className="px-3 py-1 rounded-full text-[10px] font-semibold uppercase transition-all"
                  style={{
                    background: mode === m ? GOLD : "transparent",
                    color: mode === m ? "#06101A" : MUTED,
                  }}>
                  {m === "both" ? "EN/AR" : m}
                </button>
              ))}
            </div>
            <Link to={otherLink.to} className="text-xs hidden sm:block" style={{ color: MUTED }}>{otherLink.label}</Link>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-16">
        <p className="font-mono text-[10px] tracking-[0.3em] mb-3" style={{ color: GOLD }}>LEGAL · قانوني</p>
        {(mode === "en" || mode === "both") && (
          <h1 className="font-display text-4xl md:text-5xl mb-3 tracking-tight" style={{ fontWeight: 300 }}>{title}</h1>
        )}
        {(mode === "ar" || mode === "both") && (
          <p className="font-arabic text-lg mb-2" dir="rtl" style={{ color: GOLD }}>{defaultTitleAr}</p>
        )}
        {updatedAt && (
          <p className="text-sm mb-12" style={{ color: MUTED }}>
            Last updated: {new Date(updatedAt).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}
          </p>
        )}

        {!loaded ? (
          <p className="text-sm" style={{ color: MUTED }}>Loading…</p>
        ) : hasAny ? (
          <div className={`${mode === "both" && hasEn && hasAr ? "grid md:grid-cols-2 gap-6" : ""}`}>
            {showEn && (
              <article
                className="prose prose-invert max-w-none rounded-2xl p-8"
                style={{
                  background: BG2, border: `1px solid ${BORDER}`,
                  // @ts-expect-error CSS vars
                  "--tw-prose-body": TEXT, "--tw-prose-headings": TEXT, "--tw-prose-links": GOLD,
                  "--tw-prose-bold": TEXT, "--tw-prose-bullets": GOLD, color: TEXT,
                }}
              >
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{bodyEn}</ReactMarkdown>
              </article>
            )}
            {showAr && (
              <article
                dir="rtl"
                className="prose prose-invert max-w-none rounded-2xl p-8 font-arabic"
                style={{
                  background: BG2, border: `1px solid ${BORDER}`,
                  // @ts-expect-error CSS vars
                  "--tw-prose-body": TEXT, "--tw-prose-headings": TEXT, "--tw-prose-links": GOLD,
                  "--tw-prose-bold": TEXT, "--tw-prose-bullets": GOLD, color: TEXT,
                }}
              >
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{bodyAr}</ReactMarkdown>
              </article>
            )}
            {!showEn && !showAr && (
              <p className="text-sm" style={{ color: MUTED }}>
                Content not available in selected language. Try switching to EN/AR.
              </p>
            )}
          </div>
        ) : (
          fallback
        )}

        <p className="text-center text-xs mt-12" style={{ color: MUTED }}>
          © 2026 RufayQ · <Link to={mode === "ar" ? "/ar" : "/"} style={{ color: GOLD }}>Back to home</Link>
        </p>
      </main>
    </div>
  );
};

export default MarkdownPage;
