import { useEffect, useRef, useState } from "react";
import { Check, Copy, Link2, Loader2, Mail, Phone, Shield, Unlink } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useLinkedProviders, type ProviderState } from "@/hooks/useLinkedProviders";
import { clearGoogleLinkage, clearProviderLinkage } from "@/lib/auth/googleLink";
import { PROVIDERS, PROVIDER_ORDER, formatLinkedDate, maskPhone, type ProviderId } from "@/lib/auth/providers";
import UnlinkConfirmDialog from "@/components/profile/UnlinkConfirmDialog";

const GoogleGlyph = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden>
    <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.6 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.3-.4-3.5z" />
    <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.4 6.3 14.7z" />
    <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35 26.7 36 24 36c-5.3 0-9.7-3.4-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
    <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.1 5.6l6.2 5.2c-.4.4 6.6-4.8 6.6-14.8 0-1.3-.1-2.3-.4-3.5z" />
  </svg>
);

const AppleGlyph = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden fill="#0a0a0a">
    <path d="M16.365 1.43c0 1.14-.46 2.21-1.21 3.01-.81.85-2.13 1.51-3.21 1.42-.13-1.12.42-2.27 1.13-3.01.79-.85 2.21-1.49 3.29-1.42zM20.5 17.5c-.55 1.27-.81 1.83-1.52 2.95-.99 1.56-2.39 3.5-4.13 3.52-1.55.02-1.94-1.01-4.04-1-2.1.01-2.54 1.02-4.09 1-1.74-.02-3.07-1.77-4.06-3.33-2.77-4.36-3.06-9.48-1.35-12.2 1.21-1.93 3.13-3.06 4.92-3.06 1.83 0 2.98 1 4.49 1 1.47 0 2.36-1 4.48-1 1.6 0 3.3.87 4.51 2.38-3.97 2.18-3.32 7.85.79 9.74z" />
  </svg>
);

const providerGlyph = (id: ProviderId) => {
  if (id === "google") return <GoogleGlyph />;
  if (id === "apple") return <AppleGlyph />;
  if (id === "email") return <Mail size={18} style={{ color: "var(--teal-deep)" }} />;
  if (id === "phone") return <Phone size={18} style={{ color: "var(--teal-deep)" }} />;
  return null;
};

