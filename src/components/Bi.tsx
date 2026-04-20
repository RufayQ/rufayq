// Tiny inline bilingual helper. Renders "<en> · <ar>" but lets the
// global language switcher hide whichever side is off.
// Usage:  <Bi en="Sign in" ar="تسجيل الدخول" />
//         <Bi en="Back" ar="رجوع" sep="·" />
import { ReactNode } from "react";

interface BiProps {
  en: ReactNode;
  ar: string;
  sep?: string;
  className?: string;
  arClassName?: string;
}

const Bi = ({ en, ar, sep = "·", className, arClassName }: BiProps) => (
  <span className={className}>
    <span>{en}</span>
    <span className={`font-arabic ${arClassName ?? ""}`} dir="rtl">
      {" "}{sep} {ar}
    </span>
  </span>
);

export default Bi;
