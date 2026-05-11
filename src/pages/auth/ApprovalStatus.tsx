import { Navigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { getApprovalStatus, getDefaultRouteForRole } from "../../services/auth.service";

const copy = {
  pharmacist: {
    pending: {
      title: "Your pharmacy registration is under review",
      message: "Approval is required before full pharmacy workspace access.",
    },
    rejected: {
      title: "Your pharmacy registration was not approved",
      message: "Review the latest note below. Approval is required before full pharmacy workspace access.",
    },
    suspended: {
      title: "Your pharmacy access is suspended",
      message: "Your pharmacy workspace is currently unavailable.",
    },
  },
  medical_center_admin: {
    pending: {
      title: "Your medical center registration is under review",
      message: "Approval is required before full medical center workspace access.",
    },
    rejected: {
      title: "Your medical center registration was not approved",
      message: "Review the latest note below. Approval is required before full medical center workspace access.",
    },
    suspended: {
      title: "Your medical center access is suspended",
      message: "Your medical center workspace is currently unavailable.",
    },
  },
  doctor: {
    pending: {
      title: "Your doctor account is under review",
      message: "Approval is required before full doctor workspace access.",
    },
    rejected: {
      title: "Your doctor account was not approved",
      message: "Review the latest note below. Approval is required before full doctor workspace access.",
    },
    suspended: {
      title: "Your doctor access is suspended",
      message: "Your doctor workspace is currently unavailable.",
    },
  },
} as const;

export default function ApprovalStatusPage() {
  const { user, logout } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const status = getApprovalStatus(user);
  if (!status || status === "approved") {
    return <Navigate to={getDefaultRouteForRole(user.role)} replace />;
  }

  const roleCopy =
    copy[user.role as keyof typeof copy]?.[status as "pending" | "rejected" | "suspended"] ??
    copy.doctor.pending;

  return (
    <div className="flex min-h-screen items-center justify-center bg-[linear-gradient(180deg,#F8FBFD_0%,#FFFFFF_100%)] px-6">
      <div className="w-full max-w-xl rounded-[28px] border border-[#DCEAF3] bg-white p-10 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#21A5EC]">
          Approval status
        </p>
        <h1 className="mt-3 text-3xl font-semibold text-[#053F56]">{roleCopy.title}</h1>
        <p className="mt-4 text-sm leading-6 text-slate-500">{roleCopy.message}</p>
        {user.verificationNotes ? (
          <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Latest note</p>
            <p className="mt-2 text-sm text-slate-700">{user.verificationNotes}</p>
          </div>
        ) : null}

        <div className="mt-8 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={logout}
            className="rounded-full bg-[#053F56] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0D5E80]"
          >
            Log out
          </button>
        </div>
      </div>
    </div>
  );
}
