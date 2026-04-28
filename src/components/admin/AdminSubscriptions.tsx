/**
 * AdminSubscriptions — spec-aligned worklist over the live `user_subscriptions`
 * table. Replaces the older view that queried a non-existent `subscriptions`
 * table. Provides:
 *   • Filter tabs by status (active / pending / past_due / suspended / all)
 *   • Search across device_id and plan
 *   • Inline status changes (suspend / resume / cancel) with audit logging
 *   • Plan tier reassignment dropdown (FREE/STARTER/COMPANION/FAMILY)
 *
 * Self-contained: only touches `user_subscriptions` + `log_audit_event` RPC.
 */
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Calendar, CreditCard, Search, RefreshCw, PauseCircle, PlayCircle, XCircle, User, Mail } from "lucide-react";
import type { Subscription as Sub, SubscriptionStatus } from "@/shared/types/subscription";
import { PLAN_CODES, statusTone } from "@/features/subscriptions/logic/statusMachine";

type Tab = "all" | "active" | "pending_receipt" | "past_due" | "suspended" | "cancelled";

interface SubWithProfile extends Sub {
  profile?: { full_name_en: string | null; full_name_ar: string | null; email: string | null; phone: string | null } | null;
}

const PLAN_OPTIONS = PLAN_CODES;

