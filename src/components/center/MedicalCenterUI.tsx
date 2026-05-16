import type { PropsWithChildren, ReactNode } from "react";
import { AlertCircle, Building2, type LucideIcon } from "lucide-react";

export function MedicalCenterPageHeader({
  eyebrow = "Medical center panel",
  title,
  subtitle,
  action,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 rounded-[28px] border border-[#DDEFE8] bg-white p-6 shadow-[0_24px_80px_-52px_rgba(6,78,59,0.28)] lg:flex-row lg:items-end lg:justify-between">
      <div className="min-w-0">
        <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#047857]">{eyebrow}</p>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight text-[#064E3B]">{title}</h2>
        {subtitle ? <p className="mt-3 max-w-3xl text-sm leading-7 text-[#4B6358]">{subtitle}</p> : null}
      </div>
      {action ? <div className="flex shrink-0 flex-wrap gap-3">{action}</div> : null}
    </div>
  );
}

export function MedicalCenterStatCard({
  icon: Icon,
  label,
  value,
  detail,
  tone = "primary",
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
  detail: string;
  tone?: "primary" | "soft" | "accent" | "warning";
}) {
  const toneClasses = {
    primary: "border-[#B7E4D6] bg-[linear-gradient(160deg,#ECFDF5_0%,#FFFFFF_100%)] text-[#047857]",
    soft: "border-[#DDEFE8] bg-[#F8FAFC] text-[#0F766E]",
    accent: "border-[#BFECD8] bg-[linear-gradient(160deg,#D1FAE5_0%,#FFFFFF_100%)] text-[#10B981]",
    warning: "border-[#FDE7BE] bg-[linear-gradient(160deg,#FFF7E8_0%,#FFFFFF_100%)] text-[#B45309]",
  } as const;

  return (
    <section className="rounded-[24px] border bg-white p-5 shadow-[0_18px_60px_-44px_rgba(6,78,59,0.3)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#6A8579]">{label}</p>
          <p className="mt-3 text-[2rem] font-semibold tracking-tight text-[#064E3B]">{value}</p>
          <p className="mt-2 text-sm leading-6 text-[#5D766B]">{detail}</p>
        </div>
        <div className={`flex h-12 w-12 items-center justify-center rounded-2xl border ${toneClasses[tone]}`}>
          <Icon size={18} />
        </div>
      </div>
    </section>
  );
}

export function MedicalCenterStatusBadge({
  status,
}: {
  status: string | null | undefined;
}) {
  const normalized = String(status || "UNKNOWN").trim().toUpperCase();
  const tone =
    normalized === "ACTIVE" || normalized === "APPROVED" || normalized === "LIVE" || normalized === "COMPLETED"
      ? "border-[#B7E4D6] bg-[#ECFDF5] text-[#047857]"
      : normalized === "PENDING" || normalized === "PAUSED" || normalized === "WAITING" || normalized === "CHECKED_IN"
        ? "border-[#FDE7BE] bg-[#FFF7E8] text-[#B45309]"
        : normalized === "REJECTED" || normalized === "INACTIVE" || normalized === "DISABLED"
          ? "border-[#F8C9C9] bg-[#FEF2F2] text-[#DC2626]"
          : "border-[#DDE7E1] bg-[#F8FAFC] text-[#51695D]";

  return (
    <span className={`inline-flex min-h-8 items-center rounded-full border px-3 text-xs font-bold uppercase tracking-[0.16em] ${tone}`}>
      {normalized.split("_").join(" ")}
    </span>
  );
}

export function MedicalCenterEmptyState({
  title,
  description,
  action,
  icon: Icon = Building2,
}: {
  title: string;
  description: string;
  action?: ReactNode;
  icon?: LucideIcon;
}) {
  return (
    <div className="rounded-[24px] border border-dashed border-[#C7DED3] bg-[#F8FFFB] px-6 py-10 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#D1FAE5] text-[#047857]">
        <Icon size={22} />
      </div>
      <h3 className="mt-4 text-lg font-semibold text-[#064E3B]">{title}</h3>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-7 text-[#5B7569]">{description}</p>
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </div>
  );
}

export function MedicalCenterSectionCard({
  title,
  subtitle,
  action,
  children,
}: PropsWithChildren<{
  title: string;
  subtitle?: string;
  action?: ReactNode;
}>) {
  return (
    <section className="rounded-[28px] border border-[#DDEFE8] bg-white p-6 shadow-[0_20px_72px_-56px_rgba(6,78,59,0.34)]">
      <div className="mb-5 flex flex-col gap-3 border-b border-[#E8F4EE] pb-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h3 className="text-xl font-semibold text-[#064E3B]">{title}</h3>
          {subtitle ? <p className="mt-2 text-sm leading-6 text-[#5B7569]">{subtitle}</p> : null}
        </div>
        {action ? <div className="flex flex-wrap gap-2">{action}</div> : null}
      </div>
      {children}
    </section>
  );
}

export function MedicalCenterInlineAlert({
  tone,
  message,
}: {
  tone: "success" | "error" | "warning" | "info";
  message: string;
}) {
  const toneClasses = {
    success: "border-[#B7E4D6] bg-[#ECFDF5] text-[#047857]",
    error: "border-[#F8C9C9] bg-[#FEF2F2] text-[#DC2626]",
    warning: "border-[#FDE7BE] bg-[#FFF7E8] text-[#B45309]",
    info: "border-[#CBE7DF] bg-[#F2FBF8] text-[#0F766E]",
  } as const;

  return (
    <div className={`flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm ${toneClasses[tone]}`}>
      <AlertCircle size={18} className="mt-0.5 shrink-0" />
      <span>{message}</span>
    </div>
  );
}
