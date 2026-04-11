const Wordmark = ({ size = "text-xl" }: { size?: string }) => (
  <span className={`font-display font-light ${size}`}>
    <span style={{ color: "#004D5B" }}>Rufay</span>
    <span className="font-bold" style={{ color: "#C5965A" }}>Q</span>
  </span>
);

export default Wordmark;
