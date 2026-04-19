import { forwardRef } from "react";

interface RufayQLogoProps {
  size?: number;
  variant?: "light" | "dark" | "gold";
}

const RufayQLogo = forwardRef<SVGSVGElement, RufayQLogoProps>(
  ({ size = 32, variant = "dark" }, ref) => {
    const strokeColor = variant === "light" ? "#fff" : variant === "gold" ? "#C5965A" : "#004D5B";
    return (
      <svg ref={ref} width={size} height={size} viewBox="0 0 100 100" fill="none">
        <circle cx="36" cy="38" r="26" stroke={strokeColor} strokeWidth="7" strokeLinecap="round" fill="none" />
        <polyline
          points="55,52 63,52 67,36 72,68 77,52 86,52 96,52"
          stroke="#C5965A"
          strokeWidth="7"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <circle cx="27" cy="57" r="4.5" fill="#C5965A" />
        <circle cx="40" cy="57" r="4.5" fill="#C5965A" />
      </svg>
    );
  }
);
RufayQLogo.displayName = "RufayQLogo";

export default RufayQLogo;
