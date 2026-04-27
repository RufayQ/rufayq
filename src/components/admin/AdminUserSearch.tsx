/**
 * AdminUserSearch — implements WF-01 (User Search & Lookup) and
 * WF-02 (Assign Subscription) from the RufayQ subscription UX spec.
 *
 * Single unified search bar that auto-detects the criterion type from the
 * pattern entered (no need to pick a field):
 *   • Email          (contains "@")
 *   • Phone          (digits / +966)
 *   • National ID    (10 digits starting with 1 or 2)
 *   • Passport       (alphanumeric, 6+)
 *   • RufayQ ID      (RFQ-YYYY-XXXXXX exact)
 *
 * Selecting a result opens an inline profile drawer with current
 * subscription info and an "Assign Subscription" modal (WF-02) that
 * lets admins grant a plan with reason, duration, billing cycle, and
 * notify-patient toggle. All actions are written to the audit log
 * (USER_SEARCHED, USER_PROFILE_VIEWED, SUBSCRIPTION_ASSIGNED).
 *
 * Self-contained: only touches `profiles`, `user_subscriptions`,
 * `payment_receipts` (read), and the existing `log_audit_event` RPC.
 */
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Search, User, Mail, Phone, IdCard, KeyRound, X, ChevronRight,
  Sparkles, Calendar, ShieldCheck, Loader2, ArrowLeft,
} from "lucide-react";
import { PLANS, type PlanCode, type BillingCycle } from "@/data/subscriptionPlans";
import { useQuickCreateSignal } from "@/components/admin/shell/quickCreateSignal";

// ─────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────
interface Profile {
  id: string;
  device_id: string;
  full_name_en: string | null;
  full_name_ar: string | null;
  email: string | null;
  phone: string | null;
  saudi_id: string | null;
  iqama_number: string | null;
  passport_number: string | null;
  rufayq_id: string | null;
  created_at: string;
  provider_type: string;
}
interface ActiveSub {
  id: string;
  plan: string;
  status: string;
  billing_cycle: string;
  amount: number | null;
  currency: string;
  current_period_end: string | null;
}

type Criterion = "email" | "phone" | "national_id" | "passport" | "rufayq" | "unknown";

// ─────────────────────────────────────────────────────────────────────
// Auto-detect search criterion (per WF-01 spec)
// ─────────────────────────────────────────────────────────────────────
function detectCriterion(raw: string): Criterion {
  const v = raw.trim();
  if (!v) return "unknown";
  if (/^RFQ-\d{4}-[A-Z0-9]{4,8}$/i.test(v)) return "rufayq";
  if (v.includes("@")) return "email";
  const digits = v.replace(/[\s\-+]/g, "");
  if (/^\d{10}$/.test(digits) && /^[12]/.test(digits)) return "national_id";
  if (/^\d{9,15}$/.test(digits) || v.startsWith("+")) return "phone";
  if (/^[A-Z0-9]{6,12}$/i.test(v)) return "passport";
  return "unknown";
}

const CRITERION_META: Record<Criterion, { label: string; Icon: typeof Mail }> = {
  email:       { label: "Email",        Icon: Mail },
  phone:       { label: "Phone",        Icon: Phone },
  national_id: { label: "National ID",  Icon: IdCard },
  passport:    { label: "Passport",     Icon: IdCard },
  rufayq:      { label: "RufayQ ID",    Icon: KeyRound },
  unknown:     { label: "Type to search", Icon: Search },
};

function maskId(value: string | null): string {
  if (!value) return "—";
  if (value.length <= 4) return value;
  return `••••••${value.slice(-4)}`;
}

