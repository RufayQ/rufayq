/**
 * AdminAiUsage — daily aggregated AI prompt usage per device.
 * Modular: reads only the `ai_usage_audit` view; safe to remove independently.
 *
 * Shows: device, plan, prompts used today, daily limit, remaining, reset time.
 * Filters: plan, search by device, day window (today/last 7 days).
 */
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Activity, Search, RefreshCw, Download } from "lucide-react";

interface Row {
  device_id: string;
  usage_day: string;
  count: number;
  last_prompt_at: string;
  plan: string;
  daily_limit: number;
  resets_at: string;
}

const PLAN_COLOR: Record<string, string> = {
  trial: "bg-slate-700 text-slate-300",
  basic: "bg-blue-500/15 text-blue-300",
  companion: "bg-emerald-500/15 text-emerald-300",
  family: "bg-violet-500/15 text-violet-300",
  premium: "bg-amber-500/15 text-amber-300",
};

const formatResetIn = (iso: string) => {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return "—";
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  return h >= 1 ? `${h}h ${m}m` : `${m}m`;
};

const AdminAiUsage = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [planFilter, setPlanFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [todayOnly, setTodayOnly] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("ai_usage_audit" as any)
      .select("*")
      .order("usage_day", { ascending: false })
      .order("count", { ascending: false })
      .limit(1000);
    if (error) toast.error(error.message);
    setRows((data as unknown as Row[]) || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const today = new Date().toISOString().slice(0, 10);

  const filtered = useMemo(() => rows.filter(r => {
    if (todayOnly && r.usage_day !== today) return false;
    if (planFilter !== "all" && r.plan !== planFilter) return false;
    if (search && !r.device_id.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }), [rows, todayOnly, planFilter, search, today]);

  const stats = useMemo(() => {
    const totals = filtered.reduce((acc, r) => {
      acc.prompts += r.count;
      acc.devices += 1;
      acc.atLimit += r.count >= r.daily_limit ? 1 : 0;
      return acc;
    }, { prompts: 0, devices: 0, atLimit: 0 });
    return totals;
  }, [filtered]);

  const exportCsv = () => {
    const cols = ["usage_day", "device_id", "plan", "count", "daily_limit", "remaining", "resets_at", "last_prompt_at"];
    const rows = [cols.join(",")].concat(
      filtered.map(r => [
        r.usage_day,
        r.device_id,
        r.plan,
        r.count,
        r.daily_limit,
        Math.max(r.daily_limit - r.count, 0),
        r.resets_at,
        r.last_prompt_at,
      ].map(v => `"${String(v ?? "")}"`).join(","))
    );
    const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ai-usage-${today}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${filtered.length} rows`);
  };

  return (
    <div className="space-y-3">
      {/* KPIs */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "Active devices", value: stats.devices },
          { label: "Total prompts", value: stats.prompts },
          { label: "At daily limit", value: stats.atLimit },
        ].map(k => (
          <div key={k.label} className="rounded-xl border border-slate-800 bg-slate-900/40 p-3">
            <p className="text-[10px] uppercase tracking-wider text-slate-500">{k.label}</p>
            <p className="text-xl font-semibold text-white mt-1">{k.value.toLocaleString()}</p>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search device id…"
            className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-sm text-slate-200" />
        </div>
        <select value={planFilter} onChange={(e) => setPlanFilter(e.target.value)}
          className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200">
          <option value="all">All plans</option>
          {["trial", "basic", "companion", "family", "premium"].map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <label className="flex items-center gap-1.5 text-xs text-slate-300">
          <input type="checkbox" checked={todayOnly} onChange={(e) => setTodayOnly(e.target.checked)} />
          Today only
        </label>
        <button onClick={load} className="px-3 py-2 rounded-lg bg-slate-800 text-slate-200 text-xs flex items-center gap-1.5">
          <RefreshCw size={12} />Refresh
        </button>
        <button onClick={exportCsv} disabled={!filtered.length}
          className="px-3 py-2 rounded-lg bg-emerald-500/15 text-emerald-300 text-xs flex items-center gap-1.5 disabled:opacity-30">
          <Download size={12} />CSV
        </button>
      </div>

      {loading && <p className="text-slate-400 text-sm">Loading…</p>}
      {!loading && filtered.length === 0 && <p className="text-slate-500 text-sm">No usage in this window.</p>}

      <div className="overflow-x-auto rounded-xl border border-slate-800">
        <table className="w-full text-xs">
          <thead className="bg-slate-900/60">
            <tr className="text-left text-slate-400">
              <th className="px-3 py-2 font-medium">Day</th>
              <th className="px-3 py-2 font-medium">Device</th>
              <th className="px-3 py-2 font-medium">Plan</th>
              <th className="px-3 py-2 font-medium text-right">Used</th>
              <th className="px-3 py-2 font-medium text-right">Limit</th>
              <th className="px-3 py-2 font-medium text-right">Remaining</th>
              <th className="px-3 py-2 font-medium">Resets in</th>
              <th className="px-3 py-2 font-medium">Last prompt</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => {
              const remaining = Math.max(r.daily_limit - r.count, 0);
              const ratio = Math.min(r.count / Math.max(r.daily_limit, 1), 1);
              const atLimit = r.count >= r.daily_limit;
              return (
                <tr key={`${r.device_id}-${r.usage_day}`} className="border-t border-slate-800 hover:bg-slate-900/30">
                  <td className="px-3 py-2 text-slate-400">{r.usage_day}</td>
                  <td className="px-3 py-2 font-mono text-[10px] text-slate-400">{r.device_id.slice(0, 14)}…</td>
                  <td className="px-3 py-2">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${PLAN_COLOR[r.plan] || "bg-slate-700 text-slate-300"}`}>{r.plan}</span>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <div className="w-16 h-1 rounded-full bg-slate-800 overflow-hidden">
                        <div className="h-full" style={{
                          width: `${ratio * 100}%`,
                          background: atLimit ? "rgb(244,63,94)" : "rgb(16,185,129)",
                        }} />
                      </div>
                      <span className={atLimit ? "text-rose-300 font-semibold" : "text-slate-200"}>{r.count}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-right text-slate-400">{r.daily_limit}</td>
                  <td className={`px-3 py-2 text-right font-semibold ${atLimit ? "text-rose-300" : "text-emerald-300"}`}>{remaining}</td>
                  <td className="px-3 py-2 text-slate-400">{r.usage_day === today ? formatResetIn(r.resets_at) : "—"}</td>
                  <td className="px-3 py-2 text-slate-500 text-[10px] font-mono">{new Date(r.last_prompt_at).toLocaleTimeString()}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminAiUsage;
