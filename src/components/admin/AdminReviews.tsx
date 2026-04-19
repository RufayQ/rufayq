import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Star, Check, X, Trash2 } from "lucide-react";

interface Review {
  id: string; rating: number; reviewer_name: string | null; reviewer_country: string | null;
  notes: string | null; advice: string | null; approved: boolean; created_at: string;
}

const AdminReviews = () => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("app_reviews").select("*").order("created_at", { ascending: false });
    if (error) toast.error(error.message); else setReviews((data || []) as Review[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const setApproved = async (id: string, approved: boolean) => {
    const { error } = await supabase.from("app_reviews").update({ approved }).eq("id", id);
    if (error) toast.error(error.message); else { toast.success(approved ? "Approved" : "Unapproved"); load(); }
  };
  const remove = async (id: string) => {
    if (!confirm("Delete this review?")) return;
    const { error } = await supabase.from("app_reviews").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Deleted"); load(); }
  };

  if (loading) return <p className="text-slate-400 text-sm">Loading…</p>;

  return (
    <div className="space-y-3">
      {reviews.length === 0 && <p className="text-slate-500 text-sm">No reviews yet.</p>}
      {reviews.map((r) => (
        <div key={r.id} className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <div className="flex">
                  {[1,2,3,4,5].map(n => <Star key={n} size={14} fill={n <= r.rating ? "#C5965A" : "transparent"} color="#C5965A" strokeWidth={1.5} />)}
                </div>
                <span className="text-xs text-slate-400">{r.reviewer_name || "Anonymous"}{r.reviewer_country ? ` · ${r.reviewer_country}` : ""}</span>
                <span className="text-xs text-slate-600">· {new Date(r.created_at).toLocaleDateString()}</span>
                {r.approved
                  ? <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300">Approved</span>
                  : <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300">Pending</span>}
              </div>
              <p className="text-sm text-slate-200 mb-1">{r.notes}</p>
              {r.advice && <p className="text-xs text-slate-400 italic">Advice: {r.advice}</p>}
            </div>
            <div className="flex flex-col gap-1.5 shrink-0">
              {!r.approved
                ? <button onClick={() => setApproved(r.id, true)} className="px-3 py-1.5 rounded-lg bg-emerald-500/15 text-emerald-300 text-xs font-medium flex items-center gap-1.5"><Check size={12}/>Approve</button>
                : <button onClick={() => setApproved(r.id, false)} className="px-3 py-1.5 rounded-lg bg-amber-500/15 text-amber-300 text-xs font-medium flex items-center gap-1.5"><X size={12}/>Unapprove</button>}
              <button onClick={() => remove(r.id)} className="px-3 py-1.5 rounded-lg bg-rose-500/15 text-rose-300 text-xs font-medium flex items-center gap-1.5"><Trash2 size={12}/>Delete</button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default AdminReviews;
