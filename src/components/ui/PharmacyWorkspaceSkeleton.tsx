import Skeleton from "./Skeleton";

type PharmacyWorkspaceSkeletonProps = {
  heroLabel: string;
  heroTitle: string;
  heroCopy: string;
  cardLabel: string;
};

export default function PharmacyWorkspaceSkeleton({
  cardLabel,
  heroCopy,
  heroLabel,
  heroTitle,
}: PharmacyWorkspaceSkeletonProps) {
  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-[34px] border border-white/70 bg-[#0F172A] p-8 shadow-[0_40px_120px_-55px_rgba(15,23,42,0.85)]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(56,189,248,0.34),_transparent_30%),radial-gradient(circle_at_bottom_left,_rgba(16,185,129,0.2),_transparent_28%)]" />
        <div className="relative grid gap-8 xl:grid-cols-[1.45fr_1fr]">
          <div className="space-y-4">
            <p className="text-xs font-bold uppercase tracking-[0.38em] text-sky-200/80">{heroLabel}</p>
            <h2 className="max-w-2xl text-4xl font-semibold tracking-tight text-white">{heroTitle}</h2>
            <p className="max-w-2xl text-sm leading-7 text-slate-300">{heroCopy}</p>
            <div className="grid gap-4 sm:grid-cols-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="rounded-[24px] border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
                  <Skeleton width={84} height={10} className="rounded-full bg-white/15" />
                  <Skeleton width={70} height={28} className="mt-4 rounded-2xl bg-white/15" />
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-4">
            {Array.from({ length: 2 }).map((_, index) => (
              <div
                key={index}
                className="rounded-[28px] border border-white/10 bg-white/5 p-5 backdrop-blur-sm"
              >
                <Skeleton width={110} height={10} className="rounded-full bg-white/15" />
                <Skeleton width={64} height={30} className="mt-4 rounded-2xl bg-white/15" />
                <Skeleton width="82%" height={12} className="mt-4 rounded-full bg-white/15" />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="rounded-[30px] border border-white/60 bg-white p-5 shadow-[0_24px_80px_-42px_rgba(15,23,42,0.45)]"
          >
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-3">
                <Skeleton width={96} height={11} className="rounded-full" />
                <Skeleton width={84} height={30} className="rounded-2xl" />
                <Skeleton width={120} height={12} className="rounded-full" />
              </div>
              <Skeleton width={50} height={50} className="rounded-2xl" />
            </div>
          </div>
        ))}
      </section>

      <section className="rounded-[30px] border border-white/70 bg-white/85 p-6 shadow-[0_24px_80px_-42px_rgba(15,23,42,0.32)] backdrop-blur-sm">
        <div className="flex flex-col gap-4 border-b border-slate-100 pb-5 md:flex-row md:items-center md:justify-between">
          <div className="space-y-3">
            <Skeleton width={170} height={18} className="rounded-full" />
            <Skeleton width={260} height={12} className="rounded-full" />
          </div>
          <Skeleton width={320} height={48} className="rounded-[20px]" />
        </div>

        <div className="mt-6 grid gap-4 xl:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="rounded-[28px] border border-slate-200/70 bg-white/90 p-5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-3">
                  <Skeleton width={160} height={20} className="rounded-full" />
                  <Skeleton width={200} height={12} className="rounded-full" />
                </div>
                <Skeleton width={88} height={28} className="rounded-full" />
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <Skeleton height={82} className="rounded-[20px]" />
                <Skeleton height={82} className="rounded-[20px]" />
              </div>
              <div className="mt-4 grid gap-2 md:grid-cols-2">
                {Array.from({ length: 4 }).map((__, metaIndex) => (
                  <Skeleton key={metaIndex} width="92%" height={12} className="rounded-full" />
                ))}
              </div>
              <div className="mt-5 text-xs font-semibold uppercase tracking-[0.24em] text-slate-300">
                {cardLabel}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
