import Skeleton from "./Skeleton";

export default function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-[#DCEAF3] bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl space-y-4">
            <Skeleton width={150} height={12} className="rounded-full" />
            <Skeleton width="55%" height={42} className="rounded-2xl" />
            <Skeleton width="90%" height={16} className="rounded-full" />
            <Skeleton width="72%" height={16} className="rounded-full" />
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="rounded-2xl border border-gray-100 bg-[#F8FBFD] p-4">
                <Skeleton width={70} height={10} className="rounded-full" />
                <Skeleton width={56} height={28} className="mt-4 rounded-2xl" />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={index} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1 space-y-3">
                <Skeleton width="60%" height={12} className="rounded-full" />
                <Skeleton width="45%" height={28} className="rounded-2xl" />
              </div>
              <Skeleton width={56} height={56} className="rounded-full" />
            </div>
          </div>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[2fr_1fr]">
        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center justify-between">
            <div className="space-y-3">
              <Skeleton width={150} height={18} className="rounded-full" />
              <Skeleton width={220} height={12} className="rounded-full" />
            </div>
            <Skeleton width={96} height={18} className="rounded-full" />
          </div>
          <Skeleton height={300} className="rounded-3xl" />
        </div>

        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center gap-3">
            <Skeleton width={20} height={20} className="rounded-full" />
            <Skeleton width={120} height={18} className="rounded-full" />
          </div>
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="flex items-center justify-between rounded-2xl border border-gray-100 p-4">
                <Skeleton width="68%" height={14} className="rounded-full" />
                <Skeleton width={36} height={28} className="rounded-full" />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-6 flex items-center justify-between">
          <div className="space-y-3">
            <Skeleton width={180} height={18} className="rounded-full" />
            <Skeleton width={280} height={12} className="rounded-full" />
          </div>
          <Skeleton width={110} height={18} className="rounded-full" />
        </div>
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="flex flex-col gap-3 rounded-2xl border border-gray-100 px-4 py-4 md:flex-row md:items-center md:justify-between">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Skeleton width={120} height={24} className="rounded-full" />
                  <Skeleton width={150} height={24} className="rounded-full" />
                </div>
                <Skeleton width={260} height={12} className="rounded-full" />
              </div>
              <Skeleton width={96} height={12} className="rounded-full" />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