const AdminSubscriptions = () => {
  const [tab, setTab] = useState<Tab>("active");
  const [rows, setRows] = useState<SubWithProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  const load = async () => {
    setLoading(true);
    let q = supabase
      .from("user_subscriptions")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    if (tab !== "all") q = q.eq("status", tab);
    const { data, error } = await q;
    if (error) { toast.error(error.message); setLoading(false); return; }
    const subs = (data || []) as Sub[];
    // Join profiles by device_id (best-effort; missing profiles render gracefully)
    const deviceIds = Array.from(new Set(subs.map((s) => s.device_id).filter(Boolean)));
    let profileMap: Record<string, SubWithProfile["profile"]> = {};
    if (deviceIds.length) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("device_id, full_name_en, full_name_ar, email, phone")
        .in("device_id", deviceIds);
      (profs || []).forEach((p: any) => { profileMap[p.device_id] = p; });
    }
    setRows(subs.map((s) => ({ ...s, profile: profileMap[s.device_id] || null })));
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [tab]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter(
      (s) =>
        s.device_id.toLowerCase().includes(term) ||
        s.plan.toLowerCase().includes(term) ||
        s.status.toLowerCase().includes(term),
    );
  }, [rows, search]);

  const setStatus = async (s: Sub, status: string, extra: Record<string, unknown> = {}) => {
    const { error } = await supabase
      .from("user_subscriptions")
      .update({ status, ...extra })
      .eq("id", s.id);
    if (error) return toast.error(error.message);
    await supabase.rpc("log_audit_event", {
      _action: `SUBSCRIPTION_${status.toUpperCase()}`,
      _target_type: "user_subscription",
      _target_id: s.id,
      _details: { from: s.status, to: status, plan: s.plan, device_id: s.device_id },
    });
    toast.success(`Updated → ${status}`);
    load();
  };

  const setPlan = async (s: Sub, plan: string) => {
    const { error } = await supabase
      .from("user_subscriptions")
      .update({ plan })
      .eq("id", s.id);
    if (error) return toast.error(error.message);
    await supabase.rpc("log_audit_event", {
      _action: "SUBSCRIPTION_MODIFIED",
      _target_type: "user_subscription",
      _target_id: s.id,
      _details: { from_plan: s.plan, to_plan: plan, device_id: s.device_id },
    });
    toast.success(`Plan → ${plan}`);
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1.5 border-b border-slate-800 pb-1">
        {(
          [
            { k: "active", label: "Active" },
            { k: "pending_receipt", label: "Pending" },
            { k: "past_due", label: "Past due" },
            { k: "suspended", label: "Suspended" },
            { k: "cancelled", label: "Cancelled" },
            { k: "all", label: "All" },
          ] as const
        ).map(({ k, label }) => (
          <button
            key={k}
            onClick={() => setTab(k as Tab)}
            className={`px-3 py-1.5 rounded-full text-xs ${
              tab === k
                ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                : "text-slate-400 border border-transparent hover:text-slate-200"
            }`}
          >
            {label}
          </button>
        ))}
        <button
          onClick={load}
          className="ml-auto text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1"
        >
          <RefreshCw size={12} /> Reload
        </button>
      </div>

      <div className="flex items-center gap-2">
        <Search size={14} className="text-slate-500" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by device id, plan, status…"
          className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200"
        />
      </div>

      {loading && <p className="text-slate-400 text-sm">Loading…</p>}

      <div className="space-y-2">
        {!loading && filtered.length === 0 && (
          <p className="text-slate-500 text-sm">No subscriptions match this filter.</p>
        )}
        {filtered.map((s) => (
          <div key={s.id} className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <CreditCard size={14} className="text-amber-300" />
                  <span className="text-sm font-semibold text-white uppercase">{s.plan}</span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-mono ${statusTone(s.status)}`}
                  >
                    {s.status}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                    {s.billing_cycle}
                  </span>
                  {s.amount != null && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                      {s.currency} {Number(s.amount).toLocaleString()}
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-slate-500 font-mono">device: {s.device_id}</p>
                <p className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                  <Calendar size={10} />
                  Created {new Date(s.created_at).toLocaleDateString()}
                  {s.current_period_end && ` · renews ${new Date(s.current_period_end).toLocaleDateString()}`}
                </p>
                {s.notes && <p className="text-[11px] text-slate-300 italic mt-2">"{s.notes}"</p>}
              </div>
              <select
                value={(PLAN_OPTIONS as readonly string[]).includes(s.plan.toUpperCase()) ? s.plan.toUpperCase() : ""}
                onChange={(e) => setPlan(s, e.target.value)}
                className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-200 shrink-0"
              >
                {!(PLAN_OPTIONS as readonly string[]).includes(s.plan.toUpperCase()) && (
                  <option value="">{s.plan}</option>
                )}
                {PLAN_OPTIONS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-wrap gap-1.5 pt-3 mt-2 border-t border-slate-800">
              {s.status !== "active" && (
                <button
                  onClick={() =>
                    setStatus(s, "active", {
                      activated_at: new Date().toISOString(),
                      current_period_start: s.current_period_start || new Date().toISOString(),
                    })
                  }
                  className="px-2.5 py-1 rounded bg-emerald-500/15 text-emerald-300 text-[11px] flex items-center gap-1"
                >
                  <PlayCircle size={11} /> Activate
                </button>
              )}
              {s.status === "active" && (
                <button
                  onClick={() => setStatus(s, "suspended")}
                  className="px-2.5 py-1 rounded bg-orange-500/15 text-orange-300 text-[11px] flex items-center gap-1"
                >
                  <PauseCircle size={11} /> Suspend
                </button>
              )}
              {s.status === "suspended" && (
                <button
                  onClick={() => setStatus(s, "active")}
                  className="px-2.5 py-1 rounded bg-emerald-500/15 text-emerald-300 text-[11px] flex items-center gap-1"
                >
                  <PlayCircle size={11} /> Resume
                </button>
              )}
              {s.status !== "cancelled" && s.status !== "rejected" && (
                <button
                  onClick={() => {
                    if (confirm(`Cancel ${s.plan} subscription for device ${s.device_id.slice(0, 12)}…?`))
                      setStatus(s, "cancelled", { cancelled_at: new Date().toISOString() });
                  }}
                  className="px-2.5 py-1 rounded bg-rose-500/15 text-rose-300 text-[11px] flex items-center gap-1"
                >
                  <XCircle size={11} /> Cancel
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminSubscriptions;
