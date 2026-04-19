import { forwardRef, useState } from "react";
import { Star, Send } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getDeviceId } from "@/hooks/useDeviceId";

interface Props {
  variant?: "light" | "dark";
  onSubmitted?: () => void;
}

const ReviewForm = forwardRef<HTMLDivElement, Props>(({ variant = "light", onSubmitted }, ref) => {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [name, setName] = useState("");
  const [country, setCountry] = useState("Saudi Arabia");
  const [notes, setNotes] = useState("");
  const [advice, setAdvice] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const isDark = variant === "dark";
  const cardBg = isDark ? "#0B1A28" : "var(--white)";
  const inputBg = isDark ? "rgba(255,255,255,0.04)" : "var(--off-white)";
  const text = isDark ? "#E8ECF0" : "var(--navy)";
  const muted = isDark ? "rgba(232,236,240,0.55)" : "var(--gray)";
  const border = isDark ? "rgba(197,150,90,0.18)" : "var(--gray-light)";
  const GOLD = "#C5965A";

  const handleSubmit = async () => {
    if (rating === 0) { toast.error("Please select a rating · يرجى اختيار التقييم"); return; }
    if (!notes.trim()) { toast.error("Please share your experience"); return; }
    setSubmitting(true);
    const { error } = await supabase.from("app_reviews").insert({
      device_id: getDeviceId(),
      reviewer_name: name.trim() || "Anonymous",
      reviewer_country: country.trim() || null,
      rating,
      notes: notes.trim(),
      advice: advice.trim() || null,
      approved: false,
    });
    setSubmitting(false);
    if (error) { toast.error("Failed to submit review"); return; }
    toast.success("Thank you! Review sent for moderation · شكراً لك");
    setRating(0); setNotes(""); setAdvice(""); setName("");
    onSubmitted?.();
  };

  return (
    <div ref={ref} className="rounded-2xl p-5 space-y-4" style={{ background: cardBg, border: `1px solid ${border}` }}>
      <div>
        <p className="font-mono text-[10px] tracking-widest mb-1" style={{ color: GOLD }}>YOUR RATING · تقييمك</p>
        <div className="flex gap-1.5">
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} onMouseEnter={() => setHover(n)} onMouseLeave={() => setHover(0)} onClick={() => setRating(n)}
              className="transition-transform hover:scale-110">
              <Star size={28} fill={(hover || rating) >= n ? GOLD : "transparent"} color={GOLD} strokeWidth={1.5} />
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-[10px] mb-1" style={{ color: muted }}>Name (optional)</p>
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} placeholder="Mohammed A."
            className="w-full px-3 py-2 rounded-lg text-[13px] outline-none" style={{ background: inputBg, border: `1px solid ${border}`, color: text }} />
        </div>
        <div>
          <p className="text-[10px] mb-1" style={{ color: muted }}>Country</p>
          <input value={country} onChange={(e) => setCountry(e.target.value)} maxLength={40} placeholder="Saudi Arabia"
            className="w-full px-3 py-2 rounded-lg text-[13px] outline-none" style={{ background: inputBg, border: `1px solid ${border}`, color: text }} />
        </div>
      </div>

      <div>
        <p className="text-[10px] mb-1" style={{ color: muted }}>Your experience · تجربتك *</p>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={500} rows={3} placeholder="What worked well? What helped you most?"
          className="w-full px-3 py-2 rounded-lg text-[13px] outline-none resize-none" style={{ background: inputBg, border: `1px solid ${border}`, color: text }} />
        <p className="text-[9px] mt-0.5 text-right" style={{ color: muted }}>{notes.length}/500</p>
      </div>

      <div>
        <p className="text-[10px] mb-1" style={{ color: muted }}>Advice for improvement · اقتراحاتك</p>
        <textarea value={advice} onChange={(e) => setAdvice(e.target.value)} maxLength={300} rows={2} placeholder="Anything we could do better?"
          className="w-full px-3 py-2 rounded-lg text-[13px] outline-none resize-none" style={{ background: inputBg, border: `1px solid ${border}`, color: text }} />
      </div>

      <button onClick={handleSubmit} disabled={submitting}
        className="w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 btn-press"
        style={{ background: GOLD, color: "#06101A", opacity: submitting ? 0.6 : 1 }}>
        <Send size={14} /> {submitting ? "Sending…" : "Submit review · إرسال"}
      </button>
    </div>
  );
});
ReviewForm.displayName = "ReviewForm";

export default ReviewForm;
