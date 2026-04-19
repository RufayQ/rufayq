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
  fallback: ReactNode; // rendered if DB row is empty/missing
  otherLink: { to: string; label: string };
}

const MarkdownPage = ({ slug, defaultTitle, defaultTitleAr, fallback, otherLink }: MarkdownPageProps) => {
  const BG = "#06101A", BG2 = "#0B1A28", BORDER = "rgba(197,150,90,0.12)";
  const TEXT = "#E8ECF0", MUTED = "rgba(232,236,240,0.6)", GOLD = "#C5965A";

  const [body, setBody] = useState<string | null>(null);
  const [title, setTitle] = useState(defaultTitle);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("site_pages")
        .select("title, body_md, updated_at")
        .eq("slug", slug)
        .maybeSingle();
      if (data?.body_md && data.body_md.trim().length > 30) {
        setBody(data.body_md);
        setTitle(data.title || defaultTitle);
        setUpdatedAt(data.updated_at);
      }
      setLoaded(true);
    })();
  }, [slug, defaultTitle]);

  return (
    <div className="min-h-screen" style={{ background: BG, color: TEXT, fontFamily: "'DM Sans', system-ui" }}>
      <nav className="sticky top-0 z-50 backdrop-blur-xl" style={{ background: "rgba(6,16,26,0.85)", borderBottom: `1px solid ${BORDER}` }}>
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <ArrowLeft size={16} color={TEXT} />
            <RufayQLogo size={28} variant="light" />
            <span className="font-display text-lg"><span style={{ color: TEXT }}>Rufay</span><span className="font-bold" style={{ color: GOLD }}>Q</span></span>
          </Link>
          <Link to={otherLink.to} className="text-xs" style={{ color: MUTED }}>{otherLink.label}</Link>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-16">
        <p className="font-mono text-[10px] tracking-[0.3em] mb-3" style={{ color: GOLD }}>LEGAL · قانوني</p>
        <h1 className="font-display text-4xl md:text-5xl mb-3 tracking-tight" style={{ fontWeight: 300 }}>{title}</h1>
        <p className="font-arabic text-lg mb-2" dir="rtl" style={{ color: GOLD }}>{defaultTitleAr}</p>
        {updatedAt && (
          <p className="text-sm mb-12" style={{ color: MUTED }}>
            Last updated: {new Date(updatedAt).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}
          </p>
        )}

        {!loaded ? (
          <p className="text-sm" style={{ color: MUTED }}>Loading…</p>
        ) : body ? (
          <article
            className="prose prose-invert max-w-none rounded-2xl p-8"
            style={{
              background: BG2, border: `1px solid ${BORDER}`,
              // @ts-expect-error CSS vars
              "--tw-prose-body": TEXT,
              "--tw-prose-headings": TEXT,
              "--tw-prose-links": GOLD,
              "--tw-prose-bold": TEXT,
              "--tw-prose-bullets": GOLD,
              color: TEXT,
            }}
          >
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{body}</ReactMarkdown>
          </article>
        ) : (
          fallback
        )}

        <p className="text-center text-xs mt-12" style={{ color: MUTED }}>
          © 2026 RufayQ · <Link to="/" style={{ color: GOLD }}>Back to home</Link>
        </p>
      </main>
    </div>
  );
};

export default MarkdownPage;
