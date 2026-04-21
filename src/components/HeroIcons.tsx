/**
 * Inline SVG icon set for the Landing hero + nav.
 * Avoids loading the 47 kB lucide-react chunk on the critical path.
 * Each icon is a tiny stateless component matching lucide's API (size, color).
 *
 * Wrapped in forwardRef so React.memo composition works cleanly under
 * react-helmet-async + Suspense (which probe children for refs and warn
 * loudly when a memoised plain function component is given one).
 */
import { forwardRef, memo, type SVGProps, type Ref } from "react";

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

const make = (paths: React.ReactNode) =>
  memo(
    forwardRef<SVGSVGElement, IconProps>(({ size, color, ...rest }, ref) => (
      <svg ref={ref as Ref<SVGSVGElement>} {...base(size, color, rest)} aria-hidden="true">
        {paths}
      </svg>
    )),
  );

export const ArrowRightIcon = make(<><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></>);
export const SparklesIcon = make(<path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z" />);
export const LockIcon = make(<><rect width="18" height="11" x="3" y="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></>);
export const GlobeIcon = make(<><circle cx="12" cy="12" r="10" /><path d="M2 12h20" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></>);
export const HeartIcon = make(<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.29 1.51 4.04 3 5.5l7 7Z" />);
export const MenuIcon = make(<><path d="M4 6h16" /><path d="M4 12h16" /><path d="M4 18h16" /></>);
export const XIcon = make(<><path d="M18 6 6 18" /><path d="m6 6 12 12" /></>);
export const ChevronDownIcon = make(<path d="m6 9 6 6 6-6" />);

/* Icons used by below-the-fold landing — keeps lucide out of the marketing bundle. */
export const PlaneIcon = make(<path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z" />);
export const PillIcon = make(<><path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z" /><path d="m8.5 8.5 7 7" /></>);
export const FileTextIcon = make(<><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" /><polyline points="14 2 14 8 20 8" /><line x1="16" x2="8" y1="13" y2="13" /><line x1="16" x2="8" y1="17" y2="17" /><line x1="10" x2="8" y1="9" y2="9" /></>);
export const MessageCircleIcon = make(<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />);
export const StarIcon = make(<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />);
export const CheckIcon = make(<polyline points="20 6 9 17 4 12" />);
export const SendIcon = make(<><path d="m22 2-7 20-4-9-9-4Z" /><path d="M22 2 11 13" /></>);
