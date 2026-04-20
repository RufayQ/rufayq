/**
 * Inline SVG icon set for the Landing hero + nav.
 * Avoids loading the 47 kB lucide-react chunk on the critical path.
 * Each icon is a tiny stateless component matching lucide's API (size, color).
 */
import { memo, type SVGProps } from "react";

interface IconProps extends Omit<SVGProps<SVGSVGElement>, "size"> {
  size?: number;
  color?: string;
}

const base = (size = 16, color = "currentColor", extra: SVGProps<SVGSVGElement> = {}) => ({
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: color,
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  ...extra,
});

export const ArrowRightIcon = memo(({ size, color, ...rest }: IconProps) => (
  <svg {...base(size, color, rest)} aria-hidden="true">
    <path d="M5 12h14" /><path d="m12 5 7 7-7 7" />
  </svg>
));

export const SparklesIcon = memo(({ size, color, ...rest }: IconProps) => (
  <svg {...base(size, color, rest)} aria-hidden="true">
    <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z" />
  </svg>
));

export const LockIcon = memo(({ size, color, ...rest }: IconProps) => (
  <svg {...base(size, color, rest)} aria-hidden="true">
    <rect width="18" height="11" x="3" y="11" rx="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
));

export const GlobeIcon = memo(({ size, color, ...rest }: IconProps) => (
  <svg {...base(size, color, rest)} aria-hidden="true">
    <circle cx="12" cy="12" r="10" />
    <path d="M2 12h20" />
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
  </svg>
));

export const HeartIcon = memo(({ size, color, ...rest }: IconProps) => (
  <svg {...base(size, color, rest)} aria-hidden="true">
    <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.29 1.51 4.04 3 5.5l7 7Z" />
  </svg>
));

export const MenuIcon = memo(({ size, color, ...rest }: IconProps) => (
  <svg {...base(size, color, rest)} aria-hidden="true">
    <path d="M4 6h16" /><path d="M4 12h16" /><path d="M4 18h16" />
  </svg>
));

export const XIcon = memo(({ size, color, ...rest }: IconProps) => (
  <svg {...base(size, color, rest)} aria-hidden="true">
    <path d="M18 6 6 18" /><path d="m6 6 12 12" />
  </svg>
));

export const ChevronDownIcon = memo(({ size, color, ...rest }: IconProps) => (
  <svg {...base(size, color, rest)} aria-hidden="true">
    <path d="m6 9 6 6 6-6" />
  </svg>
));
