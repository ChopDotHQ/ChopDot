interface SkeletonProps {
  className?: string;
  width?: string | number;
  height?: string | number;
}

export function Skeleton({ className = "", width, height }: SkeletonProps) {
  const style: React.CSSProperties = {};
  if (width) style.width = typeof width === 'number' ? `${width}px` : width;
  if (height) style.height = typeof height === 'number' ? `${height}px` : height;

  return (
    <div
      className={`bg-muted/20 rounded-[var(--r-lg)] animate-pulse ${className}`}
      style={style}
    />
  );
}

interface SkeletonCardProps {
  className?: string;
}

export function SkeletonCard({ className = "" }: SkeletonCardProps) {
  return (
    <div className={`card p-4 space-y-3 ${className}`}>
      <Skeleton height={20} width="60%" />
      <Skeleton height={16} width="40%" />
      <div className="flex items-center justify-between pt-2">
        <Skeleton height={16} width="30%" />
        <Skeleton height={24} width="35%" />
      </div>
    </div>
  );
}

interface SkeletonListProps {
  count?: number;
  className?: string;
}

export function SkeletonList({ count = 3, className = "" }: SkeletonListProps) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: count }).map((_, idx) => (
        <SkeletonCard key={idx} />
      ))}
    </div>
  );
}

interface SkeletonRowProps {
  className?: string;
}

export function SkeletonRow({ className = "" }: SkeletonRowProps) {
  return (
    <div className={`flex items-center gap-3 p-3 card ${className}`}>
      <Skeleton width={40} height={40} className="rounded-full flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton height={16} width="40%" />
        <Skeleton height={12} width="60%" />
      </div>
      <Skeleton height={20} width={60} className="flex-shrink-0" />
    </div>
  );
}

