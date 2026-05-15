import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Pause, Play, Ban, Trash2, KeyRound, Search, Copy, MessageCircle, Mail, Edit3, Save, X, RotateCw, Shuffle, Crown } from "lucide-react";
import SubscriptionDrawer from "@/features/subscriptions/admin/ui/SubscriptionDrawer";
import { statusTone, normalizePlanCode } from "@/features/subscriptions/logic/statusMachine";
import { usePermissions } from "@/features/auth";
import NationalityCombobox from "@/components/NationalityCombobox";

interface Profile {
  id: string; device_id: string; full_name_en: string | null; phone: string | null;
  email: string | null; nationality: string | null; created_at: string;
  deleted_at?: string | null; deleted_reason?: string | null;
  provider_type?: string | null; organization_id?: string | null;
  rufayq_id?: string | null;
}
interface UserStatus {
  user_id: string; status: "active" | "on_hold" | "suspended"; reason: string | null;
}
interface Org { id: string; name: string; org_type: string }
interface SubSummary {
  device_id: string; plan: string; status: string;
  current_period_end: string | null;
}
interface ReceiptSummary { device_id: string; status: string; }

const PROVIDER_TYPES = ["patient","hospital","physician","vendor","insurance","internal"];
const TYPE_BADGE: Record<string, string> = {
  patient: "bg-rose-500/15 text-rose-300",
  hospital: "bg-blue-500/15 text-blue-300",
  physician: "bg-emerald-500/15 text-emerald-300",
  vendor: "bg-amber-500/15 text-amber-300",
  insurance: "bg-violet-500/15 text-violet-300",
  internal: "bg-slate-500/15 text-slate-300",
};

