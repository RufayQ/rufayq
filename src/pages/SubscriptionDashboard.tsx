/**
 * /app/dashboard/subscription — patient self-service subscription manager.
 * Sections: Current plan • Family members • Active add-ons • Billing history.
 */
import { useEffect, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Crown, Users, Sparkles, Receipt, X, Plus, Trash2, AlertTriangle, Wallet } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { ADDON_META, type AddOnId } from "@/data/currencyMaster";

const BG = "#06101A", BG2 = "#0B1A28", BORDER = "rgba(197,150,90,0.18)";
const TEXT = "#E8ECF0", MUTED = "rgba(232,236,240,0.65)", GOLD = "#C5965A", TEAL = "#004D5B";

interface Sub {
  id: string;
  plan: "free" | "starter" | "companion" | "family" | "enterprise";
  status: string;
  billing_cycle: "monthly" | "annual";
  currency: string;
  amount: number;
  current_period_end: string | null;
  family_seat_capacity: number;
  family_setup_completed: boolean;
}
interface FamMember { id: string; full_name: string; full_name_ar: string | null; relationship: string; phone: string | null; status: string; }
interface Addon { id: string; addon: AddOnId; status: string; qty: number; unit_price: number; currency: string; created_at: string; }
interface BillEvent { id: string; event_type: string; amount: number | null; currency: string | null; created_at: string; details: any; }
interface WalletTx { id: string; kind: string; direction: string; amount: number; currency: string; balance_after: number; reference: string | null; reason: string | null; refund_tier: string | null; created_at: string; }

