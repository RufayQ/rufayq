/**
 * AvatarEditorSheet — in-app image editor for profile photo.
 * Mirrors the Scanner's canvas-based pipeline (rotate, zoom, brightness,
 * contrast, grayscale) and exports a 512×512 circular-safe square JPEG.
 *
 * The crop is a centered square fit; the user adjusts via zoom + drag.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { X, Check, RotateCw, Loader2, RefreshCw, Sun, Contrast as ContrastIcon, Droplet } from "lucide-react";

interface Props {
  src: string;
  busy?: boolean;
  onCancel: () => void;
  onSave: (jpeg: Blob) => void;
}

const SIZE = 512; // export resolution
const VIEWPORT = 280; // on-screen preview size (square)

const AvatarEditorSheet = ({ src, busy, onCancel, onSave }: Props) => {
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [rotation, setRotation] = useState(0); // 0/90/180/270
  const [zoom, setZoom] = useState(1); // 1..3
  const [offset, setOffset] = useState({ x: 0, y: 0 }); // px in viewport space
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [grayscale, setGrayscale] = useState(0);
  const [dragStart, setDragStart] = useState<{ x: number; y: number; ox: number; oy: number } | null>(null);

  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => { imgRef.current = img; setLoaded(true); };
    img.src = src;
  }, [src]);

  const reset = () => {
    setRotation(0); setZoom(1); setOffset({ x: 0, y: 0 });
    setBrightness(100); setContrast(100); setGrayscale(0);
  };

  const onPointerDown = (e: React.PointerEvent) => {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setDragStart({ x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y });
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragStart) return;
    setOffset({ x: dragStart.ox + (e.clientX - dragStart.x), y: dragStart.oy + (e.clientY - dragStart.y) });
  };
  const onPointerUp = () => setDragStart(null);

  const filterCss = useMemo(
    () => `brightness(${brightness}%) contrast(${contrast}%) grayscale(${grayscale}%)`,
    [brightness, contrast, grayscale]
  );

  // Compute the image's displayed scale inside the viewport (contain) before zoom.
  const baseScale = useMemo(() => {
    if (!imgRef.current) return 1;
    const rotated = rotation % 180 !== 0;
    const w = rotated ? imgRef.current.naturalHeight : imgRef.current.naturalWidth;
    const h = rotated ? imgRef.current.naturalWidth : imgRef.current.naturalHeight;
    return VIEWPORT / Math.min(w, h); // cover the square viewport
  }, [rotation, loaded]);

  const exportJpeg = async (): Promise<Blob> => {
    const img = imgRef.current!;
    const canvas = document.createElement("canvas");
    canvas.width = SIZE; canvas.height = SIZE;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#0F172A"; ctx.fillRect(0, 0, SIZE, SIZE);

    // The displayed image dimensions in viewport pixels:
    const rotated = rotation % 180 !== 0;
    const dispNatW = rotated ? img.naturalHeight : img.naturalWidth;
    const dispNatH = rotated ? img.naturalWidth : img.naturalHeight;
    const effScale = baseScale * zoom; // viewport px per natural px

    // Center of viewport in canvas coordinates is SIZE/2.
    // Place image so its center aligns with viewport center + offset.
    const ratio = SIZE / VIEWPORT;
    ctx.save();
    ctx.translate(SIZE / 2 + offset.x * ratio, SIZE / 2 + offset.y * ratio);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.filter = filterCss;
    const drawW = dispNatW * effScale * ratio;
    const drawH = dispNatH * effScale * ratio;
    // Counter-rotate drawing dims: after rotation, the natural w/h apply.
    const naturalDrawW = rotated ? drawH : drawW;
    const naturalDrawH = rotated ? drawW : drawH;
    ctx.drawImage(img, -naturalDrawW / 2, -naturalDrawH / 2, naturalDrawW, naturalDrawH);
    ctx.restore();

    return await new Promise<Blob>((res) =>
      canvas.toBlob((b) => res(b!), "image/jpeg", 0.9)
    );
  };

  const save = async () => {
    const blob = await exportJpeg();
    onSave(blob);
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center" style={{ background: "rgba(6,16,26,0.78)" }}>
      <div className="w-full max-w-[420px] rounded-t-3xl pt-3 pb-5 px-5 max-h-[96vh] overflow-y-auto" style={{ background: "var(--off-white)" }}>
        <div className="mx-auto w-10 h-1 rounded-full mb-3" style={{ background: "var(--gray-light)" }} />
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="font-display text-[18px]" style={{ color: "var(--navy)" }}>Edit photo</p>
            <p className="font-arabic text-[11px]" dir="rtl" style={{ color: "var(--gray)" }}>تعديل الصورة</p>
          </div>
          <button onClick={onCancel} className="w-8 h-8 rounded-full flex items-center justify-center btn-press" style={{ background: "var(--gray-light)" }}>
            <X size={16} />
          </button>
        </div>

        {/* Preview */}
        <div className="flex justify-center mb-4">
          <div
            className="relative overflow-hidden touch-none select-none"
            style={{ width: VIEWPORT, height: VIEWPORT, background: "#0F172A", borderRadius: 16 }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          >
            {loaded && imgRef.current && (
              <img
                src={src}
                alt="Edit preview"
                draggable={false}
                style={{
                  position: "absolute",
                  left: "50%", top: "50%",
                  transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px)) rotate(${rotation}deg) scale(${baseScale * zoom})`,
                  transformOrigin: "center center",
                  filter: filterCss,
                  maxWidth: "none",
                  width: imgRef.current.naturalWidth,
                  height: imgRef.current.naturalHeight,
                  pointerEvents: "none",
                }}
              />
            )}
            {/* Circular crop overlay */}
            <div className="absolute inset-0 pointer-events-none" style={{
              boxShadow: `0 0 0 9999px rgba(15,23,42,0.55) inset`,
              borderRadius: "50%",
            }} />
            <div className="absolute inset-0 pointer-events-none" style={{
              border: "2px dashed rgba(197,150,90,0.85)", borderRadius: "50%",
            }} />
          </div>
        </div>

        <p className="text-center text-[10px] mb-3" style={{ color: "var(--gray)" }}>
          Drag to position · اسحب للتموضع
        </p>

        {/* Tool buttons */}
        <div className="grid grid-cols-2 gap-2 mb-3">
          <button onClick={() => setRotation((r) => (r + 90) % 360)} className="flex items-center justify-center gap-1.5 py-2 rounded-lg btn-press text-[12px] font-semibold" style={{ background: "var(--white)", border: "1px solid var(--gray-light)", color: "var(--navy)" }}>
            <RotateCw size={13} /> Rotate
          </button>
          <button onClick={reset} className="flex items-center justify-center gap-1.5 py-2 rounded-lg btn-press text-[12px] font-semibold" style={{ background: "var(--white)", border: "1px solid var(--gray-light)", color: "var(--navy)" }}>
            <RefreshCw size={13} /> Reset
          </button>
        </div>

        {/* Sliders */}
        <Slider icon={<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5"/></svg>} label="ZOOM" labelAr="تكبير" value={zoom} min={1} max={3} step={0.05} onChange={setZoom} format={(v) => `${v.toFixed(2)}×`} />
        <Slider icon={<Sun size={13} />} label="BRIGHTNESS" labelAr="سطوع" value={brightness} min={50} max={150} step={1} onChange={setBrightness} format={(v) => `${v}%`} />
        <Slider icon={<ContrastIcon size={13} />} label="CONTRAST" labelAr="تباين" value={contrast} min={50} max={150} step={1} onChange={setContrast} format={(v) => `${v}%`} />
        <Slider icon={<Droplet size={13} />} label="B&W" labelAr="أبيض وأسود" value={grayscale} min={0} max={100} step={1} onChange={setGrayscale} format={(v) => `${v}%`} />

        <button onClick={save} disabled={!loaded || busy} className="w-full py-3 rounded-xl text-white font-semibold flex items-center justify-center gap-2 btn-press mt-3 shadow-lg" style={{ background: "var(--teal-deep)", opacity: (!loaded || busy) ? 0.7 : 1 }}>
          {busy ? <Loader2 className="animate-spin" size={16} /> : <Check size={16} />}
          Save photo · حفظ الصورة
        </button>
      </div>
    </div>
  );
};

const Slider = ({ icon, label, labelAr, value, min, max, step, onChange, format }: {
  icon: React.ReactNode; label: string; labelAr: string; value: number;
  min: number; max: number; step: number; onChange: (v: number) => void; format: (v: number) => string;
}) => (
  <div className="mb-2.5">
    <div className="flex items-center justify-between mb-1 px-1">
      <div className="flex items-center gap-1.5" style={{ color: "var(--teal-deep)" }}>
        {icon}
        <p className="font-mono text-[9px] tracking-widest" style={{ color: "var(--gold)" }}>{label}</p>
        <p className="font-arabic text-[10px]" dir="rtl" style={{ color: "var(--gray)" }}>{labelAr}</p>
      </div>
      <p className="font-mono text-[10px] font-bold" style={{ color: "var(--navy)" }}>{format(value)}</p>
    </div>
    <input
      type="range" min={min} max={max} step={step} value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="w-full"
      style={{ accentColor: "var(--teal-deep)" }}
    />
  </div>
);

export default AvatarEditorSheet;
