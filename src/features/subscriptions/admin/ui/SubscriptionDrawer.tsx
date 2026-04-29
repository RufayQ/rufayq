/**
 * SubscriptionDrawer — full subscription-management workflow for one customer,
 * opened from the Admin → Users list. 720px right slideover (mobile: full
 * screen). Self-contained: only talks to live tables (`user_subscriptions`,
 * `user_subscription_addons`, `payment_receipts`, `subscription_events`) +
 * `log_audit_event` RPC. No new backend pieces required.
 *
 * Sections implemented (RufayQ Subscription Mgmt Spec, 2026-04-27):
 *   1  Current snapshot          6  Renew / Extend
 *   2  Quick actions             7  Complimentary access
 *   3  Plan management           8  Suspend / Cancel
 *   4  Add-ons                   9  History timeline
 *   5  Payment workflow         10  Internal notes
 *  12  List badges (in AdminUsers)
 *  14  Audit log (uses subscription_events stream + log_audit_event)
 *  15  RufayQ premium dark UX
 *  16  All workflows in-drawer (no page leave)
 *
 * Skipped per scope: S11 (customer comms — needs sender edge fn) and
 * S13 (granular roles — needs new app_role enum values).
 */
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  X, CreditCard, Crown, Calendar, CheckCircle2, AlertCircle, Clock,
  PauseCircle, PlayCircle, XCircle, Plus, Trash2, RefreshCw, Gift,
  Receipt, FileText, History, StickyNote, Copy, Upload, ExternalLink,
  ChevronRight, Sparkles, ShieldCheck, Ban, ArrowUpRight,
} from "lucide-react";
import { PLANS, type PlanCode } from "@/data/subscriptionPlans";
import { statusTone, normalizePlanCode } from "@/features/subscriptions/logic/statusMachine";

/* ── Types ────────────────────────────────────────────────────────────── */

interface UserHeader {
  id: string;
  device_id: string;
  full_name_en: string | null;
  email: string | null;
  phone: string | null;
  rufayq_id?: string | null;
}

interface Sub {
  id: string; device_id: string; plan: string; status: string;
  billing_cycle: "monthly" | "quarterly" | "yearly";
  amount: number | null; currency: string;
  current_period_start: string | null; current_period_end: string | null;
  activated_at: string | null; cancelled_at: string | null;
  notes: string | null; created_at: string; updated_at: string;
  payment_receipt_id?: string | null;
}

interface Addon {
  id: string; subscription_id: string; addon_key: string; addon_label: string;
  quantity: number; unit_price: number | null; currency: string;
  active_from: string; active_until: string | null; is_active: boolean;
}

interface Receipt {
  id: string; device_id: string; requested_plan: string; billing_cycle: string;
  amount: number; currency: string; payment_method: string;
  payment_reference: string | null; reference_no: string | null;
  receipt_file_path: string | null; status: string;
  reviewer_notes: string | null; internal_note: string | null;
  patient_message: string | null;
  created_at: string; reviewed_at: string | null;
  submission_channel: string;
}

interface EventRow {
  id: string; event_type: string; from_value: string | null; to_value: string | null;
  notes: string | null; created_at: string; actor_role: string | null;
  details: Record<string, unknown> | null;
}

/* ── Add-on catalog: loaded from `pricing_addons` table (admin-managed). ── */
/*    Fallback list is used only if the DB query fails (offline / RLS).     */

interface CatalogItem { key: string; label: string; price: number; durationDays: number; icon: string }

const FALLBACK_ADDON_CATALOG: CatalogItem[] = [
  { key: "extra_family",      label: "Extra Family Member",        price: 49, durationDays: 30, icon: "👨‍👩‍👧" },
  { key: "consult_pack",      label: "Additional Consultation Pack", price: 199, durationDays: 30, icon: "🩺" },
  { key: "priority_concierge", label: "Priority Concierge",         price: 299, durationDays: 30, icon: "⚡" },
];

const useAddonCatalog = (): CatalogItem[] => {
  const [items, setItems] = useState<CatalogItem[]>(FALLBACK_ADDON_CATALOG);
  useEffect(() => {
    (async () => {
      const [aRes, pRes] = await Promise.all([
        supabase.from("pricing_addons").select("*").eq("is_active", true).order("sort_order"),
        supabase.from("pricing_addon_prices").select("addon_id,currency,amount").eq("currency", "SAR"),
      ]);
      if (!aRes.data) return;
      const px: Record<string, number> = {};
      (pRes.data || []).forEach((r: any) => { px[r.addon_id] = Number(r.amount); });
      setItems(aRes.data.map((a: any) => ({
        key: a.key, label: a.name_en,
        price: px[a.id] ?? 0, durationDays: 30, icon: a.hero ? "⭐" : "✨",
      })));
    })();
  }, []);
  return items;
};

/* ── Helpers ──────────────────────────────────────────────────────────── */

const fmtDate = (d: string | null | undefined) =>
  d ? new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—";

const daysBetween = (a: string | null, b: string | null) => {
  if (!a || !b) return null;
  const ms = new Date(b).getTime() - new Date(a).getTime();
  return Math.max(0, Math.ceil(ms / 86_400_000));
};

const PAYMENT_TONE: Record<string, string> = {
  pending: "bg-amber-500/15 text-amber-300",
  under_review: "bg-blue-500/15 text-blue-300",
  needs_more_info: "bg-orange-500/15 text-orange-300",
  verified: "bg-emerald-500/15 text-emerald-300",
  rejected: "bg-rose-500/15 text-rose-300",
  code_expired: "bg-slate-500/15 text-slate-300",
};

