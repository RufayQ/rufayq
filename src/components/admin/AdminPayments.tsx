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
import { toast } from "sonner";
import { useQuickCreateSignal } from "@/components/admin/shell/quickCreateSignal";
import {
  CreditCard, FileText, Sparkles, Search, Check, X, RefreshCw,
  Plus, Eye, Trash2, List, LayoutGrid, Activity,
} from "lucide-react";
import {
  paymentsClient,
  useRealtimeChannel,
  type PaymentReceipt,
  type SubscriptionRow as Sub,
  type AddonRow as Addon,
} from "@/api";
import { Can } from "@/features/auth";

type Tab = "subs" | "receipts" | "addons";
type Receipt = PaymentReceipt;
type ReceiptView = "cards" | "table";

import { receiptTone, isPendingReceipt } from "@/features/payments/logic/receipts";
import { statusTone } from "@/features/subscriptions/logic/statusMachine";

const PLAN_OPTIONS = ["basic", "companion", "family", "premium"] as const;

/** Receipts use receipt tones; subscription rows use the subscription tones.
 *  We pick whichever is defined first to keep one badge component. */
const tone = (s: string): string => {
  const r = receiptTone(s);
  if (r !== "bg-slate-700 text-slate-300") return r;
  return statusTone(s);
};

const StatusBadge = ({ s }: { s: string }) => (
  <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono ${tone(s)}`}>{s}</span>
);

const PERIOD_DAYS: Record<string, number> = { monthly: 30, quarterly: 90, yearly: 365 };

const AdminPayments = () => {
  const [tab, setTab] = useState<Tab>("subs");
  useQuickCreateSignal("payments", () => { setTab("receipts"); toast.info("Switched to Receipts — log a new manual payment from here."); });
  const [loading, setLoading] = useState(false);
  const [subs, setSubs] = useState<Sub[]>([]);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [addons, setAddons] = useState<Addon[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [receiptView, setReceiptView] = useState<ReceiptView>("table");
  const [pulseId, setPulseId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    if (tab === "subs") {
      const res = await paymentsClient.listSubscriptions();
      if (res.error) toast.error(res.error.message); else setSubs(res.data ?? []);
    } else if (tab === "receipts") {
      const res = await paymentsClient.list();
      if (res.error) toast.error(res.error.message); else setReceipts(res.data ?? []);
    } else {
      const res = await paymentsClient.listAddons();
      if (res.error) toast.error(res.error.message); else setAddons(res.data ?? []);
    }
    setLoading(false);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [tab]);

  // Live refresh — any receipt change (insert/update/delete, any status) flows
  // into the table so verifications, rejections and incoming pendings all
  // appear instantly. Pulse the affected row briefly to draw the eye.
  useRealtimeChannel<Receipt>("paymentsAny", (payload) => {
    if (tab !== "receipts") return;
    const id = (payload.new?.id ?? payload.old?.id) as string | undefined;
    if (id) setPulseId(id);
    load();
    if (id) setTimeout(() => setPulseId((cur) => (cur === id ? null : cur)), 1800);
  });

  // --- Subscription actions ---
  const activateSub = async (s: Sub) => {
    const res = await paymentsClient.activateSubscription(s);
    if (res.error) return toast.error(res.error.message);
    toast.success(`Activated ${s.plan} until ${res.data!.end.toLocaleDateString()}`);
    load();
  };

  const cancelSub = async (s: Sub) => {
    if (!confirm(`Cancel ${s.plan} subscription for device ${s.device_id.slice(0, 12)}…?`)) return;
    const res = await paymentsClient.cancelSubscription(s.id);
    if (res.error) return toast.error(res.error.message);
    toast.success("Cancelled");
    load();
  };

  const extendSub = async (s: Sub, days: number) => {
    const res = await paymentsClient.extendSubscription(s, days);
    if (res.error) return toast.error(res.error.message);
    toast.success(`+${days}d → ${res.data!.end.toLocaleDateString()}`);
    load();
  };

  // --- Receipt actions ---
  const verifyReceipt = async (r: Receipt) => {
    const res = await paymentsClient.verifyAndActivate(r);
    if (res.error) return toast.error(res.error.message);
    toast.success("Receipt verified · plan activated");
    load();
  };

  const rejectReceipt = async (r: Receipt) => {
    const patientMsg = prompt("Message shown to the patient (English/Arabic):") || "Your payment could not be verified.";
    const internalNote = prompt("Internal note (admins only, optional):") || "";
    const res = await paymentsClient.reject(r.id, patientMsg, internalNote);
    if (res.error) return toast.error(res.error.message);
    toast.success("Rejected");
    load();
  };

  const markUnderReview = async (r: Receipt) => {
    const res = await paymentsClient.markUnderReview(r.id);
    if (res.error) return toast.error(res.error.message);
    toast.success("Marked under review");
    load();
  };

  const requestMoreInfo = async (r: Receipt) => {
    const patientMsg = prompt("What does the patient need to provide? (shown to them)")
      || "Please re-upload a clearer receipt.";
    const internalNote = prompt("Internal note (optional):") || "";
    const res = await paymentsClient.requestMoreInfo(r.id, patientMsg, internalNote);
    if (res.error) return toast.error(res.error.message);
    toast.success("Asked patient for more info");
    load();
  };

  const viewReceiptFile = async (path: string) => {
    const res = await paymentsClient.getSignedReceiptUrl(path, 60);
    if (res.error || !res.data) return toast.error(res.error?.message ?? "Could not open receipt");
    window.open(res.data, "_blank");
  };

  // --- Addon actions ---
  const addAddon = async (subId: string) => {
    const key = prompt("Add-on key (e.g. extra_ai_credits, extra_seat):"); if (!key) return;
    const label = prompt("Display label:") || key;
    const qty = Number(prompt("Quantity:", "1") || "1");
    const price = Number(prompt("Unit price (SAR):", "0") || "0");
    const res = await paymentsClient.addAddon({
      subscription_id: subId, addon_key: key, addon_label: label,
      quantity: qty, unit_price: price,
    });
    if (res.error) return toast.error(res.error.message);
    toast.success("Add-on attached");
    load();
  };

  const removeAddon = async (id: string) => {
    if (!confirm("Remove add-on?")) return;
    const res = await paymentsClient.removeAddon(id);
    if (res.error) return toast.error(res.error.message);
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

  const pendingCount = receipts.filter(r => isPendingReceipt(r.status)).length;

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
                      <Can action="subscription.modify">
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
                      </Can>
                      <Can action="subscription.cancel">
                        {s.status !== "cancelled" && (
                          <button onClick={() => cancelSub(s)} title="Cancel"
                            className="px-2 py-1 rounded bg-rose-500/15 text-rose-300 text-[10px]">
                            <X size={10} />
                          </button>
                        )}
                      </Can>
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
        <>
          {/* View toggle */}
          <div className="flex items-center gap-1.5 -mt-2">
            <button
              onClick={() => setReceiptView("table")}
              className={`px-2.5 py-1 rounded-md text-[11px] flex items-center gap-1 border ${receiptView === "table" ? "bg-amber-500/15 text-amber-300 border-amber-500/40" : "border-slate-800 text-slate-400 hover:text-slate-200"}`}
              title="Compact realtime table"
            >
              <List size={11} />Table
            </button>
            <button
              onClick={() => setReceiptView("cards")}
              className={`px-2.5 py-1 rounded-md text-[11px] flex items-center gap-1 border ${receiptView === "cards" ? "bg-amber-500/15 text-amber-300 border-amber-500/40" : "border-slate-800 text-slate-400 hover:text-slate-200"}`}
              title="Detailed card view"
            >
              <LayoutGrid size={11} />Cards
            </button>
            <span className="ml-2 inline-flex items-center gap-1 text-[10px] text-slate-500">
              <Activity size={10} className="text-emerald-400 animate-pulse" />live
            </span>
          </div>

          {receiptView === "table" && (
            <div className="overflow-x-auto rounded-xl border border-slate-800">
              <table className="w-full text-xs">
                <thead className="bg-slate-900/60">
                  <tr className="text-left text-slate-400">
                    <th className="px-3 py-2 font-medium">Submitted</th>
                    <th className="px-3 py-2 font-medium">Plan</th>
                    <th className="px-3 py-2 font-medium">Status</th>
                    <th className="px-3 py-2 font-medium">Amount</th>
                    <th className="px-3 py-2 font-medium">Method</th>
                    <th className="px-3 py-2 font-medium">Device</th>
                    <th className="px-3 py-2 font-medium">Reference</th>
                    <th className="px-3 py-2 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredReceipts.length === 0 && (
                    <tr><td colSpan={8} className="px-3 py-6 text-center text-slate-500">No receipts.</td></tr>
                  )}
                  {filteredReceipts.map((r) => {
                    const pulse = pulseId === r.id;
                    return (
                      <tr key={r.id}
                        className={`border-t border-slate-800 transition-colors ${pulse ? "bg-amber-500/10" : "hover:bg-slate-900/30"}`}>
                        <td className="px-3 py-2 text-slate-400 whitespace-nowrap">{new Date(r.created_at).toLocaleString()}</td>
                        <td className="px-3 py-2 capitalize text-slate-200">{r.requested_plan} <span className="text-slate-500">· {r.billing_cycle}</span></td>
                        <td className="px-3 py-2"><StatusBadge s={r.status} /></td>
                        <td className="px-3 py-2 text-slate-300">{r.currency} {Number(r.amount).toLocaleString()}</td>
                        <td className="px-3 py-2 text-slate-400">{r.payment_method}</td>
                        <td className="px-3 py-2 font-mono text-[10px] text-slate-500">{r.device_id.slice(0, 14)}…</td>
                        <td className="px-3 py-2 font-mono text-[10px] text-amber-300/80">{r.reference_no || r.payment_reference || "—"}</td>
                        <td className="px-3 py-2 text-right">
                          <div className="inline-flex gap-1">
                            {r.receipt_file_path && (
                              <button onClick={() => viewReceiptFile(r.receipt_file_path!)}
                                title="View receipt"
                                className="px-1.5 py-1 rounded bg-slate-700 text-slate-200 text-[10px]">
                                <Eye size={10} />
                              </button>
                            )}
                            {(r.status === "pending" || r.status === "under_review" || r.status === "needs_more_info") && (
                              <>
                                <Can action="payment.verify">
                                  <button onClick={() => verifyReceipt(r)} title="Approve"
                                    className="px-1.5 py-1 rounded bg-emerald-500/20 text-emerald-300 text-[10px]">
                                    <Check size={10} />
                                  </button>
                                </Can>
                                <Can action="payment.reject">
                                  <button onClick={() => rejectReceipt(r)} title="Reject"
                                    className="px-1.5 py-1 rounded bg-rose-500/15 text-rose-300 text-[10px]">
                                    <X size={10} />
                                  </button>
                                </Can>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {receiptView === "cards" && (
            <div className="space-y-2">
              {filteredReceipts.length === 0 && <p className="text-slate-500 text-sm">No receipts.</p>}
              {filteredReceipts.map(r => {
                const pulse = pulseId === r.id;
                return (
                <div key={r.id} className={`rounded-xl border p-4 transition-colors ${pulse ? "border-amber-500/60 bg-amber-500/5" : "border-slate-800 bg-slate-900/40"}`}>
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
                            <Can action="payment.verify">
                              <button onClick={() => markUnderReview(r)}
                                className="px-3 py-1 rounded bg-blue-500/20 text-blue-300 text-[11px] flex items-center gap-1">
                                <RefreshCw size={11} />Take review
                              </button>
                            </Can>
                          )}
                          <Can action="payment.verify">
                            <button onClick={() => verifyReceipt(r)}
                              className="px-3 py-1 rounded bg-emerald-500/20 text-emerald-300 text-[11px] flex items-center gap-1">
                              <Check size={11} />Approve & activate
                            </button>
                            <button onClick={() => requestMoreInfo(r)}
                              className="px-3 py-1 rounded bg-amber-500/20 text-amber-300 text-[11px] flex items-center gap-1">
                              <FileText size={11} />Need more info
                            </button>
                          </Can>
                          <Can action="payment.reject">
                            <button onClick={() => rejectReceipt(r)}
                              className="px-3 py-1 rounded bg-rose-500/15 text-rose-300 text-[11px] flex items-center gap-1">
                              <X size={11} />Reject
                            </button>
                          </Can>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                );
              })}
            </div>
          )}
        </>
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
