import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Shield, ChevronLeft, RefreshCw, AlertTriangle, CheckCircle2, EyeOff, Activity, Download, PlayCircle } from "lucide-react";

type ScanRun = {
  ran_at: string;
  source: "manual" | "cron";
  status: "ok" | "partial" | "failed";
  total: number;
  open: number;
  fixed_now: number;
  duration_ms: number | null;
  error_summary: string | null;
};

type Finding = {
  id: string;
  scanner_name: string;
  internal_id: string;
  title: string;
  severity: "low" | "medium" | "high" | "critical";
  status: "open" | "fixed" | "ignored";
  description: string | null;
  first_seen_at: string;
  last_seen_at: string;
  resolved_at: string | null;
  resolution_note: string | null;
};

const SEV_TONE: Record<string, string> = {
  critical: "bg-red-500/20 text-red-300 border-red-500/40",
  high: "bg-orange-500/20 text-orange-300 border-orange-500/40",
  medium: "bg-amber-500/20 text-amber-300 border-amber-500/40",
  low: "bg-slate-500/20 text-slate-300 border-slate-500/40",
};
const STATUS_TONE: Record<string, string> = {
  open: "bg-rose-500/20 text-rose-300 border-rose-500/40",
  fixed: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
  ignored: "bg-slate-500/20 text-slate-400 border-slate-500/40",
};

const fmt = (s: string | null) => (s ? new Date(s).toLocaleString() : "—");