const audit = async (action: string, target_id: string, details: Record<string, unknown>) => {
  await supabase.rpc("log_audit_event", {
    _action: action, _target_type: "user_subscription",
    _target_id: target_id, _details: details as never,
  });
};

/* ── Component ────────────────────────────────────────────────────────── */

interface Props { user: UserHeader; onClose: () => void; }

const SubscriptionDrawer = ({ user, onClose }: Props) => {
  const [tab, setTab] = useState<"overview" | "plans" | "addons" | "payments" | "history" | "notes">("overview");
  const [subs, setSubs] = useState<Sub[]>([]);
  const [addons, setAddons] = useState<Addon[]>([]);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [noteDraft, setNoteDraft] = useState("");

  const active = useMemo(() => subs.find((s) => s.status === "active") || subs[0] || null, [subs]);
  const isFree = !active || active.plan.toUpperCase() === "FREE";

  const load = async () => {
    setLoading(true);
    const [subsRes, recRes, evtRes] = await Promise.all([
      supabase.from("user_subscriptions").select("*")
        .eq("device_id", user.device_id).order("created_at", { ascending: false }),
      supabase.from("payment_receipts").select("*")
        .eq("device_id", user.device_id).order("created_at", { ascending: false }).limit(50),
      supabase.from("subscription_events").select("*")
        .eq("device_id", user.device_id).order("created_at", { ascending: false }).limit(100),
    ]);
    if (subsRes.error) toast.error(subsRes.error.message);
    const subRows = (subsRes.data || []) as Sub[];
    setSubs(subRows);
    setReceipts((recRes.data || []) as Receipt[]);
    setEvents((evtRes.data || []) as EventRow[]);

    const subIds = subRows.map((s) => s.id);
    if (subIds.length) {
      const { data: ax } = await supabase.from("user_subscription_addons")
        .select("*").in("subscription_id", subIds).order("created_at", { ascending: false });
      setAddons((ax || []) as Addon[]);
    } else {
      setAddons([]);
    }
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [user.device_id]);

  /* ── Mutations ─────────────────────────────────────────────────────── */

  const setSubStatus = async (s: Sub, status: string, extra: Record<string, unknown> = {}) => {
    setBusy(true);
    const { error } = await supabase.from("user_subscriptions")
      .update({ status, ...extra }).eq("id", s.id);
    if (error) { toast.error(error.message); setBusy(false); return; }
    await audit(`SUBSCRIPTION_${status.toUpperCase()}`, s.id,
      { from: s.status, to: status, plan: s.plan, device_id: s.device_id });
    toast.success(`Status → ${status}`);
    setBusy(false); load();
  };

  const changePlan = async (s: Sub, newPlan: PlanCode, immediate: boolean) => {
    setBusy(true);
    const update: Record<string, unknown> = { plan: newPlan };
    if (immediate) {
      update.activated_at = new Date().toISOString();
      update.current_period_start = new Date().toISOString();
    }
    const { error } = await supabase.from("user_subscriptions")
      .update(update as never).eq("id", s.id);
    if (error) { toast.error(error.message); setBusy(false); return; }
    await audit("SUBSCRIPTION_PLAN_CHANGED", s.id,
      { from_plan: s.plan, to_plan: newPlan, immediate, device_id: s.device_id });
    toast.success(`Plan → ${newPlan} (${immediate ? "immediate" : "next cycle"})`);
    setBusy(false); load();
  };

  const extendDays = async (s: Sub, days: number) => {
    setBusy(true);
    const baseEnd = s.current_period_end ? new Date(s.current_period_end) : new Date();
    if (baseEnd.getTime() < Date.now()) baseEnd.setTime(Date.now());
    baseEnd.setDate(baseEnd.getDate() + days);
    const { error } = await supabase.from("user_subscriptions")
      .update({ current_period_end: baseEnd.toISOString(), status: "active" }).eq("id", s.id);
    if (error) { toast.error(error.message); setBusy(false); return; }
    await audit("SUBSCRIPTION_EXTENDED", s.id,
      { days, new_end: baseEnd.toISOString(), device_id: s.device_id });
    toast.success(`Extended ${days} day(s)`);
    setBusy(false); load();
  };

  const renew = async (s: Sub, plan: PlanCode, cycle: "monthly" | "yearly") => {
    setBusy(true);
    const def = PLANS.find((p) => p.code === plan);
    const amount = def ? (cycle === "yearly" ? def.yearly : def.monthly) : null;
    const start = new Date();
    const end = new Date(start);
    if (cycle === "yearly") end.setFullYear(end.getFullYear() + 1);
    else end.setMonth(end.getMonth() + 1);
    const { error } = await supabase.from("user_subscriptions").update({
      plan, billing_cycle: cycle, amount, status: "active",
      current_period_start: start.toISOString(), current_period_end: end.toISOString(),
      activated_at: start.toISOString(), cancelled_at: null,
    }).eq("id", s.id);
    if (error) { toast.error(error.message); setBusy(false); return; }
    await audit("SUBSCRIPTION_RENEWED", s.id,
      { plan, cycle, amount, device_id: s.device_id });
    toast.success(`Renewed → ${plan} ${cycle}`);
    setBusy(false); load();
  };

  const grantComplimentary = async (
    plan: PlanCode, days: number, reason: string, approver: string,
  ) => {
    if (days > 30 && !confirm(
      `Complimentary > 30 days (${days}). RufayQ policy requires manager-level approval. Continue under your authority?`,
    )) return;
    setBusy(true);
    const start = new Date();
    const end = new Date(start);
    end.setDate(end.getDate() + days);
    const payload = {
      device_id: user.device_id, plan, billing_cycle: "monthly" as const, amount: 0,
      currency: "SAR", status: "active", provider: "manual",
      current_period_start: start.toISOString(), current_period_end: end.toISOString(),
      activated_at: start.toISOString(),
      notes: `COMP · ${reason}${approver ? ` · approver: ${approver}` : ""}`,
    };
    if (active && active.status === "active") {
      const { error } = await supabase.from("user_subscriptions")
        .update(payload).eq("id", active.id);
      if (error) { toast.error(error.message); setBusy(false); return; }
      await audit("SUBSCRIPTION_COMPLIMENTARY", active.id,
        { plan, days, reason, approver, device_id: user.device_id });
    } else {
      const { data, error } = await supabase.from("user_subscriptions")
        .insert(payload).select("id").single();
      if (error) { toast.error(error.message); setBusy(false); return; }
      await audit("SUBSCRIPTION_COMPLIMENTARY", data!.id,
        { plan, days, reason, approver, device_id: user.device_id });
    }
    toast.success(`Complimentary ${plan} · ${days} days granted`);
    setBusy(false); load();
  };

  const addAddon = async (
    sub: Sub, key: string, label: string, price: number, days: number, complimentary: boolean,
  ) => {
    setBusy(true);
    const start = new Date();
    const end = new Date(start);
    end.setDate(end.getDate() + days);
    const { error } = await supabase.from("user_subscription_addons").insert({
      subscription_id: sub.id, addon_key: key, addon_label: label, quantity: 1,
      unit_price: complimentary ? 0 : price, currency: "SAR",
      active_from: start.toISOString(), active_until: end.toISOString(), is_active: true,
    });
    if (error) { toast.error(error.message); setBusy(false); return; }
    await audit("ADDON_ADDED", sub.id,
      { addon_key: key, complimentary, days, price: complimentary ? 0 : price });
    toast.success(`Add-on added: ${label}`);
    setBusy(false); load();
  };

  const removeAddon = async (a: Addon) => {
    if (!confirm(`Remove "${a.addon_label}"?`)) return;
    setBusy(true);
    const { error } = await supabase.from("user_subscription_addons")
      .update({ is_active: false, active_until: new Date().toISOString() }).eq("id", a.id);
    if (error) { toast.error(error.message); setBusy(false); return; }
    await audit("ADDON_REMOVED", a.subscription_id, { addon_key: a.addon_key });
    toast.success("Add-on removed");
    setBusy(false); load();
  };

  const extendAddon = async (a: Addon, days: number) => {
    setBusy(true);
    const base = a.active_until ? new Date(a.active_until) : new Date();
    if (base.getTime() < Date.now()) base.setTime(Date.now());
    base.setDate(base.getDate() + days);
    const { error } = await supabase.from("user_subscription_addons")
      .update({ active_until: base.toISOString(), is_active: true }).eq("id", a.id);
    if (error) { toast.error(error.message); setBusy(false); return; }
    await audit("ADDON_EXTENDED", a.subscription_id, { addon_key: a.addon_key, days });
    toast.success(`Extended ${days}d`);
    setBusy(false); load();
  };

  const reviewReceipt = async (r: Receipt, status: "verified" | "rejected" | "needs_more_info", note: string) => {
    setBusy(true);
    const { error } = await supabase.from("payment_receipts").update({
      status, reviewer_notes: note || null, reviewed_at: new Date().toISOString(),
    }).eq("id", r.id);
    if (error) { toast.error(error.message); setBusy(false); return; }
    toast.success(`Receipt → ${status}`);
    setBusy(false); load();
  };

  const createPaymentRequest = async (plan: PlanCode, cycle: "monthly" | "yearly") => {
    const def = PLANS.find((p) => p.code === plan);
    if (!def) return;
    // payment_receipts.requested_plan accepts only basic|companion|family|premium
    const reqPlan = plan === "STARTER" ? "basic" : plan === "COMPANION" ? "companion"
      : plan === "FAMILY" ? "family" : "basic";
    setBusy(true);
    const { data, error } = await supabase.from("payment_receipts").insert({
      device_id: user.device_id, requested_plan: reqPlan, billing_cycle: cycle,
      amount: cycle === "yearly" ? def.yearly : def.monthly, currency: "SAR",
      payment_method: "bank_transfer", status: "pending", submission_channel: "admin",
    }).select("id, payment_reference").single();
    if (error) { toast.error(error.message); setBusy(false); return; }
    toast.success(`Payment request created · ${data?.payment_reference || "ref pending"}`);
    setBusy(false); load();
  };

  const addInternalNote = async () => {
    if (!noteDraft.trim()) return;
    if (!active) { toast.error("No subscription to attach the note to"); return; }
    setBusy(true);
    const stamped = `[${new Date().toLocaleString("en-GB")}] ${noteDraft.trim()}`;
    const merged = active.notes ? `${active.notes}\n${stamped}` : stamped;
    const { error } = await supabase.from("user_subscriptions")
      .update({ notes: merged }).eq("id", active.id);
    if (error) { toast.error(error.message); setBusy(false); return; }
    await audit("SUBSCRIPTION_NOTE_ADDED", active.id, { note: noteDraft.trim() });
    toast.success("Note added");
    setNoteDraft(""); setBusy(false); load();
  };

  /* ── UI ────────────────────────────────────────────────────────────── */

  const drawer = (
    <div className="fixed inset-0 z-[60] flex" onClick={onClose}>
      <div className="flex-1 bg-black/60 backdrop-blur-sm" />
      <aside
        onClick={(e) => e.stopPropagation()}
        className="w-full md:w-[720px] h-full bg-[#0D1B2A] border-l border-amber-500/20 flex flex-col shadow-2xl animate-in slide-in-from-right duration-200"
      >
        {/* Header */}
        <header className="px-5 py-4 border-b border-slate-800 bg-gradient-to-r from-[#0D1B2A] to-[#004D5B]/40">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-lg font-semibold text-amber-300 flex items-center gap-2">
                <Crown size={18} /> Subscription Management
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Manage plans, renewals, add-ons, and access for this customer.
              </p>
            </div>
            <button onClick={onClose} aria-label="Close"
              className="p-2 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 -mr-1 -mt-1">
              <X size={18} />
            </button>
          </div>

          {/* Identity block */}
          <div className="mt-3 rounded-xl border border-slate-800 bg-slate-900/50 p-3">
            <p className="text-sm font-semibold text-slate-100">{user.full_name_en || "—"}</p>
            <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-400 mt-0.5">
              {user.rufayq_id && <span className="font-mono text-amber-300/80">{user.rufayq_id}</span>}
              {user.email && <span>{user.email}</span>}
              {user.phone && <span>{user.phone}</span>}
              <span className="font-mono text-slate-600">{user.device_id.slice(0, 16)}…</span>
            </div>
          </div>

          {/* Tab strip */}
          <div className="flex gap-1 mt-3 -mb-1 overflow-x-auto">
            {[
              { k: "overview", label: "Overview", icon: Sparkles },
              { k: "plans", label: "Plans", icon: CreditCard },
              { k: "addons", label: "Add-ons", icon: Plus },
              { k: "payments", label: "Payments", icon: Receipt },
              { k: "history", label: "History", icon: History },
              { k: "notes", label: "Notes", icon: StickyNote },
            ].map(({ k, label, icon: Icon }) => (
              <button key={k} onClick={() => setTab(k as typeof tab)}
                className={`px-3 py-1.5 text-xs rounded-t-lg flex items-center gap-1.5 whitespace-nowrap transition-colors ${
                  tab === k
                    ? "bg-slate-900 text-amber-300 border border-b-0 border-slate-800"
                    : "text-slate-400 hover:text-slate-200"
                }`}>
                <Icon size={12} /> {label}
              </button>
            ))}
          </div>
        </header>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {loading && <p className="text-slate-400 text-sm">Loading subscription details…</p>}

          {!loading && tab === "overview" && (
            <OverviewTab
              active={active} addons={addons.filter((a) => a.is_active)}
              onUpgrade={() => setTab("plans")}
              onRenew={() => active && renew(active, (normalizePlanCode(active.plan) || "STARTER"), active.billing_cycle === "yearly" ? "yearly" : "monthly")}
              onExtend={(d) => active && extendDays(active, d)}
              onSuspend={() => active && setSubStatus(active, "suspended")}
              onCancel={() => active && confirm("Cancel this subscription?") &&
                setSubStatus(active, "cancelled", { cancelled_at: new Date().toISOString() })}
              onAddAddon={() => setTab("addons")}
              onPayments={() => setTab("payments")}
              onComp={() => setTab("plans")}
              busy={busy}
            />
          )}

          {!loading && tab === "plans" && (
            <PlansTab active={active} isFree={isFree} busy={busy}
              onChange={(plan, immediate) => active
                ? changePlan(active, plan, immediate)
                : grantComplimentary(plan, 30, "Initial activation", "")}
              onComp={(plan, days, reason, approver) => grantComplimentary(plan, days, reason, approver)}
              onCreatePayment={(plan, cycle) => createPaymentRequest(plan, cycle)}
            />
          )}

          {!loading && tab === "addons" && (
            <AddonsTab active={active} addons={addons} busy={busy}
              onAdd={(k, l, p, d, comp) => active && addAddon(active, k, l, p, d, comp)}
              onRemove={removeAddon} onExtend={extendAddon} />
          )}

          {!loading && tab === "payments" && (
            <PaymentsTab receipts={receipts} busy={busy}
              onReview={reviewReceipt}
              onCreate={(plan, cycle) => createPaymentRequest(plan, cycle)} />
          )}

          {!loading && tab === "history" && <HistoryTab events={events} />}

          {!loading && tab === "notes" && (
            <NotesTab active={active} draft={noteDraft} setDraft={setNoteDraft}
              onAdd={addInternalNote} busy={busy} />
          )}
        </div>
      </aside>
    </div>
  );

  return createPortal(drawer, document.body);
};

