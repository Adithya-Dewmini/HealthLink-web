import Skeleton from "./Skeleton";

type TableSkeletonProps = {
  rows?: number;
  columns?: number;
  className?: string;
};

export default function TableSkeleton({
  rows = 6,
  columns = 6,
  className = "",
}: TableSkeletonProps) {
  return (
    <div className={`overflow-x-auto rounded-2xl border border-gray-200 bg-white ${className}`.trim()}>
      <div className="min-w-full">
        <div className="grid gap-4 border-b border-gray-200 bg-[#F8FBFD] px-4 py-4" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
          {Array.from({ length: columns }).map((_, index) => (
            <Skeleton key={`header-${index}`} height={12} className="rounded-full" />
          ))}
        </div>
        <div className="divide-y divide-gray-100">
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <div
              key={`row-${rowIndex}`}
              className="grid items-center gap-4 px-4 py-4"
              style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
            >
              {Array.from({ length: columns }).map((__, columnIndex) => (
                <Skeleton
                  key={`cell-${rowIndex}-${columnIndex}`}
                  height={columnIndex === 0 ? 16 : 14}
                  className={columnIndex === columns - 1 ? "ml-auto w-20" : columnIndex === 0 ? "w-28" : "w-full"}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
