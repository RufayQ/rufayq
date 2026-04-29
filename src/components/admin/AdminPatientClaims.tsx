import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Check, X, Search, Activity, Filter, Eye, Copy, Calendar } from "lucide-react";
import { useQuickCreateSignal } from "@/components/admin/shell/quickCreateSignal";
import { useRealtimeChannel } from "@/api";
import { Can, usePermissions } from "@/features/auth";

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

const STATUS_TONE: Record<string, string> = {
  pending_admin: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  pending_patient: "bg-indigo-500/15 text-indigo-300 border-indigo-500/30",
  approved: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  rejected: "bg-rose-500/15 text-rose-300 border-rose-500/30",
};

const AdminPatientClaims = () => {
  const [loading, setLoading] = useState(true);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [filter, setFilter] = useState<string>("pending_admin");
  const [search, setSearch] = useState("");
  const [searchType, setSearchType] = useState<string>("");
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");
  const [active, setActive] = useState<Claim | null>(null);
  const { ready, can } = usePermissions();
  const canDecide = can("claim.decide");
  useQuickCreateSignal("claims", () => toast.info("Patient claims are submitted by hospitals/insurers. Filter ‘Pending’ to triage incoming requests."));

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
  useRealtimeChannel("patientClaimsPending", () => load());

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
    await supabase.rpc("log_audit_event", {
      _action: approve ? "patient_claim_approved" : "patient_claim_rejected",
      _target_type: "patient_claim",
      _target_id: id,
      _details: { decided_by: user?.id ?? null },
    });
    toast.success(approve ? "Sent to patient for consent" : "Rejected");
    await load();
  };

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return claims.filter((c) => {
      if (filter !== "all" && c.status !== filter) return false;
      if (searchType && c.search_type !== searchType) return false;
      if (from && new Date(c.created_at) < new Date(from)) return false;
      if (to && new Date(c.created_at) > new Date(`${to}T23:59:59`)) return false;
      if (!q) return true;
      return [c.org_name, c.search_value, c.reason, c.matched_device_id, c.id]
        .some((f) => f && String(f).toLowerCase().includes(q));
    });
  }, [claims, filter, search, searchType, from, to]);

  const searchTypes = useMemo(
    () => Array.from(new Set(claims.map((c) => c.search_type).filter(Boolean))),
    [claims],
  );

  const copyClaim = async (c: Claim) => {
    const text = [
      `Claim ID: ${c.id}`,
      `Organization: ${c.org_name || c.organization_id}`,
      `Search: ${c.search_type}=${c.search_value}`,
      `Match: ${c.matched_device_id || "none"}`,
      `Status: ${c.status}`,
      `Reason: ${c.reason || "—"}`,
      `Created: ${new Date(c.created_at).toLocaleString()}`,
    ].join("\n");
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Claim info copied");
      await supabase.rpc("log_audit_event", {
        _action: "patient_claim_info_copied",
        _target_type: "patient_claim",
        _target_id: c.id,
        _details: { fields: 7 },
      });
    } catch {
      toast.error("Copy failed");
    }
  };

  const viewClaim = async (c: Claim) => {
    setActive(c);
    await supabase.rpc("log_audit_event", {
      _action: "patient_claim_viewed",
      _target_type: "patient_claim",
      _target_id: c.id,
      _details: { status: c.status },
    });
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-3">
        <h2 className="text-xl font-semibold">Patient Claims</h2>
        <span className="inline-flex items-center gap-1 text-[10px] text-slate-500">
          <Activity size={10} className="text-emerald-400 animate-pulse" />live
        </span>
        <span className="ml-auto text-xs text-slate-500">{visible.length} of {claims.length}</span>
      </div>

      {/* Filters bar */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-3 space-y-2 mb-4">
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by org, claim ID, ID/passport, reason…"
            className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-8 pr-3 py-2 text-sm text-slate-200 placeholder:text-slate-500"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Filter size={13} className="text-slate-500" />
          <select value={filter} onChange={(e) => setFilter(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-xs text-slate-200">
            <option value="pending_admin">Pending admin</option>
            <option value="pending_patient">Awaiting patient</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="all">All statuses</option>
          </select>
          <select value={searchType} onChange={(e) => setSearchType(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-xs text-slate-200">
            <option value="">All ID types</option>
            {searchTypes.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <span className="flex items-center gap-1 text-[11px] text-slate-500"><Calendar size={11} />from</span>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-xs text-slate-200" />
          <span className="text-[11px] text-slate-500">to</span>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-xs text-slate-200" />
          {(search || searchType || from || to) && (
            <button onClick={() => { setSearch(""); setSearchType(""); setFrom(""); setTo(""); }}
              className="text-[11px] text-slate-400 hover:text-slate-200 underline ml-auto">Clear</button>
          )}
        </div>
      </div>

      {ready && !canDecide && (
        <p className="mb-3 text-[11px] text-amber-400/80 bg-amber-500/5 border border-amber-500/20 rounded-lg px-3 py-2">
          Read-only view — your role can review claims but cannot approve or reject them.
        </p>
      )}

      {loading && <p className="text-slate-400">Loading…</p>}

      {!loading && visible.length === 0 && (
        <div className="text-center py-16 text-slate-500">
          <Search size={32} className="mx-auto mb-3 opacity-50" />
          No claims match these filters.
        </div>
      )}

      <div className="space-y-3">
        {visible.map((c) => (
          <div
            key={c.id}
            role="button"
            tabIndex={0}
            onClick={() => viewClaim(c)}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); viewClaim(c); } }}
            className="rounded-xl border border-slate-800 bg-slate-900/40 p-3 sm:p-4 hover:border-amber-500/40 cursor-pointer transition"
          >
            <div className="flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">{c.org_name || c.organization_id}</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  Search: <span className="text-slate-200 font-mono">{c.search_type}={c.search_value}</span>
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  Match: {c.matched_device_id ? <span className="text-emerald-400">found</span> : <span className="text-amber-400">no patient yet</span>}
                </p>
                {c.reason && <p className="text-xs text-slate-300 mt-2 italic line-clamp-2">"{c.reason}"</p>}
                <p className="text-[10px] text-slate-500 mt-1">{new Date(c.created_at).toLocaleString()}</p>
              </div>
              <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border ${STATUS_TONE[c.status] || "bg-slate-800 text-slate-300 border-slate-700"}`}>
                {c.status}
              </span>
            </div>

            <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-slate-800">
              <button onClick={() => viewClaim(c)}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] flex items-center gap-1">
                <Eye size={11} /> View
              </button>
              <button onClick={() => copyClaim(c)}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] flex items-center gap-1">
                <Copy size={11} /> Copy
              </button>
              {c.status === "pending_admin" && (
                <Can action="claim.decide" fallback={null}>
                  <button onClick={() => decide(c.id, true)} disabled={!c.matched_device_id || !canDecide}
                    className="ml-auto px-3 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed">
                    <Check size={11} /> Approve
                  </button>
                  <button onClick={() => decide(c.id, false)} disabled={!canDecide}
                    className="px-3 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1 bg-rose-600 hover:bg-rose-500 disabled:opacity-40 disabled:cursor-not-allowed">
                    <X size={11} /> Reject
                  </button>
                </Can>
              )}
            </div>
            {c.status === "pending_admin" && !c.matched_device_id && (
              <p className="text-[10px] text-amber-400 mt-2">Patient not registered yet — wait for signup before approving.</p>
            )}
          </div>
        ))}
      </div>

      {active && <ClaimDetailDrawer claim={active} onClose={() => setActive(null)} />}
    </div>
  );
};

const ClaimDetailDrawer = ({ claim, onClose }: { claim: Claim; onClose: () => void }) => (
  <div className="fixed inset-0 z-50 flex">
    <div className="flex-1 bg-slate-950/60 backdrop-blur-sm" onClick={onClose} />
    <aside className="w-full max-w-md bg-slate-950 border-l border-slate-800 overflow-y-auto p-5 space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-100">Claim details</h3>
          <p className="text-[11px] font-mono text-slate-500 mt-0.5 break-all">{claim.id}</p>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300">
          <X size={14} />
        </button>
      </div>
      <span className={`inline-block px-2 py-1 rounded-full text-[10px] font-bold uppercase border ${STATUS_TONE[claim.status] || "bg-slate-800 text-slate-300 border-slate-700"}`}>
        {claim.status}
      </span>
      <DL label="Organization" value={claim.org_name || claim.organization_id} />
      <DL label="Search type" value={claim.search_type} />
      <DL label="Search value" value={claim.search_value} mono />
      <DL label="Matched device" value={claim.matched_device_id || "—"} mono />
      <DL label="Matched profile" value={claim.matched_profile_id || "—"} mono />
      <DL label="Reason" value={claim.reason || "—"} />
      <DL label="Created" value={new Date(claim.created_at).toLocaleString()} />
    </aside>
  </div>
);

const DL = ({ label, value, mono }: { label: string; value: string; mono?: boolean }) => (
  <div>
    <p className="text-[10px] uppercase tracking-wide text-slate-500">{label}</p>
    <p className={`text-sm text-slate-200 break-words ${mono ? "font-mono text-xs" : ""}`}>{value}</p>
  </div>
);

export default AdminPatientClaims;