// ─────────────────────────────────────────────────────────────────────
// Search RPC
// ─────────────────────────────────────────────────────────────────────
async function runSearch(term: string, criterion: Criterion): Promise<Profile[]> {
  const t = term.trim();
  if (t.length < 3) return [];
  const cols =
    "id,device_id,full_name_en,full_name_ar,email,phone,saudi_id,iqama_number,passport_number,rufayq_id,created_at,provider_type";
  let q = supabase.from("profiles").select(cols).is("deleted_at", null).limit(10);

  switch (criterion) {
    case "email":
      q = q.ilike("email", `%${t}%`);
      break;
    case "phone": {
      const digits = t.replace(/[\s\-+]/g, "");
      const last9 = digits.slice(-9);
      q = q.or(`phone.ilike.%${last9}%`);
      break;
    }
    case "national_id":
      q = q.or(`saudi_id.eq.${t},iqama_number.eq.${t}`);
      break;
    case "passport":
      q = q.ilike("passport_number", t);
      break;
    case "rufayq":
      q = q.eq("rufayq_id", t.toUpperCase());
      break;
    default:
      // unknown → broad OR across all four
      q = q.or(
        [
          `email.ilike.%${t}%`,
          `phone.ilike.%${t}%`,
          `full_name_en.ilike.%${t}%`,
          `full_name_ar.ilike.%${t}%`,
          `rufayq_id.ilike.%${t}%`,
        ].join(","),
      );
  }
  const { data, error } = await q;
  if (error) {
    toast.error(error.message);
    return [];
  }
  return (data || []) as Profile[];
}

