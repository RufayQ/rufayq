import { useEffect, useRef, useState } from "react";
import { Camera, Loader2, User } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getDeviceId } from "@/hooks/useDeviceId";
import AvatarEditorSheet from "@/components/profile/AvatarEditorSheet";

/**
 * Upload (or replace) the current user's profile photo.
 * - If signed in, store under `${auth.uid()}/avatar.jpg` (auth-RLS path).
 * - Otherwise, store under `${device_id}/avatar.jpg` (device-id RLS path).
 * - Picked images first open the in-app AvatarEditorSheet for crop/rotate/zoom
 *   using the same canvas-based image tooling as the Scanner.
 */
export default function AvatarUploader() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const deviceId = getDeviceId();
      const { data } = await supabase
        .from("profiles")
        .select("avatar_url, google_picture_url")
        .eq("device_id", deviceId)
        .maybeSingle();
      if (!cancelled) setUrl(data?.avatar_url ?? data?.google_picture_url ?? null);
    })();
    return () => { cancelled = true; };
  }, []);

  const handlePick = () => inputRef.current?.click();

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please pick an image · اختر صورة");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setEditing(String(reader.result || ""));
    reader.readAsDataURL(file);
  };

  const handleSaveEdited = async (blob: Blob) => {
    setBusy(true);
    try {
      const deviceId = getDeviceId();
      const { data: { session } } = await supabase.auth.getSession();
      const folder = session?.user?.id || deviceId;
      const path = `${folder}/avatar.jpg`;
      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(path, blob, { upsert: true, contentType: "image/jpeg" });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
      const publicUrl = `${pub.publicUrl}?t=${Date.now()}`;
      const { error: profErr } = await supabase
        .from("profiles")
        .upsert({ device_id: deviceId, avatar_url: publicUrl }, { onConflict: "device_id" });
      if (profErr) throw profErr;
      setUrl(publicUrl);
      toast.success("Photo updated · تم تحديث الصورة");
      setEditing(null);
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message ? `Upload failed · ${err.message}` : "Upload failed · فشل الرفع");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
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
      {editing && (
        <AvatarEditorSheet
          src={editing}
          busy={busy}
          onCancel={() => setEditing(null)}
          onSave={handleSaveEdited}
        />
      )}
    </>
  );
}
