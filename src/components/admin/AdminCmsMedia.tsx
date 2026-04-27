/**
 * AdminCmsMedia — first-version Media Library backed by Supabase Storage.
 *
 * Uploads files into the `cms-media` bucket (public). Lets admins copy the
 * public URL for use in any CMS section's image / media field. This is a
 * functional v1 — Phase 2 will add tagging, search, alt-text per locale.
 */
import { useEffect, useRef, useState } from "react";
import { Upload, Copy, Trash2, Image as ImageIcon, FileText, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface MediaItem {
  name: string;
  url: string;
  size: number;
  contentType?: string;
  updatedAt?: string;
}

const BUCKET = "cms-media";

const AdminCmsMedia = () => {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase.storage.from(BUCKET).list("", { limit: 200, sortBy: { column: "updated_at", order: "desc" } });
    if (error) {
      setError(error.message);
      setItems([]);
    } else {
      const enriched = (data ?? [])
        .filter((d) => !d.name.startsWith("."))
        .map((d) => {
          const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(d.name);
          return {
            name: d.name,
            url: pub.publicUrl,
            size: (d.metadata as { size?: number } | null)?.size ?? 0,
            contentType: (d.metadata as { mimetype?: string } | null)?.mimetype,
            updatedAt: d.updated_at ?? undefined,
          } as MediaItem;
        });
      setItems(enriched);
    }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const upload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    setError(null);
    for (const f of Array.from(files)) {
      const safe = `${Date.now()}-${f.name.replace(/[^a-zA-Z0-9._-]/g, "-")}`;
      const { error } = await supabase.storage.from(BUCKET).upload(safe, f, { upsert: false, contentType: f.type });
      if (error) { setError(error.message); break; }
    }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
    load();
  };

  const remove = async (name: string) => {
    if (!confirm(`Delete "${name}"?`)) return;
    const { error } = await supabase.storage.from(BUCKET).remove([name]);
    if (error) { setError(error.message); return; }
    load();
  };

  const copy = async (url: string) => {
    try { await navigator.clipboard.writeText(url); } catch { /* */ }
  };

  const filtered = items.filter((i) => !q.trim() || i.name.toLowerCase().includes(q.toLowerCase()));

  const fmtBytes = (b: number) => {
    if (!b) return "—";
    if (b < 1024) return `${b} B`;
    if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
    return `${(b / 1024 / 1024).toFixed(2)} MB`;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-semibold text-white">Media Library</h2>
          <p className="text-xs text-slate-400">Upload images and files for use across the site. Copy the URL into any section.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative w-56">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input className="w-full pl-7 pr-2 py-1.5 text-xs rounded-md bg-slate-950/50 border border-slate-800 text-slate-200 focus:outline-none focus:border-amber-500/50"
              placeholder="Search files…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <input ref={fileRef} type="file" multiple className="hidden" onChange={(e) => upload(e.target.files)} />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border bg-amber-500 border-amber-400 text-slate-950 hover:bg-amber-400 disabled:opacity-50"
          >
            <Upload size={12} /> {uploading ? "Uploading…" : "Upload files"}
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-rose-700/50 bg-rose-950/30 p-3 text-xs text-rose-300">
          {error}
          {error.toLowerCase().includes("bucket") && (
            <p className="mt-1 text-rose-400/80">Tip: a storage bucket called <code>cms-media</code> needs to exist. Ask an admin to create it (public read).</p>
          )}
        </div>
      )}

      {loading ? (
        <div className="text-slate-400 text-sm">Loading library…</div>
      ) : filtered.length === 0 ? (
        <div className="text-center text-slate-500 text-sm py-16 border border-dashed border-slate-800 rounded-lg">
          {items.length === 0 ? "No files yet — upload your first asset above." : "No files match."}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {filtered.map((m) => {
            const isImg = (m.contentType ?? "").startsWith("image/") || /\.(png|jpe?g|gif|webp|svg)$/i.test(m.name);
            return (
              <div key={m.name} className="rounded-lg border border-slate-800 bg-slate-900/40 overflow-hidden group">
                <div className="aspect-video bg-slate-950 flex items-center justify-center overflow-hidden">
                  {isImg ? (
                    <img src={m.url} alt={m.name} className="w-full h-full object-cover" loading="lazy" />
                  ) : (
                    <FileText size={32} className="text-slate-600" />
                  )}
                </div>
                <div className="p-2 space-y-1">
                  <div className="text-[11px] text-slate-200 truncate" title={m.name}>{m.name}</div>
                  <div className="text-[10px] text-slate-500 flex items-center gap-1">
                    {isImg ? <ImageIcon size={9} /> : <FileText size={9} />}
                    {fmtBytes(m.size)}
                  </div>
                  <div className="flex gap-1 pt-1">
                    <button
                      onClick={() => copy(m.url)}
                      className="flex-1 inline-flex items-center justify-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium border border-slate-700 text-slate-200 hover:border-amber-400"
                    >
                      <Copy size={10} /> Copy URL
                    </button>
                    <button
                      onClick={() => remove(m.name)}
                      className="inline-flex items-center justify-center px-2 py-1 rounded-md text-[10px] font-medium border border-rose-700/60 text-rose-300 hover:bg-rose-950/40"
                      aria-label={`Delete ${m.name}`}
                    >
                      <Trash2 size={10} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AdminCmsMedia;
