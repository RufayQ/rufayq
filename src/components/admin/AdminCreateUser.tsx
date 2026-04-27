import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { UserPlus, Copy, Globe, Phone } from "lucide-react";
import { useQuickCreateSignal } from "@/components/admin/shell/quickCreateSignal";

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

// Compact list — most common nationalities for the GCC + medical-travel corridor.
// Each entry maps to ISO-3166 phone country code so we can auto-fill mobile prefix.
const NATIONALITIES: { code: string; name: string; dial: string; flag: string }[] = [
  { code: "SA", name: "Saudi Arabia", dial: "+966", flag: "🇸🇦" },
  { code: "EG", name: "Egypt",        dial: "+20",  flag: "🇪🇬" },
  { code: "AE", name: "UAE",          dial: "+971", flag: "🇦🇪" },
  { code: "QA", name: "Qatar",        dial: "+974", flag: "🇶🇦" },
  { code: "KW", name: "Kuwait",       dial: "+965", flag: "🇰🇼" },
  { code: "BH", name: "Bahrain",      dial: "+973", flag: "🇧🇭" },
  { code: "OM", name: "Oman",         dial: "+968", flag: "🇴🇲" },
  { code: "JO", name: "Jordan",       dial: "+962", flag: "🇯🇴" },
  { code: "LB", name: "Lebanon",      dial: "+961", flag: "🇱🇧" },
  { code: "SY", name: "Syria",        dial: "+963", flag: "🇸🇾" },
  { code: "PS", name: "Palestine",    dial: "+970", flag: "🇵🇸" },
  { code: "IQ", name: "Iraq",         dial: "+964", flag: "🇮🇶" },
  { code: "YE", name: "Yemen",        dial: "+967", flag: "🇾🇪" },
  { code: "SD", name: "Sudan",        dial: "+249", flag: "🇸🇩" },
  { code: "MA", name: "Morocco",      dial: "+212", flag: "🇲🇦" },
  { code: "TN", name: "Tunisia",      dial: "+216", flag: "🇹🇳" },
  { code: "DZ", name: "Algeria",      dial: "+213", flag: "🇩🇿" },
  { code: "LY", name: "Libya",        dial: "+218", flag: "🇱🇾" },
  { code: "TR", name: "Türkiye",      dial: "+90",  flag: "🇹🇷" },
  { code: "IN", name: "India",        dial: "+91",  flag: "🇮🇳" },
  { code: "PK", name: "Pakistan",     dial: "+92",  flag: "🇵🇰" },
  { code: "BD", name: "Bangladesh",   dial: "+880", flag: "🇧🇩" },
  { code: "PH", name: "Philippines",  dial: "+63",  flag: "🇵🇭" },
  { code: "ID", name: "Indonesia",    dial: "+62",  flag: "🇮🇩" },
  { code: "GB", name: "United Kingdom", dial: "+44", flag: "🇬🇧" },
  { code: "US", name: "United States",  dial: "+1",  flag: "🇺🇸" },
  { code: "DE", name: "Germany",      dial: "+49",  flag: "🇩🇪" },
  { code: "FR", name: "France",       dial: "+33",  flag: "🇫🇷" },
  { code: "TH", name: "Thailand",     dial: "+66",  flag: "🇹🇭" },
  { code: "MY", name: "Malaysia",     dial: "+60",  flag: "🇲🇾" },
];

