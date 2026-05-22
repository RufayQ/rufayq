import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Users, Building2, Stethoscope, Heart, Shield, Briefcase, TrendingUp, Activity, MessageSquare, Star, BookOpen } from "lucide-react";

interface KPIRow { provider_type: string; total: number; new_7d: number; new_30d: number; }

const TYPE_META: Record<string, { label: string; Icon: typeof Users; tone: string }> = {
  patient:    { label: "Patients",            Icon: Heart,        tone: "from-rose-500/20 to-rose-500/5 border-rose-500/30 text-rose-300" },
  hospital:   { label: "Hospitals",           Icon: Building2,    tone: "from-blue-500/20 to-blue-500/5 border-blue-500/30 text-blue-300" },
  physician:  { label: "Physicians",          Icon: Stethoscope,  tone: "from-emerald-500/20 to-emerald-500/5 border-emerald-500/30 text-emerald-300" },
  vendor:     { label: "Vendors",             Icon: Briefcase,    tone: "from-amber-500/20 to-amber-500/5 border-amber-500/30 text-amber-300" },
  insurance:  { label: "Insurance",           Icon: Shield,       tone: "from-violet-500/20 to-violet-500/5 border-violet-500/30 text-violet-300" },
  internal:   { label: "Internal staff",      Icon: Users,        tone: "from-slate-500/20 to-slate-500/5 border-slate-500/30 text-slate-300" },
};
const TYPE_ORDER = ["patient", "hospital", "physician", "vendor", "insurance", "internal"];

const AdminDashboard = () => {
  const [kpis, setKpis] = useState<KPIRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [extras, setExtras] = useState({ tickets: 0, openTickets: 0, reviews: 0, avgRating: 0, audit24h: 0 });

  useEffect(() => {
    (async () => {
      const [{ data: k }, { count: tc }, { count: oc }, { data: rv }, { count: ac }] = await Promise.all([
        supabase.rpc("admin_user_kpis"),
        supabase.from("support_tickets").select("*", { count: "exact", head: true }),
        supabase.from("support_tickets").select("*", { count: "exact", head: true }).eq("status", "open"),
        supabase.from("app_reviews").select("rating").eq("approved", true),
        supabase.from("admin_audit_log").select("*", { count: "exact", head: true })
          .gt("created_at", new Date(Date.now() - 86400000).toISOString()),
      ]);
      setKpis((k as KPIRow[]) || []);
      const ratings = (rv || []) as { rating: number }[];
      const avg = ratings.length ? ratings.reduce((s, r) => s + r.rating, 0) / ratings.length : 0;
      setExtras({ tickets: tc || 0, openTickets: oc || 0, reviews: ratings.length, avgRating: Math.round(avg * 10) / 10, audit24h: ac || 0 });
      setLoading(false);
    })();
  }, []);

  const byType: Record<string, KPIRow> = {};
  kpis.forEach(k => { byType[k.provider_type] = k; });
  const totalUsers = kpis.reduce((s, k) => s + Number(k.total), 0);
  const new7d = kpis.reduce((s, k) => s + Number(k.new_7d), 0);
  const new30d = kpis.reduce((s, k) => s + Number(k.new_30d), 0);

  if (loading) return <p className="text-slate-400 text-sm">Loading dashboard…</p>;

  return (
    <div className="space-y-6">
      {/* Quick links */}
      <div className="flex flex-wrap gap-2">
        <Link
          to="/admin/swagger"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-slate-700 bg-slate-900/50 text-xs text-slate-300 hover:text-amber-300 hover:border-amber-500/50 transition"
        >
          <BookOpen size={12} /> API Swagger reference
        </Link>
        <Link
          to="/admin/security"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-slate-700 bg-slate-900/50 text-xs text-slate-300 hover:text-amber-300 hover:border-amber-500/50 transition"
        >
          <Shield size={12} /> Security findings
        </Link>
      </div>

      {/* Top-line summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <SummaryCard label="Total users" value={totalUsers} Icon={Users} tone="text-amber-300" />
        <SummaryCard label="New (7 days)" value={new7d} Icon={TrendingUp} tone="text-emerald-300" />
        <SummaryCard label="New (30 days)" value={new30d} Icon={TrendingUp} tone="text-emerald-300" />
        <SummaryCard label="Audit events / 24h" value={extras.audit24h} Icon={Activity} tone="text-violet-300" />
      </div>

      {/* Joiners by type */}
      <div>
        <h3 className="text-sm font-semibold text-slate-200 mb-3">New joiners by user type</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {TYPE_ORDER.map((t) => {
            const meta = TYPE_META[t];
            const row = byType[t] || { provider_type: t, total: 0, new_7d: 0, new_30d: 0 };
            const pct = totalUsers ? Math.round((Number(row.total) / totalUsers) * 100) : 0;
            return (
              <div key={t} className={`rounded-xl border bg-gradient-to-br p-4 ${meta.tone}`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <meta.Icon size={18} />
                    <h4 className="font-semibold text-sm text-slate-100">{meta.label}</h4>
                  </div>
                  <span className="text-[10px] font-mono opacity-70">{pct}%</span>
                </div>
                <div className="text-3xl font-bold text-slate-100 mb-2">{row.total}</div>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="bg-slate-900/40 rounded px-2 py-1.5">
                    <div className="text-slate-400">+7d</div>
                    <div className="font-semibold text-slate-100">{row.new_7d}</div>
                  </div>
                  <div className="bg-slate-900/40 rounded px-2 py-1.5">
                    <div className="text-slate-400">+30d</div>
                    <div className="font-semibold text-slate-100">{row.new_30d}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Operational KPIs */}
      <div>
        <h3 className="text-sm font-semibold text-slate-200 mb-3">Operations</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <SummaryCard label="Total tickets" value={extras.tickets} Icon={MessageSquare} tone="text-blue-300" />
          <SummaryCard label="Open tickets" value={extras.openTickets} Icon={MessageSquare} tone="text-amber-300" />
          <SummaryCard label="Approved reviews" value={extras.reviews} Icon={Star} tone="text-emerald-300" />
          <SummaryCard label="Avg rating" value={extras.avgRating || "—"} Icon={Star} tone="text-amber-300" suffix={extras.avgRating ? "/5" : ""} />
        </div>
      </div>
    </div>
  );
};

const SummaryCard = ({ label, value, Icon, tone, suffix }: { label: string; value: number | string; Icon: typeof Users; tone: string; suffix?: string }) => (
  <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
    <div className="flex items-center justify-between mb-2">
      <p className="text-[11px] uppercase tracking-wide text-slate-500">{label}</p>
      <Icon size={14} className={tone} />
    </div>
    <p className="text-2xl font-bold text-slate-100">{value}{suffix && <span className="text-sm text-slate-500 ml-0.5">{suffix}</span>}</p>
  </div>
);

export default AdminDashboard;