export default function AdminSecurity() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<Finding[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<"all" | Finding["status"]>("all");
  const [filterSev, setFilterSev] = useState<"all" | Finding["severity"]>("all");
  const [cronHealth, setCronHealth] = useState<"checking" | "ok" | "fail">("checking");
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [lastRun, setLastRun] = useState<ScanRun | null>(null);
  const [scanning, setScanning] = useState(false);
  const inFlightRef = useRef(false);

  const loadLastRun = useCallback(async () => {
    const { data } = await supabase
      .from("security_scan_runs")
      .select("ran_at, source, status, total, open, fixed_now, duration_ms, error_summary")
      .order("ran_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data) setLastRun(data as ScanRun);
  }, []);

  const load = useCallback(async (opts: { silent?: boolean } = {}) => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    if (!opts.silent) setLoading(true);
    const { data, error } = await supabase
      .from("security_findings")
      .select("id, scanner_name, internal_id, title, severity, status, description, first_seen_at, last_seen_at, resolved_at, resolution_note")
      .order("severity", { ascending: false })
      .order("last_seen_at", { ascending: false });
    if (error) setErr(error.message);
    else { setRows((data ?? []) as Finding[]); setErr(null); }
    setLastRefresh(new Date());
    setLoading(false);
    inFlightRef.current = false;
    void loadLastRun();
  }, [loadLastRun]);

  const checkCron = async () => {
    setCronHealth("checking");
    try {
      const { data, error } = await supabase.functions.invoke("security-scan-run", {
        body: { health: true },
        headers: { "x-health-check": "1" },
      });
      if (!error && (data as { ok?: boolean })?.ok) setCronHealth("ok");
      else setCronHealth("fail");
    } catch { setCronHealth("fail"); }
  };

  const runScan = async () => {
    if (scanning) return;
    setScanning(true);
    const t = toast.loading("Running security scan…");
    try {
      const { data, error } = await supabase.functions.invoke("security-scan-run", {
        body: { source: "manual" },
      });
      if (error) throw error;
      const r = data as { open?: number; fixed_now?: number; total?: number; status?: string; errors?: string[] };
      const msg = `Scan ${r.status ?? "ok"} — ${r.open ?? 0} open, ${r.fixed_now ?? 0} newly fixed`;
      if (r.status === "failed") toast.error(msg, { id: t });
      else if (r.status === "partial") toast.warning(msg, { id: t, description: r.errors?.join(" | ") });
      else toast.success(msg, { id: t });
      await load({ silent: true });
    } catch (e) {
      toast.error("Scan failed", { id: t, description: (e as Error).message });
    } finally {
      setScanning(false);
    }
  };

  useEffect(() => {
    (async () => {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) { navigate("/admin/login"); return; }
      const { data: isAdmin } = await supabase.rpc("has_role", {
        _user_id: session.session.user.id, _role: "admin",
      });
      if (!isAdmin) { navigate("/admin"); return; }
      await load();
      await checkCron();
    })();
  }, [navigate, load]);

  // Auto-refresh: poll every 30s while the tab is visible and autoRefresh is on.
  useEffect(() => {
    if (!autoRefresh) return;
    const tick = () => {
      if (document.visibilityState !== "visible") return;
      void load({ silent: true });
    };
    const id = window.setInterval(tick, 30_000);
    const onVis = () => { if (document.visibilityState === "visible") void load({ silent: true }); };
    document.addEventListener("visibilitychange", onVis);
    return () => { window.clearInterval(id); document.removeEventListener("visibilitychange", onVis); };
  }, [autoRefresh, load]);

  const setStatus = async (id: string, status: Finding["status"]) => {
    const note = status === "ignored" ? window.prompt("Reason for ignoring this finding?") ?? "" : null;
    const { error } = await supabase.rpc("security_finding_set_status", {
      _id: id, _status: status, _note: note,
    });
    if (error) { alert(error.message); return; }
    await load();
  };

  const summary = useMemo(() => {
    const s = { total: rows.length, open: 0, fixed: 0, ignored: 0 };
    for (const r of rows) s[r.status]++;
    return s;
  }, [rows]);

  const visible = rows.filter((r) =>
    (filterStatus === "all" || r.status === filterStatus) &&
    (filterSev === "all" || r.severity === filterSev),
  );

  const exportCsv = () => {
    const cols = [
      "severity", "status", "scanner_name", "internal_id", "title",
      "description", "resolution_note", "first_seen_at", "last_seen_at", "resolved_at",
    ] as const;
    const esc = (v: unknown) => {
      const s = v === null || v === undefined ? "" : String(v);
      return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const lines = [cols.join(",")];
    for (const r of visible) lines.push(cols.map((c) => esc((r as Record<string, unknown>)[c])).join(","));
    const blob = new Blob(["\ufeff" + lines.join("\r\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `security-findings-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200">
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link to="/admin" className="p-1.5 rounded hover:bg-slate-800"><ChevronLeft size={18} /></Link>
          <Shield size={18} className="text-amber-300" />
          <h1 className="text-base font-semibold">Security findings</h1>
          <span className="ml-auto" />
          {lastRefresh && (
            <span className="hidden sm:inline text-[10px] text-slate-500">
              Updated {lastRefresh.toLocaleTimeString()}
            </span>
          )}
          <label className="inline-flex items-center gap-1.5 px-2 py-1.5 rounded-md border border-slate-700 bg-slate-900/50 text-xs cursor-pointer">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="accent-amber-400"
            />
            Auto
          </label>
          <button
            onClick={exportCsv}
            disabled={visible.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-slate-700 bg-slate-900/50 text-xs hover:border-amber-500/50 disabled:opacity-40 disabled:cursor-not-allowed"
            title="Download visible findings as CSV"
          >
            <Download size={12} /> Export CSV
          </button>
          <button
            onClick={() => { void runScan(); }}
            disabled={scanning}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-emerald-500/40 bg-emerald-500/10 text-emerald-200 text-xs hover:bg-emerald-500/20 disabled:opacity-40"
            title="Run security scan now"
          >
            <PlayCircle size={12} className={scanning ? "animate-pulse" : ""} /> {scanning ? "Scanning…" : "Run scan"}
          </button>
          <button
            onClick={() => { void load(); void checkCron(); }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-slate-700 bg-slate-900/50 text-xs hover:border-amber-500/50"
          >
            <RefreshCw size={12} /> Refresh
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* Summary tiles */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Tile icon={Shield} label="Total" value={summary.total} tone="text-amber-300" />
          <Tile icon={AlertTriangle} label="Open" value={summary.open} tone="text-rose-300" />
          <Tile icon={CheckCircle2} label="Fixed" value={summary.fixed} tone="text-emerald-300" />
          <Tile icon={EyeOff} label="Ignored" value={summary.ignored} tone="text-slate-400" />
          <Tile
            icon={Activity}
            label="Push / cron health"
            value={cronHealth === "ok" ? "OK" : cronHealth === "fail" ? "Fail" : "…"}
            tone={cronHealth === "ok" ? "text-emerald-300" : cronHealth === "fail" ? "text-rose-300" : "text-slate-400"}
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 text-xs">
          {(["all", "open", "fixed", "ignored"] as const).map((s) => (
            <button key={s} onClick={() => setFilterStatus(s)}
              className={`px-3 py-1.5 rounded-md border ${filterStatus === s ? "border-amber-500/60 bg-amber-500/10 text-amber-200" : "border-slate-700 text-slate-400 hover:text-slate-200"}`}
            >{s}</button>
          ))}
          <span className="mx-1 text-slate-700">|</span>
          {(["all", "critical", "high", "medium", "low"] as const).map((s) => (
            <button key={s} onClick={() => setFilterSev(s)}
              className={`px-3 py-1.5 rounded-md border ${filterSev === s ? "border-amber-500/60 bg-amber-500/10 text-amber-200" : "border-slate-700 text-slate-400 hover:text-slate-200"}`}
            >{s}</button>
          ))}
        </div>

        {/* Table */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 overflow-hidden">
          {err && <p className="p-4 text-sm text-rose-300">{err}</p>}
          {loading ? (
            <p className="p-6 text-sm text-slate-500">Loading findings…</p>
          ) : visible.length === 0 ? (
            <p className="p-6 text-sm text-slate-500">No findings match the current filters.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-slate-900/80 text-slate-400 uppercase text-[10px]">
                  <tr>
                    <th className="text-left px-3 py-2">Severity</th>
                    <th className="text-left px-3 py-2">Title</th>
                    <th className="text-left px-3 py-2">Scanner</th>
                    <th className="text-left px-3 py-2">Status</th>
                    <th className="text-left px-3 py-2">First seen</th>
                    <th className="text-left px-3 py-2">Last seen</th>
                    <th className="text-left px-3 py-2">Resolved</th>
                    <th className="text-left px-3 py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((r) => (
                    <tr key={r.id} className="border-t border-slate-800 hover:bg-slate-900/60">
                      <td className="px-3 py-2"><span className={`inline-block px-1.5 py-0.5 rounded border text-[10px] uppercase ${SEV_TONE[r.severity]}`}>{r.severity}</span></td>
                      <td className="px-3 py-2">
                        <div className="font-medium text-slate-100">{r.title}</div>
                        {r.description && <div className="text-slate-500 text-[10px] line-clamp-2 max-w-md">{r.description}</div>}
                        {r.resolution_note && <div className="text-slate-400 text-[10px] mt-0.5 italic">Note: {r.resolution_note}</div>}
                      </td>
                      <td className="px-3 py-2 text-slate-400 font-mono text-[10px]">{r.scanner_name}<br/>{r.internal_id}</td>
                      <td className="px-3 py-2"><span className={`inline-block px-1.5 py-0.5 rounded border text-[10px] uppercase ${STATUS_TONE[r.status]}`}>{r.status}</span></td>
                      <td className="px-3 py-2 text-slate-400">{fmt(r.first_seen_at)}</td>
                      <td className="px-3 py-2 text-slate-400">{fmt(r.last_seen_at)}</td>
                      <td className="px-3 py-2 text-slate-400">{fmt(r.resolved_at)}</td>
                      <td className="px-3 py-2 space-x-1 whitespace-nowrap">
                        {r.status !== "fixed"   && <button onClick={() => setStatus(r.id, "fixed")}   className="px-2 py-0.5 rounded border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/10">Fix</button>}
                        {r.status !== "ignored" && <button onClick={() => setStatus(r.id, "ignored")} className="px-2 py-0.5 rounded border border-slate-600 text-slate-300 hover:bg-slate-700/40">Ignore</button>}
                        {r.status !== "open"    && <button onClick={() => setStatus(r.id, "open")}    className="px-2 py-0.5 rounded border border-rose-500/40 text-rose-300 hover:bg-rose-500/10">Reopen</button>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <p className="text-[11px] text-slate-500">
          To populate this dashboard, send findings to the <code>security-findings-sync</code> edge function as an admin.
          Missing findings are auto-marked fixed.
        </p>
      </main>
    </div>
  );
}

function Tile({ icon: Icon, label, value, tone }: { icon: typeof Shield; label: string; value: number | string; tone: string }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[11px] uppercase tracking-wide text-slate-500">{label}</p>
        <Icon size={14} className={tone} />
      </div>
      <p className={`text-2xl font-bold ${tone}`}>{value}</p>
    </div>
  );
}
