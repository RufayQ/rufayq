import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CheckCircle, XCircle, Clock, FileWarning } from "lucide-react";

interface Props { organizationId: string; }

const STATUS_COLORS: Record<string, string> = {
  pending: "text-amber-400 bg-amber-500/10",
  assigned: "text-blue-400 bg-blue-500/10",
  in_progress: "text-indigo-400 bg-indigo-500/10",
  activated: "text-emerald-400 bg-emerald-500/10",
  rejected: "text-rose-400 bg-rose-500/10",
  cancelled: "text-slate-400 bg-slate-500/10",
};

const RcmActivationWorklist = ({ organizationId }: Props) => {
  const [rows, setRows] = useState<any[]>([]);
  const [filter, setFilter] = useState("pending");

  const load = async () => {
    const { data, error } = await (supabase as any).from("rcm_policy_activation_requests")
      .select("*").eq("organization_id", organizationId).order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setRows(data || []);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [organizationId]);

  const decide = async (id: string, status: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await (supabase as any).from("rcm_policy_activation_requests").update({
      status, decided_at: new Date().toISOString(), decided_by: user?.id,
    }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(`Marked ${status}`);
    load();
  };

  const visible = rows.filter(r => filter === "all" || r.status === filter);

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <FileWarning size={14} className="text-amber-400" />
        <h3 className="text-sm font-semibold">Policy Activation Worklist ({visible.length})</h3>
        <select value={filter} onChange={e => setFilter(e.target.value)} className="ml-auto bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200">
          <option value="pending">Pending</option>
          <option value="assigned">Assigned</option>
          <option value="in_progress">In progress</option>
          <option value="activated">Activated</option>
          <option value="rejected">Rejected</option>
          <option value="all">All</option>
        </select>
      </div>

      {visible.length === 0 && <p className="text-slate-500 text-sm">No activation requests in this state.</p>}

      <div className="space-y-2">
        {visible.map(r => (
          <div key={r.id} className="p-3 rounded-lg border border-slate-800 bg-slate-900/40">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <p className="text-sm font-mono text-slate-100">{r.patient_device_id || "—"}</p>
                <p className="text-[11px] text-slate-500">Visit {r.visit_ref || "—"} · Exception: <span className="text-amber-300">{r.exception_type}</span></p>
                {r.member_number && <p className="text-[11px] text-slate-400 mt-0.5">Member #{r.member_number}</p>}
                {r.decision_notes && <p className="text-[11px] text-slate-300 italic mt-1">"{r.decision_notes}"</p>}
                <p className="text-[10px] text-slate-500 mt-1">{new Date(r.created_at).toLocaleString()}</p>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase font-bold ${STATUS_COLORS[r.status] || "bg-slate-800 text-slate-300"}`}>{r.status}</span>
            </div>

            {(r.status === "pending" || r.status === "assigned" || r.status === "in_progress") && (
              <div className="flex gap-1.5 mt-2.5">
                {r.status === "pending" && <button onClick={() => decide(r.id, "in_progress")} className="px-2.5 py-1 rounded text-[11px] bg-blue-600 text-white flex items-center gap-1"><Clock size={11} />Take</button>}
                <button onClick={() => decide(r.id, "activated")} className="px-2.5 py-1 rounded text-[11px] bg-emerald-600 text-white flex items-center gap-1"><CheckCircle size={11} />Activate</button>
                <button onClick={() => decide(r.id, "rejected")} className="px-2.5 py-1 rounded text-[11px] bg-rose-600 text-white flex items-center gap-1"><XCircle size={11} />Reject</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default RcmActivationWorklist;
