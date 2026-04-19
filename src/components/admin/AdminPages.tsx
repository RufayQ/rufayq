import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Save, Eye, FileText } from "lucide-react";

interface Page {
  slug: string; title: string; body_md: string; updated_at: string;
}

const AdminPages = () => {
  const [pages, setPages] = useState<Page[]>([]);
  const [active, setActive] = useState<string>("privacy");
  const [draft, setDraft] = useState<{ title: string; body_md: string }>({ title: "", body_md: "" });
  const [preview, setPreview] = useState(false);
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
    if (p) setDraft({ title: p.title, body_md: p.body_md });
  }, [active, pages]);

  const save = async () => {
    setSaving(true);
    const { error } = await supabase.from("site_pages").update({
      title: draft.title, body_md: draft.body_md,
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
        <p className="text-[10px] text-slate-600 px-2 mt-3">
          New pages can be added from the database. Render them by their slug at /<code>{`{slug}`}</code>.
        </p>
      </aside>

      <div className="rounded-xl border border-slate-800 bg-slate-900/50">
        <div className="flex items-center justify-between p-3 border-b border-slate-800">
          <input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            className="flex-1 bg-transparent text-base font-semibold text-slate-100 outline-none" />
          <div className="flex gap-2">
            <button onClick={() => setPreview(!preview)}
              className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs flex items-center gap-1.5"><Eye size={12}/>{preview ? "Edit" : "Preview"}</button>
            <button onClick={save} disabled={saving}
              className="px-3 py-1.5 rounded-lg bg-amber-500 text-slate-950 text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50">
              <Save size={12}/>{saving ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
        {preview ? (
          <article className="prose prose-invert max-w-none p-6 min-h-[60vh]">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{draft.body_md}</ReactMarkdown>
          </article>
        ) : (
          <textarea
            value={draft.body_md}
            onChange={(e) => setDraft({ ...draft, body_md: e.target.value })}
            className="w-full p-4 bg-transparent text-sm font-mono text-slate-200 outline-none resize-none"
            rows={28}
            spellCheck={false}
            placeholder="# Heading&#10;&#10;Markdown body…"
          />
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
