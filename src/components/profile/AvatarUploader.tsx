import { useEffect, useRef, useState } from "react";
import { Camera, Loader2, User } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getDeviceId } from "@/hooks/useDeviceId";

/**
 * Upload (or replace) the current user's profile photo. Photo is stored in
 * the public `avatars` bucket under `{device_id}/avatar.{ext}` and the
 * public URL is written to `profiles.avatar_url`.
 */
export default function AvatarUploader() {
  const deviceId = getDeviceId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("avatar_url, google_picture_url")
        .eq("device_id", deviceId)
        .maybeSingle();
      if (!cancelled) setUrl(data?.avatar_url ?? data?.google_picture_url ?? null);
    })();
    return () => { cancelled = true; };
  }, [deviceId]);

  const handlePick = () => inputRef.current?.click();

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please pick an image · اختر صورة");
      return;
    }
    setBusy(true);
    try {
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
      const path = `${deviceId}/avatar.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
      const publicUrl = `${pub.publicUrl}?t=${Date.now()}`;
      const { error: profErr } = await supabase
        .from("profiles")
        .upsert({ device_id: deviceId, avatar_url: publicUrl }, { onConflict: "device_id" });
      if (profErr) throw profErr;
      setUrl(publicUrl);
      toast.success("Photo updated · تم تحديث الصورة");
    } catch (err) {
      console.error(err);
      toast.error("Upload failed · فشل الرفع");
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handlePick}
      disabled={busy}
      className="relative w-16 h-16 rounded-full mx-auto flex items-center justify-center overflow-hidden btn-press"
      style={{ border: "2px solid var(--gold)", background: url ? "transparent" : "rgba(197,150,90,0.15)", color: "var(--gold)" }}
      aria-label="Change profile photo"
    >
      {url ? (
        <img src={url} alt="Profile" className="w-full h-full object-cover" />
      ) : (
        <User size={28} />
      )}
      <span
        className="absolute bottom-0 right-0 w-6 h-6 rounded-full flex items-center justify-center"
        style={{ background: "var(--teal-deep)", color: "#fff", border: "2px solid var(--navy)" }}
      >
        {busy ? <Loader2 size={11} className="animate-spin" /> : <Camera size={11} />}
      </span>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFile}
      />
    </button>
  );
}
