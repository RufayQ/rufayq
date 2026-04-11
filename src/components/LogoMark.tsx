const LogoMark = ({ size = 40 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
    <circle cx="20" cy="20" r="16" stroke="#004D5B" strokeWidth="2.5" fill="none" />
    {/* ECG tail */}
    <polyline
      points="32,24 36,24 38,18 40,30 42,20 44,24 48,24"
      stroke="#C5965A"
      strokeWidth="2"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* Two gold dots for ق */}
    <circle cx="17" cy="22" r="2" fill="#C5965A" />
    <circle cx="23" cy="22" r="2" fill="#C5965A" />
  </svg>
);

export default LogoMark;
