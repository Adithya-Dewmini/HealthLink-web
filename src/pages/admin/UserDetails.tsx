import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  fetchAdminUserDetails,
  updateAdminUserStatus,
  type AdminManagedUserRole,
  type AdminUserDetails,
} from "../../services/admin-users.service";
import PageLoader from "../../components/ui/PageLoader";

const roleBadgeClass: Record<AdminManagedUserRole, string> = {
  admin: "border-rose-200 bg-rose-50 text-rose-800",
  medical_center_admin: "border-sky-200 bg-sky-50 text-sky-800",
  doctor: "border-cyan-200 bg-cyan-50 text-cyan-800",
  receptionist: "border-amber-200 bg-amber-50 text-amber-800",
  pharmacist: "border-emerald-200 bg-emerald-50 text-emerald-800",
  patient: "border-slate-200 bg-slate-100 text-slate-700",
};

function Badge({ label, className }: { label: string; className: string }) {
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${className}`}>{label}</span>;
}

function formatDate(value: string | null) {
  if (!value) return "Unknown";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function EmptyState({ text }: { text: string }) {
  return <p className="rounded-2xl border border-dashed border-[#FBD2B8] bg-[#FFF8F3] px-4 py-8 text-sm text-slate-500">{text}</p>;
}

export default function UserDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const [detail, setDetail] = useState<AdminUserDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [updating, setUpdating] = useState(false);
  const isFallbackDetail = detail?.data_mode === "fallback";

  useEffect(() => {
    let active = true;

    const load = async () => {
      if (!id) {
        setError("User not found.");
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const data = await fetchAdminUserDetails(id);
        if (!active) return;
        setDetail(data);
        setError("");
      } catch (caughtError) {
        if (!active) return;
        setError(caughtError instanceof Error ? caughtError.message : "Unable to load user details.");
      } finally {
        if (active) setLoading(false);
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, [id]);

  const toggleStatus = async () => {
    if (!detail) return;
    setUpdating(true);
    setActionError("");
    try {
      await updateAdminUserStatus({
        id: detail.identity.id,
        is_active: !detail.identity.is_active,
      });
      const data = await fetchAdminUserDetails(detail.identity.id);
      setDetail(data);
    } catch (caughtError) {
      setActionError(caughtError instanceof Error ? caughtError.message : "Unable to update user status.");
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return <PageLoader />;
  }

  if (error || !detail) {
    return <div className="rounded-3xl border border-red-100 bg-red-50 px-6 py-4 text-sm text-red-700 shadow-sm">{error || "User not found."}</div>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link to="/admin/users" className="text-sm font-semibold text-[#F28B45] hover:text-[#D9752F]">
          Back to users
        </Link>
        <button
          type="button"
          disabled={updating || isFallbackDetail}
          onClick={() => void toggleStatus()}
          className={`rounded-full px-4 py-2 text-sm font-semibold transition disabled:opacity-50 ${
            detail.identity.is_active
              ? "border border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
              : "bg-[#0F8F58] text-white hover:bg-[#0A7748]"
          }`}
        >
          {updating ? "Updating..." : detail.identity.is_active ? "Deactivate user" : "Activate user"}
        </button>
      </div>

      <section className="rounded-3xl border border-[#DCEAF3] bg-[linear-gradient(135deg,#FBFEFF_0%,#FFF5EF_100%)] p-6 shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#F28B45]">Identity summary</p>
            <h2 className="mt-3 text-3xl font-semibold text-[#053F56]">{detail.identity.name}</h2>
            <p className="mt-3 text-sm text-slate-500">{detail.identity.email}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Badge label={detail.identity.role.replace(/_/g, " ")} className={roleBadgeClass[detail.identity.role]} />
              <Badge
                label={detail.identity.is_active ? "Active" : "Inactive"}
                className={detail.identity.is_active ? "border-green-200 bg-green-50 text-green-800" : "border-red-200 bg-red-50 text-red-700"}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-white p-4">
              <p className="text-xs uppercase tracking-wide text-slate-400">Created</p>
              <p className="mt-2 text-sm font-semibold text-[#053F56]">{formatDate(detail.identity.created_at)}</p>
            </div>
            <div className="rounded-2xl bg-white p-4">
              <p className="text-xs uppercase tracking-wide text-slate-400">Last Login</p>
              <p className="mt-2 text-sm font-semibold text-[#053F56]">{formatDate(detail.identity.last_login_at)}</p>
            </div>
            <div className="rounded-2xl bg-white p-4">
              <p className="text-xs uppercase tracking-wide text-slate-400">Bookings</p>
              <p className="mt-2 text-xl font-semibold text-[#053F56]">{detail.activity_summary.bookings_count}</p>
            </div>
            <div className="rounded-2xl bg-white p-4">
              <p className="text-xs uppercase tracking-wide text-slate-400">Consultations</p>
              <p className="mt-2 text-xl font-semibold text-[#053F56]">{detail.activity_summary.consultations_count}</p>
            </div>
          </div>
        </div>
      </section>

      {actionError ? (
        <div className="rounded-2xl border border-red-100 bg-red-50 px-5 py-4 text-sm text-red-700">{actionError}</div>
      ) : null}

      {isFallbackDetail ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800">
          Showing a summary view because the extended admin user detail endpoint is not mounted in this environment.
        </div>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-[#053F56]">Role & ownership</h3>
          <div className="mt-4 space-y-4 text-sm text-slate-600">
            {detail.linked_domain_records.owned_medical_center ? (
              <div className="rounded-2xl bg-[#F7FAFC] p-4">
                <p className="font-semibold text-[#053F56]">Owned medical center</p>
                <p className="mt-1">{detail.linked_domain_records.owned_medical_center.name}</p>
              </div>
            ) : null}
            {detail.linked_domain_records.doctor_profile ? (
              <div className="rounded-2xl bg-[#F7FAFC] p-4">
                <p className="font-semibold text-[#053F56]">Doctor profile</p>
                <p className="mt-1">Specialization: {detail.linked_domain_records.doctor_profile.specialization || "Not provided"}</p>
                <p className="mt-1">Verification: {detail.linked_domain_records.doctor_profile.verification_status || "pending"}</p>
              </div>
            ) : null}
            {detail.linked_domain_records.receptionist_assignment ? (
              <div className="rounded-2xl bg-[#F7FAFC] p-4">
                <p className="font-semibold text-[#053F56]">Receptionist assignment</p>
                <p className="mt-1">{detail.linked_domain_records.receptionist_assignment.medical_center_name || "No clinic assigned"}</p>
              </div>
            ) : null}
            {detail.linked_domain_records.patient_profile ? (
              <div className="rounded-2xl bg-[#F7FAFC] p-4">
                <p className="font-semibold text-[#053F56]">Patient profile</p>
                <p className="mt-1">City: {detail.linked_domain_records.patient_profile.city || "Not provided"}</p>
              </div>
            ) : null}
            {!detail.linked_domain_records.owned_medical_center &&
            !detail.linked_domain_records.doctor_profile &&
            !detail.linked_domain_records.receptionist_assignment &&
            !detail.linked_domain_records.patient_profile &&
            detail.linked_domain_records.pharmacy_associations.length === 0 ? (
              <EmptyState text="No role-specific ownership records found." />
            ) : null}
          </div>
        </div>

        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-[#053F56]">Linked records</h3>
          <div className="mt-4 space-y-4">
            <div>
              <p className="text-sm font-semibold text-[#053F56]">Clinic associations</p>
              <div className="mt-3 space-y-3">
                {detail.linked_domain_records.clinic_associations.length === 0 ? (
                  <p className="text-sm text-slate-500">No clinic associations.</p>
                ) : (
                  detail.linked_domain_records.clinic_associations.map((item) => (
                    <div key={item.relationship_id} className="rounded-2xl bg-[#F7FAFC] p-4">
                      <p className="font-semibold text-[#053F56]">{item.medical_center_name}</p>
                      <p className="mt-1 text-sm text-slate-500">{item.status} • {formatDate(item.joined_at)}</p>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div>
              <p className="text-sm font-semibold text-[#053F56]">Pharmacy associations</p>
              <div className="mt-3 space-y-3">
                {detail.linked_domain_records.pharmacy_associations.length === 0 ? (
                  <p className="text-sm text-slate-500">No pharmacy associations.</p>
                ) : (
                  detail.linked_domain_records.pharmacy_associations.map((item) => (
                    <div key={`${item.pharmacy_id}-${item.linked_at}`} className="rounded-2xl bg-[#F7FAFC] p-4">
                      <p className="font-semibold text-[#053F56]">{item.pharmacy_name}</p>
                      <p className="mt-1 text-sm text-slate-500">{item.verification_status || "pending"} • {formatDate(item.linked_at)}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-[#053F56]">Activity summary</h3>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl bg-[#F7FAFC] p-4">
              <p className="text-xs uppercase tracking-wide text-slate-400">Bookings</p>
              <p className="mt-2 text-2xl font-semibold text-[#053F56]">{detail.activity_summary.bookings_count}</p>
            </div>
            <div className="rounded-2xl bg-[#F7FAFC] p-4">
              <p className="text-xs uppercase tracking-wide text-slate-400">Consultations</p>
              <p className="mt-2 text-2xl font-semibold text-[#053F56]">{detail.activity_summary.consultations_count}</p>
            </div>
            <div className="rounded-2xl bg-[#F7FAFC] p-4">
              <p className="text-xs uppercase tracking-wide text-slate-400">Prescriptions</p>
              <p className="mt-2 text-2xl font-semibold text-[#053F56]">{detail.activity_summary.prescriptions_count}</p>
            </div>
          </div>
          <div className="mt-4 space-y-3">
            {detail.activity_summary.recent_activity.length === 0 ? (
              <EmptyState text="No recent activity recorded." />
            ) : (
              detail.activity_summary.recent_activity.map((item, index) => (
                <div key={`${item.type}-${item.occurred_at}-${index}`} className="rounded-2xl bg-[#F7FAFC] p-4">
                  <p className="font-semibold text-[#053F56]">{item.title}</p>
                  <p className="mt-1 text-sm text-slate-500">{item.context || "No context"}</p>
                  <p className="mt-2 text-xs uppercase tracking-wide text-slate-400">{formatDate(item.occurred_at)}</p>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-[#053F56]">Audit trail</h3>
          <div className="mt-4 space-y-3">
            {detail.audit_summary.recent_actions.length === 0 ? (
              <EmptyState text="No audit actions found for this user." />
            ) : (
              detail.audit_summary.recent_actions.map((item) => (
                <div key={item.id} className="rounded-2xl bg-[#F7FAFC] p-4">
                  <p className="font-semibold text-[#053F56]">{item.action}</p>
                  <p className="mt-2 text-xs uppercase tracking-wide text-slate-400">{formatDate(item.created_at)}</p>
                </div>
              ))
            )}
          </div>
          {detail.audit_summary.activation_logs.length > 0 ? (
            <div className="mt-6">
              <p className="text-sm font-semibold text-[#053F56]">Activation logs</p>
              <div className="mt-3 space-y-3">
                {detail.audit_summary.activation_logs.map((item) => (
                  <div key={`activation-${item.id}`} className="rounded-2xl border border-gray-200 p-4">
                    <p className="text-sm text-slate-700">{item.action}</p>
                    <p className="mt-2 text-xs uppercase tracking-wide text-slate-400">{formatDate(item.created_at)}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
