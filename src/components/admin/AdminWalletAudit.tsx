/**
 * AdminWalletAudit — admin-only screen showing:
 *  1) Wallet audit log (payouts, disputes, integrity) with filters & CSV export.
 *  2) Open wallet integrity alerts with a "Resolve" action and a manual
 *     "Run integrity check now" trigger that calls reconcile_wallet_balances().
 *
 * All data is read via Supabase RLS (admin-only policies on both tables).
 */
import { useEffect, useMemo, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Activity, RefreshCw, Download, ShieldAlert, CheckCircle2, Search, Loader2, Filter,
} from "lucide-react";

interface AuditRow {
  id: string;
  created_at: string;
  actor_id: string | null;
  actor_email: string | null;
  action: string;
  target_type: string | null;
  target_id: string | null;
  wallet_id: string | null;
  user_id: string | null;
  device_id: string | null;
  amount: number | null;
  currency: string | null;
  details: Record<string, any> | null;
}

interface IntegrityRow {
  id: string;
  wallet_id: string;
  user_id: string | null;
  device_id: string | null;
  expected_balance: number;
  actual_balance: number;
  drift: number;
  currency: string;
  resolved: boolean;
  resolved_at: string | null;
  notes: string | null;
  created_at: string;
}

const ACTION_TONE: Record<string, string> = {
  payout_recorded: "bg-amber-500/15 text-amber-300",
  dispute_opened: "bg-blue-500/15 text-blue-300",
  dispute_status_changed: "bg-violet-500/15 text-violet-300",
  dispute_resolved: "bg-emerald-500/15 text-emerald-300",
  manual_refund: "bg-emerald-500/15 text-emerald-300",
  integrity_flagged: "bg-rose-500/15 text-rose-300",
};

