import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Save, Eye, FileText } from "lucide-react";

interface Page {
  slug: string; title: string; body_md: string; body_md_ar: string; updated_at: string;
}

type Lang = "en" | "ar";
type Preview = "off" | "en" | "ar" | "both";

const AdminPages = () => {
  const [pages, setPages] = useState<Page[]>([]);
  const [active, setActive] = useState<string>("privacy");
  const [draft, setDraft] = useState<{ title: string; body_md: string; body_md_ar: string }>({ title: "", body_md: "", body_md_ar: "" });
  const [editLang, setEditLang] = useState<Lang>("en");
  const [preview, setPreview] = useState<Preview>("off");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("site_pages").select("*").order("slug");
    if (error) toast.error(error.message); else setPages((data || []) as Page[]);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  useEffect(() => {
    const p = pages.find((x) => x.slug === active);
    if (p) setDraft({ title: p.title, body_md: p.body_md || "", body_md_ar: p.body_md_ar || "" });
  }, [active, pages]);

  const save = async () => {
    setSaving(true);
    const { error } = await supabase.from("site_pages").update({
      title: draft.title, body_md: draft.body_md, body_md_ar: draft.body_md_ar,
    }).eq("slug", active);
    setSaving(false);
    if (error) toast.error(error.message); else {
      await supabase.rpc("log_audit_event", { _action: "page_updated", _target_type: "site_page", _target_id: active, _details: { title: draft.title } });
      toast.success("Page saved · live now"); load();
    }
  };

  const current = pages.find((x) => x.slug === active);

  if (loading) return <p className="text-slate-400 text-sm">Loading…</p>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-[180px_1fr] gap-4">
      <aside className="space-y-1">
        <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-2 px-2">Pages</p>
        {pages.map((p) => (
          <button key={p.slug} onClick={() => setActive(p.slug)}
            className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2 ${
              active === p.slug ? "bg-amber-500/15 text-amber-300" : "text-slate-400 hover:bg-slate-800/50"
            }`}>
            <FileText size={13} />
            <span className="truncate">{p.title}</span>
          </button>
        ))}
        <p className="text-[10px] text-slate-600 px-2 mt-3 leading-relaxed">
          <span className="text-amber-400">Landing Sections</span> controls the homepage section text
          (Features, How, Pricing, FAQ, Contact, For Providers). Use the convention:
          <br /><code className="text-amber-400">## features</code> → <code className="text-amber-400">### Title</code> / <code className="text-amber-400">### Subtitle</code>.
          Fonts &amp; colors stay code-controlled.
        </p>
      </aside>

      <div className="rounded-xl border border-slate-800 bg-slate-900/50">
        <div className="flex items-center justify-between p-3 border-b border-slate-800 gap-2 flex-wrap">
          <input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            className="flex-1 min-w-[160px] bg-transparent text-base font-semibold text-slate-100 outline-none" />
          <div className="flex gap-2 items-center">
            <div className="flex rounded-lg bg-slate-800 p-0.5">
              <button onClick={() => setEditLang("en")}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold ${editLang === "en" ? "bg-amber-500 text-slate-950" : "text-slate-400"}`}>EN</button>
              <button onClick={() => setEditLang("ar")}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold ${editLang === "ar" ? "bg-amber-500 text-slate-950" : "text-slate-400"}`}>AR</button>
            </div>
            <div className="flex rounded-lg bg-slate-800 p-0.5">
              {(["off","en","ar","both"] as Preview[]).map(p => (
                <button key={p} onClick={() => setPreview(p)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold uppercase ${preview === p ? "bg-slate-700 text-amber-300" : "text-slate-400"}`}>
                  {p === "off" ? <Eye size={11}/> : p}
                </button>
              ))}
            </div>
            <button onClick={save} disabled={saving}
              className="px-3 py-1.5 rounded-lg bg-amber-500 text-slate-950 text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50">
              <Save size={12}/>{saving ? "Saving…" : "Save"}
            </button>
          </div>
        </div>

        {preview === "off" ? (
          <textarea
            key={editLang}
            value={editLang === "en" ? draft.body_md : draft.body_md_ar}
            onChange={(e) => setDraft({ ...draft, [editLang === "en" ? "body_md" : "body_md_ar"]: e.target.value })}
            dir={editLang === "ar" ? "rtl" : "ltr"}
            className="w-full p-4 bg-transparent text-sm font-mono text-slate-200 outline-none resize-none"
            rows={28}
            spellCheck={false}
            placeholder={editLang === "en" ? "# Heading\n\nMarkdown body…" : "# عنوان\n\nمحتوى ماركداون…"}
          />
        ) : (
          <div className={`p-6 min-h-[60vh] ${preview === "both" ? "grid md:grid-cols-2 gap-6" : ""}`}>
            {(preview === "en" || preview === "both") && (
              <article className="prose prose-invert max-w-none">
                {preview === "both" && <p className="text-[10px] uppercase tracking-wider text-amber-400 mb-2">English</p>}
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{draft.body_md || "_Empty_"}</ReactMarkdown>
              </article>
            )}
            {(preview === "ar" || preview === "both") && (
              <article className="prose prose-invert max-w-none" dir="rtl">
                {preview === "both" && <p className="text-[10px] uppercase tracking-wider text-amber-400 mb-2" dir="ltr">Arabic</p>}
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{draft.body_md_ar || "_فارغ_"}</ReactMarkdown>
              </article>
            )}
          </div>
        )}

        {current && (
          <p className="text-[10px] text-slate-600 px-3 py-2 border-t border-slate-800">
            Last updated: {new Date(current.updated_at).toLocaleString()} · Slug: <code>{current.slug}</code> · Live at /{current.slug}
          </p>
        )}
      </div>
    </div>
  );
};

export default AdminPages;