const AdminCreateUser = () => {
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [busy, setBusy] = useState(false);
  const [showAr, setShowAr] = useState(false);

  const [form, setForm] = useState({
    email: "", password: "", full_name: "", full_name_ar: "", phone: "", phoneCountry: "SA",
    role: "user", organization_id: "", provider_type: "patient",
    id_number: "", dob: "", gender: "male", nationality: "SA",
  });
  const [created, setCreated] = useState<{ email: string; password: string } | null>(null);

  const dialCode = useMemo(
    () => NATIONALITIES.find((n) => n.code === form.phoneCountry)?.dial || "+966",
    [form.phoneCountry]
  );

  useEffect(() => {
    supabase.from("organizations").select("id,name,org_type").order("name").then(({ data }) => setOrgs((data as Org[]) || []));
  }, []);

  // Auto-sync phone country to nationality unless user has manually overridden
  useEffect(() => {
    setForm((f) => (f.phoneCountry === f.nationality || f.phone.length > 0 ? f : { ...f, phoneCountry: f.nationality }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.nationality]);

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
    const phone_e164 = form.phone.trim()
      ? (form.phone.startsWith("+") ? form.phone.replace(/\s+/g, "") : `${dialCode}${form.phone.replace(/^0+/, "").replace(/\s+/g, "")}`)
      : null;
    const nationalityName = NATIONALITIES.find((n) => n.code === form.nationality)?.name || form.nationality;

    const { data, error } = await supabase.functions.invoke("admin-create-user", {
      body: {
        email: form.email.trim().toLowerCase(),
        password: form.password,
        full_name: form.full_name.trim(),
        full_name_ar: showAr && form.full_name_ar.trim() ? form.full_name_ar.trim() : null,
        phone: phone_e164,
        role: form.role,
        organization_id: form.organization_id || null,
        provider_type: form.provider_type,
        id_number: form.id_number.trim() || null,
        date_of_birth: form.dob || null,
        gender: form.gender,
        nationality: nationalityName,
      },
    });
    setBusy(false);
    if (error || (data as any)?.error) { toast.error((data as any)?.error || error?.message || "Failed"); return; }
    toast.success("User created");
    setCreated({ email: form.email, password: form.password });
    setForm({
      email: "", password: "", full_name: "", full_name_ar: "", phone: "", phoneCountry: "SA",
      role: "user", organization_id: "", provider_type: "patient",
      id_number: "", dob: "", gender: "male", nationality: "SA",
    });
    setShowAr(false);
  };

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
        <div className="flex items-center gap-2 mb-4">
          <UserPlus size={18} className="text-amber-400" />
          <h2 className="text-base font-semibold">Create new user</h2>
        </div>

        <div className="space-y-3">
          {/* Identity block */}
          <Field label="Full name *">
            <input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              placeholder="e.g. Abdelrahman" className="input" />
          </Field>

          <label className="flex items-center gap-2 text-[11px] text-slate-300 cursor-pointer">
            <input type="checkbox" checked={showAr} onChange={(e) => setShowAr(e.target.checked)}
              className="w-3.5 h-3.5 accent-amber-500" />
            Add Arabic name (optional) · <span className="font-arabic">إضافة الاسم بالعربية</span>
          </label>
          {showAr && (
            <Field label="الاسم بالعربي">
              <input dir="rtl" value={form.full_name_ar} onChange={(e) => setForm({ ...form, full_name_ar: e.target.value })}
                placeholder="عبدالرحمن" className="input font-arabic text-right" />
            </Field>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Field label="ID / Passport">
              <input value={form.id_number} onChange={(e) => setForm({ ...form, id_number: e.target.value })}
                placeholder="National ID or passport #" className="input" />
            </Field>
            <Field label="Date of birth">
              <input type="date" value={form.dob} onChange={(e) => setForm({ ...form, dob: e.target.value })}
                className="input" />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Gender">
              <select value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })} className="input">
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </Field>
            <Field label="Nationality">
              <div className="relative">
                <Globe size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                <select value={form.nationality} onChange={(e) => setForm({ ...form, nationality: e.target.value })}
                  className="input pl-7">
                  {NATIONALITIES.map((n) => (
                    <option key={n.code} value={n.code}>{n.flag} {n.name}</option>
                  ))}
                </select>
              </div>
            </Field>
          </div>

          {/* Contact */}
          <Field label="Mobile number">
            <div className="flex gap-2">
              <select value={form.phoneCountry} onChange={(e) => setForm({ ...form, phoneCountry: e.target.value })}
                className="input w-32" title="Country code (auto-set from nationality, override here)">
                {NATIONALITIES.map((n) => (
                  <option key={n.code} value={n.code}>{n.flag} {n.dial}</option>
                ))}
              </select>
              <div className="relative flex-1">
                <Phone size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="5X XXX XXXX" inputMode="tel" className="input pl-7" />
              </div>
            </div>
            <p className="text-[10px] text-slate-500 mt-1">Country code auto-fills from nationality — override anytime.</p>
          </Field>

          <Field label="Email *">
            <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="user@example.com" className="input" />
          </Field>
          <Field label="Password *">
            <div className="flex gap-2">
              <input value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="input flex-1" />
              <button type="button" onClick={generatePassword} className="px-3 rounded-lg bg-slate-700 text-slate-200 text-xs">Generate</button>
            </div>
          </Field>

          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-800">
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
