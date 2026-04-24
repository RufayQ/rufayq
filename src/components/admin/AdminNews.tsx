/**
 * AdminNews — sectionized article manager with full SEO metadata panel,
 * cross-link inserter, slug uniqueness checks, and a duplicate action.
 *
 * Storage: same `landing-news` row in `site_pages`. Each article block in the
 * markdown body uses an HTML comment to carry per-article SEO metadata
 * (slug, description, author, publishedAt, readingTime, keywords, image).
 * See src/lib/articleMeta.ts for the format.
 */
import { useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Save, Plus, Trash2, ChevronUp, ChevronDown, Eye, FileText, Globe,
  Copy, Link as LinkIcon, AlertTriangle, Sparkles, Search, ArrowUpDown,
} from "lucide-react";
import {
  ArticleMeta,
  DEFAULT_AUTHOR_AR as DEFAULT_AUTHOR_AR_FALLBACK,
  DEFAULT_AUTHOR_EN,
  estimateReadingTime,
  extractMeta,
  isDraft,
  isScheduled,
  parsePublishedAt,
  resolveSlug,
  serializeMeta,
  slugify,
} from "@/lib/articleMeta";
import { getClusterSuggestions } from "@/lib/seoCluster";
import ArticleSeoPreview from "./ArticleSeoPreview";

type Lang = "en" | "ar";
type StatusFilter = "all" | "live" | "scheduled" | "draft";
type SortOrder = "soonest" | "latest" | "manual";

interface Article {
  id: string;
  titleEn: string;
  titleAr: string;
  bodyEn: string;
  bodyAr: string;
  meta: ArticleMeta;
  metaAr: ArticleMeta;
}

const SEP = "\n\n";

const DEFAULT_AUTHOR = DEFAULT_AUTHOR_EN;
const DEFAULT_AUTHOR_AR = DEFAULT_AUTHOR_AR_FALLBACK;

const newArticle = (): Article => ({
  id: crypto.randomUUID(),
  titleEn: "Untitled article",
  titleAr: "مقال جديد",
  bodyEn: "Write your article here…",
  bodyAr: "اكتب مقالك هنا…",
  meta: { author: DEFAULT_AUTHOR, publishedAt: new Date().toISOString().slice(0, 10) },
  metaAr: { author: DEFAULT_AUTHOR_AR },
});

