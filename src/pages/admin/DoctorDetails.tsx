import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  fetchAdminDoctorAssociations,
  fetchAdminDoctorDetails,
  fetchAdminDoctorSchedules,
  updateAdminDoctorStatus,
  updateAdminDoctorVisibility,
  type AdminDoctorAssociation,
  type AdminDoctorDetails,
  type AdminDoctorSchedule,
} from "../../services/admin-doctors.service";
import {
  approveVerificationEntity,
  rejectVerificationEntity,
} from "../../services/admin-verifications.service";
import PageLoader from "../../components/ui/PageLoader";

type DetailTab = "overview" | "associations" | "schedules" | "activity";

const tabs: Array<{ key: DetailTab; label: string }> = [
  { key: "overview", label: "Overview" },
  { key: "associations", label: "Associations" },
  { key: "schedules", label: "Schedules" },
  { key: "activity", label: "Activity" },
];

const verificationBadgeClass = {
  pending: "border-yellow-200 bg-yellow-50 text-yellow-800",
  approved: "border-green-200 bg-green-50 text-green-800",
  rejected: "border-red-200 bg-red-50 text-red-800",
} as const;

function Badge({ label, className }: { label: string; className: string }) {
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${className}`}>{label}</span>;
}

function formatDate(value: string | null) {
  if (!value) {
    return "Unknown";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function EmptyState({ text }: { text: string }) {
  return <p className="rounded-2xl border border-dashed border-[#BDEEF5] bg-[#F7FEFF] px-4 py-8 text-sm text-slate-500">{text}</p>;
}

export default function DoctorDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const [detail, setDetail] = useState<AdminDoctorDetails | null>(null);
  const [associations, setAssociations] = useState<AdminDoctorAssociation[]>([]);
  const [schedules, setSchedules] = useState<AdminDoctorSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [busyAction, setBusyAction] = useState<"status" | "visibility" | "approve" | "reject" | null>(null);
  const [activeTab, setActiveTab] = useState<DetailTab>("overview");

  useEffect(() => {
    let active = true;

    const load = async () => {
      if (!id) {
        setError("Doctor not found.");
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const [detailData, associationsData, schedulesData] = await Promise.all([
          fetchAdminDoctorDetails(id),
          fetchAdminDoctorAssociations(id),
          fetchAdminDoctorSchedules(id),
        ]);

        if (!active) {
          return;
        }

        setDetail(detailData);
        setAssociations(associationsData);
        setSchedules(schedulesData);
        setError("");
      } catch (caughtError) {
        if (!active) {
          return;
        }

        setError(caughtError instanceof Error ? caughtError.message : "Unable to load doctor details.");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, [id]);

  const summary = useMemo(() => {
    if (!detail) {
      return null;
    }

    return {
      clinics: associations.filter((item) => item.relationship_status === "ACTIVE").length,
      pending: detail.relationships.join_requests.filter((item) => item.status === "PENDING").length,
      invites: detail.relationships.invite_history.length,
      activeSchedules: detail.activity_summary.active_schedules,
    };
  }, [associations, detail]);

  const refreshDetail = async () => {
    if (!id) {
      return;
    }

    const [detailData, associationsData, schedulesData] = await Promise.all([
      fetchAdminDoctorDetails(id),
      fetchAdminDoctorAssociations(id),
      fetchAdminDoctorSchedules(id),
    ]);

    setDetail(detailData);
    setAssociations(associationsData);
    setSchedules(schedulesData);
  };

  const runAction = async (
    action: "status" | "visibility" | "approve" | "reject",
    runner: () => Promise<void>
  ) => {
    setBusyAction(action);
    setActionError("");
    try {
      await runner();
      await refreshDetail();
    } catch (caughtError) {
      setActionError(caughtError instanceof Error ? caughtError.message : "Action failed.");
    } finally {
      setBusyAction(null);
    }
  };

  const toggleStatus = async () => {
    if (!detail) {
      return;
    }

    await runAction("status", async () => {
      await updateAdminDoctorStatus({
        id: detail.profile.id,
        is_active: !detail.profile.is_active,
      });
    });
  };

  const toggleVisibility = async () => {
    if (!detail) {
      return;
    }

    await runAction("visibility", async () => {
      await updateAdminDoctorVisibility({
        id: detail.profile.id,
        is_visible: !detail.profile.is_visible,
      });
    });
  };

  const approveVerification = async () => {
    if (!detail) {
      return;
    }

    const note = window.prompt("Approval note (optional)", detail.profile.verification_notes || "");
    if (note === null) {
      return;
    }

    await runAction("approve", async () => {
      await approveVerificationEntity({
        type: "doctor",
        id: detail.profile.id,
        note: note.trim() || undefined,
      });
    });
  };

  const rejectVerification = async () => {
    if (!detail) {
      return;
    }

    const note = window.prompt("Rejection reason", detail.profile.verification_notes || "");
    if (note === null) {
      return;
    }

    if (!note.trim()) {
      setActionError("A rejection note is required.");
      return;
    }

    await runAction("reject", async () => {
      await rejectVerificationEntity({
        type: "doctor",
        id: detail.profile.id,
        note: note.trim(),
      });
    });
  };

  if (loading) {
    return <PageLoader />;
  }

  if (error || !detail) {
    return <div className="rounded-3xl border border-red-100 bg-red-50 px-6 py-4 text-sm text-red-700 shadow-sm">{error || "Doctor not found."}</div>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link to="/admin/doctors" className="text-sm font-semibold text-[#1AA2B8] hover:text-[#137A8D]">
          Back to doctors
        </Link>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busyAction === "approve"}
            onClick={() => void approveVerification()}
            className="rounded-full border border-green-200 bg-green-50 px-4 py-2 text-sm font-semibold text-green-700 transition hover:bg-green-100 disabled:opacity-50"
          >
            {busyAction === "approve" ? "Approving..." : "Approve verification"}
          </button>
          <button
            type="button"
            disabled={busyAction === "reject"}
            onClick={() => void rejectVerification()}
            className="rounded-full border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:opacity-50"
          >
            {busyAction === "reject" ? "Rejecting..." : "Reject verification"}
          </button>
          <button
            type="button"
            disabled={busyAction === "visibility"}
            onClick={() => void toggleVisibility()}
            className="rounded-full border border-cyan-200 bg-cyan-50 px-4 py-2 text-sm font-semibold text-cyan-800 transition hover:bg-cyan-100 disabled:opacity-50"
          >
            {busyAction === "visibility"
              ? "Updating..."
              : detail.profile.is_visible
                ? "Hide doctor"
                : "Make visible"}
          </button>
          <button
            type="button"
            disabled={busyAction === "status"}
            onClick={() => void toggleStatus()}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition disabled:opacity-50 ${
              detail.profile.is_active
                ? "border border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
                : "bg-[#0F8F58] text-white hover:bg-[#0A7748]"
            }`}
          >
            {busyAction === "status"
              ? "Updating..."
              : detail.profile.is_active
                ? "Deactivate account"
                : "Activate account"}
          </button>
        </div>
      </div>

      <section className="rounded-3xl border border-[#DCEAF3] bg-[linear-gradient(135deg,#FBFEFF_0%,#EFFBFC_100%)] p-6 shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#1AA2B8]">Doctor governance</p>
            <h2 className="mt-3 text-3xl font-semibold text-[#053F56]">{detail.profile.name}</h2>
            <p className="mt-3 text-sm text-slate-500">
              {detail.profile.specialization || "Specialization not provided"} • {detail.profile.email}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Badge
                label={detail.profile.verification_status}
                className={verificationBadgeClass[detail.profile.verification_status]}
              />
              <Badge
                label={detail.profile.is_active ? "Active account" : "Inactive account"}
                className={
                  detail.profile.is_active
                    ? "border-green-200 bg-green-50 text-green-800"
                    : "border-red-200 bg-red-50 text-red-700"
                }
              />
              <Badge
                label={detail.profile.is_visible ? "Visible in booking" : "Hidden from booking"}
                className={
                  detail.profile.is_visible
                    ? "border-cyan-200 bg-cyan-50 text-cyan-800"
                    : "border-slate-200 bg-slate-100 text-slate-700"
                }
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-white p-4">
              <p className="text-xs uppercase tracking-wide text-slate-400">Active Clinics</p>
              <p className="mt-2 text-xl font-semibold text-[#053F56]">{summary?.clinics ?? 0}</p>
            </div>
            <div className="rounded-2xl bg-white p-4">
              <p className="text-xs uppercase tracking-wide text-slate-400">Pending Requests</p>
              <p className="mt-2 text-xl font-semibold text-[#053F56]">{summary?.pending ?? 0}</p>
            </div>
            <div className="rounded-2xl bg-white p-4">
              <p className="text-xs uppercase tracking-wide text-slate-400">Invite History</p>
              <p className="mt-2 text-xl font-semibold text-[#053F56]">{summary?.invites ?? 0}</p>
            </div>
            <div className="rounded-2xl bg-white p-4">
              <p className="text-xs uppercase tracking-wide text-slate-400">Active Schedules</p>
              <p className="mt-2 text-xl font-semibold text-[#053F56]">{summary?.activeSchedules ?? 0}</p>
            </div>
          </div>
        </div>
      </section>

      {actionError ? (
        <div className="rounded-2xl border border-red-100 bg-red-50 px-5 py-4 text-sm text-red-700">{actionError}</div>
      ) : null}

      <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap gap-2">
          {tabs.map((tab) => {
            const active = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  active ? "bg-[#053F56] text-white" : "bg-[#F3F7FA] text-slate-600 hover:bg-[#DCEAF3]"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="mt-6">
          {activeTab === "overview" ? (
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="rounded-2xl bg-[#F7FAFC] p-5">
                <h3 className="text-lg font-semibold text-[#053F56]">Profile summary</h3>
                <div className="mt-4 space-y-3 text-sm text-slate-600">
                  <p><span className="font-semibold text-slate-800">Experience:</span> {detail.profile.experience_years ?? "Not provided"} years</p>
                  <p><span className="font-semibold text-slate-800">Created:</span> {formatDate(detail.profile.created_at)}</p>
                  <p><span className="font-semibold text-slate-800">Verified at:</span> {formatDate(detail.profile.verified_at)}</p>
                  <p><span className="font-semibold text-slate-800">Verification notes:</span> {detail.profile.verification_notes || "None"}</p>
                </div>
              </div>

              <div className="rounded-2xl bg-[#F7FAFC] p-5">
                <h3 className="text-lg font-semibold text-[#053F56]">Availability</h3>
                <div className="mt-4 space-y-3">
                  {detail.activity_summary.availability_summary.length === 0 ? (
                    <p className="text-sm text-slate-500">No availability configured.</p>
                  ) : (
                    detail.activity_summary.availability_summary.map((item) => (
                      <div key={`${item.day}-${item.start_time}-${item.end_time}`} className="flex items-center justify-between rounded-2xl bg-white px-4 py-3">
                        <div>
                          <p className="font-semibold text-[#053F56]">{item.day}</p>
                          <p className="text-sm text-slate-500">{item.start_time} - {item.end_time}</p>
                        </div>
                        <Badge
                          label={item.is_active ? "Active" : "Inactive"}
                          className={
                            item.is_active
                              ? "border-green-200 bg-green-50 text-green-800"
                              : "border-slate-200 bg-slate-100 text-slate-700"
                          }
                        />
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="rounded-2xl bg-[#F7FAFC] p-5 lg:col-span-2">
                <h3 className="text-lg font-semibold text-[#053F56]">Join requests and invites</h3>
                <div className="mt-4 grid gap-4 xl:grid-cols-2">
                  <div className="rounded-2xl bg-white p-4">
                    <p className="text-sm font-semibold text-[#053F56]">Join requests</p>
                    <div className="mt-3 space-y-3">
                      {detail.relationships.join_requests.length === 0 ? (
                        <p className="text-sm text-slate-500">No join requests recorded.</p>
                      ) : (
                        detail.relationships.join_requests.slice(0, 4).map((request) => (
                          <div key={request.id} className="rounded-2xl border border-gray-200 p-3">
                            <div className="flex items-center justify-between gap-3">
                              <p className="font-medium text-[#053F56]">{request.clinic_name}</p>
                              <Badge label={request.status} className="border-slate-200 bg-slate-100 text-slate-700" />
                            </div>
                            <p className="mt-2 text-xs uppercase tracking-wide text-slate-400">
                              {formatDate(request.created_at)}
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="rounded-2xl bg-white p-4">
                    <p className="text-sm font-semibold text-[#053F56]">Invite history</p>
                    <div className="mt-3 space-y-3">
                      {detail.relationships.invite_history.length === 0 ? (
                        <p className="text-sm text-slate-500">No invite history found.</p>
                      ) : (
                        detail.relationships.invite_history.slice(0, 4).map((invite) => (
                          <div key={invite.id} className="rounded-2xl border border-gray-200 p-3">
                            <div className="flex items-center justify-between gap-3">
                              <p className="font-medium text-[#053F56]">{invite.clinic_name}</p>
                              <Badge label={invite.status} className="border-slate-200 bg-slate-100 text-slate-700" />
                            </div>
                            <p className="mt-1 text-sm text-slate-500">{invite.email}</p>
                            <p className="mt-2 text-xs uppercase tracking-wide text-slate-400">
                              Expires {formatDate(invite.expires_at)}
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {activeTab === "associations" ? (
            <div className="grid gap-6 xl:grid-cols-2">
              <div>
                <h3 className="text-lg font-semibold text-[#053F56]">Clinic associations</h3>
                <div className="mt-4 max-h-[520px] space-y-3 overflow-y-auto pr-1">
                  {associations.length === 0 ? (
                    <EmptyState text="No clinic relationships found." />
                  ) : (
                    associations.map((association) => (
                      <div key={association.relationship_id} className="rounded-2xl border border-gray-200 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold text-[#053F56]">{association.clinic_name}</p>
                            <p className="mt-1 text-sm text-slate-500">{association.clinic_location}</p>
                          </div>
                          <Badge
                            label={association.relationship_status}
                            className={
                              association.relationship_status === "ACTIVE"
                                ? "border-green-200 bg-green-50 text-green-800"
                                : association.relationship_status === "PENDING"
                                  ? "border-yellow-200 bg-yellow-50 text-yellow-800"
                                  : "border-slate-200 bg-slate-100 text-slate-700"
                            }
                          />
                        </div>
                        <p className="mt-3 text-sm text-slate-600">
                          Role/context: {association.role_in_clinic || "Not assigned"}
                        </p>
                        <p className="mt-1 text-xs uppercase tracking-wide text-slate-400">
                          Joined {formatDate(association.joined_at)}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-[#053F56]">Join requests</h3>
                  <div className="mt-4 max-h-[240px] space-y-3 overflow-y-auto pr-1">
                    {detail.relationships.join_requests.length === 0 ? (
                      <EmptyState text="No join requests found." />
                    ) : (
                      detail.relationships.join_requests.map((request) => (
                        <div key={request.id} className="rounded-2xl border border-gray-200 p-4">
                          <div className="flex items-center justify-between gap-3">
                            <p className="font-semibold text-[#053F56]">{request.clinic_name}</p>
                            <Badge label={request.status} className="border-slate-200 bg-slate-100 text-slate-700" />
                          </div>
                          <p className="mt-2 text-xs uppercase tracking-wide text-slate-400">
                            Submitted {formatDate(request.created_at)}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-[#053F56]">Invite history</h3>
                  <div className="mt-4 max-h-[240px] space-y-3 overflow-y-auto pr-1">
                    {detail.relationships.invite_history.length === 0 ? (
                      <EmptyState text="No invites found." />
                    ) : (
                      detail.relationships.invite_history.map((invite) => (
                        <div key={invite.id} className="rounded-2xl border border-gray-200 p-4">
                          <div className="flex items-center justify-between gap-3">
                            <p className="font-semibold text-[#053F56]">{invite.clinic_name}</p>
                            <Badge label={invite.status} className="border-slate-200 bg-slate-100 text-slate-700" />
                          </div>
                          <p className="mt-1 text-sm text-slate-500">{invite.email}</p>
                          <p className="mt-2 text-xs uppercase tracking-wide text-slate-400">
                            Sent {formatDate(invite.created_at)}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {activeTab === "schedules" ? (
            <div>
              <h3 className="text-lg font-semibold text-[#053F56]">Schedules across clinics</h3>
              <div className="mt-4 max-h-[560px] space-y-3 overflow-y-auto pr-1">
                {schedules.length === 0 ? (
                  <EmptyState text="No schedules configured for this doctor." />
                ) : (
                  schedules.map((schedule) => (
                    <div key={schedule.id} className="rounded-2xl border border-gray-200 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="font-semibold text-[#053F56]">{schedule.clinic_name}</p>
                          <p className="text-sm text-slate-500">
                            {schedule.date} • {schedule.start_time} - {schedule.end_time}
                          </p>
                        </div>
                        <Badge
                          label={schedule.status}
                          className={
                            schedule.status === "active"
                              ? "border-green-200 bg-green-50 text-green-800"
                              : "border-slate-200 bg-slate-100 text-slate-700"
                          }
                        />
                      </div>
                      <p className="mt-3 text-sm text-slate-600">
                        {schedule.clinic_type || "Clinic"} • Slot {schedule.slot_duration} min • Max patients {schedule.max_patients}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {schedule.time_slots.map((slot) => (
                          <span key={`${schedule.id}-${slot.time}`} className="rounded-full bg-[#F3F7FA] px-3 py-1 text-xs font-medium text-slate-700">
                            {slot.time}
                          </span>
                        ))}
                      </div>
                      {schedule.invalid_reason ? (
                        <p className="mt-3 text-sm text-red-600">Invalid reason: {schedule.invalid_reason}</p>
                      ) : null}
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : null}

          {activeTab === "activity" ? (
            <div className="grid gap-6 lg:grid-cols-4">
              <div className="rounded-2xl bg-[#F7FAFC] p-5">
                <p className="text-xs uppercase tracking-wide text-slate-400">Consultations</p>
                <p className="mt-2 text-2xl font-semibold text-[#053F56]">{detail.activity_summary.total_consultations}</p>
              </div>
              <div className="rounded-2xl bg-[#F7FAFC] p-5">
                <p className="text-xs uppercase tracking-wide text-slate-400">Prescriptions</p>
                <p className="mt-2 text-2xl font-semibold text-[#053F56]">{detail.activity_summary.prescriptions_issued}</p>
              </div>
              <div className="rounded-2xl bg-[#F7FAFC] p-5">
                <p className="text-xs uppercase tracking-wide text-slate-400">Active Schedules</p>
                <p className="mt-2 text-2xl font-semibold text-[#053F56]">{detail.activity_summary.active_schedules}</p>
              </div>
              <div className="rounded-2xl bg-[#F7FAFC] p-5">
                <p className="text-xs uppercase tracking-wide text-slate-400">Availability Windows</p>
                <p className="mt-2 text-2xl font-semibold text-[#053F56]">{detail.activity_summary.availability_summary.length}</p>
              </div>

              <div className="rounded-2xl bg-white lg:col-span-4">
                <h3 className="px-5 pt-5 text-lg font-semibold text-[#053F56]">Recent activity</h3>
                <div className="mt-4 max-h-[420px] space-y-3 overflow-y-auto px-5 pb-5">
                  {detail.activity_summary.recent_activity.length === 0 ? (
                    <EmptyState text="No recent activity found." />
                  ) : (
                    detail.activity_summary.recent_activity.map((item, index) => (
                      <div key={`${item.type}-${item.occurred_at}-${index}`} className="rounded-2xl border border-gray-200 p-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="font-semibold text-[#053F56]">{item.title}</p>
                            <p className="mt-1 text-sm text-slate-500">{item.context || "Platform-wide event"}</p>
                          </div>
                          {item.status ? (
                            <Badge label={item.status} className="border-slate-200 bg-slate-100 text-slate-700" />
                          ) : null}
                        </div>
                        <p className="mt-2 text-xs uppercase tracking-wide text-slate-400">
                          {formatDate(item.occurred_at)}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
