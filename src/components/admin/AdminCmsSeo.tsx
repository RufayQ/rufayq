/**
 * AdminCmsSeo — first-version SEO Manager.
 *
 * Lists every CMS page with its SEO fields editable inline so the marketing
 * team can sweep titles, descriptions, indexing flags, and canonicals
 * without diving into each page's section editor.
 */
import { useEffect, useState } from "react";
import { Save, Search, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Row {
  id: string;
  slug: string;
  title_en: string;
  seo_title_en: string | null;
  seo_title_ar: string | null;
  seo_desc_en: string | null;
  seo_desc_ar: string | null;
  canonical_url: string | null;
  index_in_search: boolean;
  include_sitemap: boolean;
  status: string;
}

const inputCls = "w-full rounded-md bg-slate-950 border border-slate-700 px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-amber-400";

const AdminCmsSeo = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("cms_pages")
      .select("id, slug, title_en, seo_title_en, seo_title_ar, seo_desc_en, seo_desc_ar, canonical_url, index_in_search, include_sitemap, status")
      .order("slug");
    setRows((data as Row[]) ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const update = (id: string, patch: Partial<Row>) =>
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  const save = async (r: Row) => {
    setSavingId(r.id);
    const { id, slug: _slug, title_en: _t, ...patch } = r;
    void _slug; void _t;
    await supabase.from("cms_pages").update(patch).eq("id", id);
    setSavingId(null);
    setSavedId(id);
    setTimeout(() => setSavedId((s) => (s === id ? null : s)), 2000);
  };

  const filtered = rows.filter((r) =>
    !q.trim() || r.slug.toLowerCase().includes(q.toLowerCase()) || r.title_en.toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-white">SEO Manager</h2>
          <p className="text-xs text-slate-400">Sweep page titles, descriptions, and indexing flags across the site.</p>
        </div>
        <div className="relative w-64">
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input className={inputCls + " pl-7"} placeholder="Filter pages…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </div>

      {loading ? (
        <div className="text-slate-400 text-sm">Loading pages…</div>
      ) : (
        <div className="space-y-3">
          {filtered.map((r) => {
            const titleLen = (r.seo_title_en ?? "").length;
            const descLen = (r.seo_desc_en ?? "").length;
            return (
              <div key={r.id} className="rounded-lg border border-slate-800 bg-slate-900/40 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-mono text-amber-300 text-xs">/{r.slug}</span>
                    <span className="text-sm text-slate-100 truncate">{r.title_en}</span>
                    <span className="text-[10px] uppercase tracking-wider text-slate-500">· {r.status}</span>
                    <a href={r.slug === "home" ? "/" : `/${r.slug}`} target="_blank" rel="noreferrer" className="text-slate-500 hover:text-amber-400">
                      <ExternalLink size={11} />
                    </a>
                  </div>
                  <button
                    onClick={() => save(r)}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium border bg-amber-500 border-amber-400 text-slate-950 hover:bg-amber-400"
                  >
                    <Save size={12} />
                    {savingId === r.id ? "Saving…" : savedId === r.id ? "Saved ✓" : "Save"}
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <label className="block">
                    <span className="block text-[10px] uppercase tracking-wide text-slate-400 mb-1 flex items-center justify-between">
                      <span>SEO title (EN)</span>
                      <span className={titleLen > 60 ? "text-rose-400" : titleLen > 50 ? "text-amber-300" : "text-slate-500"}>{titleLen}/60</span>
                    </span>
                    <input className={inputCls} value={r.seo_title_en ?? ""} onChange={(e) => update(r.id, { seo_title_en: e.target.value })} />
                  </label>
                  <label className="block">
                    <span className="block text-[10px] uppercase tracking-wide text-slate-400 mb-1">عنوان SEO (AR)</span>
                    <input className={inputCls} dir="rtl" value={r.seo_title_ar ?? ""} onChange={(e) => update(r.id, { seo_title_ar: e.target.value })} />
                  </label>
                  <label className="block col-span-2">
                    <span className="block text-[10px] uppercase tracking-wide text-slate-400 mb-1 flex items-center justify-between">
                      <span>SEO description (EN)</span>
                      <span className={descLen > 160 ? "text-rose-400" : descLen > 140 ? "text-amber-300" : "text-slate-500"}>{descLen}/160</span>
                    </span>
                    <textarea rows={2} className={inputCls} value={r.seo_desc_en ?? ""} onChange={(e) => update(r.id, { seo_desc_en: e.target.value })} />
                  </label>
                  <label className="block col-span-2">
                    <span className="block text-[10px] uppercase tracking-wide text-slate-400 mb-1">وصف SEO (AR)</span>
                    <textarea rows={2} dir="rtl" className={inputCls} value={r.seo_desc_ar ?? ""} onChange={(e) => update(r.id, { seo_desc_ar: e.target.value })} />
                  </label>
                  <label className="block col-span-2">
                    <span className="block text-[10px] uppercase tracking-wide text-slate-400 mb-1">Canonical URL</span>
                    <input className={inputCls} placeholder={`https://rufayq.com/${r.slug}`} value={r.canonical_url ?? ""} onChange={(e) => update(r.id, { canonical_url: e.target.value })} />
                  </label>
                </div>

                <div className="flex flex-wrap gap-4">
                  <label className="text-xs text-slate-300 flex items-center gap-2">
                    <input type="checkbox" checked={r.index_in_search} onChange={(e) => update(r.id, { index_in_search: e.target.checked })} />
                    Index in search engines
                  </label>
                  <label className="text-xs text-slate-300 flex items-center gap-2">
                    <input type="checkbox" checked={r.include_sitemap} onChange={(e) => update(r.id, { include_sitemap: e.target.checked })} />
                    Include in sitemap
                  </label>
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && (
            <p className="text-center text-slate-500 text-sm py-12 border border-dashed border-slate-800 rounded-lg">No pages match.</p>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminCmsSeo;
