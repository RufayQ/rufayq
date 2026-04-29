/**
 * AdminPricingCatalog — admin source of truth for plans, add-ons, and prices.
 *
 * Three tabs:
 *   • Plans   — list/edit subscription plans (name, features, multi-currency prices)
 *   • Add-ons — list/edit catalog add-ons (used by SubscriptionDrawer + landing)
 *   • History — audit-log filter view of all pricing_* changes
 *
 * Public Pricing page reads the same tables via usePricingCatalog and refreshes
 * automatically (Supabase realtime on pricing_catalog_version).
 */
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Plus, Save, Trash2, X, Star, ChevronRight, Search, RefreshCw,
  Tag, Package, Activity, GripVertical, Download,
} from "lucide-react";
import { usePermissions } from "@/features/auth";

const CURRENCIES = ["SAR", "AED", "EGP", "USD", "EUR"] as const;
const CYCLES = ["monthly", "quarterly", "yearly"] as const;

type Tab = "plans" | "addons" | "history";

interface PlanRow {
  id: string; code: string; name_en: string; name_ar: string;
  description_en: string | null; description_ar: string | null;
  recommended: boolean; sort_order: number; is_active: boolean;
  cta_en: string | null; cta_ar: string | null;
}
interface PlanFeature { id: string; plan_id: string; text_en: string; text_ar: string; sort_order: number }
interface PlanPrice { id: string; plan_id: string; currency: string; billing_cycle: string; amount: number }
interface AddonRow {
  id: string; key: string; name_en: string; name_ar: string;
  description_en: string | null; description_ar: string | null;
  unit_en: string | null; unit_ar: string | null;
  cta_en: string | null; cta_ar: string | null;
  hero: boolean; is_active: boolean; sort_order: number;
}
interface AddonPrice { id: string; addon_id: string; currency: string; amount: number }

