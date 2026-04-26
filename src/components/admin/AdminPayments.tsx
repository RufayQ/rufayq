/**
 * AdminPayments — Phase B manual payment & subscription management.
 *
 * Modular by design: lives entirely against the new tables
 * (user_subscriptions, payment_receipts, subscription_addons) so it
 * can be rolled back without touching the legacy `subscriptions` system.
 *
 * Tabs:
 *  • Subscriptions — table of active/pending users, plan, renewal, status
 *  • Receipts      — pending receipts to verify; verify/reject activates plan
 *  • Add-ons       — extras attached to a subscription
 */
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  CreditCard, FileText, Sparkles, Search, Check, X, RefreshCw,
  Plus, Calendar, DownloadCloud, Eye, Trash2,
} from "lucide-react";

type Tab = "subs" | "receipts" | "addons";

interface Sub {
  id: string; device_id: string; plan: string; status: string;
  billing_cycle: string; amount: number | null; currency: string;
  current_period_start: string | null; current_period_end: string | null;
  activated_by: string | null; activated_at: string | null;
  notes: string | null; provider: string;
  created_at: string;
}
interface Receipt {
  id: string; device_id: string; subscription_id: string | null;
  requested_plan: string; billing_cycle: string;
  amount: number; currency: string; payment_method: string;
  reference_no: string | null; receipt_file_path: string | null;
  payer_name: string | null; payer_phone: string | null;
  payment_reference: string | null;
  submission_channel: string; bank_name: string | null;
  transfer_date: string | null;
  patient_message: string | null; internal_note: string | null;
  status: string; reviewer_notes: string | null;
  reviewed_at: string | null; created_at: string;
}
interface Addon {
  id: string; subscription_id: string; addon_key: string; addon_label: string;
  quantity: number; unit_price: number | null; currency: string;
  active_from: string; active_until: string | null; is_active: boolean;
  created_at: string;
}