const SubscriptionDashboard = () => {
  const nav = useNavigate();
  const { mode } = useLanguage();
  const { format, getAddon, currency } = useCurrency();
  const isAr = mode === "ar";
  const [loading, setLoading] = useState(true);
  const [sub, setSub] = useState<Sub | null>(null);
  const [members, setMembers] = useState<FamMember[]>([]);
  const [addons, setAddons] = useState<Addon[]>([]);
  const [events, setEvents] = useState<BillEvent[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: ud } = await supabase.auth.getUser();
    if (!ud?.user) { nav("/auth"); return; }
    const { data: subs } = await supabase.from("subscriptions").select("*").eq("user_id", ud.user.id).maybeSingle();
    if (!subs) { setSub(null); setLoading(false); return; }
    setSub(subs as Sub);
    const [mRes, aRes, bRes] = await Promise.all([
      supabase.from("family_members").select("id,full_name,full_name_ar,relationship,phone,status").eq("subscription_id", subs.id).neq("status", "removed"),
      supabase.from("subscription_addons").select("*").eq("subscription_id", subs.id).order("created_at", { ascending: false }),
      supabase.from("billing_events").select("*").eq("subscription_id", subs.id).order("created_at", { ascending: false }).limit(30),
    ]);
    setMembers((mRes.data || []) as FamMember[]);
    setAddons((aRes.data || []) as Addon[]);
    setEvents((bRes.data || []) as BillEvent[]);
    setLoading(false);
  }, [nav]);

  useEffect(() => { load(); }, [load]);

  const requestAddon = async (id: AddOnId) => {
    if (!sub) return;
    const { data: ud } = await supabase.auth.getUser();
    if (!ud?.user) return;
    const price = getAddon(id);
    const { error } = await supabase.from("subscription_addons").insert({
      subscription_id: sub.id, user_id: ud.user.id, addon: id, status: "pending_admin",
      qty: 1, unit_price: price, currency,
    });
    if (error) return toast.error(error.message);
    await supabase.from("billing_events").insert({
      subscription_id: sub.id, user_id: ud.user.id, event_type: "addon_added",
      amount: price, currency, details: { addon: id },
    });
    toast.success(isAr ? "تم إرسال الطلب" : "Add-on requested");
    load();
  };

  const cancelAddon = async (a: Addon) => {
    if (!confirm(isAr ? "إلغاء هذه الإضافة؟" : "Cancel this add-on?")) return;
    const { error } = await supabase.from("subscription_addons").update({ status: "canceled", canceled_at: new Date().toISOString() }).eq("id", a.id);
    if (error) return toast.error(error.message);
    toast.success(isAr ? "تم الإلغاء" : "Canceled");
    load();
  };

  const cancelSub = async () => {
    if (!sub) return;
    if (!confirm(isAr ? "تأكيد إلغاء الاشتراك؟" : "Cancel your subscription?")) return;
    const { error } = await supabase.from("subscriptions").update({ status: "canceled", canceled_at: new Date().toISOString() }).eq("id", sub.id);
    if (error) return toast.error(error.message);
    const { data: ud } = await supabase.auth.getUser();
    if (ud?.user) {
      await supabase.from("billing_events").insert({
        subscription_id: sub.id, user_id: ud.user.id, event_type: "canceled", amount: 0, currency: sub.currency, details: {},
      });
    }
    toast.success(isAr ? "تم إلغاء الاشتراك" : "Subscription canceled");
    load();
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center" style={{ background: BG, color: MUTED }}>Loading…</div>;

  return (
    <div className="min-h-screen" style={{ background: BG, color: TEXT, fontFamily: "'DM Sans', system-ui" }}>
      <header className="sticky top-0 z-30 backdrop-blur-xl border-b" style={{ background: "rgba(6,16,26,0.85)", borderColor: BORDER }}>
        <div className="max-w-5xl mx-auto px-5 py-4 flex items-center gap-3">
          <Link to="/app" className="p-2 -ml-2 rounded-full hover:bg-white/5"><ArrowLeft size={18}/></Link>
          <div className="flex-1">
            <p className="font-mono text-[10px] tracking-widest" style={{ color: GOLD }}>{isAr ? "حسابي" : "MY ACCOUNT"}</p>
            <h1 className="font-display text-lg">{isAr ? "إدارة الاشتراك" : "Subscription"}</h1>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-5 py-6 space-y-6" dir={isAr ? "rtl" : "ltr"}>
        {!sub && (
          <div className="rounded-2xl p-8 text-center" style={{ background: BG2, border: `1px solid ${BORDER}` }}>
            <Crown size={32} className="mx-auto mb-3" color={GOLD}/>
            <p className="font-display text-lg mb-2">{isAr ? "لا يوجد اشتراك نشط" : "No active subscription"}</p>
            <Link to="/pricing" className="inline-block mt-3 px-5 py-2.5 rounded-full text-xs font-semibold" style={{ background: GOLD, color: BG }}>
              {isAr ? "اختر باقة" : "Choose a plan"}
            </Link>
          </div>
        )}

        {sub && (
          <>
            {/* Current plan */}
            <section className="rounded-3xl p-6" style={{ background: `linear-gradient(135deg, ${TEAL}55, ${BG2})`, border: `1px solid ${BORDER}` }}>
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <p className="font-mono text-[10px] tracking-widest" style={{ color: GOLD }}>{isAr ? "خطتك الحالية" : "YOUR PLAN"}</p>
                  <h2 className="font-display text-3xl capitalize mt-1" style={{ color: TEXT }}>{sub.plan}</h2>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge color={statusColor(sub.status)}>{statusLabel(sub.status, isAr)}</Badge>
                    <span className="text-xs" style={{ color: MUTED }}>· {sub.billing_cycle === "monthly" ? (isAr ? "شهري" : "Monthly") : (isAr ? "سنوي" : "Annual")}</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-display text-2xl font-bold" style={{ color: GOLD }}>{format(sub.amount)}</p>
                  <p className="text-[11px]" style={{ color: MUTED }}>
                    {sub.current_period_end ? `${isAr ? "يجدد في" : "Renews"} ${new Date(sub.current_period_end).toLocaleDateString()}` : "—"}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 pt-3 border-t" style={{ borderColor: BORDER }}>
                <Link to="/pricing" className="text-xs px-4 py-2 rounded-full" style={{ background: GOLD, color: BG, fontWeight: 600 }}>
                  {isAr ? "تغيير الخطة" : "Change plan"}
                </Link>
                {sub.status !== "canceled" && (
                  <button onClick={cancelSub} className="text-xs px-4 py-2 rounded-full" style={{ border: `1px solid ${BORDER}`, color: "#fca5a5" }}>
                    {isAr ? "إلغاء الاشتراك" : "Cancel subscription"}
                  </button>
                )}
              </div>
            </section>

            {/* Family members */}
            {sub.plan === "family" && (
              <section className="rounded-2xl p-6" style={{ background: BG2, border: `1px solid ${BORDER}` }}>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="font-mono text-[10px] tracking-widest" style={{ color: GOLD }}>{isAr ? "أفراد العائلة" : "FAMILY MEMBERS"}</p>
                    <h3 className="font-display text-xl flex items-center gap-2"><Users size={16} color={GOLD}/>{members.length} / {sub.family_seat_capacity}</h3>
                  </div>
                  {!sub.family_setup_completed && (
                    <Badge color="amber">{isAr ? "بانتظار التفعيل" : "Pending activation"}</Badge>
                  )}
                </div>
                {members.length === 0 ? (
                  <p className="text-sm" style={{ color: MUTED }}>{isAr ? "لم يتم إضافة أفراد بعد" : "No members yet"}</p>
                ) : (
                  <div className="space-y-2">
                    {members.map((m) => (
                      <div key={m.id} className="flex items-center justify-between rounded-xl p-3" style={{ background: BG, border: `1px solid ${BORDER}` }}>
                        <div>
                          <p className="text-sm font-semibold">{isAr && m.full_name_ar ? m.full_name_ar : m.full_name}</p>
                          <p className="text-[11px]" style={{ color: MUTED }}>{m.relationship} {m.phone && `· ${m.phone}`}</p>
                        </div>
                        <Badge color={m.status === "active" ? "green" : "amber"}>{m.status}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}

            {/* Add-ons */}
            <section className="rounded-2xl p-6" style={{ background: BG2, border: `1px solid ${BORDER}` }}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="font-mono text-[10px] tracking-widest" style={{ color: GOLD }}>{isAr ? "إضافات" : "ADD-ONS"}</p>
                  <h3 className="font-display text-xl flex items-center gap-2"><Sparkles size={16} color={GOLD}/>{addons.filter(a => a.status === "active").length} {isAr ? "نشطة" : "active"}</h3>
                </div>
              </div>

              {/* Active addons */}
              {addons.length > 0 && (
                <div className="space-y-2 mb-5">
                  {addons.map((a) => (
                    <div key={a.id} className="flex items-center justify-between rounded-xl p-3" style={{ background: BG, border: `1px solid ${BORDER}` }}>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold truncate">{isAr ? ADDON_META[a.addon].nameAr : ADDON_META[a.addon].nameEn}</p>
                        <p className="text-[11px]" style={{ color: MUTED }}>{format(a.unit_price)} · {new Date(a.created_at).toLocaleDateString()}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge color={a.status === "active" ? "green" : a.status === "pending_admin" ? "amber" : "muted"}>
                          {addonStatusLabel(a.status, isAr)}
                        </Badge>
                        {a.status !== "canceled" && (
                          <button onClick={() => cancelAddon(a)} className="p-1.5 rounded hover:bg-rose-500/10" title="Cancel">
                            <Trash2 size={12} color="#fca5a5"/>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Quick request */}
              <p className="text-[11px] mb-2" style={{ color: MUTED }}>{isAr ? "اطلب إضافة جديدة:" : "Request a new add-on:"}</p>
              <div className="grid grid-cols-2 gap-2">
                {(Object.keys(ADDON_META) as AddOnId[]).map((id) => (
                  <button key={id} onClick={() => requestAddon(id)}
                    className="text-left rounded-xl p-3 transition-all hover:scale-[1.01]"
                    style={{ background: BG, border: `1px solid ${BORDER}` }}>
                    <p className="text-xs font-semibold flex items-center gap-1.5">
                      <Plus size={11} color={GOLD}/>{isAr ? ADDON_META[id].nameAr : ADDON_META[id].nameEn}
                    </p>
                    <p className="text-[10px] mt-0.5" style={{ color: GOLD }}>{format(getAddon(id))}</p>
                  </button>
                ))}
              </div>
            </section>

            {/* Billing history */}
            <section className="rounded-2xl p-6" style={{ background: BG2, border: `1px solid ${BORDER}` }}>
              <div className="mb-3">
                <p className="font-mono text-[10px] tracking-widest" style={{ color: GOLD }}>{isAr ? "سجل الفوترة" : "BILLING HISTORY"}</p>
                <h3 className="font-display text-xl flex items-center gap-2"><Receipt size={16} color={GOLD}/>{events.length}</h3>
              </div>
              {events.length === 0 ? (
                <p className="text-sm" style={{ color: MUTED }}>{isAr ? "لا توجد سجلات بعد" : "No records yet"}</p>
              ) : (
                <div className="space-y-1.5">
                  {events.map((e) => (
                    <div key={e.id} className="flex items-center justify-between text-xs py-2 border-b" style={{ borderColor: BORDER }}>
                      <span className="capitalize">{e.event_type.replace(/_/g, " ")}</span>
                      <div className="text-right">
                        {e.amount != null && <span className="font-mono" style={{ color: GOLD }}>{format(Number(e.amount))}</span>}
                        <p className="text-[10px]" style={{ color: MUTED }}>{new Date(e.created_at).toLocaleString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
};

const statusColor = (s: string): "green" | "amber" | "rose" | "muted" =>
  s === "active" ? "green" : s === "trial" || s === "pending_setup" ? "amber" : s === "canceled" || s === "expired" ? "rose" : "muted";
const statusLabel = (s: string, ar: boolean) => {
  const map: Record<string, [string, string]> = {
    active: ["Active","نشط"], trial: ["Trial","تجربة"], pending_setup: ["Pending setup","بانتظار الإعداد"],
    canceled: ["Canceled","ملغى"], expired: ["Expired","منتهي"], past_due: ["Past due","متأخر"],
  };
  return (map[s] || [s, s])[ar ? 1 : 0];
};
const addonStatusLabel = (s: string, ar: boolean) => ({
  active: ar ? "نشط" : "Active", pending_admin: ar ? "بانتظار التفعيل" : "Pending", canceled: ar ? "ملغى" : "Canceled", expired: ar ? "منتهي" : "Expired",
}[s] || s);
const Badge = ({ color, children }: { color: "green" | "amber" | "rose" | "muted"; children: React.ReactNode }) => {
  const map = {
    green: "bg-emerald-500/15 text-emerald-300", amber: "bg-amber-500/15 text-amber-300",
    rose: "bg-rose-500/15 text-rose-300", muted: "bg-slate-700/50 text-slate-300",
  } as const;
  return <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono ${map[color]}`}>{children}</span>;
};

export default SubscriptionDashboard;
