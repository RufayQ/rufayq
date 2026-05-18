/**
 * Skeleton shown in the Journey screen tab content while the Supabase auth
 * session is still being restored. Mirrors the rough shape of the helicopter
 * timeline header, phase badges, and a couple of milestone rows so the layout
 * doesn't jump once data loads.
 */
import SkeletonBar from "@/components/ui/skeleton-bar";

const JourneyContentSkeleton = () => {
  return (
    <div className="px-4 pt-4 space-y-4" data-testid="journey-content-skeleton" aria-busy="true">
      {/* Helicopter timeline rail */}
      <div
        className="rounded-2xl p-4"
        style={{ background: "var(--white)", border: "1px solid var(--gray-light)" }}
      >
        <SkeletonBar width={120} height={10} />
        <div className="mt-3 flex items-center gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-2">
              <SkeletonBar width={36} height={36} rounded={18} />
              <SkeletonBar width={48} height={8} />
            </div>
          ))}
        </div>
      </div>

      {/* Phase badges */}
      <div className="flex gap-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="flex-1 rounded-xl py-2.5 flex flex-col items-center gap-1"
            style={{ background: "var(--white)", border: "1px solid var(--gray-light)" }}
          >
            <SkeletonBar width={8} height={8} rounded={4} />
            <SkeletonBar width={56} height={9} />
            <SkeletonBar width={40} height={8} />
          </div>
        ))}
      </div>

      {/* Milestone rows */}
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl p-3 flex items-center gap-3"
            style={{ background: "var(--white)", border: "1px solid var(--gray-light)" }}
          >
            <SkeletonBar width={36} height={36} rounded={10} />
            <div className="flex-1 space-y-1.5">
              <SkeletonBar width={140} height={10} />
              <SkeletonBar width={90} height={8} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default JourneyContentSkeleton;