const ConnectedAccountsCard = () => {
  const { loading, providers, identityCount, refresh } = useLinkedProviders();
  const [busyProvider, setBusyProvider] = useState<ProviderId | null>(null);
  const [busyAction, setBusyAction] = useState<"link" | "unlink" | null>(null);
  const [confirm, setConfirm] = useState<ProviderState | null>(null);
  const [confirmBusy, setConfirmBusy] = useState(false);
  const isAr = typeof window !== "undefined" && window.location.pathname.startsWith("/ar");

  // ---- Auto-refresh after OAuth redirect (?profile=1) and on focus/visibility
  const pollRef = useRef<number | null>(null);
  useEffect(() => {
    let cancelled = false;
    const onFocus = () => { if (!cancelled) refresh(); };
    const onVis = () => { if (document.visibilityState === "visible" && !cancelled) refresh(); };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVis);

    let cameFromOauth = false;
    try {
      cameFromOauth = new URLSearchParams(window.location.search).get("profile") === "1";
    } catch { /* noop */ }

    if (cameFromOauth) {
      // Force-refresh round-trip + short poll window to catch identity propagation lag.
      (async () => {
        await refresh();
        try { await supabase.auth.getSession(); } catch { /* noop */ }
        await refresh();
      })();
      let ticks = 0;
      pollRef.current = window.setInterval(() => {
        ticks += 1;
        refresh();
        if (ticks >= 3 && pollRef.current) {
          window.clearInterval(pollRef.current);
          pollRef.current = null;
        }
      }, 4000) as unknown as number;
    }

    return () => {
      cancelled = true;
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVis);
      if (pollRef.current) window.clearInterval(pollRef.current);
    };
  }, [refresh]);

  const handleLink = async (id: ProviderId) => {
    setBusyProvider(id);
    setBusyAction("link");
    try {
      const redirectTo = `${window.location.origin}${isAr ? "/ar/app" : "/app"}?profile=1`;
      const { error } = await supabase.auth.linkIdentity({
        provider: id as any,
        options: { redirectTo },
      });
      if (error) {
        const msg = (error.message || "").toLowerCase();
        if (msg.includes("manual linking")) {
          toast.error("Account linking is disabled · ربط الحسابات معطّل");
        } else if (msg.includes("not enabled") || msg.includes("provider")) {
          toast.error(
            id === "apple"
              ? "Apple sign-in isn't enabled yet · لم يُفعَّل تسجيل الدخول عبر Apple"
              : `${PROVIDERS[id].labelEn} isn't enabled yet · غير مُفعَّل`
          );
        } else if (msg.includes("already")) {
          toast.error(
            `This ${PROVIDERS[id].labelEn} account is linked to another profile · مرتبط بحساب آخر`
          );
        } else {
          toast.error(`${error.message} · تعذّر الربط`);
        }
        setBusyProvider(null);
        setBusyAction(null);
        return;
      }
      // Browser will redirect; clear busy as a fallback.
      setTimeout(() => { setBusyProvider(null); setBusyAction(null); }, 4000);
    } catch (e: any) {
      toast.error(`${e?.message || "Link failed"} · تعذّر الربط`);
      setBusyProvider(null);
      setBusyAction(null);
    }
  };

  const requestUnlink = (p: ProviderState) => {
    if (identityCount <= 1) {
      toast.error(
        `Add another sign-in method before unlinking ${PROVIDERS[p.id].labelEn} · أضف وسيلة تسجيل دخول أخرى أولاً`
      );
      return;
    }
    setConfirm(p);
  };

  const performUnlink = async () => {
    if (!confirm) return;
    const p = confirm;
    setConfirmBusy(true);
    setBusyProvider(p.id);
    setBusyAction("unlink");
    try {
      const { data, error: idErr } = await supabase.auth.getUserIdentities();
      if (idErr || !data?.identities) throw idErr || new Error("No identities");
      const ident = data.identities.find((i: any) => i.provider === p.id);
      if (!ident) throw new Error(`${p.id} identity not found`);
      const { error } = await supabase.auth.unlinkIdentity(ident as any);
      if (error) throw error;
      const { data: u } = await supabase.auth.getUser();
      if (u?.user) {
        if (p.id === "google") await clearGoogleLinkage(u.user.id);
        else await clearProviderLinkage(u.user.id, p.id);
      }
      await refresh();
      toast.success(`${PROVIDERS[p.id].labelEn} unlinked · تم فصل ${PROVIDERS[p.id].labelAr}`);
      setConfirm(null);
    } catch (e: any) {
      toast.error(`${e?.message || "Unlink failed"} · تعذّر الفصل`);
    } finally {
      setConfirmBusy(false);
      setBusyProvider(null);
      setBusyAction(null);
    }
  };

  const copyEmail = async (email: string) => {
    try {
      await navigator.clipboard.writeText(email);
      toast.success("Email copied · تم نسخ البريد");
    } catch {
      toast.error("Copy failed · تعذّر النسخ");
    }
  };

  const orderedProviders = PROVIDER_ORDER
    .map((id) => providers.find((p) => p.id === id))
    .filter((p): p is ProviderState => !!p);

  return (
    <div className="mt-4 mx-4">
      <p
        className="font-mono text-[10px] tracking-widest mb-1 px-1"
        style={{ color: "var(--gold)" }}
      >
        CONNECTED SIGN-IN METHODS · طرق تسجيل الدخول المرتبطة
      </p>
      <div
        className="rounded-xl overflow-hidden divide-y"
        style={{ background: "var(--white)", border: "1px solid var(--gray-light)", borderColor: "var(--gray-light)" }}
      >
        {orderedProviders.map((p) => {
          const meta = PROVIDERS[p.id];
          const detail = p.id === "phone" ? maskPhone(p.phone) : p.email;
          const busyHere = busyProvider === p.id;
          return (
            <div key={p.id} className="px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <div className="mt-0.5 shrink-0">{providerGlyph(p.id)}</div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-[13px] font-semibold" style={{ color: "var(--navy)" }}>
                        {meta.labelEn}
                      </p>
                      {p.linked ? (
                        <span
                          className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full"
                          style={{
                            background: meta.primary ? "var(--gold-soft, rgba(197,150,90,0.15))" : "var(--teal-light)",
                            color: meta.primary ? "var(--gold)" : "var(--teal-deep)",
                          }}
                        >
                          {meta.primary ? <Shield size={10} /> : <Check size={10} />}
                          {meta.primary ? "Primary" : "Linked"}
                        </span>
                      ) : (
                        <span
                          className="inline-flex items-center text-[10px] font-mono px-2 py-0.5 rounded-full"
                          style={{ background: "var(--gray-light)", color: "var(--gray)" }}
                        >
                          Not connected
                        </span>
                      )}
                    </div>

                    {p.linked && detail && (
                      <button
                        onClick={() => p.email && copyEmail(p.email)}
                        disabled={!p.email}
                        className="mt-1 text-left inline-flex items-center gap-1.5 max-w-full"
                        title={p.email ? "Copy" : undefined}
                      >
                        <span
                          className="text-[13px] font-mono break-all"
                          style={{ color: "var(--navy)" }}
                          dir="ltr"
                        >
                          {detail}
                        </span>
                        {p.email && (
                          <Copy size={11} style={{ color: "var(--gray)", flexShrink: 0 }} />
                        )}
                      </button>
                    )}

                    {p.linked && (p.linkedAt || p.scopes.length > 0) && (
                      <p
                        className="text-[11px] mt-0.5"
                        style={{ color: "var(--gray)" }}
                      >
                        {p.linkedAt
                          ? `Connected ${formatLinkedDate(p.linkedAt, isAr) || "recently"}`
                          : "Connected recently"}
                        {p.scopes.length > 0 && ` · ${p.scopes.join(" + ")}`}
                      </p>
                    )}

                    {!p.linked && meta.canConnect && (
                      <p className="text-[11px] mt-0.5" style={{ color: "var(--gray)" }}>
                        Sign in faster with {meta.labelEn}
                      </p>
                    )}
                  </div>
                </div>

                <div className="shrink-0">
                  {p.linked && meta.canUnlink ? (
                    <button
                      onClick={() => requestUnlink(p)}
                      disabled={busyAction !== null || loading}
                      className="text-[11px] font-semibold px-2.5 py-1 rounded-md btn-press inline-flex items-center gap-1"
                      style={{
                        border: "1px solid var(--error)",
                        color: "var(--error)",
                        opacity: busyAction ? 0.6 : 1,
                      }}
                    >
                      {busyHere && busyAction === "unlink" ? (
                        <Loader2 size={11} className="animate-spin" />
                      ) : (
                        <Unlink size={11} />
                      )}
                      Unlink
                    </button>
                  ) : !p.linked && meta.canConnect ? (
                    <button
                      onClick={() => handleLink(p.id)}
                      disabled={busyAction !== null || loading}
                      className="text-[11px] font-semibold px-3 py-1.5 rounded-md btn-press inline-flex items-center gap-1"
                      style={{
                        background: "var(--teal-deep)",
                        color: "white",
                        opacity: busyAction || loading ? 0.6 : 1,
                      }}
                    >
                      {busyHere && busyAction === "link" ? (
                        <Loader2 size={11} className="animate-spin" />
                      ) : (
                        <Link2 size={11} />
                      )}
                      Connect · ربط
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <p className="text-[10px] mt-1.5 px-1" style={{ color: "var(--gray)" }}>
        Manage how you sign in to RufayQ · أدر طرق تسجيل دخولك
      </p>

      <UnlinkConfirmDialog
        open={!!confirm}
        providerLabel={confirm ? PROVIDERS[confirm.id].labelEn : ""}
        providerLabelAr={confirm ? PROVIDERS[confirm.id].labelAr : ""}
        email={confirm?.email}
        busy={confirmBusy}
        onCancel={() => !confirmBusy && setConfirm(null)}
        onConfirm={performUnlink}
      />
    </div>
  );
};

export default ConnectedAccountsCard;
