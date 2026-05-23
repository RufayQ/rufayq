/**
 * ProfileEditSheet — bottom sheet to update the signed-in user's name (EN+AR),
 * phone, email, and avatar in one place. Writes to public.profiles via
 * upsert keyed on device_id (matches existing AvatarUploader pattern).
 */
import { useEffect, useState } from "react";
import { X, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getDeviceId } from "@/hooks/useDeviceId";
import AvatarUploader from "@/components/profile/AvatarUploader";

interface Props { onClose: () => void; onSaved?: () => void; }

const Field = ({
  label, labelAr, value, onChange, placeholder, type = "text", dir,
}: {
  label: string; labelAr: string; value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string; dir?: "ltr" | "rtl";
}) => (
  <div className="mb-3">
    <div className="flex items-baseline justify-between mb-1 px-1">
      <p className="font-mono text-[9px] tracking-widest" style={{ color: "var(--gold)" }}>{label}</p>
      <p className="font-arabic text-[10px]" dir="rtl" style={{ color: "var(--gray)" }}>{labelAr}</p>
    </div>
    <input
      value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} type={type} dir={dir}
      className="w-full px-3 py-2.5 rounded-lg text-[13px] outline-none"
      style={{ background: "var(--off-white)", border: "1px solid var(--gray-light)", color: "var(--navy)" }}
    />
  </div>
);

const ProfileEditSheet = ({ onClose, onSaved }: Props) => {
  const deviceId = getDeviceId();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [nameEn, setNameEn] = useState("");
  const [nameAr, setNameAr] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const { data } = await supabase
        .from("profiles")
        .select("full_name_en, full_name_ar, phone, email")
        .eq("device_id", deviceId)
        .maybeSingle();
      if (cancelled) return;
      const meta = (session?.user?.user_metadata || {}) as Record<string, string>;
      setNameEn(data?.full_name_en || meta.full_name || meta.name || "");
      setNameAr(data?.full_name_ar || meta.full_name_ar || "");
      setPhone(data?.phone || session?.user?.phone || "");
      setEmail(data?.email || session?.user?.email || "");
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [deviceId]);

  const save = async () => {
    setSaving(true);
    try {
      const { error } = await supabase.from("profiles").upsert({
        device_id: deviceId,
        full_name_en: nameEn.trim() || null,
        full_name_ar: nameAr.trim() || null,
        phone: phone.trim() || null,
        email: email.trim() || null,
      }, { onConflict: "device_id" });
      if (error) throw error;
      toast.success("Profile updated · تم التحديث");
      onSaved?.();
      onClose();
    } catch (e) {
      console.error(e);
      toast.error("Save failed · فشل الحفظ");
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center" style={{ background: "rgba(6,16,26,0.65)" }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-[420px] rounded-t-3xl pb-6 pt-3 px-5 max-h-[92vh] overflow-y-auto" style={{ background: "var(--white)" }}>
        <div className="mx-auto w-10 h-1 rounded-full mb-3" style={{ background: "var(--gray-light)" }} />
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="font-display text-[17px]" style={{ color: "var(--navy)" }}>Edit profile</p>
            <p className="font-arabic text-[11px]" dir="rtl" style={{ color: "var(--gray)" }}>تعديل الملف الشخصي</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center btn-press" style={{ background: "var(--gray-light)" }}><X size={16} /></button>
        </div>

        <div className="flex flex-col items-center mb-4">
          <AvatarUploader />
          <p className="text-[10px] mt-2" style={{ color: "var(--gray)" }}>Tap to change photo · غيّر الصورة</p>
        </div>

        {loading ? (
          <div className="py-10 flex items-center justify-center"><Loader2 className="animate-spin" size={18} style={{ color: "var(--teal-deep)" }} /></div>
        ) : (
          <>
            <Field label="FULL NAME (EN)" labelAr="الاسم بالإنجليزية" value={nameEn} onChange={setNameEn} placeholder="Your full name" />
            <Field label="FULL NAME (AR)" labelAr="الاسم بالعربية" value={nameAr} onChange={setNameAr} placeholder="اسمك الكامل" dir="rtl" />
            <Field label="PHONE" labelAr="رقم الجوال" value={phone} onChange={setPhone} placeholder="+966 5X XXX XXXX" type="tel" />
            <Field label="EMAIL" labelAr="البريد الإلكتروني" value={email} onChange={setEmail} placeholder="you@example.com" type="email" />

            <button onClick={save} disabled={saving} className="w-full py-3 rounded-xl text-white font-semibold flex items-center justify-center gap-2 btn-press mt-2" style={{ background: "var(--teal-deep)", opacity: saving ? 0.7 : 1 }}>
              {saving ? <Loader2 className="animate-spin" size={16} /> : <Check size={16} />}
              Save changes · حفظ التغييرات
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default ProfileEditSheet;
