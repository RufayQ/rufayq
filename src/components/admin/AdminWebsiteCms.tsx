/**
 * AdminWebsiteCms — Phase 1 Website CMS control center.
 *
 * Tabs:
 *   • Pages          — list + page editor with section builder
 *   • Navigation     — header nav items
 *   • Footer         — footer columns & links
 *   • Global         — brand, colors, contact, copyright
 *   • Publish History — read-only audit feed of cms_versions
 *
 * Defers (Phase 2): Media Library, granular per-page SEO panel,
 * scheduling UI polish, role split (Editor/Designer/Marketing/Admin),
 * advanced section types.
 */
import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Copy, Eye, EyeOff, Globe, History, Layers,
  Layout, Plus, Save, Settings, Trash2, FileText, ListOrdered, Palette,
  ArrowLeft, Languages } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { editorFor } from "./cms/SectionEditors";
import { SECTION_LABELS, emptyContent, type CmsPage, type CmsSection,
  type PageStatus, type SectionType } from "./cms/cmsTypes";

type CmsTab = "pages" | "nav" | "footer" | "global" | "history";

const TABS: { key: CmsTab; label: string; Icon: typeof Layers }[] = [
  { key: "pages",   label: "Pages",          Icon: FileText },
  { key: "nav",     label: "Navigation",     Icon: ListOrdered },
  { key: "footer",  label: "Footer",         Icon: Layout },
  { key: "global",  label: "Global Settings",Icon: Settings },
  { key: "history", label: "Publish History",Icon: History },
];

const inputCls =
  "w-full rounded-md bg-slate-950 border border-slate-700 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-amber-400";
const btn = "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border";
const btnPrimary = btn + " bg-amber-500 border-amber-400 text-slate-950 hover:bg-amber-400";
const btnGhost = btn + " border-slate-700 text-slate-200 hover:border-amber-400";
const btnDanger = btn + " border-rose-700/60 text-rose-300 hover:bg-rose-950/40";

const STATUS_COLORS: Record<PageStatus, string> = {
  draft: "bg-slate-700/50 text-slate-300",
  published: "bg-emerald-700/30 text-emerald-300 border-emerald-700/50",
  scheduled: "bg-sky-700/30 text-sky-300 border-sky-700/50",
  archived: "bg-stone-700/30 text-stone-300 border-stone-700/50",
};