/* ── Sub-components ───────────────────────────────────────────────────── */

const Card = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={`rounded-xl border border-slate-800 bg-slate-900/50 p-4 ${className}`}>{children}</div>
);

const Row = ({ k, v }: { k: string; v: React.ReactNode }) => (
  <div className="flex items-baseline justify-between gap-3 py-1.5 border-b border-slate-800/60 last:border-0">
    <span className="text-[11px] uppercase tracking-wide text-slate-500">{k}</span>
    <span className="text-sm text-slate-100 text-right">{v}</span>
  </div>
);

const QuickBtn = ({
  icon: Icon, label, onClick, tone = "slate", disabled,
}: {
  icon: typeof Plus; label: string; onClick: () => void;
  tone?: "slate" | "gold" | "emerald" | "rose" | "orange" | "violet"; disabled?: boolean;
}) => {
  const tones: Record<string, string> = {
    slate: "bg-slate-800 hover:bg-slate-700 text-slate-200",
    gold: "bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30",
    emerald: "bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300",
    rose: "bg-rose-500/15 hover:bg-rose-500/25 text-rose-300",
    orange: "bg-orange-500/15 hover:bg-orange-500/25 text-orange-300",
    violet: "bg-violet-500/15 hover:bg-violet-500/25 text-violet-300",
  };
  return (
    <button onClick={onClick} disabled={disabled}
      className={`px-3 py-2 rounded-lg text-xs flex items-center gap-1.5 disabled:opacity-40 transition-colors ${tones[tone]}`}>
      <Icon size={13} /> {label}
    </button>
  );
};

