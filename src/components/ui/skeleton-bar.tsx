/**
 * Lightweight skeleton primitive used across Home / Journey / Records while
 * Supabase auth is still restoring. Theme-aware (uses CSS vars), no extra deps.
 */
import { CSSProperties } from "react";

interface Props {
  width?: number | string;
  height?: number | string;
  rounded?: number | string;
  className?: string;
  style?: CSSProperties;
}

const SkeletonBar = ({ width = "100%", height = 12, rounded = 6, className = "", style }: Props) => (
  <span
    aria-hidden="true"
    className={`block animate-pulse ${className}`}
    style={{
      width,
      height,
      borderRadius: rounded,
      background: "linear-gradient(90deg, var(--gray-light), var(--off-white), var(--gray-light))",
      backgroundSize: "200% 100%",
      ...style,
    }}
  />
);

export default SkeletonBar;