const PLAN_OPTIONS = ["basic", "companion", "family", "premium"] as const;
const STATUS_COLORS: Record<string, string> = {
  active: "bg-emerald-500/15 text-emerald-300",
  pending_receipt: "bg-amber-500/15 text-amber-300",
  pending: "bg-amber-500/15 text-amber-300",
  verified: "bg-emerald-500/15 text-emerald-300",
  rejected: "bg-rose-500/15 text-rose-300",
  expired: "bg-rose-500/15 text-rose-300",
  cancelled: "bg-slate-700 text-slate-300",
};
const StatusBadge = ({ s }: { s: string }) => (
  <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono ${STATUS_COLORS[s] || "bg-slate-700 text-slate-300"}`}>{s}</span>
);

const PERIOD_DAYS: Record<string, number> = { monthly: 30, quarterly: 90, yearly: 365 };

const AdminPayments = () => {
  const [tab, setTab] = useState<Tab>("subs");
  const [loading, setLoading] = useState(false);
  const [subs, setSubs] = useState<Sub[]>([]);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [addons, setAddons] = useState<Addon[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const load = async () => {
    setLoading(true);
    if (tab === "subs") {
      const { data, error } = await supabase
        .from("user_subscriptions")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) toast.error(error.message); else setSubs((data || []) as Sub[]);
    } else if (tab === "receipts") {
      const { data, error } = await supabase
        .from("payment_receipts")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) toast.error(error.message); else setReceipts((data || []) as Receipt[]);
    } else {
      const { data, error } = await supabase
        .from("user_subscription_addons")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) toast.error(error.message); else setAddons((data || []) as unknown as Addon[]);
    }
    setLoading(false);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [tab]);

  // --- Subscription actions ---
  const activateSub = async (s: Sub) => {
    const days = PERIOD_DAYS[s.billing_cycle] ?? 30;
    const start = new Date();
    const end = new Date(Date.now() + days * 86400000);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("user_subscriptions").update({
      status: "active",
      current_period_start: start.toISOString(),
      current_period_end: end.toISOString(),
      activated_by: user?.id ?? null,
      activated_at: start.toISOString(),
    }).eq("id", s.id);
    if (error) return toast.error(error.message);
    toast.success(`Activated ${s.plan} until ${end.toLocaleDateString()}`);
    load();
  };

  const cancelSub = async (s: Sub) => {
    if (!confirm(`Cancel ${s.plan} subscription for device ${s.device_id.slice(0, 12)}…?`)) return;
    const { error } = await supabase.from("user_subscriptions").update({
      status: "cancelled",
      cancelled_at: new Date().toISOString(),
    }).eq("id", s.id);
    if (error) return toast.error(error.message);
    toast.success("Cancelled");
    load();
  };

  const extendSub = async (s: Sub, days: number) => {
    const base = s.current_period_end ? new Date(s.current_period_end) : new Date();
    const newEnd = new Date(Math.max(base.getTime(), Date.now()) + days * 86400000);
    const { error } = await supabase.from("user_subscriptions").update({
      current_period_end: newEnd.toISOString(),
    }).eq("id", s.id);
    if (error) return toast.error(error.message);
    toast.success(`+${days}d → ${newEnd.toLocaleDateString()}`);
    load();
  };

  // --- Receipt actions ---
  const verifyReceipt = async (r: Receipt) => {
    // 1. Create or upsert subscription
    const days = PERIOD_DAYS[r.billing_cycle] ?? 30;
    const start = new Date();
    const end = new Date(Date.now() + days * 86400000);
    const { data: { user } } = await supabase.auth.getUser();

    // Cancel any existing active sub for this device first to avoid uq constraint conflict
    await supabase.from("user_subscriptions")
      .update({ status: "expired" })
      .eq("device_id", r.device_id).eq("status", "active");

    const { data: subRow, error: subErr } = await supabase.from("user_subscriptions").insert({
      device_id: r.device_id,
      plan: r.requested_plan,
      status: "active",
      billing_cycle: r.billing_cycle,
      amount: r.amount,
      currency: r.currency,
      current_period_start: start.toISOString(),
      current_period_end: end.toISOString(),
      activated_by: user?.id ?? null,
      activated_at: start.toISOString(),
      provider: "manual",
      notes: `Verified from receipt ${r.id.slice(0, 8)}`,
    }).select().single();
    if (subErr) return toast.error(subErr.message);

    // 2. Mark receipt verified, link subscription
    const { error: rErr } = await supabase.from("payment_receipts").update({
      status: "verified",
      subscription_id: subRow.id,
      reviewer_id: user?.id ?? null,
      reviewed_at: new Date().toISOString(),
    }).eq("id", r.id);
    if (rErr) return toast.error(rErr.message);
    toast.success("Receipt verified · plan activated");
    load();
  };

  const rejectReceipt = async (r: Receipt) => {
    const patientMsg = prompt("Message shown to the patient (English/Arabic):") || "Your payment could not be verified.";
    const internalNote = prompt("Internal note (admins only, optional):") || "";
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("payment_receipts").update({
      status: "rejected",
      reviewer_id: user?.id ?? null,
      reviewer_notes: patientMsg,
      patient_message: patientMsg,
      internal_note: internalNote || null,
      reviewed_at: new Date().toISOString(),
    }).eq("id", r.id);
    if (error) return toast.error(error.message);
    toast.success("Rejected");
    load();
  };

  const markUnderReview = async (r: Receipt) => {
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("payment_receipts").update({
      status: "under_review",
      reviewer_id: user?.id ?? null,
    }).eq("id", r.id);
    if (error) return toast.error(error.message);
    toast.success("Marked under review");
    load();
  };

  const requestMoreInfo = async (r: Receipt) => {
    const patientMsg = prompt("What does the patient need to provide? (shown to them)")
      || "Please re-upload a clearer receipt.";
    const internalNote = prompt("Internal note (optional):") || "";
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("payment_receipts").update({
      status: "needs_more_info",
      reviewer_id: user?.id ?? null,
      patient_message: patientMsg,
      internal_note: internalNote || null,
      reviewed_at: new Date().toISOString(),
    }).eq("id", r.id);
    if (error) return toast.error(error.message);
    toast.success("Asked patient for more info");
    load();
  };

  const viewReceiptFile = async (path: string) => {
    const { data, error } = await supabase.storage.from("payment-receipts").createSignedUrl(path, 60);
    if (error) return toast.error(error.message);
    window.open(data.signedUrl, "_blank");
  };

  // --- Addon actions ---
  const addAddon = async (subId: string) => {
    const key = prompt("Add-on key (e.g. extra_ai_credits, extra_seat):"); if (!key) return;
    const label = prompt("Display label:") || key;
    const qty = Number(prompt("Quantity:", "1") || "1");
    const price = Number(prompt("Unit price (SAR):", "0") || "0");
    const { error } = await supabase.from("user_subscription_addons").insert({
      subscription_id: subId, addon_key: key, addon_label: label,
      quantity: qty, unit_price: price, currency: "SAR",
    });
    if (error) return toast.error(error.message);
    toast.success("Add-on attached");
    load();
  };

  const removeAddon = async (id: string) => {
    if (!confirm("Remove add-on?")) return;
    const { error } = await supabase.from("user_subscription_addons").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Removed");
    load();
  };

  // --- Filter ---
  const filteredSubs = useMemo(() => subs.filter(s => {
    if (statusFilter !== "all" && s.status !== statusFilter) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return s.device_id.toLowerCase().includes(q) || s.plan.includes(q);
  }), [subs, search, statusFilter]);

  const filteredReceipts = useMemo(() => receipts.filter(r => {
    if (statusFilter !== "all" && r.status !== statusFilter) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return r.device_id.toLowerCase().includes(q) || r.requested_plan.includes(q)
      || (r.reference_no || "").toLowerCase().includes(q);
  }), [receipts, search, statusFilter]);

  const pendingCount = receipts.filter(r => r.status === "pending").length;

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex flex-wrap gap-1.5 border-b border-slate-800 pb-1">
        {([
          { k: "subs" as Tab, label: "Subscriptions", Icon: CreditCard, badge: 0 },
          { k: "receipts" as Tab, label: "Receipts", Icon: FileText, badge: pendingCount },
          { k: "addons" as Tab, label: "Add-ons", Icon: Sparkles, badge: 0 },
        ]).map(({ k, label, Icon, badge }) => (
          <button key={k} onClick={() => { setTab(k); setStatusFilter("all"); }}
            className={`px-3 py-1.5 rounded-full text-xs flex items-center gap-1.5 ${tab === k ? "bg-amber-500/20 text-amber-300 border border-amber-500/40" : "text-slate-400 border border-transparent hover:text-slate-200"}`}>
            <Icon size={12} />{label}
            {badge ? <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-rose-500/30 text-rose-100">{badge}</span> : null}
          </button>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search device, plan, ref…"
            className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-sm text-slate-200" />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200">
          <option value="all">All statuses</option>
          {tab === "subs" && ["active", "pending_receipt", "expired", "cancelled", "rejected"].map(s => <option key={s} value={s}>{s}</option>)}
          {tab === "receipts" && ["pending", "under_review", "needs_more_info", "verified", "rejected"].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <button onClick={load} className="px-3 py-2 rounded-lg bg-slate-800 text-slate-200 text-xs flex items-center gap-1.5">
          <RefreshCw size={12} />Refresh
        </button>
      </div>

      {loading && <p className="text-slate-400 text-sm">Loading…</p>}

      {/* === SUBS table === */}
      {tab === "subs" && !loading && (
        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full text-xs">
            <thead className="bg-slate-900/60">
              <tr className="text-left text-slate-400">
                <th className="px-3 py-2 font-medium">Device</th>
                <th className="px-3 py-2 font-medium">Plan</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Cycle</th>
                <th className="px-3 py-2 font-medium">Amount</th>
                <th className="px-3 py-2 font-medium">Renewal</th>
                <th className="px-3 py-2 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredSubs.length === 0 && (
                <tr><td colSpan={7} className="px-3 py-6 text-center text-slate-500">No subscriptions.</td></tr>
              )}
              {filteredSubs.map(s => (
                <tr key={s.id} className="border-t border-slate-800 hover:bg-slate-900/30">
                  <td className="px-3 py-2 font-mono text-[10px] text-slate-400">{s.device_id.slice(0, 14)}…</td>
                  <td className="px-3 py-2 capitalize text-slate-200">{s.plan}</td>
                  <td className="px-3 py-2"><StatusBadge s={s.status} /></td>
                  <td className="px-3 py-2 text-slate-400">{s.billing_cycle}</td>
                  <td className="px-3 py-2 text-slate-300">{s.amount ? `${s.currency} ${Number(s.amount).toLocaleString()}` : "—"}</td>
                  <td className="px-3 py-2 text-slate-400">
                    {s.current_period_end ? new Date(s.current_period_end).toLocaleDateString() : "—"}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <div className="inline-flex gap-1">
                      {s.status !== "active" && (
                        <button onClick={() => activateSub(s)} title="Activate"
                          className="px-2 py-1 rounded bg-emerald-500/15 text-emerald-300 text-[10px] flex items-center gap-1">
                          <Check size={10} />Activate
                        </button>
                      )}
                      {s.status === "active" && [30, 90].map(d => (
                        <button key={d} onClick={() => extendSub(s, d)}
                          className="px-2 py-1 rounded bg-amber-500/15 text-amber-300 text-[10px]">+{d}d</button>
                      ))}
                      <button onClick={() => addAddon(s.id)} title="Add-on"
                        className="px-2 py-1 rounded bg-slate-700 text-slate-200 text-[10px] flex items-center gap-1">
                        <Plus size={10} />Add-on
                      </button>
                      {s.status !== "cancelled" && (
                        <button onClick={() => cancelSub(s)} title="Cancel"
                          className="px-2 py-1 rounded bg-rose-500/15 text-rose-300 text-[10px]">
                          <X size={10} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* === RECEIPTS === */}
      {tab === "receipts" && !loading && (
        <div className="space-y-2">
          {filteredReceipts.length === 0 && <p className="text-slate-500 text-sm">No receipts.</p>}
          {filteredReceipts.map(r => (
            <div key={r.id} className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-sm font-semibold text-white capitalize">{r.requested_plan}</span>
                    <StatusBadge s={r.status} />
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">{r.billing_cycle}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">{r.currency} {Number(r.amount).toLocaleString()}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">{r.payment_method}</span>
                  </div>
                  <p className="text-[10px] text-slate-500 font-mono">device: {r.device_id.slice(0, 18)}…</p>
                  {r.payment_reference && (
                    <p className="text-[10px] text-amber-300 font-mono">ref · {r.payment_reference}</p>
                  )}
                  <p className="text-[10px] text-slate-500">
                    {new Date(r.created_at).toLocaleString()}
                    {r.submission_channel && ` · via ${r.submission_channel}`}
                    {r.reference_no && ` · txn ${r.reference_no}`}
                    {r.payer_name && ` · ${r.payer_name}`}
                    {r.bank_name && ` · ${r.bank_name}`}
                    {r.transfer_date && ` · transferred ${r.transfer_date}`}
                  </p>
                  {r.patient_message && <p className="text-[11px] text-slate-200 mt-1">📨 {r.patient_message}</p>}
                  {r.internal_note && <p className="text-[11px] text-amber-300/80 italic mt-0.5">🗒 {r.internal_note}</p>}
                </div>
                <div className="flex gap-1.5 shrink-0 flex-wrap justify-end">
                  {r.receipt_file_path && (
                    <button onClick={() => viewReceiptFile(r.receipt_file_path!)}
                      className="px-2.5 py-1 rounded bg-slate-700 text-slate-200 text-[11px] flex items-center gap-1">
                      <Eye size={11} />View receipt
                    </button>
                  )}
                  {(r.status === "pending" || r.status === "under_review" || r.status === "needs_more_info") && (
                    <>
                      {r.status === "pending" && (
                        <button onClick={() => markUnderReview(r)}
                          className="px-3 py-1 rounded bg-blue-500/20 text-blue-300 text-[11px] flex items-center gap-1">
                          <RefreshCw size={11} />Take review
                        </button>
                      )}
                      <button onClick={() => verifyReceipt(r)}
                        className="px-3 py-1 rounded bg-emerald-500/20 text-emerald-300 text-[11px] flex items-center gap-1">
                        <Check size={11} />Approve & activate
                      </button>
                      <button onClick={() => requestMoreInfo(r)}
                        className="px-3 py-1 rounded bg-amber-500/20 text-amber-300 text-[11px] flex items-center gap-1">
                        <FileText size={11} />Need more info
                      </button>
                      <button onClick={() => rejectReceipt(r)}
                        className="px-3 py-1 rounded bg-rose-500/15 text-rose-300 text-[11px] flex items-center gap-1">
                        <X size={11} />Reject
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* === ADDONS === */}
      {tab === "addons" && !loading && (
        <div className="space-y-2">
          {addons.length === 0 && <p className="text-slate-500 text-sm">No add-ons.</p>}
          {addons.map(a => (
            <div key={a.id} className="rounded-xl border border-slate-800 bg-slate-900/40 p-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-white">{a.addon_label}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">{a.addon_key}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">×{a.quantity}</span>
                  {a.unit_price != null && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">{a.currency} {Number(a.unit_price).toLocaleString()}</span>
                  )}
                </div>
                <p className="text-[10px] text-slate-500 font-mono mt-1">sub: {a.subscription_id.slice(0, 14)}… · since {new Date(a.active_from).toLocaleDateString()}</p>
              </div>
              <button onClick={() => removeAddon(a.id)}
                className="px-2 py-1 rounded bg-rose-500/15 text-rose-300 text-[10px] flex items-center gap-1">
                <Trash2 size={10} />Remove
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminPayments;
