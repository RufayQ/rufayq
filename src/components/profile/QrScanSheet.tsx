/**
 * QrScanSheet — camera-based QR scanner. On a successful scan that decodes
 * to a RufayQ payload, hands the payload to the parent so it can prompt the
 * user to classify the new connection (family / provider / friend).
 */
import { useEffect, useRef, useState } from "react";
import { X, ClipboardPaste, Camera } from "lucide-react";
import { Html5Qrcode } from "html5-qrcode";
import { toast } from "sonner";
import { decodeQrPayload, type QrPayload } from "@/lib/connections/connectionsStore";

interface Props {
  onClose: () => void;
  onDetected: (payload: QrPayload) => void;
}

const REGION_ID = "rufayq-qr-region";

const QrScanSheet = ({ onClose, onDetected }: Props) => {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [status, setStatus] = useState<"starting" | "running" | "error">("starting");
  const [manual, setManual] = useState("");
  const handledRef = useRef(false);

  useEffect(() => {
    const inst = new Html5Qrcode(REGION_ID, { verbose: false });
    scannerRef.current = inst;
    const start = async () => {
      try {
        await inst.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 220, height: 220 } },
          (decoded) => {
            if (handledRef.current) return;
            const payload = decodeQrPayload(decoded);
            if (!payload) return; // ignore unrelated codes silently
            handledRef.current = true;
            inst.stop().catch(() => {});
            onDetected(payload);
          },
          () => {/* scan error per frame — ignore */},
        );
        setStatus("running");
      } catch (e) {
        console.warn("[qr] camera start failed", e);
        setStatus("error");
      }
    };
    void start();
    return () => {
      inst.stop().catch(() => {}).finally(() => inst.clear().catch(() => {}));
    };
  }, [onDetected]);

  const handleManual = () => {
    const payload = decodeQrPayload(manual);
    if (!payload) {
      toast.error("That doesn't look like a RufayQ code · رمز غير صالح");
      return;
    }
    handledRef.current = true;
    onDetected(payload);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: "rgba(6,16,26,0.65)" }} onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[420px] rounded-t-3xl pb-6 pt-3 px-5"
        style={{ background: "var(--white)", boxShadow: "0 -20px 60px rgba(0,0,0,0.3)" }}
      >
        <div className="mx-auto w-10 h-1 rounded-full mb-3" style={{ background: "var(--gray-light)" }} />
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="font-display text-[17px]" style={{ color: "var(--navy)" }}>Scan QR · مسح رمز</p>
            <p className="font-arabic text-[11px]" dir="rtl" style={{ color: "var(--gray)" }}>
              امسح رمز جهة اتصال لإضافتها
            </p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center btn-press" style={{ background: "var(--gray-light)" }}>
            <X size={16} />
          </button>
        </div>

        <div className="relative rounded-2xl overflow-hidden mx-auto" style={{ width: "100%", aspectRatio: "1/1", background: "#06101A" }}>
          <div id={REGION_ID} style={{ width: "100%", height: "100%" }} />
          {status !== "running" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white text-center px-6">
              <Camera size={28} className="mb-2 opacity-70" />
              {status === "starting" && <p className="text-[12px] opacity-80">Requesting camera…<br/><span className="font-arabic" dir="rtl">جاري طلب الكاميرا…</span></p>}
              {status === "error" && <p className="text-[12px] opacity-80">Camera unavailable.<br/><span className="font-arabic" dir="rtl">الكاميرا غير متاحة. الصق الرابط أدناه.</span></p>}
            </div>
          )}
          {/* viewfinder corners */}
          <div className="pointer-events-none absolute inset-6 rounded-xl" style={{ boxShadow: "0 0 0 2px rgba(197,150,90,0.6) inset" }} />
        </div>

        <div className="mt-3">
          <p className="font-mono text-[9px] tracking-widest mb-1" style={{ color: "var(--gray)" }}>OR PASTE LINK · أو الصق الرابط</p>
          <div className="flex gap-2">
            <input
              value={manual}
              onChange={(e) => setManual(e.target.value)}
              placeholder="rufayq://connect?d=…"
              className="flex-1 px-3 py-2 rounded-lg text-[12px] outline-none"
              style={{ background: "var(--off-white)", border: "1px solid var(--gray-light)", color: "var(--navy)" }}
            />
            <button onClick={handleManual} className="px-3 py-2 rounded-lg flex items-center gap-1 text-[12px] font-semibold text-white btn-press" style={{ background: "var(--teal-deep)" }}>
              <ClipboardPaste size={13} /> Add
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QrScanSheet;
