/**
 * Skeleton shown in the Records screen body while the auth session is still
 * being restored. Mirrors the discharge-pack hero card and a list of document
 * rows so the layout doesn't jump once real data arrives.
 */
import SkeletonBar from "@/components/ui/skeleton-bar";

const RecordsContentSkeleton = () => {
  return (
    <div className="space-y-3" data-testid="records-content-skeleton" aria-busy="true">
      {/* Featured discharge pack */}
      <div
        className="rounded-2xl p-5 space-y-3"
        style={{ background: "linear-gradient(135deg, var(--header-dark-from), var(--header-dark-alt))" }}
      >
        <SkeletonBar width={140} height={10} />
        <SkeletonBar width={200} height={18} />
        <SkeletonBar width={120} height={10} />
        <div className="flex gap-2">
          <SkeletonBar width={70} height={18} rounded={10} />
          <SkeletonBar width={80} height={18} rounded={10} />
          <SkeletonBar width={60} height={18} rounded={10} />
        </div>
        <div className="grid grid-cols-2 gap-2 pt-2">
          <SkeletonBar height={36} rounded={12} />
          <SkeletonBar height={36} rounded={12} />
        </div>
      </div>

      {/* Document rows */}
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="rounded-xl p-3.5 flex items-center gap-3"
          style={{ background: "var(--white)", border: "1px solid var(--gray-light)" }}
        >
          <SkeletonBar width={44} height={44} rounded={12} />
          <div className="flex-1 space-y-1.5">
            <SkeletonBar width={160} height={11} />
            <SkeletonBar width={100} height={9} />
            <SkeletonBar width={120} height={9} />
          </div>
        </div>
      ))}
    </div>
  );
};

export default RecordsContentSkeleton;
