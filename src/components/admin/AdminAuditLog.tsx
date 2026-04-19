import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Activity, Search, RefreshCw } from "lucide-react";

interface Entry {
  id: string; created_at: string;
  actor_id: string | null; actor_email: string | null; actor_role: string | null;
  action: string; target_type: string | null; target_id: string | null;
  details: any; ip_address: string | null;
}

const ACTION_COLORS: Record<string, string> = {
  manual_otp_generated: "bg-amber-500/15 text-amber-300",
  manual_otp_consumed: "bg-emerald-500/15 text-emerald-300",
  staff_user_created: "bg-blue-500/15 text-blue-300",
  user_role_added: "bg-violet-500/15 text-violet-300",
  user_status_changed: "bg-rose-500/15 text-rose-300",
  profile_updated: "bg-slate-500/15 text-slate-300",
  organization_created: "bg-teal-500/15 text-teal-300",
  organization_deleted: "bg-rose-500/15 text-rose-300",
  trial_extended: "bg-emerald-500/15 text-emerald-300",
  page_updated: "bg-blue-500/15 text-blue-300",
  ticket_updated: "bg-amber-500/15 text-amber-300",
  user_soft_deleted: "bg-rose-500/15 text-rose-300",
  user_restored: "bg-emerald-500/15 text-emerald-300",
};

const AdminAuditLog = () => {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("admin_audit_log").select("*").order("created_at", { ascending: false }).limit(500);
    if (error) toast.error(error.message);
    setEntries((data as Entry[]) || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const actions = Array.from(new Set(entries.map(e => e.action))).sort();
  const filtered = entries.filter(e => {
    if (filter !== "all" && e.action !== filter) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return e.actor_email?.toLowerCase().includes(q)
      || e.action.toLowerCase().includes(q)
      || e.target_id?.toLowerCase().includes(q)
      || JSON.stringify(e.details || {}).toLowerCase().includes(q);
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search actor, target, details…"
            className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-sm text-slate-200" />
        </div>
        <select value={filter} onChange={(e) => setFilter(e.target.value)}
          className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200">
          <option value="all">All actions</option>
          {actions.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        <button onClick={load} className="px-3 py-2 rounded-lg bg-slate-800 text-slate-200 text-xs flex items-center gap-1.5"><RefreshCw size={12}/>Refresh</button>
        <p className="text-xs text-slate-500 ml-auto">{filtered.length} of {entries.length}</p>
      </div>

      {loading && <p className="text-slate-400 text-sm">Loading…</p>}
      {!loading && filtered.length === 0 && <p className="text-slate-500 text-sm">No audit entries.</p>}

      <div className="space-y-1.5">
        {filtered.map(e => (
          <div key={e.id} className="rounded-lg border border-slate-800 bg-slate-900/40 p-3 text-xs">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2 flex-wrap">
                <Activity size={12} className="text-slate-500" />
                <span className={`px-2 py-0.5 rounded font-mono text-[10px] ${ACTION_COLORS[e.action] || "bg-slate-700 text-slate-300"}`}>{e.action}</span>
                <span className="text-slate-300">{e.actor_email || "system"}</span>
                {e.actor_role && <span className="text-[10px] text-slate-500">({e.actor_role})</span>}
                {e.target_type && (
                  <span className="text-slate-500">→ {e.target_type}{e.target_id ? `:${e.target_id.slice(0, 12)}` : ""}</span>
                )}
              </div>
              <span className="text-[10px] text-slate-500 font-mono">{new Date(e.created_at).toLocaleString()}</span>
            </div>
            {e.details && Object.keys(e.details).length > 0 && (
              <pre className="mt-1.5 text-[10px] text-slate-400 font-mono bg-slate-950/50 rounded p-2 overflow-x-auto">{JSON.stringify(e.details, null, 0)}</pre>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminAuditLog;
