/**
 * /app/wallet — patient wallet ledger with filters and CSV export.
 *
 * Filters:
 *   - date range (from/to)
 *   - credit-note reference (contains)
 *   - subscription id (contains)
 *   - add-on id (contains)
 *
 * CSV export (patient-facing minimal columns):
 *   Date · Type · Amount · Currency · Credit-note · Reason
 */
import { useEffect, useMemo, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Wallet, Download, Filter, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { RefundPolicyHint } from "@/features/refunds/RefundPolicyHint";
import { RefundDisputeTimeline } from "@/features/refunds/RefundDisputeTimeline";

const BG = "#06101A", BG2 = "#0B1A28", BORDER = "rgba(197,150,90,0.18)";
const TEXT = "#E8ECF0", MUTED = "rgba(232,236,240,0.65)", GOLD = "#C5965A";

interface Tx {
  id: string;
  kind: string;
  direction: string;
  amount: number;
  currency: string;
  balance_after: number;
  reference: string | null;
  reason: string | null;
  refund_tier: string | null;
  subscription_id: string | null;
  addon_id: string | null;
  created_at: string;
}

const WalletLedger = () => {
  const nav = useNavigate();
  const { mode } = useLanguage();
  const isAr = mode === "ar";

  const [loading, setLoading] = useState(true);
  const [wallet, setWallet] = useState<{ balance: number; currency: string } | null>(null);
  const [tx, setTx] = useState<Tx[]>([]);
  const [userId, setUserId] = useState<string | null>(null);

  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [refQ, setRefQ] = useState("");
  const [subQ, setSubQ] = useState("");
  const [addonQ, setAddonQ] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const { data: ud } = await supabase.auth.getUser();
    if (!ud?.user) { nav("/auth"); return; }
    setUserId(ud.user.id);
    const [wRes, tRes] = await Promise.all([
      supabase.from("patient_wallets").select("balance,currency").eq("user_id", ud.user.id).maybeSingle(),
      supabase.from("wallet_transactions").select("*").eq("user_id", ud.user.id)
        .order("created_at", { ascending: false }).limit(500),
    ]);
    setWallet(wRes.data ? { balance: Number(wRes.data.balance), currency: wRes.data.currency } : null);
    setTx((tRes.data || []) as Tx[]);
    setLoading(false);
  }, [nav]);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    return tx.filter((t) => {
      const ts = new Date(t.created_at).getTime();
      if (from && ts < new Date(from).getTime()) return false;
      if (to && ts > new Date(to).getTime() + 86_400_000) return false;
      if (refQ && !(t.reference || "").toLowerCase().includes(refQ.toLowerCase())) return false;
      if (subQ && !(t.subscription_id || "").includes(subQ)) return false;
      if (addonQ && !(t.addon_id || "").includes(addonQ)) return false;
      return true;
    });
  }, [tx, from, to, refQ, subQ, addonQ]);

  const exportCsv = () => {
    const header = ["Date", "Type", "Amount", "Currency", "Credit Note", "Reason"];
    const rows = filtered.map((t) => [
      new Date(t.created_at).toISOString(),
      `${t.direction === "credit" ? "+" : "-"}${t.kind}`,
      Number(t.amount).toFixed(2),
      t.currency,
      t.reference ?? "",
      (t.reason ?? "").replace(/[\r\n]+/g, " "),
    ]);
    const csv = [header, ...rows]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `wallet-ledger-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen" style={{ background: BG, color: TEXT, fontFamily: "'DM Sans', system-ui" }}>
      <header className="sticky top-0 z-30 backdrop-blur-xl border-b" style={{ background: "rgba(6,16,26,0.85)", borderColor: BORDER }}>
        <div className="max-w-5xl mx-auto px-5 py-4 flex items-center gap-3">
          <Link to={isAr ? "/ar/app/dashboard/subscription" : "/app/dashboard/subscription"} className="p-2 -ml-2 rounded-full hover:bg-white/5"><ArrowLeft size={18}/></Link>
          <div className="flex-1">
            <p className="font-mono text-[10px] tracking-widest" style={{ color: GOLD }}>{isAr ? "محفظتي" : "MY WALLET"}</p>
            <h1 className="font-display text-lg flex items-center gap-2"><Wallet size={16}/>{isAr ? "السجل والمعاملات" : "Ledger"}</h1>
          </div>
          <button onClick={load} className="p-2 rounded-full hover:bg-white/5" aria-label="Refresh">
            <RefreshCw size={16}/>
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-5 py-6 space-y-5" dir={isAr ? "rtl" : "ltr"}>
        {/* Balance + policy hint */}
        <section className="rounded-2xl p-5" style={{ background: BG2, border: `1px solid ${BORDER}` }}>
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-[10px] font-mono tracking-widest" style={{ color: GOLD }}>{isAr ? "الرصيد الحالي" : "CURRENT BALANCE"}</p>
              <p className="font-display text-3xl font-bold" style={{ color: GOLD }}>
                {wallet ? `${wallet.currency} ${wallet.balance.toFixed(2)}` : "SAR 0.00"}
              </p>
            </div>
            <button onClick={exportCsv} disabled={filtered.length === 0}
              className="px-3 py-2 rounded-lg text-xs flex items-center gap-2 disabled:opacity-40"
              style={{ background: GOLD, color: BG, fontWeight: 600 }}>
              <Download size={12}/>{isAr ? "تصدير CSV" : "Export CSV"}
            </button>
          </div>
          <RefundPolicyHint isAr={isAr} tone="card" />
        </section>

        {/* Filters */}
        <section className="rounded-2xl p-4" style={{ background: BG2, border: `1px solid ${BORDER}` }}>
          <div className="flex items-center gap-2 mb-3">
            <Filter size={12} color={GOLD}/>
            <p className="text-[10px] font-mono tracking-widest" style={{ color: GOLD }}>{isAr ? "تصفية" : "FILTERS"}</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-xs">
            <label className="flex flex-col gap-1">
              <span style={{ color: MUTED }}>{isAr ? "من" : "From"}</span>
              <input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
                className="bg-[#06101A] border rounded px-2 py-1.5" style={{ borderColor: BORDER, color: TEXT }}/>
            </label>
            <label className="flex flex-col gap-1">
              <span style={{ color: MUTED }}>{isAr ? "إلى" : "To"}</span>
              <input type="date" value={to} onChange={(e) => setTo(e.target.value)}
                className="bg-[#06101A] border rounded px-2 py-1.5" style={{ borderColor: BORDER, color: TEXT }}/>
            </label>
            <label className="flex flex-col gap-1">
              <span style={{ color: MUTED }}>{isAr ? "إشعار دائن" : "Credit note"}</span>
              <input value={refQ} onChange={(e) => setRefQ(e.target.value)} placeholder="CN-…"
                className="bg-[#06101A] border rounded px-2 py-1.5" style={{ borderColor: BORDER, color: TEXT }}/>
            </label>
            <label className="flex flex-col gap-1">
              <span style={{ color: MUTED }}>{isAr ? "اشتراك" : "Subscription"}</span>
              <input value={subQ} onChange={(e) => setSubQ(e.target.value)} placeholder="UUID"
                className="bg-[#06101A] border rounded px-2 py-1.5" style={{ borderColor: BORDER, color: TEXT }}/>
            </label>
            <label className="flex flex-col gap-1">
              <span style={{ color: MUTED }}>{isAr ? "إضافة" : "Add-on"}</span>
              <input value={addonQ} onChange={(e) => setAddonQ(e.target.value)} placeholder="UUID"
                className="bg-[#06101A] border rounded px-2 py-1.5" style={{ borderColor: BORDER, color: TEXT }}/>
            </label>
          </div>
          <p className="text-[10px] mt-2" style={{ color: MUTED }}>
            {isAr ? `${filtered.length} من ${tx.length} معاملة` : `${filtered.length} of ${tx.length} transactions`}
          </p>
        </section>

        {/* Ledger */}
        <section className="rounded-2xl p-4" style={{ background: BG2, border: `1px solid ${BORDER}` }}>
          {loading ? (
            <p className="text-xs" style={{ color: MUTED }}>Loading…</p>
          ) : filtered.length === 0 ? (
            <p className="text-xs text-center py-8" style={{ color: MUTED }}>
              {isAr ? "لا توجد معاملات تطابق التصفية." : "No transactions match the filters."}
            </p>
          ) : (
            <div className="space-y-1.5">
              {filtered.map((t) => (
                <div key={t.id} className="rounded-xl p-3" style={{ background: BG, border: `1px solid ${BORDER}` }}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold capitalize">
                        {t.kind.replace(/_/g, " ")}
                        {t.refund_tier && t.refund_tier !== "manual" ? ` · ${t.refund_tier}` : ""}
                      </p>
                      <p className="text-[10px] font-mono" style={{ color: MUTED }}>
                        {t.reference || "—"} · {new Date(t.created_at).toLocaleString()}
                      </p>
                      {t.reason && <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>{t.reason}</p>}
                    </div>
                    <div className="text-right shrink-0">
                      <p className={`font-display text-sm font-bold ${t.direction === "credit" ? "text-emerald-300" : "text-rose-300"}`}>
                        {t.direction === "credit" ? "+" : "-"}{t.currency} {Number(t.amount).toFixed(2)}
                      </p>
                      <p className="text-[10px]" style={{ color: MUTED }}>
                        {isAr ? "بعد" : "Bal"}: {t.currency} {Number(t.balance_after).toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Dispute timeline */}
        <section className="rounded-2xl p-4" style={{ background: BG2, border: `1px solid ${BORDER}` }}>
          <p className="text-[10px] font-mono tracking-widest mb-3" style={{ color: GOLD }}>
            {isAr ? "مراجعات الاسترداد" : "REFUND REVIEWS"}
          </p>
          <RefundDisputeTimeline isAr={isAr} userId={userId}/>
        </section>
      </main>
    </div>
  );
};

export default WalletLedger;
