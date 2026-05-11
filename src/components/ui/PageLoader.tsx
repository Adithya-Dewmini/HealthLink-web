import Skeleton from "./Skeleton";

type PageLoaderProps = {
  className?: string;
};

export default function PageLoader({ className = "" }: PageLoaderProps) {
  return (
    <div
      className={`flex min-h-[320px] items-center justify-center rounded-3xl border border-gray-200 bg-white p-10 shadow-sm ${className}`.trim()}
    >
      <div className="flex flex-col items-center gap-6">
        <div className="relative flex items-center justify-center">
          <Skeleton width={88} height={88} className="rounded-full" />
          <div className="absolute inset-3 rounded-full border border-white/70" />
          <Skeleton width={28} height={28} className="absolute rounded-full" />
        </div>
        <div className="space-y-3">
          <Skeleton width={180} height={14} className="rounded-full" />
          <Skeleton width={120} height={14} className="mx-auto rounded-full" />
        </div>
      </div>
    </div>
  );
}
