import { useState } from "react";
import { Check, Link2, Loader2, Unlink } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useLinkedProviders } from "@/hooks/useLinkedProviders";
import { clearGoogleLinkage } from "@/lib/auth/googleLink";

const GoogleGlyph = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden>
    <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.6 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.3-.4-3.5z" />
    <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.4 6.3 14.7z" />
    <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35 26.7 36 24 36c-5.3 0-9.7-3.4-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
    <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.1 5.6l6.2 5.2c-.4.4 6.6-4.8 6.6-14.8 0-1.3-.1-2.3-.4-3.5z" />
  </svg>
);

const ConnectedAccountsCard = () => {
  const { loading, google, identityCount, refresh } = useLinkedProviders();
  const [busy, setBusy] = useState<"link" | "unlink" | null>(null);

  const handleLink = async () => {
    setBusy("link");
    try {
      const isAr =
        typeof window !== "undefined" && window.location.pathname.startsWith("/ar");
      const redirectTo = `${window.location.origin}${isAr ? "/ar/app" : "/app"}?profile=1`;
      const { error } = await supabase.auth.linkIdentity({
        provider: "google",
        options: { redirectTo },
      });
      if (error) {
        const msg = error.message || "";
        if (msg.toLowerCase().includes("manual linking")) {
          toast.error("Account linking is disabled · ربط الحسابات معطّل");
        } else if (msg.toLowerCase().includes("already")) {
          toast.error(
            "This Google account is linked to another profile · حساب Google مرتبط بحساب آخر"
          );
        } else {
          toast.error(`${msg} · تعذّر الربط`);
        }
        setBusy(null);
        return;
      }
      // Browser will redirect to Google; clear busy in case it doesn't.
      setTimeout(() => setBusy(null), 4000);
    } catch (e: any) {
      toast.error(`${e?.message || "Link failed"} · تعذّر الربط`);
      setBusy(null);
    }
  };

  const handleUnlink = async () => {
    if (!google.linked) return;
    if (identityCount <= 1) {
      toast.error(
        "Add another sign-in method before unlinking Google · أضف وسيلة تسجيل دخول أخرى أولاً"
      );
      return;
    }
    setBusy("unlink");
    try {
      const { data, error: idErr } = await supabase.auth.getUserIdentities();
      if (idErr || !data?.identities) throw idErr || new Error("No identities");
      const g = data.identities.find((i: any) => i.provider === "google");
      if (!g) throw new Error("Google identity not found");
      const { error } = await supabase.auth.unlinkIdentity(g as any);
      if (error) throw error;
      const { data: u } = await supabase.auth.getUser();
      if (u?.user) await clearGoogleLinkage(u.user.id);
      await refresh();
      toast.success("Google account unlinked · تم فصل حساب Google");
    } catch (e: any) {
      toast.error(`${e?.message || "Unlink failed"} · تعذّر الفصل`);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="mt-4 mx-4">
      <p
        className="font-mono text-[10px] tracking-widest mb-1 px-1"
        style={{ color: "var(--gold)" }}
      >
        CONNECTED ACCOUNTS · الحسابات المرتبطة
      </p>
      <div
        className="rounded-xl overflow-hidden"
        style={{ background: "var(--white)", border: "1px solid var(--gray-light)" }}
      >
        <div className="flex items-center justify-between py-3 px-4">
          <div className="flex items-center gap-3 min-w-0">
            <GoogleGlyph />
            <div className="text-left min-w-0">
              <p className="text-[13px] truncate" style={{ color: "var(--navy)" }}>
                Google
              </p>
              <p
                className="text-[11px] truncate"
                style={{ color: "var(--gray)" }}
                dir="ltr"
              >
                {loading
                  ? "Loading…"
                  : google.linked
                  ? google.email || "Linked"
                  : "Not connected · غير مرتبط"}
              </p>
            </div>
          </div>

          {google.linked ? (
            <div className="flex items-center gap-2">
              <span
                className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full"
                style={{ background: "var(--teal-light)", color: "var(--teal-deep)" }}
              >
                <Check size={10} /> Linked
              </span>
              <button
                onClick={handleUnlink}
                disabled={busy !== null}
                className="text-[11px] font-semibold px-2.5 py-1 rounded-md btn-press inline-flex items-center gap-1"
                style={{
                  border: "1px solid var(--error)",
                  color: "var(--error)",
                  opacity: busy ? 0.6 : 1,
                }}
              >
                {busy === "unlink" ? (
                  <Loader2 size={11} className="animate-spin" />
                ) : (
                  <Unlink size={11} />
                )}
                Unlink
              </button>
            </div>
          ) : (
            <button
              onClick={handleLink}
              disabled={busy !== null || loading}
              className="text-[11px] font-semibold px-3 py-1.5 rounded-md btn-press inline-flex items-center gap-1"
              style={{
                background: "var(--teal-deep)",
                color: "white",
                opacity: busy || loading ? 0.6 : 1,
              }}
            >
              {busy === "link" ? (
                <Loader2 size={11} className="animate-spin" />
              ) : (
                <Link2 size={11} />
              )}
              Connect · ربط
            </button>
          )}
        </div>
      </div>
      <p
        className="text-[10px] mt-1.5 px-1"
        style={{ color: "var(--gray)" }}
      >
        Sign in faster by linking your Google account · سجّل دخولك بسرعة بربط حساب Google
      </p>
    </div>
  );
};

export default ConnectedAccountsCard;