/* OVERVIEW */

const OverviewTab = ({
  active, addons, onUpgrade, onRenew, onExtend, onSuspend, onCancel,
  onAddAddon, onPayments, onComp, busy,
}: {
  active: Sub | null; addons: Addon[]; onUpgrade: () => void; onRenew: () => void;
  onExtend: (d: number) => void; onSuspend: () => void; onCancel: () => void;
  onAddAddon: () => void; onPayments: () => void; onComp: () => void; busy: boolean;
}) => {
  const planCode = normalizePlanCode(active?.plan);
  const def = PLANS.find((p) => p.code === planCode);
  const daysLeft = daysBetween(new Date().toISOString(), active?.current_period_end ?? null);

  if (!active) {
    return (
      <Card className="text-center py-8">
        <Ban className="mx-auto text-slate-600 mb-2" size={28} />
        <p className="text-sm text-slate-300 font-medium">No subscription on file</p>
        <p className="text-xs text-slate-500 mt-1">Customer is on the FREE tier.</p>
        <button onClick={onUpgrade}
          className="mt-4 px-4 py-2 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40 text-sm font-medium inline-flex items-center gap-2">
          <ArrowUpRight size={14} /> Upgrade Now
        </button>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Snapshot */}
      <Card>
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-lg font-semibold text-slate-50 uppercase">{def?.nameEn || active.plan}</span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono ${statusTone(active.status)}`}>
                {active.status}
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                {active.billing_cycle}
              </span>
            </div>
            {active.amount != null && (
              <p className="text-xs text-slate-400 mt-1">
                {active.currency} {Number(active.amount).toLocaleString()} per cycle
              </p>
            )}
          </div>
          {daysLeft !== null && (
            <div className={`text-right ${daysLeft <= 7 ? "text-amber-300" : "text-slate-300"}`}>
              <p className="text-2xl font-bold leading-none">{daysLeft}</p>
              <p className="text-[10px] uppercase tracking-wide">days left</p>
            </div>
          )}
        </div>
        <div className="grid grid-cols-2 gap-x-4">
          <Row k="Start" v={fmtDate(active.current_period_start || active.activated_at)} />
          <Row k="End" v={fmtDate(active.current_period_end)} />
          <Row k="Renewal" v="Manual Bank Transfer" />
          <Row k="Provider" v="manual" />
        </div>
        {def && (
          <div className="mt-3 pt-3 border-t border-slate-800">
            <p className="text-[10px] uppercase tracking-wide text-slate-500 mb-1.5">Entitlements</p>
            <ul className="space-y-1">
              {def.features.slice(0, 4).map((f) => (
                <li key={f.en} className="text-xs text-slate-300 flex items-start gap-1.5">
                  <CheckCircle2 size={12} className="text-emerald-400 mt-0.5 shrink-0" /> {f.en}
                </li>
              ))}
            </ul>
          </div>
        )}
      </Card>

      {/* Quick actions */}
      <div>
        <p className="text-[10px] uppercase tracking-wide text-slate-500 mb-2">Quick actions</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <QuickBtn icon={ArrowUpRight} label="Upgrade Plan" tone="gold" onClick={onUpgrade} disabled={busy} />
          <QuickBtn icon={RefreshCw} label="Renew" tone="emerald" onClick={onRenew} disabled={busy} />
          <QuickBtn icon={Calendar} label="Extend 7d" onClick={() => onExtend(7)} disabled={busy} />
          <QuickBtn icon={Calendar} label="Extend 30d" onClick={() => onExtend(30)} disabled={busy} />
          <QuickBtn icon={PauseCircle} label="Suspend" tone="orange" onClick={onSuspend} disabled={busy || active.status === "suspended"} />
          <QuickBtn icon={XCircle} label="Cancel" tone="rose" onClick={onCancel} disabled={busy || active.status === "cancelled"} />
          <QuickBtn icon={Gift} label="Complimentary" tone="violet" onClick={onComp} disabled={busy} />
          <QuickBtn icon={Receipt} label="Payments" onClick={onPayments} disabled={busy} />
        </div>
      </div>

      {/* Active add-ons */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-[10px] uppercase tracking-wide text-slate-500">Active add-ons</p>
          <button onClick={onAddAddon} className="text-[11px] text-amber-300 hover:underline flex items-center gap-1">
            <Plus size={11} /> Add
          </button>
        </div>
        {addons.length === 0 ? (
          <p className="text-xs text-slate-500 italic">None active.</p>
        ) : (
          <div className="space-y-1.5">
            {addons.map((a) => (
              <div key={a.id} className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900/40 px-3 py-2">
                <div>
                  <p className="text-xs text-slate-200">{a.addon_label}</p>
                  <p className="text-[10px] text-slate-500">until {fmtDate(a.active_until)}</p>
                </div>
                <span className="text-[10px] text-slate-400">
                  {a.unit_price ? `${a.currency} ${a.unit_price}` : "Comp"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

/* PLANS — change plan, complimentary access, request payment */

const PlansTab = ({
  active, isFree, busy, onChange, onComp, onCreatePayment,
}: {
  active: Sub | null; isFree: boolean; busy: boolean;
  onChange: (plan: PlanCode, immediate: boolean) => void;
  onComp: (plan: PlanCode, days: number, reason: string, approver: string) => void;
  onCreatePayment: (plan: PlanCode, cycle: "monthly" | "yearly") => void;
}) => {
  const [cycle, setCycle] = useState<"monthly" | "yearly">("monthly");
  const [showComp, setShowComp] = useState<PlanCode | null>(null);
  const [compDays, setCompDays] = useState(30);
  const [compReason, setCompReason] = useState("Founder approval");
  const [compApprover, setCompApprover] = useState("");

  const currentCode = normalizePlanCode(active?.plan);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-400">Choose a plan to assign or request payment for.</p>
        <div className="flex bg-slate-800 rounded-lg p-0.5 text-[11px]">
          {(["monthly", "yearly"] as const).map((c) => (
            <button key={c} onClick={() => setCycle(c)}
              className={`px-3 py-1 rounded ${cycle === c ? "bg-amber-500/20 text-amber-300" : "text-slate-400"}`}>
              {c}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-3">
        {PLANS.map((p) => {
          const price = cycle === "yearly" ? p.yearly : p.monthly;
          const isCurrent = currentCode === p.code;
          return (
            <Card key={p.code} className={isCurrent ? "ring-1 ring-amber-500/40" : ""}>
              <div className="flex items-start justify-between gap-3 mb-2">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-semibold text-slate-100 uppercase">{p.nameEn}</h4>
                    {p.recommended && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 uppercase">
                        Recommended
                      </span>
                    )}
                    {isCurrent && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 uppercase">
                        Current
                      </span>
                    )}
                  </div>
                  <p className="text-lg font-bold text-amber-300 mt-0.5">
                    {price === 0 ? "Free" : `SAR ${price.toLocaleString()}`}
                    <span className="text-[10px] font-normal text-slate-500 ml-1">/ {cycle}</span>
                  </p>
                </div>
              </div>
              <ul className="space-y-1 mb-3">
                {p.features.slice(0, 3).map((f) => (
                  <li key={f.en} className="text-[11px] text-slate-400 flex items-start gap-1.5">
                    <CheckCircle2 size={10} className="text-emerald-400/70 mt-0.5 shrink-0" /> {f.en}
                  </li>
                ))}
              </ul>
              <div className="flex flex-wrap gap-1.5">
                {p.code !== "FREE" && (
                  <>
                    <QuickBtn icon={CreditCard} label="Request payment" tone="gold"
                      onClick={() => onCreatePayment(p.code, cycle)} disabled={busy} />
                    <QuickBtn icon={ShieldCheck} label={isFree ? "Activate (immediate)" : "Switch immediate"} tone="emerald"
                      onClick={() => onChange(p.code, true)} disabled={busy || isCurrent} />
                    {!isFree && (
                      <QuickBtn icon={Clock} label="Switch next cycle"
                        onClick={() => onChange(p.code, false)} disabled={busy || isCurrent} />
                    )}
                  </>
                )}
                <QuickBtn icon={Gift} label="Complimentary" tone="violet"
                  onClick={() => setShowComp(p.code)} disabled={busy} />
                {p.code === "FREE" && active && currentCode !== "FREE" && (
                  <QuickBtn icon={ChevronRight} label="Downgrade to Free" tone="rose"
                    onClick={() => confirm("Downgrade this customer to FREE? They will lose paid features at end of cycle.")
                      && onChange("FREE", false)} disabled={busy} />
                )}
              </div>

              {showComp === p.code && (
                <div className="mt-3 pt-3 border-t border-slate-800 space-y-2">
                  <p className="text-[10px] uppercase tracking-wide text-slate-500">Complimentary access</p>
                  <div className="grid grid-cols-2 gap-2">
                    <label className="text-[11px] text-slate-400">
                      Duration
                      <select value={compDays} onChange={(e) => setCompDays(Number(e.target.value))}
                        className="mt-1 w-full bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-xs text-slate-200">
                        <option value={7}>7 days</option>
                        <option value={14}>14 days</option>
                        <option value={30}>30 days</option>
                        <option value={60}>60 days (manager)</option>
                        <option value={90}>90 days (manager)</option>
                      </select>
                    </label>
                    <label className="text-[11px] text-slate-400">
                      Reason
                      <select value={compReason} onChange={(e) => setCompReason(e.target.value)}
                        className="mt-1 w-full bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-xs text-slate-200">
                        <option>Founder approval</option>
                        <option>Support recovery</option>
                        <option>Issue compensation</option>
                        <option>Corporate gift</option>
                        <option>Manual decision</option>
                      </select>
                    </label>
                  </div>
                  <input value={compApprover} onChange={(e) => setCompApprover(e.target.value)}
                    placeholder="Approver name (optional)"
                    className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-xs text-slate-200" />
                  <div className="flex gap-2">
                    <button onClick={() => { onComp(p.code, compDays, compReason, compApprover); setShowComp(null); }}
                      className="flex-1 px-3 py-2 rounded-lg bg-violet-500/20 text-violet-300 text-xs">
                      Grant complimentary
                    </button>
                    <button onClick={() => setShowComp(null)} className="px-3 py-2 rounded-lg bg-slate-800 text-slate-400 text-xs">
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
};

/* ADDONS */

const AddonsTab = ({
  active, addons, busy, onAdd, onRemove, onExtend,
}: {
  active: Sub | null; addons: Addon[]; busy: boolean;
  onAdd: (key: string, label: string, price: number, days: number, complimentary: boolean) => void;
  onRemove: (a: Addon) => void; onExtend: (a: Addon, days: number) => void;
}) => {
  const catalog = useAddonCatalog();
  const activeKeys = new Set(addons.filter((a) => a.is_active).map((a) => a.addon_key));

  if (!active) return <p className="text-sm text-slate-400">No active subscription — assign a plan first.</p>;

  return (
    <div className="space-y-4">
      <p className="text-xs text-slate-400">Toggle add-ons for this customer's <span className="text-slate-200 uppercase">{active.plan}</span> subscription.</p>

      {/* Active addons */}
      {addons.filter((a) => a.is_active).length > 0 && (
        <div>
          <p className="text-[10px] uppercase tracking-wide text-slate-500 mb-2">Currently active</p>
          <div className="space-y-2">
            {addons.filter((a) => a.is_active).map((a) => (
              <Card key={a.id}>
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm text-slate-100">{a.addon_label}</p>
                    <p className="text-[10px] text-slate-500">
                      {a.unit_price ? `${a.currency} ${a.unit_price}` : "Complimentary"} · until {fmtDate(a.active_until)}
                    </p>
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    <button onClick={() => onExtend(a, 30)} disabled={busy}
                      className="text-[11px] px-2.5 py-1 rounded bg-emerald-500/15 text-emerald-300">+30d</button>
                    <button onClick={() => onRemove(a)} disabled={busy}
                      className="text-[11px] px-2.5 py-1 rounded bg-rose-500/15 text-rose-300 flex items-center gap-1">
                      <Trash2 size={10} /> Remove
                    </button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Catalog */}
      <div>
        <p className="text-[10px] uppercase tracking-wide text-slate-500 mb-2">Available add-ons</p>
        <div className="grid gap-2">
          {ADDON_CATALOG.map((c) => {
            const isActive = activeKeys.has(c.key);
            return (
              <Card key={c.key} className={isActive ? "opacity-60" : ""}>
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm text-slate-100">
                      <span className="mr-1.5">{c.icon}</span>{c.label}
                    </p>
                    <p className="text-[10px] text-slate-500">SAR {c.price} · {c.durationDays} days</p>
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    <button disabled={busy || isActive}
                      onClick={() => onAdd(c.key, c.label, c.price, c.durationDays, false)}
                      className="text-[11px] px-2.5 py-1 rounded bg-amber-500/15 text-amber-300 disabled:opacity-30">
                      Add
                    </button>
                    <button disabled={busy || isActive}
                      onClick={() => onAdd(c.key, c.label, c.price, c.durationDays, true)}
                      className="text-[11px] px-2.5 py-1 rounded bg-violet-500/15 text-violet-300 disabled:opacity-30">
                      Comp
                    </button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
};

/* PAYMENTS */

const PaymentsTab = ({
  receipts, busy, onReview, onCreate,
}: {
  receipts: Receipt[]; busy: boolean;
  onReview: (r: Receipt, status: "verified" | "rejected" | "needs_more_info", note: string) => void;
  onCreate: (plan: PlanCode, cycle: "monthly" | "yearly") => void;
}) => {
  const [reviewing, setReviewing] = useState<string | null>(null);
  const [reviewNote, setReviewNote] = useState("");
  const latest = receipts[0];

  return (
    <div className="space-y-4">
      <Card>
        <p className="text-[10px] uppercase tracking-wide text-slate-500 mb-1">Latest payment status</p>
        {latest ? (
          <div className="flex items-center justify-between gap-3">
            <div>
              <span className={`text-[11px] px-2 py-0.5 rounded-full font-mono ${PAYMENT_TONE[latest.status] || "bg-slate-700 text-slate-300"}`}>
                {latest.status}
              </span>
              <p className="text-xs text-slate-300 mt-1">
                {latest.currency} {Number(latest.amount).toLocaleString()} · {latest.requested_plan} · {latest.billing_cycle}
              </p>
              <p className="text-[10px] text-slate-500 font-mono mt-0.5">{latest.payment_reference || "—"}</p>
            </div>
            <button onClick={() => { navigator.clipboard.writeText(latest.payment_reference || ""); toast.success("Reference copied"); }}
              className="p-2 rounded-lg bg-slate-800 text-slate-300"><Copy size={12} /></button>
          </div>
        ) : (
          <p className="text-xs text-slate-500 italic">No receipts on file.</p>
        )}
      </Card>

      <div>
        <p className="text-[10px] uppercase tracking-wide text-slate-500 mb-2">Create payment request</p>
        <div className="flex flex-wrap gap-1.5">
          {(["STARTER", "COMPANION", "FAMILY"] as PlanCode[]).map((p) => (
            <div key={p} className="flex gap-1">
              <button onClick={() => onCreate(p, "monthly")} disabled={busy}
                className="text-[11px] px-2.5 py-1 rounded bg-amber-500/15 text-amber-300">{p} monthly</button>
              <button onClick={() => onCreate(p, "yearly")} disabled={busy}
                className="text-[11px] px-2.5 py-1 rounded bg-amber-500/10 text-amber-300/80">{p} yearly</button>
            </div>
          ))}
        </div>
      </div>

      <div>
        <p className="text-[10px] uppercase tracking-wide text-slate-500 mb-2">Payment history</p>
        {receipts.length === 0 ? (
          <p className="text-xs text-slate-500 italic">None yet.</p>
        ) : (
          <div className="space-y-2">
            {receipts.map((r) => (
              <Card key={r.id}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono ${PAYMENT_TONE[r.status] || "bg-slate-700 text-slate-300"}`}>
                        {r.status}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">
                        {r.payment_method}
                      </span>
                    </div>
                    <p className="text-xs text-slate-200 mt-1">
                      {r.currency} {Number(r.amount).toLocaleString()} · {r.requested_plan}
                    </p>
                    <p className="text-[10px] text-slate-500 font-mono">
                      {r.payment_reference || r.reference_no || "—"}
                    </p>
                    <p className="text-[10px] text-slate-500">
                      submitted {fmtDate(r.created_at)}
                      {r.reviewed_at && ` · reviewed ${fmtDate(r.reviewed_at)}`}
                    </p>
                    {r.reviewer_notes && (
                      <p className="text-[11px] text-slate-400 italic mt-1">"{r.reviewer_notes}"</p>
                    )}
                  </div>
                  <div className="flex flex-col gap-1 shrink-0">
                    {r.receipt_file_path && (
                      <a href={r.receipt_file_path} target="_blank" rel="noreferrer"
                        className="text-[11px] px-2 py-1 rounded bg-slate-800 text-slate-300 inline-flex items-center gap-1">
                        <ExternalLink size={10} /> View
                      </a>
                    )}
                    {(r.status === "pending" || r.status === "under_review" || r.status === "needs_more_info") && (
                      <button onClick={() => { setReviewing(r.id); setReviewNote(""); }}
                        className="text-[11px] px-2 py-1 rounded bg-amber-500/15 text-amber-300">
                        Review
                      </button>
                    )}
                  </div>
                </div>

                {reviewing === r.id && (
                  <div className="mt-3 pt-3 border-t border-slate-800 space-y-2">
                    <textarea value={reviewNote} onChange={(e) => setReviewNote(e.target.value)}
                      rows={2} placeholder="Reviewer notes (optional, visible to support)"
                      className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-xs text-slate-200" />
                    <div className="flex gap-1.5 flex-wrap">
                      <button onClick={() => { onReview(r, "verified", reviewNote); setReviewing(null); }}
                        className="text-[11px] px-2.5 py-1 rounded bg-emerald-500/15 text-emerald-300">
                        ✓ Mark verified
                      </button>
                      <button onClick={() => { onReview(r, "needs_more_info", reviewNote); setReviewing(null); }}
                        className="text-[11px] px-2.5 py-1 rounded bg-orange-500/15 text-orange-300">
                        Needs info
                      </button>
                      <button onClick={() => { onReview(r, "rejected", reviewNote); setReviewing(null); }}
                        className="text-[11px] px-2.5 py-1 rounded bg-rose-500/15 text-rose-300">
                        Reject
                      </button>
                      <button onClick={() => setReviewing(null)}
                        className="text-[11px] px-2.5 py-1 rounded bg-slate-800 text-slate-400">
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

/* HISTORY */

const HistoryTab = ({ events }: { events: EventRow[] }) => {
  if (events.length === 0) return <p className="text-sm text-slate-500 italic">No events recorded yet.</p>;
  return (
    <div className="relative">
      <div className="absolute left-3 top-1 bottom-1 w-px bg-slate-800" />
      <ol className="space-y-3">
        {events.map((e) => (
          <li key={e.id} className="relative pl-9">
            <span className="absolute left-1.5 top-1 w-3 h-3 rounded-full bg-amber-500/40 border-2 border-[#0D1B2A]" />
            <div className="rounded-lg border border-slate-800 bg-slate-900/50 px-3 py-2">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <p className="text-xs font-medium text-slate-100">{e.event_type.replace(/_/g, " ")}</p>
                <span className="text-[10px] text-slate-500">{new Date(e.created_at).toLocaleString("en-GB")}</span>
              </div>
              {(e.from_value || e.to_value) && (
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {e.from_value || "—"} <span className="text-slate-600">→</span> {e.to_value || "—"}
                </p>
              )}
              {e.notes && <p className="text-[11px] text-slate-400 italic mt-0.5">"{e.notes}"</p>}
              {e.actor_role && <p className="text-[10px] text-slate-600 mt-0.5">by {e.actor_role}</p>}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
};

/* NOTES */

const NotesTab = ({
  active, draft, setDraft, onAdd, busy,
}: {
  active: Sub | null; draft: string; setDraft: (s: string) => void;
  onAdd: () => void; busy: boolean;
}) => {
  const lines = active?.notes?.split("\n").filter(Boolean) || [];
  return (
    <div className="space-y-3">
      <div>
        <p className="text-[10px] uppercase tracking-wide text-slate-500 mb-1.5">Add internal note</p>
        <textarea value={draft} onChange={(e) => setDraft(e.target.value)}
          rows={3} placeholder="e.g. Founder approved 14-day extension after onboarding delay."
          className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200" />
        <button onClick={onAdd} disabled={busy || !draft.trim() || !active}
          className="mt-2 px-4 py-2 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs disabled:opacity-40">
          Save note
        </button>
        {!active && <p className="text-[11px] text-rose-300 mt-1">No subscription to attach the note to.</p>}
      </div>
      <div>
        <p className="text-[10px] uppercase tracking-wide text-slate-500 mb-2">Existing notes</p>
        {lines.length === 0 ? (
          <p className="text-xs text-slate-500 italic">No notes yet.</p>
        ) : (
          <ul className="space-y-1.5">
            {lines.slice().reverse().map((l, i) => (
              <li key={i} className="text-xs text-slate-300 rounded-lg border border-slate-800 bg-slate-900/40 px-3 py-2">
                {l}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default SubscriptionDrawer;