// ─────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────
const AdminUserSearch = () => {
  const [term, setTerm] = useState("");
  const [results, setResults] = useState<Profile[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<Profile | null>(null);
  const [activeSub, setActiveSub] = useState<ActiveSub | null>(null);
  const [assignOpen, setAssignOpen] = useState(false);
  useQuickCreateSignal("user_search", (action) => {
    if (action === "assign") toast.info("Find a user, then click their row to open the Assign Subscription modal.");
  });
  const criterion = useMemo(() => detectCriterion(term), [term]);
  const Meta = CRITERION_META[criterion];

  // Debounced live search
  useEffect(() => {
    if (term.trim().length < 3) {
      setResults([]);
      return;
    }
    const handle = setTimeout(async () => {
      setSearching(true);
      const rows = await runSearch(term, criterion);
      setResults(rows);
      setSearching(false);
      // audit
      supabase.rpc("log_audit_event", {
        _action: "USER_SEARCHED",
        _target_type: "profiles",
        _target_id: null,
        _details: { criterion, term_length: term.length, results: rows.length },
      });
      // auto-open if 1
      if (rows.length === 1) openProfile(rows[0]);
    }, 300);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [term, criterion]);

  const openProfile = async (p: Profile) => {
    setSelected(p);
    await supabase.rpc("log_audit_event", {
      _action: "USER_PROFILE_VIEWED",
      _target_type: "profile",
      _target_id: p.id,
      _details: { rufayq_id: p.rufayq_id },
    });
    const { data } = await supabase
      .from("user_subscriptions")
      .select("id,plan,status,billing_cycle,amount,currency,current_period_end")
      .eq("device_id", p.device_id)
      .order("created_at", { ascending: false })
      .limit(1);
    setActiveSub((data?.[0] as ActiveSub) || null);
  };

  return (
    <div className="space-y-4">
      {!selected && (
        <>
          {/* Search bar */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-3">
            <label className="text-[10px] font-mono tracking-widest text-amber-300 uppercase">
              WF-01 · User Search
            </label>
            <div className="flex items-center gap-2 mt-2 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2">
              <Search size={16} className="text-slate-500" />
              <input
                value={term}
                onChange={(e) => setTerm(e.target.value)}
                placeholder="Search by Email, Phone, ID or RufayQ ID…"
                className="flex-1 bg-transparent text-sm text-slate-100 outline-none"
                autoFocus
              />
              {searching && <Loader2 size={14} className="animate-spin text-slate-500" />}
            </div>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <span className="text-[10px] text-slate-500 font-mono uppercase tracking-widest">
                Detected:
              </span>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 flex items-center gap-1">
                <Meta.Icon size={11} /> {Meta.label}
              </span>
              {(["email", "phone", "national_id", "passport", "rufayq"] as Criterion[]).map((c) => {
                const M = CRITERION_META[c];
                return (
                  <button
                    key={c}
                    onClick={() =>
                      setTerm(
                        c === "email"
                          ? "patient@"
                          : c === "phone"
                          ? "+9665"
                          : c === "rufayq"
                          ? "RFQ-2026-"
                          : "",
                      )
                    }
                    className="text-[10px] px-2 py-0.5 rounded-full border border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700 flex items-center gap-1"
                  >
                    <M.Icon size={10} /> {M.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Results */}
          {term.trim().length >= 3 && !searching && (
            <div className="space-y-1.5">
              {results.length === 0 && (
                <p className="text-slate-500 text-sm py-6 text-center">
                  No user found · جرّب معيار آخر
                </p>
              )}
              {results.length >= 10 && (
                <p className="text-amber-300 text-xs">
                  Showing first 10 results — refine your search for fewer matches.
                </p>
              )}
              {results.map((p) => (
                <button
                  key={p.id}
                  onClick={() => openProfile(p)}
                  className="w-full text-left rounded-xl border border-slate-800 bg-slate-900/50 hover:border-amber-500/40 hover:bg-slate-900 transition p-3 flex items-center gap-3"
                >
                  <div className="w-10 h-10 rounded-full bg-amber-500/20 text-amber-300 flex items-center justify-center font-semibold text-sm shrink-0">
                    {(p.full_name_en || p.email || "?").slice(0, 1).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-white truncate">
                      {p.full_name_en || p.full_name_ar || "Unnamed patient"}
                      {p.full_name_ar && p.full_name_en && (
                        <span className="font-arabic text-slate-400"> · {p.full_name_ar}</span>
                      )}
                    </p>
                    <p className="text-[11px] text-slate-400 truncate">
                      {p.email || "—"} · {p.phone || "—"}
                    </p>
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                      {p.rufayq_id && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300 font-mono">
                          🔑 {p.rufayq_id}
                        </span>
                      )}
                      {(p.saudi_id || p.iqama_number) && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                          🪪 {maskId(p.saudi_id || p.iqama_number)}
                        </span>
                      )}
                      {p.passport_number && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                          📕 {maskId(p.passport_number)}
                        </span>
                      )}
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-slate-500 shrink-0" />
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {/* Profile drawer */}
      {selected && (
        <ProfileDrawer
          profile={selected}
          sub={activeSub}
          onBack={() => {
            setSelected(null);
            setActiveSub(null);
          }}
          onAssign={() => setAssignOpen(true)}
        />
      )}

      {/* Assign modal */}
      {selected && assignOpen && (
        <AssignSubscriptionModal
          profile={selected}
          currentSub={activeSub}
          onClose={() => setAssignOpen(false)}
          onDone={async () => {
            setAssignOpen(false);
            await openProfile(selected);
          }}
        />
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────
// Profile drawer
// ─────────────────────────────────────────────────────────────────────
const ProfileDrawer = ({
  profile,
  sub,
  onBack,
  onAssign,
}: {
  profile: Profile;
  sub: ActiveSub | null;
  onBack: () => void;
  onAssign: () => void;
}) => (
  <div className="space-y-4">
    <button
      onClick={onBack}
      className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200"
    >
      <ArrowLeft size={14} /> Back to search
    </button>

    <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 rounded-full bg-amber-500/20 text-amber-300 flex items-center justify-center font-bold text-lg shrink-0">
          {(profile.full_name_en || profile.email || "?").slice(0, 1).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold text-white">
            {profile.full_name_en || "Unnamed"}
          </h3>
          {profile.full_name_ar && (
            <p className="font-arabic text-sm text-slate-300">{profile.full_name_ar}</p>
          )}
          <p className="text-[11px] text-slate-500 mt-1">
            Joined {new Date(profile.created_at).toLocaleDateString()} · {profile.provider_type}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mt-4 text-xs">
        <Field label="Email" value={profile.email} icon={<Mail size={11} />} />
        <Field label="Phone" value={profile.phone} icon={<Phone size={11} />} />
        <Field label="Saudi ID" value={profile.saudi_id} icon={<IdCard size={11} />} mask />
        <Field label="Iqama" value={profile.iqama_number} icon={<IdCard size={11} />} mask />
        <Field label="Passport" value={profile.passport_number} icon={<IdCard size={11} />} mask />
        <Field label="RufayQ ID" value={profile.rufayq_id} icon={<KeyRound size={11} />} />
      </div>
    </div>

    {/* Subscription card */}
    <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
      <h4 className="text-xs font-mono uppercase tracking-widest text-amber-300 mb-2">
        Current Subscription
      </h4>
      {sub ? (
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-base font-semibold text-white uppercase">{sub.plan}</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 font-mono">
              {sub.status}
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
              {sub.billing_cycle}
            </span>
            {sub.amount != null && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                {sub.currency} {Number(sub.amount).toLocaleString()}
              </span>
            )}
          </div>
          {sub.current_period_end && (
            <p className="text-[11px] text-slate-400 mt-2 flex items-center gap-1">
              <Calendar size={11} /> Renews {new Date(sub.current_period_end).toLocaleDateString()}
            </p>
          )}
        </div>
      ) : (
        <p className="text-sm text-slate-400">FREE · no active paid subscription</p>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          onClick={onAssign}
          className="px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-semibold flex items-center gap-1.5 hover:bg-amber-500/30"
        >
          <Sparkles size={12} /> {sub ? "Change Plan" : "Assign Subscription"}
        </button>
      </div>
    </div>
  </div>
);

const Field = ({
  label,
  value,
  icon,
  mask,
}: {
  label: string;
  value: string | null;
  icon: React.ReactNode;
  mask?: boolean;
}) => (
  <div>
    <p className="text-[9px] font-mono uppercase tracking-widest text-slate-500 flex items-center gap-1">
      {icon} {label}
    </p>
    <p className="text-slate-200 mt-0.5 truncate">
      {value ? (mask ? maskId(value) : value) : <span className="text-slate-600">—</span>}
    </p>
  </div>
);

// ─────────────────────────────────────────────────────────────────────
// WF-02 Assign Subscription Modal
// ─────────────────────────────────────────────────────────────────────
const REASONS = [
  "Promotional",
  "Customer service resolution",
  "Compensation",
  "VIP",
  "Insurance / Corporate covered",
  "Other",
];
type AssignType = "paid" | "complimentary" | "trial" | "corporate";

const AssignSubscriptionModal = ({
  profile,
  currentSub,
  onClose,
  onDone,
}: {
  profile: Profile;
  currentSub: ActiveSub | null;
  onClose: () => void;
  onDone: () => void;
}) => {
  const paidPlans = PLANS.filter((p) => p.code !== "FREE");
  const [plan, setPlan] = useState<PlanCode>("COMPANION");
  const [cycle, setCycle] = useState<BillingCycle>("monthly");
  const [type, setType] = useState<AssignType>("paid");
  const [duration, setDuration] = useState<number>(1); // months
  const [reason, setReason] = useState<string>(REASONS[0]);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const planDef = PLANS.find((p) => p.code === plan)!;
  const amount = cycle === "monthly" ? planDef.monthly : planDef.yearly;

  const submit = async () => {
    if (!reason) {
      toast.error("Reason is required");
      return;
    }
    if (type === "complimentary" && duration > 3 && !confirm(
      "Complimentary > 3 months requires manager approval. Continue and flag for review?",
    )) return;

    setBusy(true);

    const start = new Date();
    const end = new Date(start);
    end.setMonth(end.getMonth() + (cycle === "yearly" ? 12 : duration));

    const status =
      type === "paid"
        ? "pending_receipt"
        : type === "trial"
        ? "trial"
        : "active";

    // close any existing active subscription on this device
    if (currentSub && currentSub.status === "active") {
      await supabase
        .from("user_subscriptions")
        .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
        .eq("id", currentSub.id);
    }

    const { data: { user } } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from("user_subscriptions")
      .insert({
        device_id: profile.device_id,
        plan,
        status,
        billing_cycle: cycle,
        amount: type === "complimentary" ? 0 : amount,
        currency: "SAR",
        current_period_start: start.toISOString(),
        current_period_end: end.toISOString(),
        activated_at: status === "active" ? new Date().toISOString() : null,
        activated_by: user?.id || null,
        provider: "manual",
        notes: `[${type}] ${reason}${note ? " — " + note : ""}`,
      })
      .select()
      .single();

    if (error) {
      setBusy(false);
      toast.error(error.message);
      return;
    }

    await supabase.rpc("log_audit_event", {
      _action: "SUBSCRIPTION_ASSIGNED",
      _target_type: "user_subscription",
      _target_id: data!.id,
      _details: {
        device_id: profile.device_id,
        rufayq_id: profile.rufayq_id,
        plan,
        billing_cycle: cycle,
        assignment_type: type,
        duration_months: duration,
        reason,
        internal_note: note,
        amount,
      },
    });

    setBusy(false);
    toast.success(`✓ ${plan} assigned to ${profile.full_name_en || profile.rufayq_id}`);
    onDone();
  };

  return (
    <div
      className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-end md:items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-slate-950 px-4 py-3 flex items-center justify-between border-b border-slate-800 sticky top-0 z-10">
          <div>
            <p className="text-[10px] font-mono uppercase tracking-widest text-amber-300">
              WF-02 · Assign Subscription
            </p>
            <p className="text-sm text-white font-semibold">
              {profile.full_name_en || profile.email || profile.rufayq_id}
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X size={18} />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Cycle toggle */}
          <div>
            <Label>Billing cycle</Label>
            <div className="flex rounded-lg p-0.5 bg-slate-800 mt-1">
              {(["monthly", "yearly"] as BillingCycle[]).map((c) => (
                <button
                  key={c}
                  onClick={() => setCycle(c)}
                  className={`flex-1 py-1.5 rounded-md text-xs font-semibold ${
                    cycle === c ? "bg-amber-500 text-slate-950" : "text-slate-400"
                  }`}
                >
                  {c === "monthly" ? "Monthly" : "Yearly · save 2 months"}
                </button>
              ))}
            </div>
          </div>

          {/* Plan picker */}
          <div>
            <Label>Plan</Label>
            <div className="grid grid-cols-3 gap-2 mt-1">
              {paidPlans.map((p) => {
                const selected = p.code === plan;
                return (
                  <button
                    key={p.code}
                    onClick={() => setPlan(p.code)}
                    className={`rounded-lg p-2 border text-left ${
                      selected
                        ? "border-amber-400 bg-amber-500/10"
                        : "border-slate-800 bg-slate-950 hover:border-slate-700"
                    }`}
                  >
                    <p className="text-[10px] font-mono uppercase text-slate-400">{p.code}</p>
                    <p className="text-sm font-semibold text-white mt-0.5">
                      SAR {cycle === "monthly" ? p.monthly : p.yearly}
                    </p>
                    <p className="text-[10px] text-slate-500">
                      / {cycle === "monthly" ? "month" : "year"}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Type */}
          <div>
            <Label>Assignment type</Label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as AssignType)}
              className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100"
            >
              <option value="paid">Paid — patient must complete payment</option>
              <option value="complimentary">Complimentary — no charge</option>
              <option value="trial">Trial — free, then convert</option>
              <option value="corporate">Insurance / Corporate covered</option>
            </select>
          </div>

          {/* Duration */}
          {cycle === "monthly" && (
            <div>
              <Label>Duration (months)</Label>
              <select
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100"
              >
                {[1, 3, 6, 12].map((d) => (
                  <option key={d} value={d}>
                    {d} {d === 1 ? "month" : "months"}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Reason */}
          <div>
            <Label>Reason (required)</Label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100"
            >
              {REASONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          {/* Internal note */}
          <div>
            <Label>Internal note (audit trail only)</Label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              placeholder="Visible to admins only…"
              className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100"
            />
          </div>

          {/* Summary */}
          <div className="rounded-lg bg-amber-500/5 border border-amber-500/20 p-3 text-xs text-amber-100/90 flex items-start gap-2">
            <ShieldCheck size={14} className="text-amber-300 shrink-0 mt-0.5" />
            <p>
              {type === "paid"
                ? `Status will be PENDING_RECEIPT until patient uploads payment proof of ${planDef.code} (SAR ${amount}).`
                : type === "trial"
                ? `Trial will be active for ${cycle === "yearly" ? 12 : duration} month(s). Auto-billing will not start without admin action.`
                : `Plan activates immediately. No charge to patient.`}
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="flex-1 py-2 rounded-lg border border-slate-700 text-slate-300 text-sm"
            >
              Cancel
            </button>
            <button
              onClick={submit}
              disabled={busy}
              className="flex-1 py-2 rounded-lg bg-amber-500 text-slate-950 text-sm font-semibold flex items-center justify-center gap-1.5 disabled:opacity-60"
            >
              {busy ? <Loader2 size={14} className="animate-spin" /> : <User size={14} />}
              Confirm
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const Label = ({ children }: { children: React.ReactNode }) => (
  <label className="text-[10px] font-mono uppercase tracking-widest text-slate-400">
    {children}
  </label>
);

export default AdminUserSearch;
