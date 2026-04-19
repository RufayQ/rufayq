import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { UserPlus, Copy } from "lucide-react";

interface Org { id: string; name: string; org_type: string }

const ROLES = [
  { value: "user", label: "External user (patient/provider/vendor)" },
  { value: "moderator", label: "Customer Service Agent (internal)" },
  { value: "admin", label: "Admin (internal)" },
];

const PROVIDER_TYPES = [
  { value: "patient",   label: "Patient / End user" },
  { value: "hospital",  label: "Hospital" },
  { value: "physician", label: "Physician" },
  { value: "vendor",    label: "Vendor" },
  { value: "insurance", label: "Insurance company" },
  { value: "internal",  label: "Internal staff" },
];

const AdminCreateUser = () => {
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    email: "", password: "", full_name: "", phone: "",
    role: "user", organization_id: "", provider_type: "patient",
  });
  const [created, setCreated] = useState<{ email: string; password: string } | null>(null);

  useEffect(() => {
    supabase.from("organizations").select("id,name,org_type").order("name").then(({ data }) => setOrgs((data as Org[]) || []));
  }, []);

  const generatePassword = () => {
    const c = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#";
    let p = ""; for (let i = 0; i < 14; i++) p += c[Math.floor(Math.random() * c.length)];
    setForm({ ...form, password: p });
  };

  const submit = async () => {
    if (!form.email || !form.password) { toast.error("Email and password are required"); return; }
    if (form.password.length < 8) { toast.error("Password must be at least 8 chars"); return; }
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("admin-create-user", {
      body: {
        email: form.email.trim().toLowerCase(),
        password: form.password,
        full_name: form.full_name || null,
        phone: form.phone || null,
        role: form.role,
        organization_id: form.organization_id || null,
        provider_type: form.provider_type,
      },
    });
    setBusy(false);
    if (error || (data as any)?.error) { toast.error((data as any)?.error || error?.message || "Failed"); return; }
    toast.success("User created");
    setCreated({ email: form.email, password: form.password });
    setForm({ email: "", password: "", full_name: "", phone: "", role: "user", organization_id: "", provider_type: "patient" });
  };

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
        <div className="flex items-center gap-2 mb-4">
          <UserPlus size={18} className="text-amber-400" />
          <h2 className="text-base font-semibold">Create new user</h2>
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Full name">
              <input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} className="input" />
            </Field>
            <Field label="Phone (with +country)">
              <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+9665..." className="input" />
            </Field>
          </div>
          <Field label="Email *">
            <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="input" />
          </Field>
          <Field label="Password *">
            <div className="flex gap-2">
              <input value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="input flex-1" />
              <button type="button" onClick={generatePassword} className="px-3 rounded-lg bg-slate-700 text-slate-200 text-xs">Generate</button>
            </div>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="User type">
              <select value={form.provider_type} onChange={(e) => setForm({ ...form, provider_type: e.target.value })} className="input">
                {PROVIDER_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </Field>
            <Field label="Auth role">
              <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="input">
                {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Organization (optional)">
            <select value={form.organization_id} onChange={(e) => setForm({ ...form, organization_id: e.target.value })} className="input">
              <option value="">— None (individual) —</option>
              {orgs.map(o => <option key={o.id} value={o.id}>{o.name} ({o.org_type})</option>)}
            </select>
          </Field>

          <button onClick={submit} disabled={busy}
            className="w-full py-2.5 rounded-lg bg-amber-500 text-slate-950 text-sm font-semibold disabled:opacity-50">
            {busy ? "Creating…" : "Create user"}
          </button>
        </div>
      </div>

      {created && (
        <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/5 p-4">
          <p className="text-xs text-emerald-300 font-semibold mb-2">✓ User created. Share these credentials securely:</p>
          <div className="bg-slate-950 rounded-lg p-3 font-mono text-xs space-y-1">
            <div className="flex justify-between items-center"><span className="text-slate-400">Email:</span><span className="text-slate-200">{created.email}</span></div>
            <div className="flex justify-between items-center"><span className="text-slate-400">Password:</span><span className="text-slate-200">{created.password}</span></div>
          </div>
          <button onClick={() => { navigator.clipboard.writeText(`Email: ${created.email}\nPassword: ${created.password}`); toast.success("Copied"); }}
            className="mt-3 px-3 py-1.5 rounded bg-emerald-500/20 text-emerald-300 text-xs flex items-center gap-1"><Copy size={11}/>Copy credentials</button>
        </div>
      )}

      <style>{`.input{background:rgb(15 23 42);border:1px solid rgb(30 41 59);border-radius:.5rem;padding:.5rem .75rem;font-size:.875rem;color:rgb(226 232 240);width:100%}`}</style>
    </div>
  );
};

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div><label className="block text-[11px] text-slate-400 mb-1 uppercase tracking-wide">{label}</label>{children}</div>
);

export default AdminCreateUser;
