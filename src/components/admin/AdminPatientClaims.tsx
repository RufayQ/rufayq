import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Check, X, Search } from "lucide-react";

interface Claim {
  id: string;
  organization_id: string;
  search_type: string;
  search_value: string;
  matched_device_id: string | null;
  matched_profile_id: string | null;
  reason: string | null;
  status: string;
  created_at: string;
  org_name?: string;
}

const AdminPatientClaims = () => {
  const [loading, setLoading] = useState(true);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [filter, setFilter] = useState<string>("pending_admin");

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("patient_claims")
      .select("id, organization_id, search_type, search_value, matched_device_id, matched_profile_id, reason, status, created_at, organizations:organization_id(name)")
      .order("created_at", { ascending: false });
    if (error) { toast.error(error.message); setLoading(false); return; }
    setClaims((data || []).map((c: any) => ({ ...c, org_name: c.organizations?.name })));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const decide = async (id: string, approve: boolean) => {
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("patient_claims")
      .update({
        status: approve ? "pending_patient" : "rejected",
        admin_decision_at: new Date().toISOString(),
        admin_decision_by: user?.id,
      } as any)
      .eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success(approve ? "Sent to patient for consent" : "Rejected");
    await load();
  };

  const visible = claims.filter((c) => filter === "all" || c.status === filter);

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <h2 className="text-xl font-semibold">Patient Claims</h2>
        <select value={filter} onChange={(e) => setFilter(e.target.value)}
          className="ml-auto bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-sm">
          <option value="pending_admin">Pending admin</option>
          <option value="pending_patient">Awaiting patient</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="all">All</option>
        </select>
      </div>

      {loading && <p className="text-slate-400">Loading…</p>}

      {!loading && visible.length === 0 && (
        <div className="text-center py-16 text-slate-500">
          <Search size={32} className="mx-auto mb-3 opacity-50" />
          No claims in this state.
        </div>
      )}

      <div className="space-y-3">
        {visible.map((c) => (
          <div key={c.id} className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
            <div className="flex items-start gap-3">
              <div className="flex-1">
                <p className="font-semibold">{c.org_name || c.organization_id}</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  Search: <span className="text-slate-200 font-mono">{c.search_type}={c.search_value}</span>
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  Match: {c.matched_device_id ? <span className="text-emerald-400">found</span> : <span className="text-amber-400">no patient yet</span>}
                </p>
                {c.reason && <p className="text-xs text-slate-300 mt-2 italic">"{c.reason}"</p>}
                <p className="text-[10px] text-slate-500 mt-1">{new Date(c.created_at).toLocaleString()}</p>
              </div>
              <span className="px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide bg-slate-800 text-slate-300">
                {c.status}
              </span>
            </div>

            {c.status === "pending_admin" && (
              <div className="flex gap-2 mt-3">
                <button onClick={() => decide(c.id, true)} disabled={!c.matched_device_id}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed">
                  <Check size={14} /> Approve → Patient
                </button>
                <button onClick={() => decide(c.id, false)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 bg-rose-600 hover:bg-rose-500">
                  <X size={14} /> Reject
                </button>
                {!c.matched_device_id && (
                  <span className="text-[10px] text-amber-400 self-center">Patient not registered yet — wait for signup</span>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminPatientClaims;
