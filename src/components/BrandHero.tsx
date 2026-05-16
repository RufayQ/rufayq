import RufayQLogo from "@/components/RufayQLogo";
import RufayQWordmark from "@/components/RufayQWordmark";

interface BrandHeroProps {
  /** Compact = inline use on a CTA. Full = standalone hero spot. */
  size?: "compact" | "full";
  /** Show the Arabic رُفَيِّق monogram beneath the wordmark. */
  showArabic?: boolean;
}

/**
 * Enriched brand presentation used on the splash / onboarding hero. Replaces
 * the lone "boxed" logo mark with a layered identity:
 *   - soft animated gold halo
 *   - circular gradient ring
 *   - logo mark
 *   - bilingual wordmark (English serif + Arabic naskh)
 *   - tagline pill
 *
 * Animations are pure CSS so we keep the no-framer-motion constraint.
 */
export default function BrandHero({ size = "full", showArabic = true }: BrandHeroProps) {
  const logoSize = size === "full" ? 80 : 64;
  const ringSize = size === "full" ? 156 : 124;

  return (
    <div className="flex flex-col items-center select-none">
      {/* Mark + halo */}
      <div className="relative flex items-center justify-center" style={{ width: ringSize, height: ringSize }}>
        {/* Outer pulsing halo */}
        <div
          className="absolute inset-0 rounded-full animate-brand-pulse"
          style={{
            background: "radial-gradient(circle at center, rgba(197,150,90,0.35) 0%, rgba(197,150,90,0.05) 55%, transparent 75%)",
            filter: "blur(2px)",
          }}
          aria-hidden
        />
        {/* Conic gradient ring */}
        <div
          className="absolute rounded-full animate-brand-spin"
          style={{
            inset: 8,
            background: "conic-gradient(from 140deg, rgba(197,150,90,0.0) 0deg, rgba(197,150,90,0.7) 90deg, rgba(15,181,201,0.6) 180deg, rgba(197,150,90,0.0) 270deg, rgba(197,150,90,0.0) 360deg)",
            WebkitMask: "radial-gradient(circle, transparent 58%, #000 60%)",
            mask: "radial-gradient(circle, transparent 58%, #000 60%)",
            opacity: 0.85,
          }}
          aria-hidden
        />
        {/* Inner disk with mark */}
        <div
          className="relative rounded-full flex items-center justify-center"
          style={{
            width: ringSize - 36,
            height: ringSize - 36,
            background: "radial-gradient(circle at 30% 25%, rgba(255,255,255,0.06), rgba(0,0,0,0.18) 70%)",
            border: "1px solid rgba(197,150,90,0.35)",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08), 0 18px 40px rgba(0,0,0,0.45)",
          }}
        >
          <RufayQLogo size={logoSize} variant="gold" />
        </div>
      </div>

      {/* Wordmark */}
      <div className="mt-5">
        <RufayQWordmark size={size === "full" ? "lg" : "md"} variant="light" />
      </div>

      {/* Arabic monogram — culturally anchors the brand */}
      {showArabic && (
        <p
          className="font-arabic mt-1 tracking-wide"
          dir="rtl"
          style={{
            fontSize: size === "full" ? 22 : 18,
            color: "var(--gold-light)",
            fontWeight: 600,
            letterSpacing: "0.02em",
          }}
        >
          رُفَيِّق
        </p>
      )}

      {/* Tagline pill */}
      <div
        className="mt-3 px-3 py-1 rounded-full text-[10px] font-mono uppercase tracking-[0.18em] flex items-center gap-2"
        style={{
          color: "rgba(255,255,255,0.7)",
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(197,150,90,0.25)",
        }}
      >
        <span
          className="w-1 h-1 rounded-full"
          style={{ background: "var(--gold)", boxShadow: "0 0 8px var(--gold)" }}
          aria-hidden
        />
        Companion for every journey
      </div>
    </div>
  );
}
