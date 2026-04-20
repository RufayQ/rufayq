import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CheckCircle2, XCircle, Clock } from "lucide-react";

const KIND_COLORS: Record<string, string> = {
  policy: "bg-blue-500/15 text-blue-300",
  class: "bg-violet-500/15 text-violet-300",
  network: "bg-emerald-500/15 text-emerald-300",
};

const AdminRcmActivations = () => {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("pending");

  const load = async () => {
    setLoading(true);
    let q = (supabase as any).from("rcm_policy_activation_requests").select("*").order("created_at", { ascending: false });
    if (filter !== "all") q = q.eq("status", filter);
    const { data } = await q;
    setRows(data || []); setLoading(false);
  };

  useEffect(() => { load(); }, [filter]);

  const decide = async (id: string, status: "approved" | "rejected", notes = "") => {
    const { data: u } = await supabase.auth.getUser();
    const { error } = await (supabase as any).from("rcm_policy_activation_requests")
      .update({ status, decided_by: u.user?.id, decided_at: new Date().toISOString(), decision_notes: notes })
      .eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(`Marked ${status}`);
    load();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-200">Activation worklist ({rows.length})</h3>
        <div className="flex gap-1">
          {["pending","approved","rejected","all"].map(f => (
            <button key={f} onClick={() => setFilter(f as any)}
              className={`px-3 py-1 rounded-full text-xs ${filter === f ? "bg-amber-500 text-slate-950 font-semibold" : "bg-slate-800 text-slate-300"}`}>
              {f}
            </button>
          ))}
        </div>
      </div>

      {loading ? <p className="text-slate-500 text-sm">Loading…</p>
        : rows.length === 0 ? <p className="text-slate-500 text-sm">No requests.</p>
        : <div className="space-y-2">
            {rows.map(r => (
              <div key={r.id} className="p-3 rounded-lg border border-slate-800 bg-slate-900/40">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase ${KIND_COLORS[r.kind] || ""}`}>{r.kind}</span>
                      <span className="text-xs text-slate-500">{new Date(r.created_at).toLocaleString()}</span>
                    </div>
                    <p className="text-xs text-slate-400 font-mono">
                      {r.policy_id && `policy:${r.policy_id.slice(0,8)}…`}
                      {r.class_id && `class:${r.class_id.slice(0,8)}…`}
                      {r.network_id && `network:${r.network_id.slice(0,8)}…`}
                    </p>
                    {r.decision_notes && <p className="text-xs text-slate-500 mt-1">{r.decision_notes}</p>}
                  </div>
                  <div className="flex flex-col gap-1.5">
                    {r.status === "pending" ? (
                      <>
                        <button onClick={() => decide(r.id, "approved")} className="px-3 py-1 rounded-lg bg-emerald-600 text-white text-xs flex items-center gap-1"><CheckCircle2 size={12} /> Approve</button>
                        <button onClick={() => decide(r.id, "rejected", prompt("Reason?") || "")} className="px-3 py-1 rounded-lg bg-rose-600 text-white text-xs flex items-center gap-1"><XCircle size={12} /> Reject</button>
                      </>
                    ) : (
                      <span className={`text-xs px-2 py-1 rounded-full ${r.status === "approved" ? "bg-emerald-500/15 text-emerald-300" : "bg-rose-500/15 text-rose-300"}`}>{r.status}</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>}
    </div>
  );
};

export default AdminRcmActivations;
