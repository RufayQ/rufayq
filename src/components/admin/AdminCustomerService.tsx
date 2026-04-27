import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Headphones, Plus, Search, Shield, Eye, Power, Trash2, X, Save, Copy, ChevronRight, AlertCircle,
} from "lucide-react";
import { NAV_MODULES } from "./shell/adminNav";
import CountrySelect from "./CountrySelect";

interface CsUser {
  user_id: string;
  email: string | null;
  full_name: string | null;
  phone: string | null;
  country: string | null;
  status: string;
  role: "admin" | "moderator";
  created_at: string;
}

const ROLE_OPTIONS = [
  { value: "moderator", label: "Customer Service Agent", desc: "Read-mostly access to support modules. Cannot edit billing or RCM." },
  { value: "admin",     label: "Admin",                  desc: "Full access to every admin module including settings." },
] as const;

const AdminCustomerService = () => {
  const [users, setUsers] = useState<CsUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);
  const [simulating, setSimulating] = useState<"moderator" | "admin">("moderator");

  const load = async () => {
    setLoading(true);
    // Pull users with the moderator OR admin role plus profile basics.
    const { data: roles, error } = await supabase
      .from("user_roles")
      .select("user_id, role")
      .in("role", ["admin", "moderator"]);
    if (error) { toast.error(error.message); setLoading(false); return; }
    const ids = [...new Set((roles || []).map((r: any) => r.user_id))];
    if (ids.length === 0) { setUsers([]); setLoading(false); return; }

    const profilesRes: any = await (supabase.from("profiles") as any).select("user_id, email, full_name, phone, country, created_at").in("user_id", ids);
    const statusRes: any = await (supabase.from("user_status") as any).select("user_id, status").in("user_id", ids);
    const profiles: any[] = profilesRes.data || [];
    const status: any[] = statusRes.data || [];

    const map = new Map<string, CsUser>();
    (roles || []).forEach((r: any) => {
      const p = (profiles || []).find((x: any) => x.user_id === r.user_id) as any;
      const s = (status || []).find((x: any) => x.user_id === r.user_id) as any;
      // Prefer admin if both roles exist
      const existing = map.get(r.user_id);
      const role = existing?.role === "admin" ? "admin" : r.role;
      map.set(r.user_id, {
        user_id: r.user_id, email: p?.email || null, full_name: p?.full_name || null,
        phone: p?.phone || null, country: p?.country || null, status: s?.status || "active",
        role: role as any, created_at: p?.created_at || new Date().toISOString(),
      });
    });
    setUsers([...map.values()].sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at)));
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) =>
      [u.email, u.full_name, u.phone, u.country, u.user_id].some((f) => f && f.toLowerCase().includes(q))
    );
  }, [users, search]);

  const setStatus = async (u: CsUser, next: string) => {
    const { error } = await supabase.from("user_status").upsert({ user_id: u.user_id, status: next }, { onConflict: "user_id" });
    if (error) { toast.error(error.message); return; }
    await supabase.rpc("log_audit_event", {
      _action: `cs_user_${next}`, _target_type: "user", _target_id: u.user_id, _details: { email: u.email, role: u.role },
    });
    toast.success(`Marked ${next}`); load();
  };

  const revokeRole = async (u: CsUser) => {
    if (!confirm(`Revoke ${u.role} access for ${u.email || u.user_id}?`)) return;
    const { error } = await supabase.from("user_roles").delete().eq("user_id", u.user_id).eq("role", u.role);
    if (error) { toast.error(error.message); return; }
    await supabase.rpc("log_audit_event", {
      _action: "cs_user_role_revoked", _target_type: "user", _target_id: u.user_id, _details: { email: u.email, role: u.role },
    });
    toast.success("Access revoked"); load();
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-3 flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search agents by name, email, phone…"
            className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-8 pr-3 py-2 text-sm text-slate-200" />
        </div>
        <button onClick={() => setCreating(true)}
          className="px-3 py-2 rounded-lg bg-amber-500 text-slate-950 text-xs font-semibold flex items-center gap-1.5 hover:bg-amber-400 transition">
          <Plus size={14} /> New CS user
        </button>
      </div>

      {/* Privilege simulator */}
      <div className="rounded-xl border border-indigo-500/30 bg-indigo-500/5 p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Eye size={14} className="text-indigo-300" />
          <h3 className="text-sm font-semibold text-slate-100">Privilege simulator</h3>
          <span className="ml-auto flex gap-1">
            {ROLE_OPTIONS.map((r) => (
              <button key={r.value} onClick={() => setSimulating(r.value as any)}
                className={`px-2 py-1 rounded text-[11px] font-semibold transition ${
                  simulating === r.value ? "bg-indigo-500 text-slate-950" : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                }`}>
                {r.label}
              </button>
            ))}
          </span>
        </div>
        <p className="text-xs text-slate-400">{ROLE_OPTIONS.find((r) => r.value === simulating)?.desc}</p>
        <PrivilegePreview role={simulating} />
      </div>

      {/* List */}
      {loading && <p className="text-slate-400 text-sm">Loading…</p>}
      {!loading && filtered.length === 0 && (
        <div className="rounded-xl border border-dashed border-slate-700 p-8 text-center text-slate-500 text-sm">
          No customer service users yet. Click <span className="text-amber-300">+ New CS user</span> to provision one.
        </div>
      )}
      <div className="space-y-2">
        {filtered.map((u) => (
          <article key={u.user_id} className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center shrink-0">
                <Headphones size={16} className="text-indigo-300" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="text-sm font-semibold text-slate-100 truncate">{u.full_name || "—"}</h4>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full border ${
                    u.role === "admin"
                      ? "bg-rose-500/15 text-rose-300 border-rose-500/30"
                      : "bg-indigo-500/15 text-indigo-300 border-indigo-500/30"
                  }`}>{u.role === "admin" ? "Admin" : "CS Agent"}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full capitalize ${
                    u.status === "active" ? "bg-emerald-500/15 text-emerald-300" : "bg-slate-700 text-slate-300"
                  }`}>{u.status}</span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5 truncate">{u.email || "—"} · {u.phone || "—"} · {u.country || "—"}</p>
                <p className="text-[10px] text-slate-500 mt-1 font-mono truncate">{u.user_id}</p>
              </div>
              <div className="flex flex-col gap-1.5">
                {u.status === "active" ? (
                  <button onClick={() => setStatus(u, "suspended")}
                    className="text-[11px] px-2 py-1 rounded bg-amber-500/15 text-amber-300 flex items-center gap-1">
                    <Power size={11} /> Suspend
                  </button>
                ) : (
                  <button onClick={() => setStatus(u, "active")}
                    className="text-[11px] px-2 py-1 rounded bg-emerald-500/15 text-emerald-300 flex items-center gap-1">
                    <Power size={11} /> Activate
                  </button>
                )}
                <button onClick={() => revokeRole(u)}
                  className="text-[11px] px-2 py-1 rounded bg-rose-500/15 text-rose-300 flex items-center gap-1">
                  <Trash2 size={11} /> Revoke
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>

      {creating && <CreateCsUser onClose={() => { setCreating(false); load(); }} />}
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* Privilege preview — mirrors the gating used in Admin.tsx                   */
/* -------------------------------------------------------------------------- */
const PrivilegePreview = ({ role }: { role: "admin" | "moderator" }) => {
  const isAdmin = role === "admin";
  const all = NAV_MODULES.flatMap((m) => m.leaves.map((l) => ({ ...l, module: m.label })));
  const allowed = all.filter((l) => !l.adminOnly || isAdmin);
  const blocked = all.filter((l) => l.adminOnly && !isAdmin);

  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="rounded-lg bg-slate-950/60 border border-emerald-500/20 p-3">
        <p className="text-[11px] font-semibold text-emerald-300 mb-2 flex items-center gap-1">
          <Shield size={11} /> Allowed ({allowed.length})
        </p>
        <ul className="space-y-1 max-h-48 overflow-y-auto pr-1">
          {allowed.map((l) => (
            <li key={l.key} className="text-[11px] text-slate-300 flex items-center gap-1">
              <ChevronRight size={10} className="text-emerald-400" />
              <span className="truncate">{l.module} → {l.label}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="rounded-lg bg-slate-950/60 border border-rose-500/20 p-3">
        <p className="text-[11px] font-semibold text-rose-300 mb-2 flex items-center gap-1">
          <AlertCircle size={11} /> Blocked ({blocked.length})
        </p>
        {blocked.length === 0 ? (
          <p className="text-[11px] text-slate-500">No restrictions for this role.</p>
        ) : (
          <ul className="space-y-1 max-h-48 overflow-y-auto pr-1">
            {blocked.map((l) => (
              <li key={l.key} className="text-[11px] text-slate-400 flex items-center gap-1">
                <X size={10} className="text-rose-400" />
                <span className="truncate">{l.module} → {l.label}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* Create CS user dialog                                                       */
/* -------------------------------------------------------------------------- */
const CreateCsUser = ({ onClose }: { onClose: () => void }) => {
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState<{ email: string; password: string } | null>(null);
  const [form, setForm] = useState({
    email: "", password: "", full_name: "", phone: "", country: "Saudi Arabia", role: "moderator" as "moderator" | "admin",
  });

  const generatePassword = () => {
    const c = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#";
    let p = ""; for (let i = 0; i < 14; i++) p += c[Math.floor(Math.random() * c.length)];
    setForm({ ...form, password: p });
  };

  const submit = async () => {
    if (!form.full_name.trim()) { toast.error("Full name is required"); return; }
    if (!form.email || !form.password) { toast.error("Email and password are required"); return; }
    if (form.password.length < 8) { toast.error("Password must be at least 8 chars"); return; }
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("admin-create-user", {
      body: {
        email: form.email.trim().toLowerCase(),
        password: form.password,
        full_name: form.full_name.trim(),
        phone: form.phone.trim() || null,
        role: form.role,
        provider_type: "internal",
        nationality: form.country,
      },
    });
    setBusy(false);
    if (error || (data as any)?.error) { toast.error((data as any)?.error || error?.message || "Failed"); return; }
    toast.success(`${form.role === "admin" ? "Admin" : "CS agent"} created`);
    setCreated({ email: form.email, password: form.password });
  };

  const copy = (v: string) => { navigator.clipboard.writeText(v); toast.success("Copied"); };

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-slate-950/60 backdrop-blur-sm" onClick={onClose} />
      <aside className="w-full max-w-md bg-slate-950 border-l border-slate-800 overflow-y-auto p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Headphones size={16} className="text-indigo-300" />
            <h2 className="font-semibold text-slate-100">New customer service user</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300">
            <X size={14} />
          </button>
        </div>

        {!created ? (
          <div className="space-y-3">
            <Field label="Full name *">
              <input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                className="input" placeholder="Jane Doe" />
            </Field>
            <Field label="Email *">
              <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="input" placeholder="agent@rufayq.com" />
            </Field>
            <Field label="Phone">
              <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="input" placeholder="+966 5X XXX XXXX" />
            </Field>
            <Field label="Country">
              <CountrySelect value={form.country} onChange={(v) => setForm({ ...form, country: v })} className="w-full rounded-lg" />
            </Field>
            <Field label="Password *">
              <div className="flex gap-2">
                <input value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="input flex-1" />
                <button type="button" onClick={generatePassword} className="px-3 rounded-lg bg-slate-700 text-slate-200 text-xs">Generate</button>
              </div>
            </Field>
            <Field label="Role *">
              <div className="space-y-1.5">
                {ROLE_OPTIONS.map((r) => (
                  <label key={r.value}
                    className={`flex items-start gap-2 p-2.5 rounded-lg border cursor-pointer transition ${
                      form.role === r.value ? "border-indigo-500 bg-indigo-500/10" : "border-slate-700 bg-slate-900/40 hover:border-slate-600"
                    }`}>
                    <input type="radio" name="role" value={r.value} checked={form.role === r.value}
                      onChange={() => setForm({ ...form, role: r.value as any })} className="mt-1 accent-indigo-500" />
                    <div>
                      <p className="text-xs font-semibold text-slate-100">{r.label}</p>
                      <p className="text-[11px] text-slate-400">{r.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </Field>

            <div className="rounded-lg border border-indigo-500/20 bg-indigo-500/5 p-3 space-y-2">
              <p className="text-[11px] font-semibold text-indigo-300 flex items-center gap-1">
                <Eye size={11} /> Privileges this user will receive
              </p>
              <PrivilegePreview role={form.role} />
            </div>

            <button onClick={submit} disabled={busy}
              className="w-full py-2.5 rounded-lg bg-amber-500 text-slate-950 text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2">
              <Save size={13} /> {busy ? "Creating…" : "Create user"}
            </button>
          </div>
        ) : (
          <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/5 p-4 space-y-3">
            <p className="text-xs text-emerald-300 font-semibold">✓ User created. Share these credentials securely:</p>
            <div className="bg-slate-950 rounded-lg p-3 font-mono text-xs space-y-2">
              <div className="flex justify-between items-center gap-2">
                <span className="text-slate-400 shrink-0">Email:</span>
                <span className="text-slate-200 truncate">{created.email}</span>
                <button onClick={() => copy(created.email)} className="p-1 text-slate-400 hover:text-amber-300"><Copy size={11}/></button>
              </div>
              <div className="flex justify-between items-center gap-2">
                <span className="text-slate-400 shrink-0">Password:</span>
                <span className="text-slate-200 truncate">{created.password}</span>
                <button onClick={() => copy(created.password)} className="p-1 text-slate-400 hover:text-amber-300"><Copy size={11}/></button>
              </div>
            </div>
            <button onClick={onClose} className="w-full py-2 rounded-lg bg-slate-800 text-slate-200 text-xs">Close</button>
          </div>
        )}
      </aside>

      <style>{`.input{background:rgb(15 23 42);border:1px solid rgb(51 65 85);border-radius:0.5rem;padding:0.5rem 0.75rem;font-size:0.8125rem;color:rgb(226 232 240);width:100%}`}</style>
    </div>
  );
};

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <label className="block">
    <span className="text-[10px] uppercase tracking-wide text-slate-500">{label}</span>
    <div className="mt-1">{children}</div>
  </label>
);

export default AdminCustomerService;
