import { useEffect, useRef, useState } from "react";
import { RotateCw, ZoomIn, ZoomOut, Check, X } from "lucide-react";

interface Props {
  /** Source image (data URL or http URL) */
  src: string;
  onCancel: () => void;
  onSave: (dataUrl: string) => void;
}

/**
 * Lightweight crop/rotate/zoom editor for a custom QR upload.
 * Output: a 512×512 PNG data URL containing the framed selection.
 */
const QrImageEditor = ({ src, onCancel, onSave }: Props) => {
  const wrapRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgNatural, setImgNatural] = useState({ w: 0, h: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotate, setRotate] = useState(0); // 0/90/180/270
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [drag, setDrag] = useState<{ x: number; y: number; px: number; py: number } | null>(null);
  const FRAME = 260; // visible square crop frame size in CSS px

  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      imgRef.current = img;
      setImgNatural({ w: img.naturalWidth, h: img.naturalHeight });
      setImgLoaded(true);
    };
    img.src = src;
  }, [src]);

  const onPointerDown = (e: React.PointerEvent) => {
    (e.target as Element).setPointerCapture?.(e.pointerId);
    setDrag({ x: e.clientX, y: e.clientY, px: pan.x, py: pan.y });
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag) return;
    setPan({ x: drag.px + (e.clientX - drag.x), y: drag.py + (e.clientY - drag.y) });
  };
  const onPointerUp = () => setDrag(null);

  const handleSave = () => {
    if (!imgRef.current) return;
    const OUT = 512;
    const canvas = document.createElement("canvas");
    canvas.width = OUT;
    canvas.height = OUT;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, OUT, OUT);

    // The on-screen preview: image is drawn centered in FRAME, scaled by zoom, then translated by pan, then rotated.
    // Recreate identical math on a 512x512 canvas (scale factor OUT/FRAME).
    const k = OUT / FRAME;
    ctx.translate(OUT / 2 + pan.x * k, OUT / 2 + pan.y * k);
    ctx.rotate((rotate * Math.PI) / 180);
    const baseScale = Math.max(FRAME / imgNatural.w, FRAME / imgNatural.h); // cover
    const s = baseScale * zoom * k;
    ctx.drawImage(
      imgRef.current,
      -(imgNatural.w * s) / 2,
      -(imgNatural.h * s) / 2,
      imgNatural.w * s,
      imgNatural.h * s,
    );
    onSave(canvas.toDataURL("image/png", 0.95));
  };

  const baseScale = imgNatural.w
    ? Math.max(FRAME / imgNatural.w, FRAME / imgNatural.h)
    : 1;
  const dispW = imgNatural.w * baseScale * zoom;
  const dispH = imgNatural.h * baseScale * zoom;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      style={{ background: "rgba(15,23,42,0.75)" }}
      onClick={onCancel}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[360px] rounded-3xl p-4"
        style={{ background: "var(--white)", boxShadow: "0 12px 40px rgba(0,0,0,0.35)" }}
      >
        <div className="mb-3 flex items-center justify-between">
          <p className="text-[14px] font-bold" style={{ color: "var(--navy)" }}>
            Adjust QR image
          </p>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Cancel"
            className="flex h-7 w-7 items-center justify-center rounded-full"
            style={{ background: "var(--off-white)", color: "var(--navy)" }}
          >
            <X size={14} />
          </button>
        </div>

        <div
          ref={wrapRef}
          className="relative mx-auto overflow-hidden rounded-2xl select-none touch-none"
          style={{
            width: FRAME,
            height: FRAME,
            background: "#0f1f3a",
            cursor: drag ? "grabbing" : "grab",
          }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          {imgLoaded && (
            <img
              src={src}
              alt="Editing QR"
              draggable={false}
              style={{
                position: "absolute",
                left: "50%",
                top: "50%",
                width: dispW,
                height: dispH,
                transform: `translate(calc(-50% + ${pan.x}px), calc(-50% + ${pan.y}px)) rotate(${rotate}deg)`,
                transformOrigin: "center center",
                pointerEvents: "none",
              }}
            />
          )}
          {/* Frame overlay */}
          <div
            className="pointer-events-none absolute inset-0 rounded-2xl"
            style={{ boxShadow: "inset 0 0 0 2px rgba(197,150,90,0.9)" }}
          />
        </div>

        <div className="mt-4 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setZoom((z) => Math.max(0.5, +(z - 0.1).toFixed(2)))}
            aria-label="Zoom out"
            className="flex h-9 w-9 items-center justify-center rounded-full btn-press"
            style={{ background: "var(--off-white)", color: "var(--navy)" }}
          >
            <ZoomOut size={14} />
          </button>
          <input
            type="range"
            min={0.5}
            max={3}
            step={0.01}
            value={zoom}
            onChange={(e) => setZoom(parseFloat(e.target.value))}
            className="flex-1"
            aria-label="Zoom"
          />
          <button
            type="button"
            onClick={() => setZoom((z) => Math.min(3, +(z + 0.1).toFixed(2)))}
            aria-label="Zoom in"
            className="flex h-9 w-9 items-center justify-center rounded-full btn-press"
            style={{ background: "var(--off-white)", color: "var(--navy)" }}
          >
            <ZoomIn size={14} />
          </button>
          <button
            type="button"
            onClick={() => setRotate((r) => (r + 90) % 360)}
            aria-label="Rotate 90 degrees"
            className="flex h-9 w-9 items-center justify-center rounded-full btn-press"
            style={{ background: "var(--off-white)", color: "var(--navy)" }}
          >
            <RotateCw size={14} />
          </button>
        </div>

        <p className="mt-2 text-center text-[10px]" style={{ color: "var(--gray)" }}>
          Drag to move · pinch / slider to zoom · rotate · سحب وتكبير وتدوير
        </p>

        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-full py-2.5 text-[12px] font-bold btn-press"
            style={{ background: "var(--off-white)", color: "var(--navy)" }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex-[1.4] inline-flex items-center justify-center gap-1.5 rounded-full py-2.5 text-[13px] font-bold btn-press"
            style={{ background: "var(--teal-deep)", color: "var(--white)" }}
          >
            <Check size={14} /> Use this image
          </button>
        </div>
      </div>
    </div>
  );
};

export default QrImageEditor;