// ============================================================
const AdminWebsiteCms = () => {
  const [tab, setTab] = useState<CmsTab>("pages");
  const [editingPageId, setEditingPageId] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">Website CMS</h2>
          <p className="text-xs text-slate-400">Control every word, image, and section on the public site.</p>
        </div>
      </div>

      {/* sub-tabs */}
      <div className="flex flex-wrap gap-1 border-b border-slate-800">
        {TABS.map(({ key, label, Icon }) => (
          <button key={key} onClick={() => { setTab(key); setEditingPageId(null); }}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs border-b-2 transition ${tab === key ? "border-amber-400 text-white" : "border-transparent text-slate-400 hover:text-slate-200"}`}>
            <Icon size={14} />{label}
          </button>
        ))}
      </div>

      {tab === "pages" && (editingPageId
        ? <PageEditor pageId={editingPageId} onBack={() => setEditingPageId(null)} />
        : <PagesList onEdit={setEditingPageId} />)}
      {tab === "nav" && <NavEditor location="header" />}
      {tab === "footer" && <FooterEditor />}
      {tab === "global" && <GlobalSettingsEditor />}
      {tab === "history" && <PublishHistory />}
    </div>
  );
};

// ============================================================
// PAGES LIST
// ============================================================
const PagesList = ({ onEdit }: { onEdit: (id: string) => void }) => {
  const [pages, setPages] = useState<CmsPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [newSlug, setNewSlug] = useState("");
  const [newTitle, setNewTitle] = useState("");

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("cms_pages").select("*").order("is_system", { ascending: false }).order("slug");
    setPages((data as unknown as CmsPage[]) ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!newSlug.trim() || !newTitle.trim()) return;
    const { error } = await supabase.from("cms_pages").insert({
      slug: newSlug.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-"),
      title_en: newTitle.trim(),
      status: "draft",
    });
    if (error) { alert(error.message); return; }
    setNewSlug(""); setNewTitle(""); setAdding(false); load();
  };

  const remove = async (p: CmsPage) => {
    if (p.is_system) { alert("System pages cannot be deleted. Archive instead."); return; }
    if (!confirm(`Delete page "${p.title_en}" and all its sections?`)) return;
    await supabase.from("cms_pages").delete().eq("id", p.id);
    load();
  };

  const updateStatus = async (p: CmsPage, status: PageStatus) => {
    await supabase.from("cms_pages").update({ status }).eq("id", p.id);
    load();
  };

  if (loading) return <div className="text-slate-400 text-sm">Loading pages…</div>;

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        {!adding ? (
          <button className={btnPrimary} onClick={() => setAdding(true)}><Plus size={14} /> New page</button>
        ) : (
          <div className="flex gap-2 items-end">
            <input className={inputCls + " w-40"} placeholder="slug" value={newSlug} onChange={(e) => setNewSlug(e.target.value)} />
            <input className={inputCls + " w-56"} placeholder="Title" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} />
            <button className={btnPrimary} onClick={create}>Create</button>
            <button className={btnGhost} onClick={() => setAdding(false)}>Cancel</button>
          </div>
        )}
      </div>

      <div className="rounded-lg border border-slate-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-900/60 text-slate-400 text-xs">
            <tr><th className="text-left p-3">Slug</th><th className="text-left p-3">Title</th><th className="text-left p-3">Status</th><th className="text-left p-3">System</th><th className="text-right p-3">Actions</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {pages.map(p => (
              <tr key={p.id} className="hover:bg-slate-900/40">
                <td className="p-3 font-mono text-amber-300">/{p.slug}</td>
                <td className="p-3 text-slate-100">{p.title_en}{p.title_ar ? <span className="text-slate-500 text-xs ms-2">· {p.title_ar}</span> : null}</td>
                <td className="p-3">
                  <select className={`text-xs px-2 py-1 rounded border ${STATUS_COLORS[p.status]}`}
                    value={p.status} onChange={(e) => updateStatus(p, e.target.value as PageStatus)}>
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                    <option value="scheduled">Scheduled</option>
                    <option value="archived">Archived</option>
                  </select>
                </td>
                <td className="p-3 text-xs text-slate-500">{p.is_system ? "Yes" : "—"}</td>
                <td className="p-3 text-right">
                  <button className={btnGhost} onClick={() => onEdit(p.id)}>Edit sections</button>
                  {!p.is_system && <button className={btnDanger + " ml-2"} onClick={() => remove(p)}><Trash2 size={12} /></button>}
                </td>
              </tr>
            ))}
            {pages.length === 0 && <tr><td colSpan={5} className="p-6 text-center text-slate-500">No pages yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ============================================================
// PAGE EDITOR
// ============================================================
const PageEditor = ({ pageId, onBack }: { pageId: string; onBack: () => void }) => {
  const [page, setPage] = useState<CmsPage | null>(null);
  const [sections, setSections] = useState<CmsSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [locale, setLocale] = useState<"en" | "ar">("en");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const load = async () => {
    setLoading(true);
    const [{ data: p }, { data: s }] = await Promise.all([
      supabase.from("cms_pages").select("*").eq("id", pageId).maybeSingle(),
      supabase.from("cms_sections").select("*").eq("page_id", pageId).order("sort_order"),
    ]);
    setPage(p as unknown as CmsPage);
    setSections((s as unknown as CmsSection[]) ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, [pageId]);

  const savePage = async (patch: Partial<CmsPage>) => {
    if (!page) return;
    setPage({ ...page, ...patch });
    await supabase.from("cms_pages").update(patch).eq("id", page.id);
  };

  const addSection = async (type: SectionType) => {
    if (!page) return;
    const { en, ar } = emptyContent(type);
    const sort_order = (sections[sections.length - 1]?.sort_order ?? 0) + 10;
    const { data } = await supabase.from("cms_sections").insert({
      page_id: page.id, type, sort_order, content_en: en as never, content_ar: ar as never,
    } as never).select().single();
    if (data) { setSections([...sections, data as unknown as CmsSection]); setExpanded((data as { id: string }).id); }
    setAdding(false);
  };

  const updateSection = async (id: string, patch: Partial<CmsSection>) => {
    setSections(prev => prev.map(s => s.id === id ? { ...s, ...patch } : s));
    await supabase.from("cms_sections").update(patch as never).eq("id", id);
  };

  const removeSection = async (id: string) => {
    if (!confirm("Delete this section?")) return;
    await supabase.from("cms_sections").delete().eq("id", id);
    setSections(prev => prev.filter(s => s.id !== id));
  };

  const duplicateSection = async (s: CmsSection) => {
    const { data } = await supabase.from("cms_sections").insert({
      page_id: s.page_id, type: s.type, sort_order: s.sort_order + 5,
      visible: s.visible, content_en: s.content_en as never, content_ar: s.content_ar as never, config: s.config as never,
    } as never).select().single();
    if (data) load();
  };

  const move = async (s: CmsSection, dir: -1 | 1) => {
    const idx = sections.findIndex(x => x.id === s.id);
    const swap = sections[idx + dir];
    if (!swap) return;
    await Promise.all([
      supabase.from("cms_sections").update({ sort_order: swap.sort_order }).eq("id", s.id),
      supabase.from("cms_sections").update({ sort_order: s.sort_order }).eq("id", swap.id),
    ]);
    load();
  };

  if (loading || !page) return <div className="text-slate-400 text-sm">Loading…</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button className={btnGhost} onClick={onBack}><ArrowLeft size={14} /> Back to pages</button>
        <div className="flex gap-2">
          <button className={btnGhost} onClick={() => setLocale(l => l === "en" ? "ar" : "en")}>
            <Languages size={14} /> {locale === "en" ? "Editing English" : "تعديل العربية"}
          </button>
          <a className={btnGhost} target="_blank" rel="noreferrer" href={page.slug === "home" ? "/" : `/${page.slug}`}><Eye size={14} /> Preview</a>
        </div>
      </div>

      {/* Page meta */}
      <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-4 space-y-3">
        <div className="grid grid-cols-3 gap-3">
          <div>
            <span className="block text-xs text-slate-400 mb-1">Slug</span>
            <input className={inputCls} value={page.slug} disabled={page.is_system} onChange={(e) => savePage({ slug: e.target.value })} />
          </div>
          <div>
            <span className="block text-xs text-slate-400 mb-1">Title (EN)</span>
            <input className={inputCls} value={page.title_en} onChange={(e) => savePage({ title_en: e.target.value })} />
          </div>
          <div>
            <span className="block text-xs text-slate-400 mb-1">العنوان (AR)</span>
            <input className={inputCls} dir="rtl" value={page.title_ar ?? ""} onChange={(e) => savePage({ title_ar: e.target.value })} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <span className="block text-xs text-slate-400 mb-1">SEO title (EN)</span>
            <input className={inputCls} value={page.seo_title_en ?? ""} onChange={(e) => savePage({ seo_title_en: e.target.value })} />
          </div>
          <div>
            <span className="block text-xs text-slate-400 mb-1">SEO description (EN)</span>
            <input className={inputCls} value={page.seo_desc_en ?? ""} onChange={(e) => savePage({ seo_desc_en: e.target.value })} />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <label className="flex items-center gap-2 text-xs text-slate-300">
            <input type="checkbox" checked={page.index_in_search} onChange={(e) => savePage({ index_in_search: e.target.checked })} />
            Index in search engines
          </label>
          <label className="flex items-center gap-2 text-xs text-slate-300">
            <input type="checkbox" checked={page.include_sitemap} onChange={(e) => savePage({ include_sitemap: e.target.checked })} />
            Include in sitemap
          </label>
          <div>
            <span className="block text-xs text-slate-400 mb-1">Status</span>
            <select className={inputCls} value={page.status} onChange={(e) => savePage({ status: e.target.value as PageStatus })}>
              <option value="draft">Draft</option><option value="published">Published</option>
              <option value="scheduled">Scheduled</option><option value="archived">Archived</option>
            </select>
          </div>
        </div>
      </div>

      {/* Sections list */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white">Sections ({sections.length})</h3>
          {!adding ? (
            <button className={btnPrimary} onClick={() => setAdding(true)}><Plus size={14} /> Add section</button>
          ) : (
            <div className="flex gap-2 items-center">
              <select className={inputCls + " w-56"} onChange={(e) => addSection(e.target.value as SectionType)} defaultValue="">
                <option value="" disabled>Choose section type…</option>
                {Object.entries(SECTION_LABELS).map(([k, label]) => (
                  <option key={k} value={k}>{label}</option>
                ))}
              </select>
              <button className={btnGhost} onClick={() => setAdding(false)}>Cancel</button>
            </div>
          )}
        </div>

        {sections.map((s, idx) => {
          const Editor = editorFor(s.type);
          const open = expanded === s.id;
          const content = locale === "en" ? s.content_en : s.content_ar;
          return (
            <div key={s.id} className="rounded-lg border border-slate-800 bg-slate-900/40">
              <div className="flex items-center gap-2 p-3">
                <span className="text-xs font-mono text-amber-300 w-8">{s.sort_order}</span>
                <button onClick={() => setExpanded(open ? null : s.id)} className="flex-1 text-left">
                  <div className="text-sm font-semibold text-white">{SECTION_LABELS[s.type]}</div>
                  <div className="text-[11px] text-slate-500 font-mono">{s.type}</div>
                </button>
                <button className={btnGhost} title={s.visible ? "Hide" : "Show"} onClick={() => updateSection(s.id, { visible: !s.visible })}>
                  {s.visible ? <Eye size={12} /> : <EyeOff size={12} />}
                </button>
                <button className={btnGhost} disabled={idx === 0} onClick={() => move(s, -1)}><ChevronUp size={12} /></button>
                <button className={btnGhost} disabled={idx === sections.length - 1} onClick={() => move(s, 1)}><ChevronDown size={12} /></button>
                <button className={btnGhost} onClick={() => duplicateSection(s)} title="Duplicate"><Copy size={12} /></button>
                <button className={btnDanger} onClick={() => removeSection(s.id)}><Trash2 size={12} /></button>
              </div>
              {open && (
                <div className="border-t border-slate-800 p-4">
                  {/* eslint-disable @typescript-eslint/no-explicit-any */}
                  <Editor content={content as any} onChange={(v: any) => updateSection(s.id, locale === "en" ? { content_en: v } : { content_ar: v })} />
                </div>
              )}
            </div>
          );
        })}
        {sections.length === 0 && <div className="text-center text-slate-500 text-sm py-8 border border-dashed border-slate-800 rounded-lg">No sections yet — add one above.</div>}
      </div>
    </div>
  );
};

// ============================================================
// NAV EDITOR (header + footer share base shape)
// ============================================================
const NavEditor = ({ location }: { location: "header" | "footer" }) => {
  type NavRow = { id: string; label_en: string; label_ar: string | null; link_type: string; link_value: string; sort_order: number; visible: boolean };
  const [rows, setRows] = useState<NavRow[]>([]);
  const load = async () => {
    const { data } = await supabase.from("cms_nav_items").select("*").eq("location", location).order("sort_order");
    setRows((data as unknown as NavRow[]) ?? []);
  };
  useEffect(() => { load(); }, [location]);

  const update = async (id: string, patch: Partial<NavRow>) => {
    setRows(prev => prev.map(r => r.id === id ? { ...r, ...patch } : r));
    await supabase.from("cms_nav_items").update(patch as never).eq("id", id);
  };
  const add = async () => {
    const sort_order = (rows[rows.length - 1]?.sort_order ?? 0) + 10;
    await supabase.from("cms_nav_items").insert({ location, label_en: "New item", link_type: "page", link_value: "/", sort_order });
    load();
  };
  const remove = async (id: string) => { await supabase.from("cms_nav_items").delete().eq("id", id); load(); };

  return (
    <div className="space-y-3">
      <div className="flex justify-between"><h3 className="text-sm font-semibold text-white">Header navigation</h3><button className={btnPrimary} onClick={add}><Plus size={14} /> Add item</button></div>
      <div className="space-y-2">
        {rows.map(r => (
          <div key={r.id} className="grid grid-cols-[60px_1fr_1fr_120px_2fr_auto_auto] gap-2 items-center p-2 rounded border border-slate-800 bg-slate-900/40">
            <input type="number" className={inputCls} value={r.sort_order} onChange={(e) => update(r.id, { sort_order: parseInt(e.target.value) || 0 })} />
            <input className={inputCls} placeholder="Label EN" value={r.label_en} onChange={(e) => update(r.id, { label_en: e.target.value })} />
            <input className={inputCls} dir="rtl" placeholder="Label AR" value={r.label_ar ?? ""} onChange={(e) => update(r.id, { label_ar: e.target.value })} />
            <select className={inputCls} value={r.link_type} onChange={(e) => update(r.id, { link_type: e.target.value })}>
              <option value="page">Page</option><option value="anchor">Anchor</option><option value="external">External</option>
            </select>
            <input className={inputCls} placeholder="/pricing or #features" value={r.link_value} onChange={(e) => update(r.id, { link_value: e.target.value })} />
            <button className={btnGhost} onClick={() => update(r.id, { visible: !r.visible })}>{r.visible ? <Eye size={12} /> : <EyeOff size={12} />}</button>
            <button className={btnDanger} onClick={() => remove(r.id)}><Trash2 size={12} /></button>
          </div>
        ))}
      </div>
    </div>
  );
};

// ============================================================
// FOOTER EDITOR
// ============================================================
const FooterEditor = () => {
  type FooterRow = { id: string; column_key: string; label_en: string; label_ar: string | null; link_type: string; link_value: string; sort_order: number; visible: boolean; is_header: boolean };
  const [rows, setRows] = useState<FooterRow[]>([]);
  const load = async () => {
    const { data } = await supabase.from("cms_footer_items").select("*").order("column_key").order("sort_order");
    setRows((data as unknown as FooterRow[]) ?? []);
  };
  useEffect(() => { load(); }, []);

  const update = async (id: string, patch: Partial<FooterRow>) => {
    setRows(prev => prev.map(r => r.id === id ? { ...r, ...patch } : r));
    await supabase.from("cms_footer_items").update(patch as never).eq("id", id);
  };
  const add = async (col: string) => {
    const colRows = rows.filter(r => r.column_key === col);
    const sort_order = (colRows[colRows.length - 1]?.sort_order ?? 0) + 1;
    await supabase.from("cms_footer_items").insert({ column_key: col, label_en: "New link", link_type: "page", link_value: "/", sort_order });
    load();
  };
  const remove = async (id: string) => { await supabase.from("cms_footer_items").delete().eq("id", id); load(); };

  const grouped = useMemo(() => {
    const m = new Map<string, FooterRow[]>();
    rows.forEach(r => { const arr = m.get(r.column_key) ?? []; arr.push(r); m.set(r.column_key, arr); });
    return m;
  }, [rows]);

  const columns = ["company", "resources", "legal", "support", "social"];

  return (
    <div className="space-y-4">
      {columns.map(col => (
        <div key={col} className="rounded-lg border border-slate-800 bg-slate-900/40 p-3">
          <div className="flex justify-between items-center mb-2">
            <h4 className="text-sm font-semibold text-white capitalize">{col}</h4>
            <button className={btnGhost} onClick={() => add(col)}><Plus size={12} /> Add link</button>
          </div>
          <div className="space-y-2">
            {(grouped.get(col) ?? []).map(r => (
              <div key={r.id} className="grid grid-cols-[60px_1fr_1fr_120px_2fr_auto_auto_auto] gap-2 items-center">
                <input type="number" className={inputCls} value={r.sort_order} onChange={(e) => update(r.id, { sort_order: parseInt(e.target.value) || 0 })} />
                <input className={inputCls} placeholder="EN" value={r.label_en} onChange={(e) => update(r.id, { label_en: e.target.value })} />
                <input className={inputCls} dir="rtl" placeholder="AR" value={r.label_ar ?? ""} onChange={(e) => update(r.id, { label_ar: e.target.value })} />
                <select className={inputCls} value={r.link_type} onChange={(e) => update(r.id, { link_type: e.target.value })}>
                  <option value="page">Page</option><option value="anchor">Anchor</option><option value="external">External</option>
                </select>
                <input className={inputCls} value={r.link_value} onChange={(e) => update(r.id, { link_value: e.target.value })} />
                <label className="text-[10px] text-slate-400 flex items-center gap-1"><input type="checkbox" checked={r.is_header} onChange={(e) => update(r.id, { is_header: e.target.checked })} />Hdr</label>
                <button className={btnGhost} onClick={() => update(r.id, { visible: !r.visible })}>{r.visible ? <Eye size={12} /> : <EyeOff size={12} />}</button>
                <button className={btnDanger} onClick={() => remove(r.id)}><Trash2 size={12} /></button>
              </div>
            ))}
            {!(grouped.get(col)?.length) && <div className="text-xs text-slate-500 italic">No links in this column.</div>}
          </div>
        </div>
      ))}
    </div>
  );
};

// ============================================================
// GLOBAL SETTINGS
// ============================================================
type GlobalRow = {
  id: string; brand_name: string; brand_name_ar: string;
  tagline_en: string | null; tagline_ar: string | null;
  primary_color: string; secondary_color: string; accent_color: string;
  gold_color: string; navy_color: string;
  support_email: string | null; support_whatsapp: string | null; sales_email: string | null;
  support_phone: string | null;
  address_en: string | null; address_ar: string | null;
  business_hours_en: string | null; business_hours_ar: string | null;
  map_embed_url: string | null;
  default_language: string; language_toggle: boolean; sticky_header: boolean;
  newsletter_title_en: string | null; newsletter_title_ar: string | null;
  newsletter_subtitle_en: string | null; newsletter_subtitle_ar: string | null;
  copyright_en: string | null; copyright_ar: string | null;
  social_links: Record<string, string>;
};

const GlobalSettingsEditor = () => {
  const [row, setRow] = useState<GlobalRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("cms_global_settings").select("*").maybeSingle();
      setRow(data as unknown as GlobalRow);
    })();
  }, []);

  const save = async () => {
    if (!row) return;
    setSaving(true);
    const { id, ...patch } = row;
    await supabase.from("cms_global_settings").update(patch as never).eq("id", id);
    setSaving(false);
    setSavedAt(new Date().toLocaleTimeString());
  };

  if (!row) return <div className="text-slate-400 text-sm">Loading…</div>;
  const set = (patch: Partial<GlobalRow>) => setRow({ ...row, ...patch });

  return (
    <div className="space-y-4 max-w-3xl">
      <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-4 space-y-3">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2"><Globe size={14} /> Brand</h3>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Brand name (EN)"><input className={inputCls} value={row.brand_name} onChange={(e) => set({ brand_name: e.target.value })} /></Field>
          <Field label="Brand name (AR)"><input dir="rtl" className={inputCls} value={row.brand_name_ar} onChange={(e) => set({ brand_name_ar: e.target.value })} /></Field>
          <Field label="Tagline (EN)"><input className={inputCls} value={row.tagline_en ?? ""} onChange={(e) => set({ tagline_en: e.target.value })} /></Field>
          <Field label="Tagline (AR)"><input dir="rtl" className={inputCls} value={row.tagline_ar ?? ""} onChange={(e) => set({ tagline_ar: e.target.value })} /></Field>
        </div>
      </div>

      <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-4 space-y-3">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2"><Palette size={14} /> Colors</h3>
        <div className="grid grid-cols-5 gap-3">
          {(["primary_color","secondary_color","accent_color","gold_color","navy_color"] as const).map(k => (
            <Field key={k} label={k.replace("_color","").replace("_"," ")}>
              <div className="flex gap-1">
                <input type="color" className="h-9 w-9 rounded border border-slate-700 bg-transparent" value={row[k]} onChange={(e) => set({ [k]: e.target.value } as Partial<GlobalRow>)} />
                <input className={inputCls} value={row[k]} onChange={(e) => set({ [k]: e.target.value } as Partial<GlobalRow>)} />
              </div>
            </Field>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-4 space-y-3">
        <h3 className="text-sm font-semibold text-white">Contact channels</h3>
        <p className="text-[11px] text-slate-500">These appear in the footer, the Contact section, and structured-data for SEO.</p>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Support email"><input className={inputCls} type="email" placeholder="support@rufayq.com" value={row.support_email ?? ""} onChange={(e) => set({ support_email: e.target.value })} /></Field>
          <Field label="Support phone"><input className={inputCls} type="tel" placeholder="+966 …" value={row.support_phone ?? ""} onChange={(e) => set({ support_phone: e.target.value })} /></Field>
          <Field label="Support WhatsApp"><input className={inputCls} placeholder="+966 … or wa.me link" value={row.support_whatsapp ?? ""} onChange={(e) => set({ support_whatsapp: e.target.value })} /></Field>
          <Field label="Sales email"><input className={inputCls} type="email" value={row.sales_email ?? ""} onChange={(e) => set({ sales_email: e.target.value })} /></Field>
          <Field label="Business hours (EN)"><input className={inputCls} placeholder="Sun – Thu · 9:00 – 18:00 AST" value={row.business_hours_en ?? ""} onChange={(e) => set({ business_hours_en: e.target.value })} /></Field>
          <Field label="ساعات العمل (AR)"><input dir="rtl" className={inputCls} value={row.business_hours_ar ?? ""} onChange={(e) => set({ business_hours_ar: e.target.value })} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Address (EN)"><textarea rows={2} className={inputCls} placeholder="Street, City, Country" value={row.address_en ?? ""} onChange={(e) => set({ address_en: e.target.value })} /></Field>
          <Field label="العنوان (AR)"><textarea rows={2} dir="rtl" className={inputCls} value={row.address_ar ?? ""} onChange={(e) => set({ address_ar: e.target.value })} /></Field>
        </div>
        <Field label="Map embed URL (Google Maps iframe src)">
          <input className={inputCls} placeholder="https://www.google.com/maps/embed?pb=…" value={row.map_embed_url ?? ""} onChange={(e) => set({ map_embed_url: e.target.value })} />
        </Field>
      </div>

      <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-4 space-y-3">
        <h3 className="text-sm font-semibold text-white">Social links</h3>
        <p className="text-[11px] text-slate-500">Used by the footer and the Contact card. Leave blank to hide an icon.</p>
        <div className="grid grid-cols-2 gap-3">
          {([
            ["twitter", "X / Twitter"], ["linkedin", "LinkedIn"],
            ["instagram", "Instagram"], ["facebook", "Facebook"],
            ["youtube", "YouTube"], ["tiktok", "TikTok"],
          ] as const).map(([k, label]) => (
            <Field key={k} label={label}>
              <input
                className={inputCls}
                placeholder={`https://${k}.com/rufayq`}
                value={(row.social_links?.[k] as string) ?? ""}
                onChange={(e) => set({ social_links: { ...(row.social_links ?? {}), [k]: e.target.value } })}
              />
            </Field>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-4 space-y-3">
        <h3 className="text-sm font-semibold text-white">Footer & language</h3>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Copyright (EN)"><input className={inputCls} value={row.copyright_en ?? ""} onChange={(e) => set({ copyright_en: e.target.value })} /></Field>
          <Field label="Copyright (AR)"><input dir="rtl" className={inputCls} value={row.copyright_ar ?? ""} onChange={(e) => set({ copyright_ar: e.target.value })} /></Field>
          <Field label="Newsletter title (EN)"><input className={inputCls} value={row.newsletter_title_en ?? ""} onChange={(e) => set({ newsletter_title_en: e.target.value })} /></Field>
          <Field label="Newsletter title (AR)"><input dir="rtl" className={inputCls} value={row.newsletter_title_ar ?? ""} onChange={(e) => set({ newsletter_title_ar: e.target.value })} /></Field>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Default language">
            <select className={inputCls} value={row.default_language} onChange={(e) => set({ default_language: e.target.value })}>
              <option value="en">English</option><option value="ar">العربية</option>
            </select>
          </Field>
          <label className="flex items-center gap-2 text-xs text-slate-300 mt-6"><input type="checkbox" checked={row.language_toggle} onChange={(e) => set({ language_toggle: e.target.checked })} />Show language toggle</label>
          <label className="flex items-center gap-2 text-xs text-slate-300 mt-6"><input type="checkbox" checked={row.sticky_header} onChange={(e) => set({ sticky_header: e.target.checked })} />Sticky header</label>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button className={btnPrimary} onClick={save} disabled={saving}><Save size={14} /> {saving ? "Saving…" : "Save changes"}</button>
        {savedAt && <span className="text-[11px] text-emerald-400">Saved at {savedAt}</span>}
      </div>
    </div>
  );
};

// ============================================================
// PUBLISH HISTORY
// ============================================================
const PublishHistory = () => {
  type V = { id: string; entity_type: string; entity_id: string; action: string; actor_id: string | null; created_at: string };
  const [items, setItems] = useState<V[]>([]);
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("cms_versions").select("id, entity_type, entity_id, action, actor_id, created_at").order("created_at", { ascending: false }).limit(100);
      setItems((data as unknown as V[]) ?? []);
    })();
  }, []);

  return (
    <div className="rounded-lg border border-slate-800 overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-slate-900/60 text-slate-400 text-xs"><tr>
          <th className="text-left p-3">Time</th><th className="text-left p-3">Entity</th><th className="text-left p-3">Action</th><th className="text-left p-3">Actor</th>
        </tr></thead>
        <tbody className="divide-y divide-slate-800">
          {items.map(i => (
            <tr key={i.id}>
              <td className="p-3 text-xs text-slate-400">{new Date(i.created_at).toLocaleString()}</td>
              <td className="p-3 text-xs"><span className="font-mono text-amber-300">{i.entity_type}</span> · <span className="text-slate-500">{i.entity_id?.slice(0, 8)}</span></td>
              <td className="p-3 text-xs text-slate-200">{i.action}</td>
              <td className="p-3 text-xs text-slate-500 font-mono">{i.actor_id?.slice(0, 8) ?? "—"}</td>
            </tr>
          ))}
          {items.length === 0 && <tr><td colSpan={4} className="p-6 text-center text-slate-500">No changes yet.</td></tr>}
        </tbody>
      </table>
    </div>
  );
};

// Small helper to keep editors compact
const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <label className="block">
    <span className="block text-xs uppercase tracking-wide text-slate-400 mb-1">{label}</span>
    {children}
  </label>
);

export default AdminWebsiteCms;
