interface RufayQLogoProps {
  size?: number;
  variant?: "light" | "dark" | "gold";
}

const RufayQLogo = ({ size = 32, variant = "dark" }: RufayQLogoProps) => {
  const strokeColor = variant === "light" ? "#fff" : variant === "gold" ? "#C5965A" : "#004D5B";
  const scale = size / 100;

  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      {/* Q circle body */}
      <circle cx="36" cy="38" r="26" stroke={strokeColor} strokeWidth="7" strokeLinecap="round" fill="none" />
      {/* ECG heartbeat tail — always gold */}
      <polyline
        points="55,52 63,52 67,36 72,68 77,52 86,52 96,52"
        stroke="#C5965A"
        strokeWidth="7"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {/* Two Qaf dots ق — always gold */}
      <circle cx="27" cy="57" r="4.5" fill="#C5965A" />
      <circle cx="40" cy="57" r="4.5" fill="#C5965A" />
    </svg>
  );
};

export default RufayQLogo;