/** Split a markdown blob into Article shells, parsing each `<!--meta-->` block. */
const parseBlocks = (md: string): Array<{ title: string; body: string; meta: ArticleMeta }> => {
  if (!md.trim()) return [];
  const lines = md.split("\n");
  const out: Array<{ title: string; body: string; meta: ArticleMeta }> = [];
  let cur: { title: string; body: string[] } | null = null;
  const flush = () => {
    if (!cur) return;
    const raw = cur.body.join("\n").trim();
    const { meta, body } = extractMeta(raw);
    out.push({ title: cur.title, body, meta });
  };
  for (const line of lines) {
    const m = line.match(/^##\s+(.+?)\s*$/);
    if (m) { flush(); cur = { title: m[1], body: [] }; }
    else if (cur) { cur.body.push(line); }
  }
  flush();
  return out;
};

/** Pair EN + AR blocks (slug-matched when possible, falls back to position). */
const zipArticles = (en: string, ar: string): Article[] => {
  const eb = parseBlocks(en);
  const ab = parseBlocks(ar);
  const used = new Set<number>();
  const arr: Article[] = [];
  eb.forEach((e) => {
    const eSlug = resolveSlug(e.title, e.meta);
    const aIdx = ab.findIndex((a, i) => !used.has(i) && resolveSlug(a.title, a.meta) === eSlug);
    if (aIdx >= 0) {
      used.add(aIdx);
      arr.push({
        id: crypto.randomUUID(),
        titleEn: e.title, titleAr: ab[aIdx].title,
        bodyEn: e.body, bodyAr: ab[aIdx].body,
        meta: e.meta, metaAr: ab[aIdx].meta,
      });
    } else {
      arr.push({
        id: crypto.randomUUID(),
        titleEn: e.title, titleAr: "",
        bodyEn: e.body, bodyAr: "",
        meta: e.meta, metaAr: {},
      });
    }
  });
  ab.forEach((a, i) => {
    if (used.has(i)) return;
    arr.push({
      id: crypto.randomUUID(),
      titleEn: "", titleAr: a.title,
      bodyEn: "", bodyAr: a.body,
      meta: {}, metaAr: a.meta,
    });
  });
  return arr;
};

/** Serialize Article rows back into a single markdown string per language. */
const serialize = (articles: Article[], lang: Lang): string =>
  articles
    .map((a) => {
      const t = lang === "en" ? a.titleEn : a.titleAr;
      const b = lang === "en" ? a.bodyEn : a.bodyAr;
      const meta = lang === "en" ? a.meta : a.metaAr;
      // AR blocks inherit the canonical slug from EN so the pair stays linked
      const effectiveMeta: ArticleMeta = lang === "ar"
        ? { ...meta, slug: meta.slug || a.meta.slug || (a.titleEn ? slugify(a.titleEn) : undefined) }
        : meta;
      if (!t.trim() && !b.trim()) return "";
      const head = `## ${t.trim() || "Untitled"}`;
      const metaBlock = serializeMeta(effectiveMeta);
      const parts = [head];
      if (metaBlock) parts.push(metaBlock);
      parts.push(b.trim());
      return parts.join("\n\n");
    })
    .filter(Boolean)
    .join(SEP);

const formatCountdown = (target: Date, now: Date): string => {
  const diff = target.getTime() - now.getTime();
  if (diff <= 0) return "live";
  const mins = Math.floor(diff / 60000);
  const days = Math.floor(mins / 1440);
  const hrs = Math.floor((mins % 1440) / 60);
  const m = mins % 60;
  if (days > 0) return `${days}d ${hrs}h`;
  if (hrs > 0) return `${hrs}h ${m}m`;
  return `${m}m`;
};

const AdminNews = () => {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [editLang, setEditLang] = useState<Lang>("en");
  const [previewLang, setPreviewLang] = useState<Lang | "off">("off");
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [showLinkPicker, setShowLinkPicker] = useState(false);
  const [showSeoPreview, setShowSeoPreview] = useState(false);
  const [pickerQuery, setPickerQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortOrder, setSortOrder] = useState<SortOrder>("manual");
  // Tick every 30s so scheduled-countdown badges in the sidebar stay fresh.
  const [now, setNow] = useState<Date>(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(id);
  }, []);

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

  /** Resolved slugs for every article (EN canonical). Used for uniqueness + link picker. */
  const slugMap = useMemo(() => {
    return articles.map((a) => ({
      id: a.id,
      slug: resolveSlug(a.titleEn || a.titleAr, a.meta),
      title: a.titleEn || a.titleAr || "Untitled",
    }));
  }, [articles]);

  /** Map of slug → ids that share it (for uniqueness warning). */
  const slugConflicts = useMemo(() => {
    const counts = new Map<string, string[]>();
    slugMap.forEach((s) => {
      const arr = counts.get(s.slug) || [];
      arr.push(s.id);
      counts.set(s.slug, arr);
    });
    return new Set([...counts.entries()].filter(([, ids]) => ids.length > 1).map(([slug]) => slug));
  }, [slugMap]);

  /** Articles missing one half of the EN/AR pair (hreflang would break). */
  const unpairedArticles = useMemo(
    () => articles.filter((a) => !a.titleEn.trim() || !a.titleAr.trim() || !a.bodyEn.trim() || !a.bodyAr.trim()),
    [articles],
  );

  const update = (patch: Partial<Article>) => {
    if (!active) return;
    setArticles((arr) => arr.map((a) => (a.id === active.id ? { ...a, ...patch } : a)));
  };

  const updateMeta = (lang: Lang, patch: Partial<ArticleMeta>) => {
    if (!active) return;
    setArticles((arr) =>
      arr.map((a) =>
        a.id !== active.id
          ? a
          : lang === "en"
            ? { ...a, meta: { ...a.meta, ...patch } }
            : { ...a, metaAr: { ...a.metaAr, ...patch } },
      ),
    );
  };

  const addArticle = () => {
    const a = newArticle();
    setArticles((arr) => [a, ...arr]);
    setActiveId(a.id);
  };

  const duplicateActive = () => {
    if (!active) return;
    const copy: Article = {
      ...active,
      id: crypto.randomUUID(),
      titleEn: `${active.titleEn} (copy)`,
      titleAr: active.titleAr ? `${active.titleAr} (نسخة)` : "",
      meta: { ...active.meta, slug: active.meta.slug ? `${active.meta.slug}-copy` : undefined },
      metaAr: { ...active.metaAr },
    };
    setArticles((arr) => [copy, ...arr]);
    setActiveId(copy.id);
    toast.success("Duplicated — edit the slug before saving");
  };

  const removeActive = () => {
    if (!active) return;
    if (!confirm(`Delete article "${active.titleEn || active.titleAr || "Untitled"}"? This cannot be undone after saving.`)) return;
    const idToDelete = active.id;
    setArticles((arr) => arr.filter((a) => a.id !== idToDelete));
    setActiveId((curId) => {
      if (curId !== idToDelete) return curId;
      const remaining = articles.filter((a) => a.id !== idToDelete);
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

  const insertLink = (target: { slug: string; title: string }, customAnchor?: string) => {
    if (!active) return;
    const isAr = editLang === "ar";
    const root = isAr ? "/ar/news" : "/news";
    const anchor = customAnchor?.trim() || target.title;
    const md = `[${anchor}](${root}/${target.slug})`;
    if (editLang === "en") update({ bodyEn: `${active.bodyEn}\n\n${md}` });
    else update({ bodyAr: `${active.bodyAr}\n\n${md}` });
    setShowLinkPicker(false);
    setPickerQuery("");
    toast.success("Internal link inserted at end of body");
  };

  const autoFillReadingTime = () => {
    if (!active) return;
    const en = estimateReadingTime(active.bodyEn);
    const ar = estimateReadingTime(active.bodyAr);
    updateMeta("en", { readingTime: en });
    if (active.bodyAr.trim()) updateMeta("ar", { readingTime: ar });
    toast.success(`Reading time updated · EN ${en} min · AR ${ar} min`);
  };

  const save = async () => {
    if (slugConflicts.size > 0) {
      toast.error("Resolve duplicate slugs before publishing");
      return;
    }
    if (unpairedArticles.length > 0) {
      const names = unpairedArticles.map((a) => a.titleEn || a.titleAr || "Untitled").join(", ");
      toast.error(`${unpairedArticles.length} article(s) missing EN↔AR pairing — fix to keep hreflang consistent: ${names}`);
      return;
    }
    setSaving(true);
    // Only default the author when left blank — preserve any custom byline the
    // editor entered. EN defaults to "RufayQ Editorial Team", AR to the Arabic
    // equivalent so the Arabic article doesn't show an English byline.
    const stamped = articles.map((a) => {
      const enAuthor = a.meta.author?.trim() ? a.meta.author : DEFAULT_AUTHOR;
      const arAuthor = a.metaAr.author?.trim() ? a.metaAr.author : DEFAULT_AUTHOR_AR;
      if (enAuthor === a.meta.author && arAuthor === a.metaAr.author) return a;
      return { ...a, meta: { ...a.meta, author: enAuthor }, metaAr: { ...a.metaAr, author: arAuthor } };
    });
    if (stamped.some((a, i) => a !== articles[i])) setArticles(stamped);
    const body_md = serialize(stamped, "en");
    const body_md_ar = serialize(stamped, "ar");
    const { error } = await supabase
      .from("site_pages")
      .update({ body_md, body_md_ar })
      .eq("slug", "landing-news");
    setSaving(false);
    if (error) { toast.error(error.message); return; }
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

  const activeMeta = active ? (editLang === "en" ? active.meta : active.metaAr) : null;
  const resolvedSlug = active ? resolveSlug(active.titleEn || active.titleAr, active.meta) : "";
  const hasConflict = active && slugConflicts.has(resolvedSlug);

  return (
    <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-4">
      {/* SIDEBAR */}
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

        {/* Status filter chips */}
        <div className="flex gap-1 px-1 mb-1.5">
          {([
            { v: "all", label: "All", count: articles.length },
            {
              v: "live",
              label: "Live",
              count: articles.filter((a) => !isDraft(a.meta) && !isScheduled(a.meta, now)).length,
            },
            {
              v: "scheduled",
              label: "Scheduled",
              count: articles.filter((a) => !isDraft(a.meta) && isScheduled(a.meta, now)).length,
            },
            { v: "draft", label: "Drafts", count: articles.filter((a) => isDraft(a.meta)).length },
          ] as Array<{ v: StatusFilter; label: string; count: number }>).map((opt) => (
            <button
              key={opt.v}
              onClick={() => setStatusFilter(opt.v)}
              className={`flex-1 px-1.5 py-1 rounded-md text-[10px] font-semibold ${
                statusFilter === opt.v
                  ? "bg-amber-500 text-slate-950"
                  : "bg-slate-800/60 text-slate-400 hover:text-slate-200"
              }`}
            >
              {opt.label}
              <span className="ml-1 opacity-70">{opt.count}</span>
            </button>
          ))}
        </div>

        {/* Sort selector */}
        <div className="flex items-center gap-1.5 px-2 mb-2">
          <ArrowUpDown size={10} className="text-slate-500" />
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as SortOrder)}
            className="flex-1 bg-slate-800/60 border border-slate-700 rounded-md text-[10px] text-slate-300 px-1.5 py-1 outline-none focus:border-amber-500"
          >
            <option value="manual">Manual order</option>
            <option value="soonest">Publish soonest first</option>
            <option value="latest">Publish latest first</option>
          </select>
        </div>

        {articles.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-700 p-4 text-center">
            <p className="text-[11px] text-slate-500 mb-2">No articles yet.</p>
            <button onClick={addArticle} className="px-3 py-1.5 rounded-md bg-amber-500 text-slate-950 text-[11px] font-semibold inline-flex items-center gap-1">
              <Plus size={11} /> Create first article
            </button>
          </div>
        ) : (
          articles.map((a, i) => {
            const slug = resolveSlug(a.titleEn || a.titleAr, a.meta);
            const conflict = slugConflicts.has(slug);
            const scheduledAt = parsePublishedAt(a.meta.publishedAt);
            const scheduled = scheduledAt && scheduledAt.getTime() > now.getTime();
            return (
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
                  <p dir="rtl" className="lang-keep truncate text-[10px] opacity-70 leading-tight mt-0.5">{a.titleAr || "—"}</p>
                  <p className="truncate text-[9px] mt-1 font-mono opacity-50">/{slug}</p>
                  {scheduled && scheduledAt && (
                    <p
                      className="truncate text-[9px] mt-1 font-mono text-amber-400"
                      title={`Goes live ${scheduledAt.toLocaleString()}`}
                    >
                      ⏱ in {formatCountdown(scheduledAt, now)}
                    </p>
                  )}
                </div>
                <div className="flex flex-col gap-1 items-end shrink-0">
                  {conflict && <AlertTriangle size={11} className="text-rose-400" />}
                  {scheduled && (
                    <span title="Scheduled — hidden from public until publish time" className="text-[8px] uppercase font-semibold text-amber-400/90">●</span>
                  )}
                  {(!a.titleEn.trim() || !a.titleAr.trim() || !a.bodyEn.trim() || !a.bodyAr.trim()) && (
                    <span title="Missing EN/AR pair" className="text-[8px] uppercase font-semibold text-amber-500/80">½</span>
                  )}
                </div>
              </button>
            );
          })
        )}

        <div className="mt-4 px-2">
          <button
            onClick={save}
            disabled={saving || slugConflicts.size > 0 || unpairedArticles.length > 0}
            className="w-full px-3 py-2 rounded-lg bg-amber-500 text-slate-950 text-xs font-semibold flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            <Save size={12} />
            {saving ? "Publishing…" : "Publish all"}
          </button>
          {slugConflicts.size > 0 && (
            <p className="text-[10px] text-rose-400 mt-2 text-center">
              Duplicate slug{slugConflicts.size > 1 ? "s" : ""} — fix before publishing
            </p>
          )}
          {unpairedArticles.length > 0 && (
            <p className="text-[10px] text-amber-400 mt-2 text-center leading-relaxed">
              {unpairedArticles.length} article{unpairedArticles.length === 1 ? "" : "s"} missing EN↔AR pair —
              hreflang requires both languages.
            </p>
          )}
          {updatedAt && (
            <p className="text-[10px] text-slate-600 mt-2 text-center">
              Last published {new Date(updatedAt).toLocaleString()}
            </p>
          )}
          <p className="text-[10px] text-slate-600 mt-2 leading-relaxed">
            Articles appear at <code className="text-amber-400">/news/&lt;slug&gt;</code> and{" "}
            <code className="text-amber-400">/ar/news/&lt;slug&gt;</code>.
          </p>
        </div>
      </aside>

      {/* EDITOR */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/50">
        {!active || !activeMeta ? (
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
                  className="lang-keep flex-1 bg-transparent text-base font-semibold text-slate-100 outline-none"
                />
              </div>
              <div className="flex gap-2 items-center flex-wrap">
                <div className="flex rounded-lg bg-slate-800 p-0.5">
                  <button onClick={() => setEditLang("en")} className={`px-2.5 py-1 rounded-md text-[11px] font-semibold ${editLang === "en" ? "bg-amber-500 text-slate-950" : "text-slate-400"}`}>EN</button>
                  <button onClick={() => setEditLang("ar")} className={`px-2.5 py-1 rounded-md text-[11px] font-semibold ${editLang === "ar" ? "bg-amber-500 text-slate-950" : "text-slate-400"}`}>AR</button>
                </div>
                <div className="flex rounded-lg bg-slate-800 p-0.5">
                  <button onClick={() => setPreviewLang("off")} title="Edit" className={`px-2.5 py-1 rounded-md text-[11px] font-semibold flex items-center ${previewLang === "off" ? "bg-slate-700 text-amber-300" : "text-slate-400"}`}><FileText size={11} /></button>
                  <button onClick={() => setPreviewLang(editLang)} title="Preview" className={`px-2.5 py-1 rounded-md text-[11px] font-semibold flex items-center ${previewLang !== "off" ? "bg-slate-700 text-amber-300" : "text-slate-400"}`}><Eye size={11} /></button>
                </div>
                <button onClick={() => setShowSeoPreview((v) => !v)} className={`p-1.5 rounded-md ${showSeoPreview ? "bg-amber-500/15 text-amber-300" : "text-slate-400 hover:bg-slate-800"}`} title="Toggle SEO preview"><Globe size={13} /></button>
                <button onClick={duplicateActive} className="p-1.5 rounded-md text-slate-400 hover:bg-slate-800" title="Duplicate article"><Copy size={13} /></button>
                <button onClick={() => move(-1)} className="p-1.5 rounded-md text-slate-400 hover:bg-slate-800" title="Move up"><ChevronUp size={13} /></button>
                <button onClick={() => move(1)} className="p-1.5 rounded-md text-slate-400 hover:bg-slate-800" title="Move down"><ChevronDown size={13} /></button>
                <button onClick={removeActive} className="p-1.5 rounded-md text-rose-400 hover:bg-rose-500/10" title="Delete article"><Trash2 size={13} /></button>
              </div>
            </div>

            {/* SEO METADATA PANEL */}
            <div className="p-4 border-b border-slate-800 bg-slate-950/40">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[10px] uppercase tracking-widest text-amber-400 font-semibold">SEO metadata</p>
                <button onClick={autoFillReadingTime} className="text-[10px] text-slate-400 hover:text-amber-300 inline-flex items-center gap-1">
                  <Sparkles size={10} /> Auto reading time
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[12px]">
                {/* Slug — EN-only, shared by AR */}
                <label className="block md:col-span-2">
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider">URL slug (shared EN/AR)</span>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[11px] text-slate-600 font-mono">/news/</span>
                    <input
                      value={active.meta.slug || ""}
                      onChange={(e) => updateMeta("en", { slug: slugify(e.target.value) })}
                      placeholder={slugify(active.titleEn || active.titleAr)}
                      className="flex-1 px-2 py-1.5 rounded-md bg-slate-800/60 border border-slate-700 text-slate-200 outline-none focus:border-amber-500 font-mono text-[12px]"
                    />
                  </div>
                  {hasConflict && (
                    <p className="text-[10px] text-rose-400 mt-1 flex items-center gap-1">
                      <AlertTriangle size={10} /> Another article uses this slug
                    </p>
                  )}
                  <p className="text-[10px] text-slate-600 mt-1">Resolved: <code className="text-amber-400">/{editLang === "ar" ? "ar/" : ""}news/{resolvedSlug}</code></p>
                </label>

                <label className="block md:col-span-2">
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider">Meta description ({editLang.toUpperCase()})</span>
                  <textarea
                    value={activeMeta.description || ""}
                    onChange={(e) => updateMeta(editLang, { description: e.target.value })}
                    rows={2}
                    dir={editLang === "ar" ? "rtl" : "ltr"}
                    placeholder={editLang === "en" ? "150-160 char snippet for Google search results" : "وصف ميتا للمقال"}
                    className="lang-keep w-full mt-1 px-2 py-1.5 rounded-md bg-slate-800/60 border border-slate-700 text-slate-200 outline-none focus:border-amber-500 text-[12px]"
                  />
                  <p className="text-[10px] text-slate-600 mt-0.5">{(activeMeta.description || "").length}/160</p>
                </label>

                <label className="block">
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider">Author ({editLang.toUpperCase()})</span>
                  <input
                    value={activeMeta.author || ""}
                    onChange={(e) => updateMeta(editLang, { author: e.target.value })}
                    placeholder={editLang === "ar" ? DEFAULT_AUTHOR_AR : DEFAULT_AUTHOR}
                    dir={editLang === "ar" ? "rtl" : "ltr"}
                    className="lang-keep w-full mt-1 px-2 py-1.5 rounded-md bg-slate-800/60 border border-slate-700 text-slate-200 outline-none focus:border-amber-500 text-[12px]"
                  />
                  <p className="text-[10px] text-slate-600 mt-0.5">Defaults to <span className="text-amber-400">{editLang === "ar" ? DEFAULT_AUTHOR_AR : DEFAULT_AUTHOR}</span> if left blank.</p>
                </label>

                <label className="block">
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider">
                    Publish date &amp; time
                    {isScheduled(active.meta) && (
                      <span className="ml-1.5 text-amber-400 normal-case tracking-normal">· scheduled</span>
                    )}
                  </span>
                  <input
                    type="datetime-local"
                    value={(active.meta.publishedAt || "").slice(0, 16)}
                    onChange={(e) => updateMeta("en", { publishedAt: e.target.value || undefined })}
                    className="w-full mt-1 px-2 py-1.5 rounded-md bg-slate-800/60 border border-slate-700 text-slate-200 outline-none focus:border-amber-500 text-[12px]"
                  />
                  <p className="text-[10px] text-slate-600 mt-0.5">
                    Future date &amp; time → article stays hidden until then.
                  </p>
                </label>

                <label className="block">
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider">Reading time (min)</span>
                  <input
                    type="number" min={1} max={60}
                    value={activeMeta.readingTime || ""}
                    onChange={(e) => updateMeta(editLang, { readingTime: parseInt(e.target.value, 10) || undefined })}
                    placeholder="auto"
                    className="w-full mt-1 px-2 py-1.5 rounded-md bg-slate-800/60 border border-slate-700 text-slate-200 outline-none focus:border-amber-500 text-[12px]"
                  />
                </label>

                <label className="block">
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider">Primary keywords ({editLang.toUpperCase()})</span>
                  <input
                    value={activeMeta.keywords || ""}
                    onChange={(e) => updateMeta(editLang, { keywords: e.target.value })}
                    placeholder="medical tourism saudi arabia, …"
                    dir={editLang === "ar" ? "rtl" : "ltr"}
                    className="lang-keep w-full mt-1 px-2 py-1.5 rounded-md bg-slate-800/60 border border-slate-700 text-slate-200 outline-none focus:border-amber-500 text-[12px]"
                  />
                </label>

                <label className="block md:col-span-2">
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider">Open Graph image (path or URL)</span>
                  <input
                    value={active.meta.image || ""}
                    onChange={(e) => updateMeta("en", { image: e.target.value })}
                    placeholder="/og-news-1.jpg"
                    className="w-full mt-1 px-2 py-1.5 rounded-md bg-slate-800/60 border border-slate-700 text-slate-200 outline-none focus:border-amber-500 text-[12px] font-mono"
                  />
                </label>
              </div>

              {/* Internal link picker — curated cluster suggestions + free search */}
              <div className="mt-4 pt-3 border-t border-slate-800">
                <button
                  onClick={() => setShowLinkPicker((v) => !v)}
                  className="text-[11px] text-amber-300 hover:text-amber-200 font-semibold inline-flex items-center gap-1.5"
                >
                  <LinkIcon size={11} /> Insert internal link to another article
                </button>
                {showLinkPicker && (
                  <div className="mt-3 space-y-3">
                    {/* Curated cluster suggestions per SEO masterplan */}
                    {(() => {
                      const suggestions = getClusterSuggestions(resolvedSlug);
                      if (suggestions.length === 0) return null;
                      return (
                        <div>
                          <p className="text-[9px] uppercase tracking-widest text-amber-400 mb-1.5 flex items-center gap-1">
                            <Sparkles size={10} /> Suggested anchors · SEO masterplan
                          </p>
                          <div className="space-y-1.5">
                            {suggestions.map((sg) => {
                              const targetTitle = slugMap.find((s) => s.slug === sg.toSlug)?.title || sg.toSlug;
                              const anchor = editLang === "ar" ? sg.anchorAr : sg.anchorEn;
                              return (
                                <button
                                  key={sg.toSlug}
                                  onClick={() => insertLink({ slug: sg.toSlug, title: targetTitle }, anchor)}
                                  dir={editLang === "ar" ? "rtl" : "ltr"}
                                  className="w-full text-left px-2.5 py-2 rounded-md bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-[11px] text-amber-200"
                                >
                                  <span className="block truncate">{anchor}</span>
                                  <span className="opacity-60 font-mono text-[9px] block mt-0.5">→ /{sg.toSlug}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })()}

                    {/* All articles (filterable) */}
                    <div>
                      <div className="relative mb-1.5">
                        <Search size={11} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-500" />
                        <input
                          value={pickerQuery}
                          onChange={(e) => setPickerQuery(e.target.value)}
                          placeholder="Filter all articles…"
                          className="w-full pl-7 pr-2 py-1.5 rounded-md bg-slate-800/60 border border-slate-700 text-[11px] text-slate-200 outline-none focus:border-amber-500"
                        />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-44 overflow-y-auto p-1">
                        {slugMap
                          .filter((s) => s.id !== active.id)
                          .filter((s) => {
                            const q = pickerQuery.trim().toLowerCase();
                            return !q || s.slug.includes(q) || s.title.toLowerCase().includes(q);
                          })
                          .map((s) => (
                            <button
                              key={s.id}
                              onClick={() => insertLink(s)}
                              className="text-left px-2 py-1.5 rounded-md bg-slate-800/40 hover:bg-amber-500/10 hover:text-amber-300 text-[11px] text-slate-300 truncate"
                              title={`/news/${s.slug}`}
                            >
                              <span className="opacity-60 font-mono">/{s.slug}</span>
                              <span className="block truncate">{s.title}</span>
                            </button>
                          ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* SEO preview panel (toggle via Globe in toolbar) */}
            {showSeoPreview && (
              <div className="p-4 border-b border-slate-800 bg-slate-950/40">
                <ArticleSeoPreview
                  slug={resolvedSlug}
                  titleEn={active.titleEn}
                  titleAr={active.titleAr}
                  metaEn={active.meta}
                  metaAr={active.metaAr}
                  excerptEn={active.bodyEn.slice(0, 200)}
                  excerptAr={active.bodyAr.slice(0, 200)}
                />
              </div>
            )}

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
                className="lang-keep w-full p-5 bg-transparent text-sm font-mono text-slate-200 outline-none resize-none leading-relaxed"
                placeholder={
                  editLang === "en"
                    ? "Write the article body in markdown…\n\n## Subheadings, **bold**, lists, [links](/news/other-article-slug) all supported."
                    : "اكتب نص المقال بصيغة ماركداون…"
                }
              />
            ) : (
              <article dir={previewLang === "ar" ? "rtl" : "ltr"} className="lang-keep prose prose-invert max-w-none p-6 min-h-[60vh]">
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