const AdminWalletAudit = () => {
  const [audit, setAudit] = useState<AuditRow[]>([]);
  const [alerts, setAlerts] = useState<IntegrityRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("all");

  const load = useCallback(async () => {
    setLoading(true);
    const [a, b] = await Promise.all([
      supabase.from("wallet_audit_log").select("*").order("created_at", { ascending: false }).limit(500),
      supabase.from("wallet_integrity_alerts").select("*").order("created_at", { ascending: false }).limit(200),
    ]);
    if (a.error) toast.error(a.error.message);
    if (b.error) toast.error(b.error.message);
    setAudit((a.data as AuditRow[]) || []);
    setAlerts((b.data as IntegrityRow[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const runCheck = async () => {
    setRunning(true);
    const { data, error } = await supabase.rpc("reconcile_wallet_balances");
    setRunning(false);
    if (error) { toast.error(error.message); return; }
    const row = Array.isArray(data) ? data[0] : data;
    toast.success(`Checked ${row?.checked ?? 0} wallets — flagged ${row?.flagged ?? 0}`);
    load();
  };

  const resolveAlert = async (id: string) => {
    const { error } = await supabase
      .from("wallet_integrity_alerts")
      .update({ resolved: true, resolved_at: new Date().toISOString() })
      .eq("id", id);
    if (error) { toast.error(error.message); return; }
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, resolved: true } : a));
  };

  const actions = useMemo(
    () => Array.from(new Set(audit.map(e => e.action))).sort(),
    [audit],
  );

  const filtered = useMemo(() => audit.filter(r => {
    if (actionFilter !== "all" && r.action !== actionFilter) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      r.actor_email?.toLowerCase().includes(q) ||
      r.action.toLowerCase().includes(q) ||
      r.user_id?.toLowerCase().includes(q) ||
      r.device_id?.toLowerCase().includes(q) ||
      r.target_id?.toLowerCase().includes(q)
    );
  }), [audit, actionFilter, search]);

  const exportCsv = () => {
    const headers = ["When", "Action", "Actor", "Amount", "Currency", "Target", "Wallet", "User", "Device", "Details"];
    const lines = [headers.join(",")];
    for (const r of filtered) {
      const cells = [
        new Date(r.created_at).toISOString(),
        r.action,
        r.actor_email || "system",
        r.amount?.toString() || "",
        r.currency || "",
        `${r.target_type || ""}:${r.target_id || ""}`,
        r.wallet_id || "",
        r.user_id || "",
        r.device_id || "",
        JSON.stringify(r.details || {}),
      ].map(v => `"${String(v).replace(/"/g, '""')}"`);
      lines.push(cells.join(","));
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `wallet-audit-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const openAlerts = alerts.filter(a => !a.resolved);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-100 inline-flex items-center gap-2">
            <Activity size={18} className="text-amber-300" /> Wallet & Refund Audit
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Every payout, dispute, and integrity check is recorded here.
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={runCheck} disabled={running}
            className="px-3 py-1.5 rounded-lg bg-blue-500/15 hover:bg-blue-500/25 text-blue-300 text-xs inline-flex items-center gap-1.5 disabled:opacity-40">
            {running ? <Loader2 size={12} className="animate-spin"/> : <ShieldAlert size={12}/>}
            Run integrity check
          </button>
          <button onClick={load}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs inline-flex items-center gap-1.5">
            <RefreshCw size={12}/> Reload
          </button>
          <button onClick={exportCsv}
            className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs inline-flex items-center gap-1.5">
            <Download size={12}/> CSV
          </button>
        </div>
      </header>

      {/* Open integrity alerts */}
      {openAlerts.length > 0 && (
        <section className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-4">
          <h2 className="text-sm font-semibold text-rose-300 mb-2 inline-flex items-center gap-1.5">
            <ShieldAlert size={14}/> {openAlerts.length} open integrity alert{openAlerts.length > 1 ? "s" : ""}
          </h2>
          <div className="space-y-2">
            {openAlerts.map(a => (
              <div key={a.id} className="flex flex-wrap items-center gap-2 text-xs bg-slate-900/40 rounded p-2">
                <span className="text-slate-400">{new Date(a.created_at).toLocaleString()}</span>
                <span className="font-mono text-slate-300 truncate max-w-[160px]">{a.wallet_id.slice(0, 8)}…</span>
                <span className="text-slate-300">expected <span className="font-mono text-emerald-300">{a.currency} {a.expected_balance}</span></span>
                <span className="text-slate-300">actual <span className="font-mono text-rose-300">{a.currency} {a.actual_balance}</span></span>
                <span className="text-amber-300">drift <span className="font-mono">{a.drift}</span></span>
                <button onClick={() => resolveAlert(a.id)}
                  className="ml-auto px-2 py-1 rounded bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 inline-flex items-center gap-1">
                  <CheckCircle2 size={11}/> Resolve
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="flex-1 min-w-[200px] relative">
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500"/>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search actor, user, device, target id…"
            className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-7 pr-3 py-2 text-xs text-slate-200"/>
        </div>
        <div className="relative">
          <Filter size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none"/>
          <select value={actionFilter} onChange={e => setActionFilter(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-lg pl-7 pr-3 py-2 text-xs text-slate-200">
            <option value="all">All actions</option>
            {actions.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
      </div>

      {/* Audit table */}
      <div className="rounded-xl border border-slate-800 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-500 text-xs">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs">No entries.</div>
        ) : (
          <table className="w-full text-xs">
            <thead className="bg-slate-900/60 text-slate-400">
              <tr>
                <th className="text-left px-3 py-2 font-medium">When</th>
                <th className="text-left px-3 py-2 font-medium">Action</th>
                <th className="text-left px-3 py-2 font-medium">Actor</th>
                <th className="text-right px-3 py-2 font-medium">Amount</th>
                <th className="text-left px-3 py-2 font-medium">Target</th>
                <th className="text-left px-3 py-2 font-medium">Details</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => (
                <tr key={r.id} className="border-t border-slate-800 hover:bg-slate-900/40">
                  <td className="px-3 py-2 text-slate-400 whitespace-nowrap">
                    {new Date(r.created_at).toLocaleString()}
                  </td>
                  <td className="px-3 py-2">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] ${ACTION_TONE[r.action] || "bg-slate-700/40 text-slate-300"}`}>
                      {r.action}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-slate-300">{r.actor_email || <span className="text-slate-500 italic">system</span>}</td>
                  <td className="px-3 py-2 text-right font-mono text-slate-200">
                    {r.amount != null ? `${r.currency || ""} ${Number(r.amount).toFixed(2)}` : "—"}
                  </td>
                  <td className="px-3 py-2 text-slate-400 font-mono">
                    {r.target_type ? `${r.target_type}:${(r.target_id || "").slice(0, 8)}` : "—"}
                  </td>
                  <td className="px-3 py-2 text-slate-500 max-w-[280px] truncate" title={JSON.stringify(r.details)}>
                    {r.details ? Object.entries(r.details).slice(0, 3).map(([k, v]) => `${k}=${v}`).join(" · ") : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default AdminWalletAudit;
