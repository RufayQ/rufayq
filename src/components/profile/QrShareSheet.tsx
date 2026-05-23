/**
 * QrShareSheet — bottom sheet showing the user's QR code with a copy/share
 * fallback (deep link) for systems without a camera.
 */
import { useEffect, useMemo, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { X, Copy, Share2 } from "lucide-react";
import { toast } from "sonner";
import { encodeQrPayload, type QrPayload } from "@/lib/connections/connectionsStore";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { getDeviceId } from "@/hooks/useDeviceId";

interface Props { onClose: () => void; }

const QrShareSheet = ({ onClose }: Props) => {
  const { showEn, showAr } = useLanguage();
  const [payload, setPayload] = useState<QrPayload | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const u = session?.user;
      const meta = (u?.user_metadata || {}) as Record<string, string>;
      const handle = u?.id || getDeviceId();
      const name = (meta.full_name || meta.name || u?.email?.split("@")[0] || "RufayQ user").trim();
      const nameAr = (meta.full_name_ar || "").trim() || undefined;
      const phone = u?.phone || undefined;
      const email = u?.email || undefined;
      setPayload({ v: 1, app: "rufayq", handle, name, nameAr, phone, email, iat: Date.now() });
    })();
  }, []);

  const encoded = useMemo(() => (payload ? encodeQrPayload(payload) : ""), [payload]);

  const copy = () => {
    if (!encoded) return;
    navigator.clipboard?.writeText(encoded);
    toast.success(showAr && !showEn ? "تم نسخ الرابط" : "Link copied · تم النسخ");
  };

  const share = async () => {
    if (!encoded) return;
    const title = "RufayQ Connect · رُفَيِّق";
    try {
      if (navigator.share) {
        await navigator.share({ title, text: `${payload?.name} on RufayQ`, url: encoded });
        return;
      }
    } catch { /* user cancelled */ }
    copy();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: "rgba(6,16,26,0.55)" }} onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[420px] rounded-t-3xl pb-6 pt-3 px-5"
        style={{ background: "var(--white)", boxShadow: "0 -20px 60px rgba(0,0,0,0.25)" }}
      >
        <div className="mx-auto w-10 h-1 rounded-full mb-3" style={{ background: "var(--gray-light)" }} />
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="font-display text-[17px]" style={{ color: "var(--navy)" }}>My QR · رمزي</p>
            <p className="font-arabic text-[11px]" dir="rtl" style={{ color: "var(--gray)" }}>
              شارك رمزك لإضافتك إلى جهات اتصال أحد المستخدمين
            </p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center btn-press" style={{ background: "var(--gray-light)" }}>
            <X size={16} />
          </button>
        </div>

        <div className="rounded-2xl p-5 flex flex-col items-center" style={{ background: "var(--off-white)", border: "1px solid var(--gray-light)" }}>
          {encoded ? (
            <div className="p-3 rounded-xl" style={{ background: "#fff" }}>
              <QRCodeSVG value={encoded} size={208} level="M" bgColor="#ffffff" fgColor="#06101A" includeMargin={false} />
            </div>
          ) : (
            <div className="w-[224px] h-[224px] rounded-xl animate-pulse" style={{ background: "var(--gray-light)" }} />
          )}
          <p className="mt-3 text-[13px] font-semibold" style={{ color: "var(--navy)" }}>{payload?.name || "—"}</p>
          {payload?.nameAr && <p className="font-arabic text-[11px]" dir="rtl" style={{ color: "var(--gray)" }}>{payload.nameAr}</p>}
          <p className="font-mono text-[9px] tracking-widest mt-1" style={{ color: "var(--gold)" }}>
            RUFAYQ • CONNECT
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 mt-3">
          <button onClick={copy} className="py-3 rounded-xl flex items-center justify-center gap-2 text-[13px] font-semibold btn-press" style={{ background: "var(--off-white)", border: "1px solid var(--gray-light)", color: "var(--navy)" }}>
            <Copy size={14} /> Copy link
          </button>
          <button onClick={share} className="py-3 rounded-xl flex items-center justify-center gap-2 text-[13px] font-semibold btn-press text-white" style={{ background: "var(--teal-deep)" }}>
            <Share2 size={14} /> Share
          </button>
        </div>
      </div>
    </div>
  );
};

export default QrShareSheet;