const AdminUsers = () => {
  const { can, ready } = usePermissions();
  const canModify = ready && can("user.assign_role"); // proxy: admins can suspend/edit/delete
  const canResetPwd = ready && can("user.create");
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [statuses, setStatuses] = useState<Record<string, UserStatus>>({});
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [otpModal, setOtpModal] = useState<{ recipient: string; code: string; expires: string } | null>(null);
  const [pwdModal, setPwdModal] = useState<{ user_id: string; label: string; password: string; mode: "auto" | "manual" } | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Profile>>({});

  const [orgs, setOrgs] = useState<Org[]>([]);
  const [filterType, setFilterType] = useState<string>("all");
  const [filterOrg, setFilterOrg] = useState<string>("all");
  const [subsByDevice, setSubsByDevice] = useState<Record<string, SubSummary>>({});
  const [latestReceiptByDevice, setLatestReceiptByDevice] = useState<Record<string, ReceiptSummary>>({});
  const [drawerUser, setDrawerUser] = useState<Profile | null>(null);

  const load = async () => {
    setLoading(true);
    const [{ data: p, error: pErr }, { data: s }, { data: o }, { data: subs }, { data: recs }] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at", { ascending: false }).limit(500),
      supabase.from("user_status").select("*"),
      supabase.from("organizations").select("id,name,org_type").order("name"),
      supabase.from("user_subscriptions")
        .select("device_id,plan,status,current_period_end")
        .order("created_at", { ascending: false }),
      supabase.from("payment_receipts")
        .select("device_id,status")
        .order("created_at", { ascending: false }),
    ]);
    if (pErr) toast.error(pErr.message);
    setProfiles((p || []) as Profile[]);
    setOrgs((o || []) as Org[]);
    const map: Record<string, UserStatus> = {};
    (s || []).forEach((x: any) => { map[x.user_id] = x; });
    setStatuses(map);
    // Pick the most relevant subscription per device: prefer active, else latest
    const subMap: Record<string, SubSummary> = {};
    (subs || []).forEach((row: any) => {
      const cur = subMap[row.device_id];
      if (!cur || (row.status === "active" && cur.status !== "active")) {
        subMap[row.device_id] = row as SubSummary;
      }
    });
    setSubsByDevice(subMap);
    const recMap: Record<string, ReceiptSummary> = {};
    (recs || []).forEach((row: any) => {
      if (!recMap[row.device_id]) recMap[row.device_id] = row as ReceiptSummary;
    });
    setLatestReceiptByDevice(recMap);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const generateOtp = async (recipient: string) => {
    if (!recipient) { toast.error("This user has no phone or email on file"); return; }
    const { data, error } = await supabase.rpc("admin_generate_manual_otp", { _recipient: recipient });
    if (error) { toast.error(error.message); return; }
    const row = (data as any)?.[0];
    if (!row) { toast.error("No code returned"); return; }
    setOtpModal({ recipient, code: row.code, expires: row.expires_at });
  };

  const resetPassword = async (p: Profile, mode: "auto" | "manual") => {
    const auth_id = p.device_id?.startsWith("auth_") ? p.device_id.slice(5) : null;
    if (!auth_id) { toast.error("This profile has no linked sign-in account."); return; }
    let manual = "";
    if (mode === "manual") {
      manual = prompt("Enter the new password (min 8 chars):") || "";
      if (manual.length < 8) { toast.error("Password must be at least 8 characters"); return; }
    }
    const { data, error } = await supabase.functions.invoke("admin-reset-password", {
      body: { user_id: auth_id, password: manual || undefined, auto_generate: mode === "auto" },
    });
    if (error || (data as any)?.error) { toast.error((data as any)?.error || error?.message || "Failed"); return; }
    setPwdModal({ user_id: auth_id, label: p.full_name_en || p.email || p.phone || auth_id, password: (data as any).password, mode });
    toast.success("Password reset");
  };


  // Resolve the auth.users.id from a profile. We key profiles by `device_id`
  // and for registered users that device_id is `auth_<uuid>`. Guests have no
  // auth user yet → status changes are not applicable.
  const authIdFromProfile = (p: Profile): string | null => {
    if (p.device_id?.startsWith("auth_")) return p.device_id.slice(5);
    return null;
  };

  const setStatus = async (p: Profile, status: UserStatus["status"]) => {
    const auth_id = authIdFromProfile(p);
    if (!auth_id) {
      toast.error("This profile has no linked sign-in account yet.", {
        description: "Guest profiles can't be activated/suspended. Ask the user to register first.",
      });
      return;
    }
    const reason = status !== "active" ? prompt(`Reason for ${status}?`) || null : null;
    const { error } = await supabase.from("user_status").upsert({ user_id: auth_id, status, reason }, { onConflict: "user_id" });
    if (error) toast.error(error.message); else {
      await supabase.rpc("log_audit_event", { _action: "user_status_changed", _target_type: "user", _target_id: auth_id, _details: { status, reason } });
      toast.success(`Set to ${status}`); load();
    }
  };

  const softDelete = async (id: string) => {
    const reason = prompt("Reason for deleting this user? (optional)") || null;
    if (!confirm("Soft-delete this user? They will be hidden from the app but data is retained.")) return;
    const { error } = await supabase
      .from("profiles")
      .update({ deleted_at: new Date().toISOString(), deleted_reason: reason })
      .eq("id", id);
    if (error) toast.error(error.message); else {
      await supabase.rpc("log_audit_event", { _action: "user_soft_deleted", _target_type: "profile", _target_id: id, _details: { reason } });
      toast.success("User soft-deleted"); load();
    }
  };

  const restore = async (id: string) => {
    const { error } = await supabase
      .from("profiles")
      .update({ deleted_at: null, deleted_reason: null })
      .eq("id", id);
    if (error) toast.error(error.message); else {
      await supabase.rpc("log_audit_event", { _action: "user_restored", _target_type: "profile", _target_id: id });
      toast.success("Restored"); load();
    }
  };

  const startEdit = (p: Profile) => {
    setEditing(p.id);
    setEditForm({ full_name_en: p.full_name_en, email: p.email, phone: p.phone, nationality: p.nationality });
  };
  const saveEdit = async (id: string) => {
    const { error } = await supabase.from("profiles").update({
      full_name_en: editForm.full_name_en || null,
      email: editForm.email || null,
      phone: editForm.phone || null,
      nationality: editForm.nationality || null,
    }).eq("id", id);
    if (error) toast.error(error.message); else {
      await supabase.rpc("log_audit_event", { _action: "profile_updated", _target_type: "profile", _target_id: id, _details: editForm });
      toast.success("Saved"); setEditing(null); load();
    }
  };

  const orgsById: Record<string, Org> = {};
  orgs.forEach(o => { orgsById[o.id] = o; });

  const filtered = profiles.filter((p) => {
    if (filterType !== "all" && (p.provider_type || "patient") !== filterType) return false;
    if (filterOrg !== "all") {
      if (filterOrg === "none" && p.organization_id) return false;
      if (filterOrg !== "none" && p.organization_id !== filterOrg) return false;
    }
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      p.full_name_en?.toLowerCase().includes(q) ||
      p.email?.toLowerCase().includes(q) ||
      p.phone?.includes(q) ||
      p.device_id?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name, email, phone, device…"
            className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-sm text-slate-200" />
        </div>
        <select value={filterType} onChange={(e) => setFilterType(e.target.value)}
          className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200">
          <option value="all">All types</option>
          {PROVIDER_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select value={filterOrg} onChange={(e) => setFilterOrg(e.target.value)}
          className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200">
          <option value="all">All organizations</option>
          <option value="none">— No organization —</option>
          {orgs.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
        </select>
        <p className="text-xs text-slate-500 ml-auto">{filtered.length} of {profiles.length}</p>
      </div>

      {loading && <p className="text-slate-400 text-sm">Loading…</p>}
      {!loading && filtered.length === 0 && <p className="text-slate-500 text-sm">No users.</p>}

      {filtered.map((p) => {
        const auth_id = p.device_id?.startsWith("auth_") ? p.device_id.slice(5) : null;
        const status = auth_id ? statuses[auth_id]?.status : undefined;
        const isDeleted = !!p.deleted_at;
        const recipient = p.email || (p.phone?.startsWith("+") ? p.phone : p.phone ? `+966${p.phone.replace(/^0+/, "")}` : "");
        const isEditing = editing === p.id;
        const sub = subsByDevice[p.device_id];
        const planCode = normalizePlanCode(sub?.plan) || "FREE";
        const subStatus = sub?.status;
        const periodEnd = sub?.current_period_end ? new Date(sub.current_period_end) : null;
        const daysLeft = periodEnd ? Math.ceil((periodEnd.getTime() - Date.now()) / 86_400_000) : null;
        const expiringSoon = daysLeft !== null && daysLeft >= 0 && daysLeft <= 7 && subStatus === "active";
        const latestRec = latestReceiptByDevice[p.device_id];
        return (
          <div
            key={p.id}
            role={!isEditing ? "button" : undefined}
            tabIndex={!isEditing ? 0 : undefined}
            onClick={() => { if (!isEditing && !isDeleted) setDrawerUser(p); }}
            onKeyDown={(e) => { if (!isEditing && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); setDrawerUser(p); } }}
            className={`rounded-xl border p-3 sm:p-4 transition ${isDeleted ? "border-rose-900/40 bg-rose-950/20 opacity-70" : "border-slate-800 bg-slate-900/50 hover:border-amber-500/40 cursor-pointer"}`}
          >
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-2">
              <div className="min-w-0 flex-1">
                {isEditing ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2" onClick={(e) => e.stopPropagation()}>
                    <input value={editForm.full_name_en || ""} onChange={(e) => setEditForm({ ...editForm, full_name_en: e.target.value })}
                      placeholder="Full name" className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-sm text-slate-200" />
                    <NationalityCombobox
                      value={editForm.nationality || ""}
                      onChange={(v) => setEditForm({ ...editForm, nationality: v })}
                      className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-sm text-slate-200"
                    />
                    <input value={editForm.email || ""} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                      placeholder="Email" className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-sm text-slate-200" />
                    <input value={editForm.phone || ""} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                      placeholder="Phone" className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-sm text-slate-200" />
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                      <h3 className="font-semibold text-sm text-slate-100">{p.full_name_en || "—"}</h3>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full ${TYPE_BADGE[p.provider_type || "patient"]}`}>{p.provider_type || "patient"}</span>
                      {status && <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                        status === "active" ? "bg-emerald-500/15 text-emerald-300"
                        : status === "on_hold" ? "bg-amber-500/15 text-amber-300"
                        : "bg-rose-500/15 text-rose-300"
                      }`}>{status}</span>}
                      {isDeleted && <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-300">DELETED</span>}
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono ${
                        planCode === "FREE" ? "bg-slate-700/60 text-slate-300"
                        : planCode === "STARTER" ? "bg-sky-500/15 text-sky-300"
                        : planCode === "COMPANION" ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                        : "bg-violet-500/15 text-violet-300"
                      }`}>{planCode}</span>
                      {subStatus && (
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono ${statusTone(subStatus)}`}>
                          {expiringSoon ? "EXPIRING" : subStatus.toUpperCase()}
                        </span>
                      )}
                      {latestRec && (latestRec.status === "pending" || latestRec.status === "under_review") && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 font-mono">
                          PAY: {latestRec.status.toUpperCase()}
                        </span>
                      )}
                      {latestRec?.status === "rejected" && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-300 font-mono">PAY: REJECTED</span>
                      )}
                      {daysLeft !== null && daysLeft >= 0 && subStatus === "active" && (
                        <span className="text-[10px] text-slate-500">· {daysLeft}d left</span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 break-words">
                      {p.phone || "no phone"} · {p.email || "no email"} · {p.nationality || "—"}
                    </p>
                    {p.organization_id && orgsById[p.organization_id] && (
                      <p className="text-[11px] text-teal-300 mt-0.5">🏢 {orgsById[p.organization_id].name}</p>
                    )}
                    <p className="text-[10px] text-slate-600 font-mono mt-0.5 break-all">{p.device_id.slice(0, 16)}… · joined {new Date(p.created_at).toLocaleDateString()}</p>
                  </>
                )}
              </div>
              <div className="flex flex-row sm:flex-col flex-wrap gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                {isEditing ? (
                  <>
                    <button onClick={() => saveEdit(p.id)} className="px-2.5 py-1 rounded bg-emerald-500/15 text-emerald-300 text-[11px] flex items-center gap-1"><Save size={11}/>Save</button>
                    <button onClick={() => setEditing(null)} className="px-2.5 py-1 rounded bg-slate-700 text-slate-300 text-[11px] flex items-center gap-1"><X size={11}/>Cancel</button>
                  </>
                ) : (
                  <>
                    {canModify && (
                      <button onClick={() => generateOtp(recipient)} disabled={!recipient || isDeleted}
                        className="px-2.5 py-1 rounded bg-amber-500/15 text-amber-300 text-[11px] flex items-center gap-1 disabled:opacity-30"><KeyRound size={11}/>Send OTP</button>
                    )}
                    {canResetPwd && (
                      <>
                        <button onClick={() => resetPassword(p, "auto")} disabled={!auth_id || isDeleted}
                          className="px-2.5 py-1 rounded bg-violet-500/15 text-violet-300 text-[11px] flex items-center gap-1 disabled:opacity-30" title="Generate a new random password">
                          <Shuffle size={11}/>Auto pwd
                        </button>
                        <button onClick={() => resetPassword(p, "manual")} disabled={!auth_id || isDeleted}
                          className="px-2.5 py-1 rounded bg-violet-500/15 text-violet-300 text-[11px] flex items-center gap-1 disabled:opacity-30" title="Set a specific password">
                          <RotateCw size={11}/>Set pwd
                        </button>
                      </>
                    )}
                    <button onClick={() => setDrawerUser(p)} disabled={isDeleted}
                      title="Open subscription management"
                      className="px-2.5 py-1 rounded bg-gradient-to-r from-amber-500/30 to-amber-600/20 text-amber-200 border border-amber-500/40 text-[11px] flex items-center gap-1 disabled:opacity-30 hover:from-amber-500/40 hover:to-amber-600/30 transition-colors">
                      <Crown size={11}/>Subscription
                    </button>
                    {canModify && (
                      <button onClick={() => startEdit(p)} disabled={isDeleted}
                        className="px-2.5 py-1 rounded bg-slate-700 text-slate-200 text-[11px] flex items-center gap-1 disabled:opacity-30"><Edit3 size={11}/>Edit</button>
                    )}
                  </>
                )}
              </div>
            </div>
            {!isEditing && canModify && (
              <div className="flex flex-wrap gap-1.5 pt-2 border-t border-slate-800" onClick={(e) => e.stopPropagation()}>
                <button onClick={() => setStatus(p, "active")} disabled={status === "active" || isDeleted}
                  className="px-2 py-1 rounded bg-emerald-500/15 text-emerald-300 text-[10px] disabled:opacity-30 flex items-center gap-1"><Play size={10}/>Activate</button>
                <button onClick={() => setStatus(p, "on_hold")} disabled={status === "on_hold" || isDeleted}
                  className="px-2 py-1 rounded bg-amber-500/15 text-amber-300 text-[10px] disabled:opacity-30 flex items-center gap-1"><Pause size={10}/>Hold</button>
                <button onClick={() => setStatus(p, "suspended")} disabled={status === "suspended" || isDeleted}
                  className="px-2 py-1 rounded bg-rose-500/15 text-rose-300 text-[10px] disabled:opacity-30 flex items-center gap-1"><Ban size={10}/>Suspend</button>
                <div className="flex-1" />
                {isDeleted ? (
                  <button onClick={() => restore(p.id)} className="px-2 py-1 rounded bg-emerald-500/15 text-emerald-300 text-[10px] flex items-center gap-1">Restore</button>
                ) : (
                  <button onClick={() => softDelete(p.id)} className="px-2 py-1 rounded bg-rose-500/15 text-rose-300 text-[10px] flex items-center gap-1"><Trash2 size={10}/>Delete</button>
                )}
              </div>
            )}
          </div>
        );
      })}

      {/* Manual OTP modal */}
      {otpModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-6" onClick={() => setOtpModal(null)}>
          <div className="bg-slate-900 border border-amber-500/40 rounded-2xl p-6 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-amber-300 mb-1 flex items-center gap-2"><KeyRound size={18}/>Manual OTP code</h3>
            <p className="text-xs text-slate-400 mb-4">For: <span className="text-slate-200 font-mono">{otpModal.recipient}</span></p>
            <div className="bg-slate-950 border border-slate-700 rounded-xl py-6 text-center mb-3">
              <p className="text-4xl font-mono font-bold tracking-[0.4em] text-amber-300">{otpModal.code}</p>
            </div>
            <p className="text-[11px] text-slate-500 mb-4">
              Expires in 15 minutes. Send this code to the user via your own WhatsApp / SMS / call. They enter it on the login screen as a normal OTP.
            </p>
            <div className="grid grid-cols-3 gap-2">
              <button onClick={() => { navigator.clipboard.writeText(otpModal.code); toast.success("Copied"); }}
                className="py-2 rounded-lg bg-slate-700 text-slate-200 text-xs flex items-center justify-center gap-1"><Copy size={12}/>Copy</button>
              <a href={`https://wa.me/${otpModal.recipient.replace(/[^\d]/g, "")}?text=${encodeURIComponent(`Your RufayQ verification code: ${otpModal.code}`)}`}
                target="_blank" rel="noreferrer"
                className="py-2 rounded-lg bg-emerald-500/20 text-emerald-300 text-xs flex items-center justify-center gap-1"><MessageCircle size={12}/>WhatsApp</a>
              <a href={otpModal.recipient.includes("@") ? `mailto:${otpModal.recipient}?subject=RufayQ%20code&body=Your%20code:%20${otpModal.code}` : "#"}
                className="py-2 rounded-lg bg-blue-500/20 text-blue-300 text-xs flex items-center justify-center gap-1"><Mail size={12}/>Email</a>
            </div>
            <button onClick={() => setOtpModal(null)} className="w-full mt-3 py-2 text-xs text-slate-400">Close</button>
          </div>
        </div>
      )}
      {pwdModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-6" onClick={() => setPwdModal(null)}>
          <div className="bg-slate-900 border border-violet-500/40 rounded-2xl p-6 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-violet-300 mb-1 flex items-center gap-2"><RotateCw size={18}/>New password ready</h3>
            <p className="text-xs text-slate-400 mb-4">For: <span className="text-slate-200">{pwdModal.label}</span></p>
            <div className="bg-slate-950 border border-slate-700 rounded-xl py-5 text-center mb-3">
              <p className="text-2xl font-mono font-bold tracking-wider text-violet-300 break-all px-3">{pwdModal.password}</p>
            </div>
            <p className="text-[11px] text-slate-500 mb-4">
              Share this password securely with the user. They can change it after signing in.
            </p>
            <button onClick={() => { navigator.clipboard.writeText(pwdModal.password); toast.success("Copied"); }}
              className="w-full py-2 rounded-lg bg-slate-700 text-slate-200 text-xs flex items-center justify-center gap-1 mb-2"><Copy size={12}/>Copy password</button>
            <button onClick={() => setPwdModal(null)} className="w-full py-2 text-xs text-slate-400">Close</button>
          </div>
        </div>
      )}

      {drawerUser && (
        <SubscriptionDrawer
          user={{
            id: drawerUser.id,
            device_id: drawerUser.device_id,
            full_name_en: drawerUser.full_name_en,
            email: drawerUser.email,
            phone: drawerUser.phone,
            rufayq_id: drawerUser.rufayq_id ?? null,
          }}
          onClose={() => { setDrawerUser(null); load(); }}
        />
      )}
    </div>
  );
};

export default AdminUsers;
