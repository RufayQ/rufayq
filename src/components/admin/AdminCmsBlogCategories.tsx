/**
 * AdminCmsBlogCategories — first-version Blog Categories editor.
 *
 * Categories are derived from existing news_articles rows (their `category`
 * column) and surfaced here as a manageable list. Admins can rename a
 * category in bulk (rewrites every article that uses the old name) or
 * delete it (clears the category from every matching article). New
 * categories are picked up automatically the next time articles are tagged.
 */
import { useEffect, useMemo, useState } from "react";
import { Tag, Pencil, Trash2, Check, X, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface CatRow {
  name: string;
  count: number;
  published: number;
}

const inputCls = "rounded-md bg-slate-950 border border-slate-700 px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-amber-400";
const btnGhost = "inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium border border-slate-700 text-slate-200 hover:border-amber-400";
const btnDanger = "inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium border border-rose-700/60 text-rose-300 hover:bg-rose-950/40";

const AdminCmsBlogCategories = () => {
  const [rows, setRows] = useState<CatRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingFrom, setEditingFrom] = useState<string | null>(null);
  const [editingTo, setEditingTo] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    // We aggregate client-side because RLS already permits reading articles
    // and the dataset is small. Phase 2 should move this to a SQL function.
    const { data } = await supabase
      .from("news_articles")
      .select("category, status");
    const counts = new Map<string, { count: number; published: number }>();
    (data ?? []).forEach((a: { category: string | null; status: string | null }) => {
      const cat = (a.category ?? "").trim();
      if (!cat) return;
      const prev = counts.get(cat) ?? { count: 0, published: 0 };
      prev.count += 1;
      if (a.status === "published") prev.published += 1;
      counts.set(cat, prev);
    });
    setRows(
      Array.from(counts.entries())
        .map(([name, v]) => ({ name, count: v.count, published: v.published }))
        .sort((a, b) => b.count - a.count),
    );
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const beginRename = (name: string) => { setEditingFrom(name); setEditingTo(name); };
  const cancelRename = () => { setEditingFrom(null); setEditingTo(""); };

  const commitRename = async () => {
    const from = editingFrom;
    const to = editingTo.trim();
    if (!from || !to || from === to) { cancelRename(); return; }
    if (rows.some((r) => r.name.toLowerCase() === to.toLowerCase() && r.name !== from)) {
      if (!confirm(`Category "${to}" already exists. Merge "${from}" into it?`)) return;
    }
    setBusy(true);
    await supabase.from("news_articles").update({ category: to } as never).eq("category", from);
    setBusy(false);
    cancelRename();
    load();
  };

  const remove = async (name: string) => {
    if (!confirm(`Remove the "${name}" category from every article? Articles themselves are kept.`)) return;
    setBusy(true);
    await supabase.from("news_articles").update({ category: null } as never).eq("category", name);
    setBusy(false);
    load();
  };

  const total = useMemo(() => rows.reduce((s, r) => s + r.count, 0), [rows]);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-white">Blog Categories</h2>
        <p className="text-xs text-slate-400">
          Categories are derived from your articles. Rename to merge, or remove to untag every article in that bucket.
        </p>
      </div>

      {loading ? (
        <div className="text-slate-400 text-sm">Loading categories…</div>
      ) : rows.length === 0 ? (
        <div className="text-center text-slate-500 text-sm py-12 border border-dashed border-slate-800 rounded-lg">
          No categories yet. Tag an article in <strong className="text-slate-300">News &amp; Articles</strong> and it will appear here.
        </div>
      ) : (
        <div className="rounded-lg border border-slate-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-900/60 text-slate-400 text-xs">
              <tr>
                <th className="text-left p-3">Category</th>
                <th className="text-left p-3">Articles</th>
                <th className="text-left p-3">Published</th>
                <th className="text-right p-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {rows.map((r) => {
                const editing = editingFrom === r.name;
                return (
                  <tr key={r.name} className="hover:bg-slate-900/40">
                    <td className="p-3">
                      {editing ? (
                        <input
                          autoFocus
                          className={inputCls + " w-64"}
                          value={editingTo}
                          onChange={(e) => setEditingTo(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter") commitRename(); if (e.key === "Escape") cancelRename(); }}
                        />
                      ) : (
                        <span className="inline-flex items-center gap-2 text-slate-100">
                          <Tag size={12} className="text-amber-400" />
                          {r.name}
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-xs text-slate-300">
                      <span className="inline-flex items-center gap-1"><FileText size={11} className="text-slate-500" /> {r.count}</span>
                    </td>
                    <td className="p-3 text-xs text-emerald-300">{r.published}</td>
                    <td className="p-3 text-right">
                      {editing ? (
                        <div className="inline-flex gap-1">
                          <button className={btnGhost} disabled={busy} onClick={commitRename}><Check size={11} /> Save</button>
                          <button className={btnGhost} onClick={cancelRename}><X size={11} /> Cancel</button>
                        </div>
                      ) : (
                        <div className="inline-flex gap-1">
                          <button className={btnGhost} onClick={() => beginRename(r.name)}><Pencil size={11} /> Rename</button>
                          <button className={btnDanger} disabled={busy} onClick={() => remove(r.name)}><Trash2 size={11} /></button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-slate-900/40 text-xs text-slate-500">
              <tr><td colSpan={4} className="p-3">{rows.length} categories · {total} tagged articles</td></tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
};

export default AdminCmsBlogCategories;
