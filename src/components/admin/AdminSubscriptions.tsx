/**
 * Admin worklists for the new subscription system.
 * Tabs:
 *  • All subs — every active/trial/canceled subscription
 *  • Pending Family setups — Family plans awaiting admin to flip to active
 *  • Add-on activations — per-addon worklist for the ops team
 *  • Trials — legacy view of user_trials (preserved for back-compat)
 */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Calendar, Clock, Users, Sparkles, CreditCard, Check, X, Search } from "lucide-react";

type Tab = "all" | "family_pending" | "addons" | "trials";

interface Sub {
  id: string; user_id: string; plan: string; status: string; billing_cycle: string;
  currency: string; amount: number; current_period_end: string | null;
  family_seat_capacity: number; family_setup_completed: boolean; created_at: string;
}
interface FamMember { id: string; full_name: string; relationship: string; phone: string | null; }
interface Addon { id: string; subscription_id: string; user_id: string; addon: string; status: string; qty: number; unit_price: number; currency: string; created_at: string; user_notes: string | null; }
interface Trial { id: string; device_id: string; plan: string; trial_started_at: string; trial_ends_at: string; extension_reason?: string | null; extended_at?: string | null; }

const AdminSubscriptions = () => {
  const [tab, setTab] = useState<Tab>("all");
  const [loading, setLoading] = useState(false);
  const [subs, setSubs] = useState<Sub[]>([]);
  const [members, setMembers] = useState<Record<string, FamMember[]>>({});
  const [addons, setAddons] = useState<Addon[]>([]);
  const [trials, setTrials] = useState<Trial[]>([]);
  const [search, setSearch] = useState("");

  const load = async () => {
    setLoading(true);
    if (tab === "all" || tab === "family_pending") {
      let q = supabase.from("subscriptions").select("*").order("created_at", { ascending: false }).limit(500);
      if (tab === "family_pending") q = q.eq("plan", "family").eq("family_setup_completed", false);
      const { data, error } = await q;
      if (error) toast.error(error.message); else {
        setSubs((data || []) as Sub[]);
        const famSubIds = (data || []).filter((s: any) => s.plan === "family").map((s: any) => s.id);
        if (famSubIds.length) {
          const { data: mem } = await supabase.from("family_members").select("id,subscription_id,full_name,relationship,phone").in("subscription_id", famSubIds);
          const grouped: Record<string, FamMember[]> = {};
          (mem || []).forEach((m: any) => { (grouped[m.subscription_id] ||= []).push(m); });
          setMembers(grouped);
        }
      }
    } else if (tab === "addons") {
      const { data, error } = await supabase.from("subscription_addons").select("*").order("created_at", { ascending: false }).limit(500);
      if (error) toast.error(error.message); else setAddons((data || []) as Addon[]);
    } else if (tab === "trials") {
      const { data, error } = await supabase.from("user_trials").select("*").order("trial_ends_at", { ascending: false }).limit(500);
      if (error) toast.error(error.message); else setTrials((data || []) as Trial[]);
    }
    setLoading(false);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [tab]);

  // === Subscription actions ===
  const setStatus = async (s: Sub, status: string, extra: Record<string, unknown> = {}) => {
    const { error } = await supabase.from("subscriptions").update({ status: status as any, ...extra }).eq("id", s.id);
    if (error) return toast.error(error.message);
    await supabase.rpc("log_audit_event", { _action: `sub_${status}`, _target_type: "subscription", _target_id: s.id, _details: { plan: s.plan } });
    toast.success(`✓ ${status}`); load();
  };
  const completeFamilySetup = async (s: Sub) => {
    const { error } = await supabase.from("subscriptions")
      .update({ status: "active", family_setup_completed: true }).eq("id", s.id);
    if (error) return toast.error(error.message);
    await supabase.from("billing_events").insert({
      subscription_id: s.id, user_id: s.user_id, event_type: "family_activated",
      amount: s.amount, currency: s.currency, details: { by: "admin" },
    });
    await supabase.rpc("log_audit_event", { _action: "family_activated", _target_type: "subscription", _target_id: s.id, _details: {} });
    toast.success("✓ Family activated"); load();
  };
  const setPlan = async (s: Sub, plan: string) => {
    const { error } = await supabase.from("subscriptions").update({ plan: plan as any }).eq("id", s.id);
    if (error) return toast.error(error.message);
    await supabase.rpc("log_audit_event", { _action: "sub_plan_changed", _target_type: "subscription", _target_id: s.id, _details: { plan } });
    toast.success(`Plan → ${plan}`); load();
  };

  // === Add-on actions ===
  const setAddonStatus = async (a: Addon, status: string) => {
    const patch: any = { status: status as any };
    if (status === "active") patch.activated_at = new Date().toISOString();
    if (status === "canceled") patch.canceled_at = new Date().toISOString();
    const { error } = await supabase.from("subscription_addons").update(patch).eq("id", a.id);
    if (error) return toast.error(error.message);
    await supabase.from("billing_events").insert({
      subscription_id: a.subscription_id, user_id: a.user_id,
      event_type: status === "active" ? "addon_activated" : "addon_canceled",
      amount: a.unit_price, currency: a.currency, details: { addon: a.addon },
    });
    toast.success(`✓ ${status}`); load();
  };

  // === Trial actions (legacy) ===
  const extendTrial = async (t: Trial, days: number) => {
    const reason = prompt(`Extend by ${days} day(s). Reason?`) || `Extended by ${days} days`;
    const newEnd = new Date(Math.max(Date.now(), new Date(t.trial_ends_at).getTime()));
    newEnd.setDate(newEnd.getDate() + days);
    const { error } = await supabase.from("user_trials").update({
      trial_ends_at: newEnd.toISOString(), extension_reason: reason, extended_at: new Date().toISOString(),
    }).eq("id", t.id);
    if (error) return toast.error(error.message);
    await supabase.rpc("log_audit_event", { _action: "trial_extended", _target_type: "trial", _target_id: t.id, _details: { days, reason } });
    toast.success(`+${days}d`); load();
  };

  const filteredSubs = subs.filter(s => !search || s.user_id.includes(search) || s.plan.includes(search.toLowerCase()) || s.status.includes(search.toLowerCase()));

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex flex-wrap gap-1.5 border-b border-slate-800 pb-1">
        {([
          { k: "all", label: "All Subscriptions", Icon: CreditCard, count: tab === "all" ? subs.length : undefined },
          { k: "family_pending", label: "Pending Family", Icon: Users, count: tab === "family_pending" ? subs.length : undefined },
          { k: "addons", label: "Add-on Activations", Icon: Sparkles, count: tab === "addons" ? addons.filter(a => a.status === "pending_admin").length : undefined },
          { k: "trials", label: "Trials (legacy)", Icon: Calendar, count: tab === "trials" ? trials.length : undefined },
        ] as const).map(({ k, label, Icon, count }) => (
          <button key={k} onClick={() => setTab(k as Tab)}
            className={`px-3 py-1.5 rounded-full text-xs flex items-center gap-1.5 ${tab === k ? "bg-amber-500/20 text-amber-300 border border-amber-500/40" : "text-slate-400 border border-transparent hover:text-slate-200"}`}>
            <Icon size={12}/>{label}{count != null && <span className="text-[10px] opacity-70">· {count}</span>}
          </button>
        ))}
      </div>

      {(tab === "all" || tab === "family_pending") && (
        <div className="flex items-center gap-2 mb-2">
          <Search size={14} className="text-slate-500"/>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by user_id, plan, status…"
            className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200"/>
        </div>
      )}

      {loading && <p className="text-slate-400 text-sm">Loading…</p>}

      {/* === ALL SUBS / FAMILY PENDING === */}
      {(tab === "all" || tab === "family_pending") && !loading && (
        <div className="space-y-2">
          {filteredSubs.length === 0 && <p className="text-slate-500 text-sm">No subscriptions.</p>}
          {filteredSubs.map((s) => (
            <div key={s.id} className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
              <div className="flex items-start justify-between gap-3 mb-2 flex-wrap">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-sm font-semibold capitalize text-white">{s.plan}</span>
                    <StatusBadge status={s.status}/>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">{s.billing_cycle}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">{s.currency} {Number(s.amount).toLocaleString()}</span>
                    {s.plan === "family" && (
                      <span className={`text-[10px] px-2 py-0.5 rounded-full ${s.family_setup_completed ? "bg-emerald-500/15 text-emerald-300" : "bg-amber-500/15 text-amber-300"}`}>
                        Family setup {s.family_setup_completed ? "✓" : "⏳"}
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-500 font-mono">user: {s.user_id.slice(0, 18)}…</p>
                  <p className="text-[10px] text-slate-500">
                    Created {new Date(s.created_at).toLocaleDateString()}
                    {s.current_period_end && ` · renews ${new Date(s.current_period_end).toLocaleDateString()}`}
                  </p>
                  {s.plan === "family" && members[s.id] && (
                    <p className="text-[11px] text-slate-300 mt-2">
                      <Users size={11} className="inline mr-1"/>{members[s.id].length} member(s):{" "}
                      {members[s.id].map(m => `${m.full_name} (${m.relationship})`).join(", ")}
                    </p>
                  )}
                </div>
                <select value={s.plan} onChange={(e) => setPlan(s, e.target.value)}
                  className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-200 shrink-0">
                  <option value="free">Free</option>
                  <option value="starter">Starter</option>
                  <option value="companion">Companion</option>
                  <option value="family">Family</option>
                  <option value="enterprise">Enterprise</option>
                </select>
              </div>
              <div className="flex flex-wrap gap-1.5 pt-2 border-t border-slate-800">
                {s.plan === "family" && !s.family_setup_completed && (
                  <button onClick={() => completeFamilySetup(s)}
                    className="px-3 py-1 rounded bg-emerald-500/20 text-emerald-300 text-[11px] flex items-center gap-1">
                    <Check size={11}/>Activate Family
                  </button>
                )}
                {s.status !== "active" && <button onClick={() => setStatus(s, "active")} className="px-2.5 py-1 rounded bg-emerald-500/15 text-emerald-300 text-[11px]">Activate</button>}
                {s.status !== "canceled" && <button onClick={() => setStatus(s, "canceled", { canceled_at: new Date().toISOString() })} className="px-2.5 py-1 rounded bg-rose-500/15 text-rose-300 text-[11px]">Cancel</button>}
                {s.status !== "trial" && <button onClick={() => setStatus(s, "trial")} className="px-2.5 py-1 rounded bg-amber-500/15 text-amber-300 text-[11px]">Mark trial</button>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* === ADDONS === */}
      {tab === "addons" && !loading && (
        <div className="space-y-2">
          {addons.length === 0 && <p className="text-slate-500 text-sm">No add-on requests.</p>}
          {addons.map((a) => (
            <div key={a.id} className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="text-sm font-semibold text-white capitalize">{a.addon.replace(/([A-Z])/g, " $1")}</span>
                  <StatusBadge status={a.status}/>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">{a.currency} {Number(a.unit_price).toLocaleString()} × {a.qty}</span>
                </div>
                <p className="text-[10px] text-slate-500 font-mono">user: {a.user_id.slice(0, 18)}… · {new Date(a.created_at).toLocaleString()}</p>
                {a.user_notes && <p className="text-[11px] text-slate-300 italic mt-1">"{a.user_notes}"</p>}
              </div>
              <div className="flex gap-1.5 shrink-0">
                {a.status === "pending_admin" && (
                  <>
                    <button onClick={() => setAddonStatus(a, "active")} className="px-3 py-1 rounded bg-emerald-500/20 text-emerald-300 text-[11px] flex items-center gap-1"><Check size={11}/>Activate</button>
                    <button onClick={() => setAddonStatus(a, "canceled")} className="px-3 py-1 rounded bg-rose-500/15 text-rose-300 text-[11px] flex items-center gap-1"><X size={11}/>Decline</button>
                  </>
                )}
                {a.status === "active" && (
                  <button onClick={() => setAddonStatus(a, "canceled")} className="px-3 py-1 rounded bg-rose-500/15 text-rose-300 text-[11px]">Cancel</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* === TRIALS (legacy) === */}
      {tab === "trials" && !loading && (
        <div className="space-y-3">
          {trials.length === 0 && <p className="text-slate-500 text-sm">No trials yet.</p>}
          {trials.map((t) => {
            const endsAt = new Date(t.trial_ends_at);
            const daysLeft = Math.ceil((endsAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
            const expired = daysLeft <= 0;
            return (
              <div key={t.id} className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${expired ? "bg-rose-500/15 text-rose-300" : "bg-emerald-500/15 text-emerald-300"}`}>
                        {expired ? "Expired" : `${daysLeft}d left`}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">{t.plan}</span>
                      {t.extended_at && <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300">Extended</span>}
                    </div>
                    <p className="text-xs text-slate-400 flex items-center gap-3">
                      <span className="flex items-center gap-1"><Calendar size={11}/>{new Date(t.trial_started_at).toLocaleDateString()}</span>
                      <span className="flex items-center gap-1"><Clock size={11}/>ends {endsAt.toLocaleDateString()}</span>
                    </p>
                    <p className="text-[10px] text-slate-600 font-mono mt-1">{t.device_id.slice(0, 16)}…</p>
                  </div>
                </div>
                <div className="flex gap-1.5 pt-2 border-t border-slate-800">
                  {[7, 14, 30].map((d) => (
                    <button key={d} onClick={() => extendTrial(t, d)}
                      className="px-2.5 py-1 rounded bg-amber-500/15 text-amber-300 text-[11px]">+{d}d</button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const StatusBadge = ({ status }: { status: string }) => {
  const map: Record<string, string> = {
    active: "bg-emerald-500/15 text-emerald-300",
    trial: "bg-amber-500/15 text-amber-300",
    pending_setup: "bg-amber-500/15 text-amber-300",
    pending_admin: "bg-amber-500/15 text-amber-300",
    canceled: "bg-rose-500/15 text-rose-300",
    expired: "bg-rose-500/15 text-rose-300",
    past_due: "bg-rose-500/15 text-rose-300",
  };
  return <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono ${map[status] || "bg-slate-700/50 text-slate-300"}`}>{status}</span>;
};

export default AdminSubscriptions;