const AdminPricingCatalog = () => {
  const { can, ready } = usePermissions();
  const canModify = ready && can("pricing.modify");
  const [tab, setTab] = useState<Tab>("plans");
  const [loading, setLoading] = useState(false);
  const [plans, setPlans] = useState<PlanRow[]>([]);
  const [features, setFeatures] = useState<PlanFeature[]>([]);
  const [planPrices, setPlanPrices] = useState<PlanPrice[]>([]);
  const [addons, setAddons] = useState<AddonRow[]>([]);
  const [addonPrices, setAddonPrices] = useState<AddonPrice[]>([]);
  const [editPlan, setEditPlan] = useState<PlanRow | null>(null);
  const [editAddon, setEditAddon] = useState<AddonRow | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [search, setSearch] = useState("");

  const load = async () => {
    setLoading(true);
    const [a, b, c, d, e] = await Promise.all([
      supabase.from("pricing_plans").select("*").order("sort_order"),
      supabase.from("pricing_plan_features").select("*").order("sort_order"),
      supabase.from("pricing_plan_prices").select("*"),
      supabase.from("pricing_addons").select("*").order("sort_order"),
      supabase.from("pricing_addon_prices").select("*"),
    ]);
    setPlans((a.data as any) || []);
    setFeatures((b.data as any) || []);
    setPlanPrices((c.data as any) || []);
    setAddons((d.data as any) || []);
    setAddonPrices((e.data as any) || []);
    setLoading(false);
  };

  const loadHistory = async () => {
    const { data } = await supabase
      .from("admin_audit_log")
      .select("*")
      .like("action", "pricing_%")
      .order("created_at", { ascending: false })
      .limit(300);
    setHistory(data || []);
  };

  useEffect(() => { load(); }, []);
  useEffect(() => { if (tab === "history") loadHistory(); }, [tab]);

  /* ── plans ─────────────────────────────────────────────────────── */
  const newPlan = () => {
    if (!canModify) return toast.error("Permission required");
    setEditPlan({
      id: "", code: "", name_en: "", name_ar: "",
      description_en: "", description_ar: "",
      recommended: false, sort_order: plans.length, is_active: true,
      cta_en: "Subscribe", cta_ar: "اشترك",
    });
  };

  const savePlan = async (p: PlanRow, planFeats: PlanFeature[], pxMap: Record<string, number>) => {
    if (!canModify) return toast.error("Permission required");
    let id = p.id;
    if (!id) {
      const { data, error } = await supabase.from("pricing_plans").insert({
        code: p.code, name_en: p.name_en, name_ar: p.name_ar,
        description_en: p.description_en, description_ar: p.description_ar,
        recommended: p.recommended, sort_order: p.sort_order, is_active: p.is_active,
        cta_en: p.cta_en, cta_ar: p.cta_ar, published_at: new Date().toISOString(),
      }).select("id").single();
      if (error) return toast.error(error.message);
      id = (data as any).id;
    } else {
      const { error } = await supabase.from("pricing_plans").update({
        code: p.code, name_en: p.name_en, name_ar: p.name_ar,
        description_en: p.description_en, description_ar: p.description_ar,
        recommended: p.recommended, sort_order: p.sort_order, is_active: p.is_active,
        cta_en: p.cta_en, cta_ar: p.cta_ar,
      }).eq("id", id);
      if (error) return toast.error(error.message);
    }
    // Replace features
    await supabase.from("pricing_plan_features").delete().eq("plan_id", id);
    if (planFeats.length) {
      await supabase.from("pricing_plan_features").insert(
        planFeats.map((f, i) => ({ plan_id: id, text_en: f.text_en, text_ar: f.text_ar, sort_order: i })),
      );
    }
    // Upsert prices
    const rows = Object.entries(pxMap)
      .filter(([, v]) => Number.isFinite(v))
      .map(([k, v]) => {
        const [currency, billing_cycle] = k.split("|");
        return { plan_id: id, currency, billing_cycle, amount: Number(v) };
      });
    if (rows.length) {
      await supabase.from("pricing_plan_prices")
        .upsert(rows, { onConflict: "plan_id,currency,billing_cycle" });
    }
    toast.success("Plan saved — landing page will refresh automatically");
    setEditPlan(null);
    load();
  };

  const deletePlan = async (id: string) => {
    if (!canModify) return toast.error("Permission required");
    if (!confirm("Delete this plan? Prices and features will be removed too.")) return;
    const { error } = await supabase.from("pricing_plans").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Plan deleted");
    setEditPlan(null);
    load();
  };

  /* ── addons ────────────────────────────────────────────────────── */
  const newAddon = () => {
    if (!canModify) return toast.error("Permission required");
    setEditAddon({
      id: "", key: "", name_en: "", name_ar: "",
      description_en: "", description_ar: "",
      unit_en: "", unit_ar: "", cta_en: "Add to plan", cta_ar: "أضف للخطة",
      hero: false, is_active: true, sort_order: addons.length,
    });
  };

  const saveAddon = async (a: AddonRow, pxMap: Record<string, number>) => {
    if (!canModify) return toast.error("Permission required");
    let id = a.id;
    const payload = {
      key: a.key, name_en: a.name_en, name_ar: a.name_ar,
      description_en: a.description_en, description_ar: a.description_ar,
      unit_en: a.unit_en, unit_ar: a.unit_ar, cta_en: a.cta_en, cta_ar: a.cta_ar,
      hero: a.hero, is_active: a.is_active, sort_order: a.sort_order,
    };
    if (!id) {
      const { data, error } = await supabase.from("pricing_addons").insert(payload).select("id").single();
      if (error) return toast.error(error.message);
      id = (data as any).id;
    } else {
      const { error } = await supabase.from("pricing_addons").update(payload).eq("id", id);
      if (error) return toast.error(error.message);
    }
    const rows = Object.entries(pxMap)
      .filter(([, v]) => Number.isFinite(v))
      .map(([currency, v]) => ({ addon_id: id, currency, amount: Number(v) }));
    if (rows.length) {
      await supabase.from("pricing_addon_prices").upsert(rows, { onConflict: "addon_id,currency" });
    }
    toast.success("Add-on saved — landing page will refresh automatically");
    setEditAddon(null);
    load();
  };

  const deleteAddon = async (id: string) => {
    if (!canModify) return toast.error("Permission required");
    if (!confirm("Delete this add-on?")) return;
    const { error } = await supabase.from("pricing_addons").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Add-on deleted");
    setEditAddon(null);
    load();
  };

  /* ── history filter / export ───────────────────────────────────── */
  const filteredHistory = useMemo(() => {
    const t = search.trim().toLowerCase();
    if (!t) return history;
    return history.filter((h) =>
      JSON.stringify(h).toLowerCase().includes(t));
  }, [history, search]);

  const exportCsv = () => {
    const headers = ["created_at", "actor_email", "actor_role", "action", "target_type", "target_id"];
    const rows = filteredHistory.map((h) =>
      headers.map((k) => JSON.stringify(h[k] ?? "")).join(","));
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url; link.download = `pricing-history-${Date.now()}.csv`;
    link.click(); URL.revokeObjectURL(url);
    toast.success(`Exported ${rows.length} events`);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap border-b border-slate-800 pb-2">
        {([
          { k: "plans", label: "Plans", icon: Tag },
          { k: "addons", label: "Add-ons", icon: Package },
          { k: "history", label: "History", icon: Activity },
        ] as const).map(({ k, label, icon: Icon }) => (
          <button key={k} onClick={() => setTab(k as Tab)}
            className={`px-3 py-1.5 rounded-full text-xs flex items-center gap-1.5 ${
              tab === k ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                : "text-slate-400 border border-transparent hover:text-slate-200"
            }`}>
            <Icon size={12} /> {label}
          </button>
        ))}
        <button onClick={load} className="ml-auto text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1">
          <RefreshCw size={12} /> Reload
        </button>
      </div>

      {!canModify && (
        <p className="text-[11px] text-amber-400/80 px-1">
          Read-only view — your role can view pricing but not modify it.
        </p>
      )}

      {tab === "plans" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-400">{plans.length} plan(s) · changes are live on rufayq.com immediately.</p>
            {canModify && (
              <button onClick={newPlan}
                className="px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-300 text-xs flex items-center gap-1 border border-amber-500/40">
                <Plus size={12} /> New plan
              </button>
            )}
          </div>
          {loading && <p className="text-slate-400 text-sm">Loading…</p>}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {plans.map((p) => {
              const sarMonthly = planPrices.find((x) => x.plan_id === p.id && x.currency === "SAR" && x.billing_cycle === "monthly");
              const featCount = features.filter((f) => f.plan_id === p.id).length;
              return (
                <button key={p.id} onClick={() => setEditPlan(p)}
                  className="text-left rounded-xl border border-slate-800 bg-slate-900/50 p-3 hover:border-amber-500/40 transition group">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-semibold text-white">{p.name_en}</span>
                    {p.recommended && <Star size={12} className="text-amber-300" />}
                    {!p.is_active && <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300">inactive</span>}
                    <ChevronRight size={12} className="ml-auto text-slate-500 group-hover:text-amber-300" />
                  </div>
                  <p className="text-[11px] text-slate-400">{p.code} · {featCount} features</p>
                  <p className="text-[11px] text-slate-300 mt-1">
                    {sarMonthly ? `SAR ${Number(sarMonthly.amount).toLocaleString()} / mo` : "no price"}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {tab === "addons" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-400">{addons.length} add-on(s) · used by landing & subscription drawer.</p>
            {canModify && (
              <button onClick={newAddon}
                className="px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-300 text-xs flex items-center gap-1 border border-amber-500/40">
                <Plus size={12} /> New add-on
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {addons.map((a) => {
              const sar = addonPrices.find((x) => x.addon_id === a.id && x.currency === "SAR");
              return (
                <button key={a.id} onClick={() => setEditAddon(a)}
                  className="text-left rounded-xl border border-slate-800 bg-slate-900/50 p-3 hover:border-amber-500/40 transition group">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-semibold text-white">{a.name_en}</span>
                    {a.hero && <Star size={12} className="text-amber-300" />}
                    {!a.is_active && <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300">inactive</span>}
                    <ChevronRight size={12} className="ml-auto text-slate-500 group-hover:text-amber-300" />
                  </div>
                  <p className="text-[11px] text-slate-400 font-mono">{a.key}</p>
                  <p className="text-[11px] text-slate-300 mt-1">
                    {sar ? `SAR ${Number(sar.amount).toLocaleString()} ${a.unit_en || ""}` : "no price"}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {tab === "history" && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <Search size={14} className="text-slate-500" />
            <input value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search action, actor, target id…"
              className="flex-1 min-w-[180px] bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200" />
            <button onClick={exportCsv}
              className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-200 text-xs flex items-center gap-1 border border-slate-700">
              <Download size={12} /> Export CSV
            </button>
            <button onClick={loadHistory} className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1">
              <RefreshCw size={12} /> Reload
            </button>
          </div>
          <div className="space-y-1">
            {filteredHistory.length === 0 && <p className="text-xs text-slate-500">No history yet.</p>}
            {filteredHistory.map((h) => (
              <div key={h.id} className="rounded-lg border border-slate-800 bg-slate-900/30 px-3 py-2 text-[11px] flex flex-wrap items-center gap-x-3 gap-y-0.5">
                <span className="text-slate-400 font-mono">{new Date(h.created_at).toLocaleString()}</span>
                <span className="text-amber-300 font-mono">{h.action}</span>
                <span className="text-slate-300">{h.actor_email || "system"}</span>
                <span className="text-slate-500">{h.target_type}</span>
                <span className="text-slate-500 font-mono break-all">{h.target_id}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {editPlan && (
        <PlanEditor
          plan={editPlan}
          features={features.filter((f) => f.plan_id === editPlan.id)}
          prices={planPrices.filter((p) => p.plan_id === editPlan.id)}
          canModify={canModify}
          onClose={() => setEditPlan(null)}
          onSave={savePlan}
          onDelete={deletePlan}
        />
      )}
      {editAddon && (
        <AddonEditor
          addon={editAddon}
          prices={addonPrices.filter((p) => p.addon_id === editAddon.id)}
          canModify={canModify}
          onClose={() => setEditAddon(null)}
          onSave={saveAddon}
          onDelete={deleteAddon}
        />
      )}
    </div>
  );
};

/* ─────────────────────────── PlanEditor ──────────────────────────── */
const PlanEditor = ({
  plan, features, prices, canModify, onClose, onSave, onDelete,
}: {
  plan: PlanRow; features: PlanFeature[]; prices: PlanPrice[]; canModify: boolean;
  onClose: () => void;
  onSave: (p: PlanRow, feats: PlanFeature[], pxMap: Record<string, number>) => void;
  onDelete: (id: string) => void;
}) => {
  const [p, setP] = useState(plan);
  const [feats, setFeats] = useState<PlanFeature[]>(features);
  const [px, setPx] = useState<Record<string, number>>(() => {
    const m: Record<string, number> = {};
    prices.forEach((r) => { m[`${r.currency}|${r.billing_cycle}`] = Number(r.amount); });
    return m;
  });
  const upd = <K extends keyof PlanRow>(k: K, v: PlanRow[K]) => setP((s) => ({ ...s, [k]: v }));

  return (
    <div className="fixed inset-0 z-50 flex justify-end animate-in fade-in" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60" />
      <div onClick={(e) => e.stopPropagation()}
        className="relative w-full sm:max-w-xl bg-slate-950 border-l border-slate-800 overflow-y-auto animate-slide-in-right">
        <div className="sticky top-0 z-10 bg-slate-950/95 border-b border-slate-800 px-4 sm:px-5 py-3 flex items-center gap-2">
          <h3 className="text-sm font-semibold text-white">{p.id ? "Edit plan" : "New plan"}</h3>
          <button onClick={onClose} className="ml-auto text-slate-400 hover:text-white"><X size={16} /></button>
        </div>
        <div className="p-4 sm:p-5 space-y-4">
          <Field label="Code (uppercase)">
            <input value={p.code} onChange={(e) => upd("code", e.target.value.toUpperCase())} className={inp} disabled={!canModify} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Name (EN)"><input value={p.name_en} onChange={(e) => upd("name_en", e.target.value)} className={inp} disabled={!canModify} /></Field>
            <Field label="Name (AR)"><input dir="rtl" value={p.name_ar} onChange={(e) => upd("name_ar", e.target.value)} className={inp} disabled={!canModify} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="CTA (EN)"><input value={p.cta_en || ""} onChange={(e) => upd("cta_en", e.target.value)} className={inp} disabled={!canModify} /></Field>
            <Field label="CTA (AR)"><input dir="rtl" value={p.cta_ar || ""} onChange={(e) => upd("cta_ar", e.target.value)} className={inp} disabled={!canModify} /></Field>
          </div>
          <div className="flex items-center gap-4 flex-wrap text-xs">
            <label className="flex items-center gap-1.5 text-slate-300">
              <input type="checkbox" checked={p.recommended} onChange={(e) => upd("recommended", e.target.checked)} disabled={!canModify} /> Recommended
            </label>
            <label className="flex items-center gap-1.5 text-slate-300">
              <input type="checkbox" checked={p.is_active} onChange={(e) => upd("is_active", e.target.checked)} disabled={!canModify} /> Active (visible)
            </label>
            <label className="flex items-center gap-1.5 text-slate-300">Sort
              <input type="number" value={p.sort_order} onChange={(e) => upd("sort_order", Number(e.target.value))} className="w-16 bg-slate-900 border border-slate-800 rounded px-2 py-0.5" disabled={!canModify} />
            </label>
          </div>

          <div>
            <p className="text-xs text-slate-400 mb-1.5">Features</p>
            <div className="space-y-1.5">
              {feats.map((f, i) => (
                <div key={i} className="flex gap-1.5 items-start">
                  <GripVertical size={14} className="text-slate-600 mt-1.5" />
                  <input value={f.text_en} onChange={(e) => setFeats((s) => s.map((x, j) => j === i ? { ...x, text_en: e.target.value } : x))}
                    placeholder="EN" className={`${inp} flex-1`} disabled={!canModify} />
                  <input dir="rtl" value={f.text_ar} onChange={(e) => setFeats((s) => s.map((x, j) => j === i ? { ...x, text_ar: e.target.value } : x))}
                    placeholder="AR" className={`${inp} flex-1`} disabled={!canModify} />
                  {canModify && (
                    <button onClick={() => setFeats((s) => s.filter((_, j) => j !== i))} className="text-slate-500 hover:text-rose-400 mt-1">
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              ))}
              {canModify && (
                <button onClick={() => setFeats((s) => [...s, { id: "", plan_id: p.id, text_en: "", text_ar: "", sort_order: s.length }])}
                  className="text-[11px] text-amber-300 hover:underline flex items-center gap-1">
                  <Plus size={11} /> Add feature
                </button>
              )}
            </div>
          </div>

          <div>
            <p className="text-xs text-slate-400 mb-1.5">Prices (leave blank for unsupported)</p>
            <div className="overflow-x-auto">
              <table className="w-full text-[11px]">
                <thead><tr className="text-slate-500"><th className="text-left p-1">Currency</th>
                  {CYCLES.map((c) => <th key={c} className="text-right p-1 capitalize">{c}</th>)}</tr></thead>
                <tbody>
                  {CURRENCIES.map((cur) => (
                    <tr key={cur} className="border-t border-slate-800">
                      <td className="p-1 text-slate-300 font-mono">{cur}</td>
                      {CYCLES.map((c) => {
                        const k = `${cur}|${c}`;
                        return (
                          <td key={c} className="p-1 text-right">
                            <input type="number" step="0.01" value={px[k] ?? ""}
                              onChange={(e) => setPx((s) => ({ ...s, [k]: e.target.value === "" ? NaN : Number(e.target.value) }))}
                              className="w-20 bg-slate-900 border border-slate-800 rounded px-2 py-0.5 text-right" disabled={!canModify} />
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {canModify && (
            <div className="flex gap-2 pt-2 border-t border-slate-800">
              <button onClick={() => onSave(p, feats, px)}
                className="px-3 py-1.5 rounded bg-amber-500/20 text-amber-300 text-xs flex items-center gap-1 border border-amber-500/40">
                <Save size={12} /> Save & publish
              </button>
              {p.id && (
                <button onClick={() => onDelete(p.id)}
                  className="px-3 py-1.5 rounded bg-rose-500/15 text-rose-300 text-xs flex items-center gap-1 ml-auto">
                  <Trash2 size={12} /> Delete
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/* ────────────────────────── AddonEditor ──────────────────────────── */
const AddonEditor = ({
  addon, prices, canModify, onClose, onSave, onDelete,
}: {
  addon: AddonRow; prices: AddonPrice[]; canModify: boolean;
  onClose: () => void;
  onSave: (a: AddonRow, pxMap: Record<string, number>) => void;
  onDelete: (id: string) => void;
}) => {
  const [a, setA] = useState(addon);
  const [px, setPx] = useState<Record<string, number>>(() => {
    const m: Record<string, number> = {};
    prices.forEach((r) => { m[r.currency] = Number(r.amount); });
    return m;
  });
  const upd = <K extends keyof AddonRow>(k: K, v: AddonRow[K]) => setA((s) => ({ ...s, [k]: v }));

  return (
    <div className="fixed inset-0 z-50 flex justify-end animate-in fade-in" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60" />
      <div onClick={(e) => e.stopPropagation()}
        className="relative w-full sm:max-w-xl bg-slate-950 border-l border-slate-800 overflow-y-auto animate-slide-in-right">
        <div className="sticky top-0 z-10 bg-slate-950/95 border-b border-slate-800 px-4 sm:px-5 py-3 flex items-center gap-2">
          <h3 className="text-sm font-semibold text-white">{a.id ? "Edit add-on" : "New add-on"}</h3>
          <button onClick={onClose} className="ml-auto text-slate-400 hover:text-white"><X size={16} /></button>
        </div>
        <div className="p-4 sm:p-5 space-y-4">
          <Field label="Key (lowercase, no spaces)">
            <input value={a.key} onChange={(e) => upd("key", e.target.value.replace(/\s/g, ""))} className={inp} disabled={!canModify} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Name (EN)"><input value={a.name_en} onChange={(e) => upd("name_en", e.target.value)} className={inp} disabled={!canModify} /></Field>
            <Field label="Name (AR)"><input dir="rtl" value={a.name_ar} onChange={(e) => upd("name_ar", e.target.value)} className={inp} disabled={!canModify} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Description (EN)"><textarea rows={2} value={a.description_en || ""} onChange={(e) => upd("description_en", e.target.value)} className={inp} disabled={!canModify} /></Field>
            <Field label="Description (AR)"><textarea rows={2} dir="rtl" value={a.description_ar || ""} onChange={(e) => upd("description_ar", e.target.value)} className={inp} disabled={!canModify} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Unit (EN, e.g. / session)"><input value={a.unit_en || ""} onChange={(e) => upd("unit_en", e.target.value)} className={inp} disabled={!canModify} /></Field>
            <Field label="Unit (AR)"><input dir="rtl" value={a.unit_ar || ""} onChange={(e) => upd("unit_ar", e.target.value)} className={inp} disabled={!canModify} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="CTA (EN)"><input value={a.cta_en || ""} onChange={(e) => upd("cta_en", e.target.value)} className={inp} disabled={!canModify} /></Field>
            <Field label="CTA (AR)"><input dir="rtl" value={a.cta_ar || ""} onChange={(e) => upd("cta_ar", e.target.value)} className={inp} disabled={!canModify} /></Field>
          </div>
          <div className="flex items-center gap-4 flex-wrap text-xs">
            <label className="flex items-center gap-1.5 text-slate-300">
              <input type="checkbox" checked={a.hero} onChange={(e) => upd("hero", e.target.checked)} disabled={!canModify} /> Hero
            </label>
            <label className="flex items-center gap-1.5 text-slate-300">
              <input type="checkbox" checked={a.is_active} onChange={(e) => upd("is_active", e.target.checked)} disabled={!canModify} /> Active
            </label>
            <label className="flex items-center gap-1.5 text-slate-300">Sort
              <input type="number" value={a.sort_order} onChange={(e) => upd("sort_order", Number(e.target.value))} className="w-16 bg-slate-900 border border-slate-800 rounded px-2 py-0.5" disabled={!canModify} />
            </label>
          </div>

          <div>
            <p className="text-xs text-slate-400 mb-1.5">Prices per currency</p>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {CURRENCIES.map((cur) => (
                <label key={cur} className="text-[11px] text-slate-300">
                  {cur}
                  <input type="number" step="0.01" value={px[cur] ?? ""}
                    onChange={(e) => setPx((s) => ({ ...s, [cur]: e.target.value === "" ? NaN : Number(e.target.value) }))}
                    className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 mt-0.5" disabled={!canModify} />
                </label>
              ))}
            </div>
          </div>

          {canModify && (
            <div className="flex gap-2 pt-2 border-t border-slate-800">
              <button onClick={() => onSave(a, px)}
                className="px-3 py-1.5 rounded bg-amber-500/20 text-amber-300 text-xs flex items-center gap-1 border border-amber-500/40">
                <Save size={12} /> Save & publish
              </button>
              {a.id && (
                <button onClick={() => onDelete(a.id)}
                  className="px-3 py-1.5 rounded bg-rose-500/15 text-rose-300 text-xs flex items-center gap-1 ml-auto">
                  <Trash2 size={12} /> Delete
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const inp = "w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 disabled:opacity-60";
const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <label className="block">
    <span className="text-[11px] text-slate-400 block mb-1">{label}</span>
    {children}
  </label>
);

export default AdminPricingCatalog;
