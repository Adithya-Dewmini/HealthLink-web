import type { ReactNode } from "react";
import Button from "../ui/Button";

type EmptyStateProps = {
  title: string;
  message: string;
  action?: ReactNode;
};

export function EmptyState({ action, message, title }: EmptyStateProps) {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
      <h3 className="text-base font-semibold text-[#053F56]">{title}</h3>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500">{message}</p>
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  );
}

type InlineAlertProps = {
  tone?: "info" | "success" | "warning" | "danger";
  message: string;
};

export function InlineAlert({ message, tone = "info" }: InlineAlertProps) {
  const classes = {
    info: "border-[#DCEAF3] bg-[#EEF8FF] text-[#0C6488]",
    success: "border-emerald-200 bg-emerald-50 text-emerald-800",
    warning: "border-[#F7D7C0] bg-[#FFF4EC] text-[#C66A2C]",
    danger: "border-red-200 bg-red-50 text-red-800",
  };

  return <div className={`rounded-lg border px-4 py-3 text-sm ${classes[tone]}`}>{message}</div>;
}

type ConfirmDialogProps = {
  title: string;
  message: string;
  confirmLabel?: string;
  tone?: "danger" | "primary";
  isOpen: boolean;
  isLoading?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export function ConfirmDialog({
  confirmLabel = "Confirm",
  isLoading = false,
  isOpen,
  message,
  onCancel,
  onConfirm,
  title,
  tone = "primary",
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 px-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-xl">
        <h2 className="text-xl font-semibold text-[#053F56]">{title}</h2>
        <p className="mt-3 text-sm leading-6 text-slate-600">{message}</p>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="ghost" onClick={onCancel} disabled={isLoading}>
            Cancel
          </Button>
          <Button variant={tone === "danger" ? "danger" : "primary"} onClick={onConfirm} isLoading={isLoading}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

type StatusBadgeProps = {
  label: string;
  tone?: "success" | "warning" | "danger" | "info" | "neutral";
};

export function StatusBadge({ label, tone = "neutral" }: StatusBadgeProps) {
  const classes = {
    success: "border-emerald-200 bg-emerald-50 text-emerald-700",
    warning: "border-[#F7D7C0] bg-[#FFF4EC] text-[#C66A2C]",
    danger: "border-red-200 bg-red-50 text-red-700",
    info: "border-[#DCEAF3] bg-[#EEF8FF] text-[#0C6488]",
    neutral: "border-slate-200 bg-slate-100 text-slate-700",
  };

  return (
    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold capitalize ${classes[tone]}`}>
      {label.replace(/_/g, " ")}
    </span>
  );
}

export function isMissingEndpointError(error: unknown) {
  return error instanceof Error && error.message.toLowerCase().includes("requires a backend endpoint");
}
