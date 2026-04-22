/**
 * AdminNews — sectionized article manager backed by the same `landing-news`
 * row in `site_pages`. Articles are stored as markdown blocks separated by
 * top-level `## ` headings (matches the parser in src/pages/News.tsx), so no
 * schema change is needed and the public site keeps rendering as before.
 *
 * Admins can:
 *  - Browse all articles (EN + AR side-by-side)
 *  - Create / edit / delete individual articles
 *  - Reorder (move up / down)
 *  - Live preview a single article
 */
import { useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Save, Plus, Trash2, ChevronUp, ChevronDown, Eye, FileText, Globe } from "lucide-react";

type Lang = "en" | "ar";

interface Article {
  id: string;        // local-only id for list rendering
  titleEn: string;
  titleAr: string;
  bodyEn: string;
  bodyAr: string;
}

const SEP = "\n\n"; // blocks are separated by a blank line

const newArticle = (): Article => ({
  id: crypto.randomUUID(),
  titleEn: "Untitled article",
  titleAr: "مقال جديد",
  bodyEn: "Write your article here…",
  bodyAr: "اكتب مقالك هنا…",
});

/** Split a `## Heading\n…body…` markdown blob into Article shells. */
const parseBlocks = (md: string): Array<{ title: string; body: string }> => {
  if (!md.trim()) return [];
  const lines = md.split("\n");
  const out: Array<{ title: string; body: string }> = [];
  let cur: { title: string; body: string[] } | null = null;
  for (const line of lines) {
    const m = line.match(/^##\s+(.+?)\s*$/);
    if (m) {
      if (cur) out.push({ title: cur.title, body: cur.body.join("\n").trim() });
      cur = { title: m[1], body: [] };
    } else if (cur) {
      cur.body.push(line);
    }
  }
  if (cur) out.push({ title: cur.title, body: cur.body.join("\n").trim() });
  return out;
};

/** Zip EN + AR blocks into Article rows (pads when counts differ). */
const zipArticles = (en: string, ar: string): Article[] => {
  const eb = parseBlocks(en);
  const ab = parseBlocks(ar);
  const max = Math.max(eb.length, ab.length);
  const arr: Article[] = [];
  for (let i = 0; i < max; i++) {
    arr.push({
      id: crypto.randomUUID(),
      titleEn: eb[i]?.title || "",
      titleAr: ab[i]?.title || "",
      bodyEn: eb[i]?.body || "",
      bodyAr: ab[i]?.body || "",
    });
  }
  return arr;
};

/** Serialize Article rows back into a single markdown string per language. */
const serialize = (articles: Article[], lang: Lang): string =>
  articles
    .map((a) => {
      const t = lang === "en" ? a.titleEn : a.titleAr;
      const b = lang === "en" ? a.bodyEn : a.bodyAr;
      if (!t.trim() && !b.trim()) return "";
      return `## ${t.trim() || "Untitled"}\n\n${b.trim()}`;
    })
    .filter(Boolean)
    .join(SEP);

const AdminNews = () => {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [editLang, setEditLang] = useState<Lang>("en");
  const [previewLang, setPreviewLang] = useState<Lang | "off">("off");
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("site_pages")
      .select("body_md, body_md_ar, updated_at")
      .eq("slug", "landing-news")
      .maybeSingle();
    if (error) toast.error(error.message);
    if (data) {
      const list = zipArticles(data.body_md || "", (data as { body_md_ar?: string }).body_md_ar || "");
      setArticles(list);
      setActiveId(list[0]?.id || null);
      setUpdatedAt(data.updated_at);
    }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const active = useMemo(() => articles.find((a) => a.id === activeId), [articles, activeId]);

  const update = (patch: Partial<Article>) => {
    if (!active) return;
    setArticles((arr) => arr.map((a) => (a.id === active.id ? { ...a, ...patch } : a)));
  };

  const addArticle = () => {
    const a = newArticle();
    setArticles((arr) => [a, ...arr]);
    setActiveId(a.id);
  };

  const removeActive = async () => {
    if (!active) return;
    if (!confirm(`Delete article "${active.titleEn || active.titleAr || "Untitled"}"? This cannot be undone after saving.`)) return;
    setArticles((arr) => arr.filter((a) => a.id !== active.id));
    setActiveId((curId) => {
      const remaining = articles.filter((a) => a.id !== curId);
      return remaining[0]?.id || null;
    });
  };

  const move = (dir: -1 | 1) => {
    if (!active) return;
    setArticles((arr) => {
      const idx = arr.findIndex((a) => a.id === active.id);
      const target = idx + dir;
      if (idx < 0 || target < 0 || target >= arr.length) return arr;
      const copy = arr.slice();
      [copy[idx], copy[target]] = [copy[target], copy[idx]];
      return copy;
    });
  };

  const save = async () => {
    setSaving(true);
    const body_md = serialize(articles, "en");
    const body_md_ar = serialize(articles, "ar");
    const { error } = await supabase
      .from("site_pages")
      .update({ body_md, body_md_ar })
      .eq("slug", "landing-news");
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    await supabase.rpc("log_audit_event", {
      _action: "news_articles_saved",
      _target_type: "site_page",
      _target_id: "landing-news",
      _details: { count: articles.length },
    });
    toast.success(`Saved · ${articles.length} article${articles.length === 1 ? "" : "s"} live`);
    load();
  };

  if (loading) return <p className="text-slate-400 text-sm">Loading…</p>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-4">
      {/* SIDEBAR — article list */}
      <aside className="space-y-1">
        <div className="flex items-center justify-between mb-2 px-2">
          <p className="text-[10px] uppercase tracking-wider text-slate-500">Articles · {articles.length}</p>
          <button
            onClick={addArticle}
            className="flex items-center gap-1 text-[10px] text-amber-400 hover:text-amber-300 font-semibold"
          >
            <Plus size={11} /> New
          </button>
        </div>

        {articles.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-700 p-4 text-center">
            <p className="text-[11px] text-slate-500 mb-2">No articles yet.</p>
            <button
              onClick={addArticle}
              className="px-3 py-1.5 rounded-md bg-amber-500 text-slate-950 text-[11px] font-semibold inline-flex items-center gap-1"
            >
              <Plus size={11} /> Create first article
            </button>
          </div>
        ) : (
          articles.map((a, i) => (
            <button
              key={a.id}
              onClick={() => setActiveId(a.id)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-start gap-2 ${
                activeId === a.id ? "bg-amber-500/15 text-amber-300" : "text-slate-400 hover:bg-slate-800/50"
              }`}
            >
              <span className="font-mono text-[10px] mt-0.5 opacity-60 shrink-0">{String(i + 1).padStart(2, "0")}</span>
              <div className="flex-1 min-w-0">
                <p className="truncate text-[12px] leading-tight">{a.titleEn || "Untitled"}</p>
                <p dir="rtl" className="truncate text-[10px] opacity-70 leading-tight mt-0.5">{a.titleAr || "—"}</p>
              </div>
            </button>
          ))
        )}

        <div className="mt-4 px-2">
          <button
            onClick={save}
            disabled={saving}
            className="w-full px-3 py-2 rounded-lg bg-amber-500 text-slate-950 text-xs font-semibold flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            <Save size={12} />
            {saving ? "Publishing…" : "Publish all"}
          </button>
          {updatedAt && (
            <p className="text-[10px] text-slate-600 mt-2 text-center">
              Last published {new Date(updatedAt).toLocaleString()}
            </p>
          )}
          <p className="text-[10px] text-slate-600 mt-2 leading-relaxed">
            Articles appear at <code className="text-amber-400">/news</code> and <code className="text-amber-400">/ar/news</code>. Use both EN + AR for a complete bilingual archive.
          </p>
        </div>
      </aside>

      {/* EDITOR */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/50">
        {!active ? (
          <div className="p-10 text-center text-slate-500">
            <FileText size={28} className="mx-auto mb-3 opacity-40" />
            <p className="text-sm">Select an article — or create a new one.</p>
          </div>
        ) : (
          <>
            {/* Toolbar */}
            <div className="flex items-center justify-between p-3 border-b border-slate-800 gap-2 flex-wrap">
              <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                <input
                  value={editLang === "en" ? active.titleEn : active.titleAr}
                  onChange={(e) =>
                    update(editLang === "en" ? { titleEn: e.target.value } : { titleAr: e.target.value })
                  }
                  placeholder={editLang === "en" ? "Article title" : "عنوان المقال"}
                  dir={editLang === "ar" ? "rtl" : "ltr"}
                  className="flex-1 bg-transparent text-base font-semibold text-slate-100 outline-none"
                />
              </div>
              <div className="flex gap-2 items-center">
                <div className="flex rounded-lg bg-slate-800 p-0.5">
                  <button
                    onClick={() => setEditLang("en")}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-semibold ${
                      editLang === "en" ? "bg-amber-500 text-slate-950" : "text-slate-400"
                    }`}
                  >
                    EN
                  </button>
                  <button
                    onClick={() => setEditLang("ar")}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-semibold ${
                      editLang === "ar" ? "bg-amber-500 text-slate-950" : "text-slate-400"
                    }`}
                  >
                    AR
                  </button>
                </div>
                <div className="flex rounded-lg bg-slate-800 p-0.5">
                  <button
                    onClick={() => setPreviewLang("off")}
                    title="Edit"
                    className={`px-2.5 py-1 rounded-md text-[11px] font-semibold flex items-center ${
                      previewLang === "off" ? "bg-slate-700 text-amber-300" : "text-slate-400"
                    }`}
                  >
                    <FileText size={11} />
                  </button>
                  <button
                    onClick={() => setPreviewLang(editLang)}
                    title="Preview"
                    className={`px-2.5 py-1 rounded-md text-[11px] font-semibold flex items-center ${
                      previewLang !== "off" ? "bg-slate-700 text-amber-300" : "text-slate-400"
                    }`}
                  >
                    <Eye size={11} />
                  </button>
                </div>
                <button
                  onClick={() => move(-1)}
                  className="p-1.5 rounded-md text-slate-400 hover:bg-slate-800"
                  title="Move up"
                >
                  <ChevronUp size={13} />
                </button>
                <button
                  onClick={() => move(1)}
                  className="p-1.5 rounded-md text-slate-400 hover:bg-slate-800"
                  title="Move down"
                >
                  <ChevronDown size={13} />
                </button>
                <button
                  onClick={removeActive}
                  className="p-1.5 rounded-md text-rose-400 hover:bg-rose-500/10"
                  title="Delete article"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>

            {/* Editor / preview */}
            {previewLang === "off" ? (
              <textarea
                key={`${active.id}-${editLang}`}
                value={editLang === "en" ? active.bodyEn : active.bodyAr}
                onChange={(e) =>
                  update(editLang === "en" ? { bodyEn: e.target.value } : { bodyAr: e.target.value })
                }
                dir={editLang === "ar" ? "rtl" : "ltr"}
                rows={26}
                spellCheck={false}
                className="w-full p-5 bg-transparent text-sm font-mono text-slate-200 outline-none resize-none leading-relaxed"
                placeholder={
                  editLang === "en"
                    ? "Write the article body in markdown…\n\n## Subheadings, **bold**, lists, [links](https://…) all supported."
                    : "اكتب نص المقال بصيغة ماركداون…"
                }
              />
            ) : (
              <article
                dir={previewLang === "ar" ? "rtl" : "ltr"}
                className="prose prose-invert max-w-none p-6 min-h-[60vh]"
              >
                <p className="text-[10px] uppercase tracking-widest text-amber-400 mb-2 flex items-center gap-1">
                  <Globe size={10} /> Preview · {previewLang === "ar" ? "العربية" : "English"}
                </p>
                <h1>{previewLang === "en" ? active.titleEn : active.titleAr || "Untitled"}</h1>
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {previewLang === "en" ? active.bodyEn || "_Empty_" : active.bodyAr || "_فارغ_"}
                </ReactMarkdown>
              </article>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default AdminNews;
