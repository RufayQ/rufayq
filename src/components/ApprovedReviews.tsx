import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { StarIcon } from "@/components/HeroIcons";

interface Review {
  id: string;
  reviewer_name: string | null;
  reviewer_country: string | null;
  rating: number;
  notes: string | null;
}

interface Props {
  variant?: "dark";
  limit?: number;
}

const ApprovedReviews = ({ limit = 6 }: Props) => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const BG2 = "#0B1A28", BORDER = "rgba(197,150,90,0.12)";
  const TEXT = "#E8ECF0", MUTED = "rgba(232,236,240,0.55)", GOLD = "#C5965A";

  useEffect(() => {
    supabase.from("app_reviews").select("id,reviewer_name,reviewer_country,rating,notes")
      .eq("approved", true).order("created_at", { ascending: false }).limit(limit)
      .then(({ data }) => { if (data) setReviews(data as Review[]); });
  }, [limit]);

  if (reviews.length === 0) return null;

  return (
    <div className="grid md:grid-cols-3 gap-4 mt-6">
      {reviews.map((r) => (
        <div key={r.id} className="rounded-2xl p-6" style={{ background: BG2, border: `1px solid ${BORDER}` }}>
          <div className="flex gap-1 mb-3">
            {[...Array(r.rating)].map((_, j) => (
              <span key={j} style={{ color: GOLD }}>
                <StarIcon size={12} color={GOLD} style={{ fill: GOLD }} />
              </span>
            ))}
          </div>
          <p className="text-sm leading-relaxed mb-4 italic" style={{ color: TEXT }}>"{r.notes}"</p>
          <p className="text-xs font-semibold" style={{ color: TEXT }}>{r.reviewer_name || "RufayQ user"}</p>
          {r.reviewer_country && <p className="text-[11px] mt-0.5" style={{ color: MUTED }}>{r.reviewer_country}</p>}
        </div>
      ))}
    </div>
  );
};

export default ApprovedReviews;
