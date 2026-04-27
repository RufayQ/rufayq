/**
 * AdminCmsBlogCategories — first-version Blog Categories editor.
 *
 * News articles in this project are stored as a JSON block inside
 * `site_pages` (slug = "landing-news"), not in their own table. So this v1
 * lets admins maintain the canonical list of category names that the
 * News & Articles editor should suggest. The list is persisted in
 * `cms_global_settings.social_links` is NOT the right home, so we keep it
 * in localStorage for now and surface it to the News editor in Phase 2.
 */
import { useEffect, useMemo, useState } from "react";
import { Tag, Pencil, Trash2, Check, X, Plus } from "lucide-react";

const STORAGE_KEY = "rufayq.cms.blog_categories";
const DEFAULTS = ["Treatment", "Travel", "Insurance", "Wellness", "Stories"];

const inputCls = "rounded-md bg-slate-950 border border-slate-700 px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-amber-400";
const btnGhost = "inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium border border-slate-700 text-slate-200 hover:border-amber-400";
const btnDanger = "inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium border border-rose-700/60 text-rose-300 hover:bg-rose-950/40";
const btnPrimary = "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border bg-amber-500 border-amber-400 text-slate-950 hover:bg-amber-400";

const load = (): string[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.filter((x) => typeof x === "string") : DEFAULTS;
  } catch { return DEFAULTS; }
};
const persist = (cats: string[]) => {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(cats)); } catch { /* */ }
};

const AdminCmsBlogCategories = () => {
  const [cats, setCats] = useState<string[]>([]);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editingTo, setEditingTo] = useState("");
  const [adding, setAdding] = useState("");

  useEffect(() => { setCats(load()); }, []);
  useEffect(() => { if (cats.length) persist(cats); }, [cats]);

  const beginRename = (i: number) => { setEditingIdx(i); setEditingTo(cats[i]); };
  const cancelRename = () => { setEditingIdx(null); setEditingTo(""); };
  const commitRename = () => {
    if (editingIdx === null) return;
    const to = editingTo.trim();
    if (!to) return;
    setCats((prev) => prev.map((c, i) => (i === editingIdx ? to : c)));
    cancelRename();
  };
  const remove = (i: number) => {
    if (!confirm(`Remove "${cats[i]}"?`)) return;
    setCats((prev) => prev.filter((_, idx) => idx !== i));
  };
  const add = () => {
    const v = adding.trim();
    if (!v) return;
    if (cats.some((c) => c.toLowerCase() === v.toLowerCase())) { setAdding(""); return; }
    setCats((prev) => [...prev, v]);
    setAdding("");
  };

  const total = useMemo(() => cats.length, [cats]);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-white">Blog Categories</h2>
        <p className="text-xs text-slate-400">
          Maintain the canonical list of categories that the News &amp; Articles editor will suggest.
          Renaming or removing here does not retroactively change existing articles.
        </p>
      </div>

      <div className="flex items-center gap-2">
        <input
          className={inputCls + " w-64"}
          placeholder="New category name…"
          value={adding}
          onChange={(e) => setAdding(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") add(); }}
        />
        <button className={btnPrimary} onClick={add}><Plus size={12} /> Add</button>
      </div>

      <div className="rounded-lg border border-slate-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-900/60 text-slate-400 text-xs">
            <tr><th className="text-left p-3">Category</th><th className="text-right p-3">Actions</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {cats.map((name, i) => {
              const editing = editingIdx === i;
              return (
                <tr key={`${name}-${i}`} className="hover:bg-slate-900/40">
                  <td className="p-3">
                    {editing ? (
                      <input autoFocus className={inputCls + " w-64"} value={editingTo}
                        onChange={(e) => setEditingTo(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") commitRename(); if (e.key === "Escape") cancelRename(); }} />
                    ) : (
                      <span className="inline-flex items-center gap-2 text-slate-100">
                        <Tag size={12} className="text-amber-400" /> {name}
                      </span>
                    )}
                  </td>
                  <td className="p-3 text-right">
                    {editing ? (
                      <div className="inline-flex gap-1">
                        <button className={btnGhost} onClick={commitRename}><Check size={11} /> Save</button>
                        <button className={btnGhost} onClick={cancelRename}><X size={11} /> Cancel</button>
                      </div>
                    ) : (
                      <div className="inline-flex gap-1">
                        <button className={btnGhost} onClick={() => beginRename(i)}><Pencil size={11} /> Rename</button>
                        <button className={btnDanger} onClick={() => remove(i)}><Trash2 size={11} /></button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
            {cats.length === 0 && (
              <tr><td colSpan={2} className="p-6 text-center text-slate-500 text-sm">No categories yet — add one above.</td></tr>
            )}
          </tbody>
          <tfoot className="bg-slate-900/40 text-xs text-slate-500">
            <tr><td colSpan={2} className="p-3">{total} categories</td></tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};

export default AdminCmsBlogCategories;
