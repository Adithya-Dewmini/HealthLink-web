import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  fetchAdminMedicalCenterDetails,
  updateAdminMedicalCenterStatus,
  type AdminMedicalCenterDetails,
  type MedicalCenterVerificationStatus,
} from "../../services/admin-medical-centers.service";
import PageLoader from "../../components/ui/PageLoader";

type DetailTab =
  | "profile"
  | "doctors"
  | "schedules"
  | "receptionists"
  | "queues"
  | "bookings"
  | "prescriptions";

const tabs: Array<{ key: DetailTab; label: string }> = [
  { key: "profile", label: "Profile" },
  { key: "doctors", label: "Doctors" },
  { key: "schedules", label: "Schedules" },
  { key: "receptionists", label: "Receptionists" },
  { key: "queues", label: "Queues" },
  { key: "bookings", label: "Bookings" },
  { key: "prescriptions", label: "Prescriptions" },
];

const verificationBadgeClass: Record<MedicalCenterVerificationStatus, string> = {
  pending: "border-yellow-200 bg-yellow-50 text-yellow-800",
  approved: "border-green-200 bg-green-50 text-green-800",
  rejected: "border-red-200 bg-red-50 text-red-800",
  suspended: "bg-slate-100 text-slate-700",
};

function Badge({ label, className }: { label: string | number | null | undefined; className: string }) {
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${className}`}>{label ?? "Unknown"}</span>;
}

function formatDate(value: string | null | undefined) {
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
  return <p className="rounded-2xl border border-dashed border-[#B7E6FA] bg-[#F8FCFE] px-4 py-8 text-sm text-slate-500">{text}</p>;
}

export default function MedicalCenterDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const [detail, setDetail] = useState<AdminMedicalCenterDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [updating, setUpdating] = useState(false);
  const [activeTab, setActiveTab] = useState<DetailTab>("profile");
  const isFallbackDetail = detail?.data_mode === "fallback";

  useEffect(() => {
    let active = true;

    const load = async () => {
      if (!id) {
        setError("Medical center not found.");
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const data = await fetchAdminMedicalCenterDetails(id);
        if (!active) {
          return;
        }
        setDetail(data);
        setError("");
      } catch (caughtError) {
        if (!active) {
          return;
        }
        setError(caughtError instanceof Error ? caughtError.message : "Unable to load medical center details.");
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
    if (!detail) return null;
    return {
      admins: detail.linked_data.center_admins.length,
      doctors: detail.linked_data.assigned_doctors.length,
      receptionists: detail.linked_data.receptionists.length,
      queues: detail.activity.active_queues_count,
    };
  }, [detail]);

  const toggleStatus = async () => {
    if (!detail) return;
    setUpdating(true);
    setActionError("");
    try {
      const updated = await updateAdminMedicalCenterStatus({
        id: String(detail.profile.id),
        is_active: !detail.profile.is_active,
      });
      setDetail({
        ...detail,
        profile: {
          ...detail.profile,
          is_active: updated.is_active,
        },
      });
    } catch (caughtError) {
      setActionError(caughtError instanceof Error ? caughtError.message : "Unable to update medical center status.");
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return <PageLoader />;
  }

  if (error || !detail) {
    return <div className="rounded-3xl border border-red-100 bg-red-50 px-6 py-4 text-sm text-red-700 shadow-sm">{error || "Medical center not found."}</div>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link to="/admin/clinics" className="text-sm font-semibold text-[#21A5EC] hover:text-[#0D86C5]">
          Back to medical centers
        </Link>
        <div className="flex flex-wrap gap-2">
          <Link
            to={`/admin/verifications/clinic/${detail.profile.id}`}
            className="rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Open verification review
          </Link>
          <button
            type="button"
            disabled={updating || isFallbackDetail}
            onClick={() => void toggleStatus()}
            className={`rounded-full px-5 py-2.5 text-sm font-semibold transition ${
              detail.profile.is_active
                ? "border border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
                : "bg-[#0F8F58] text-white hover:bg-[#0A7748]"
            } disabled:cursor-not-allowed disabled:opacity-50`}
          >
            {updating ? "Updating..." : detail.profile.is_active ? "Deactivate center" : "Activate center"}
          </button>
        </div>
      </div>

      <section className="rounded-3xl border border-[#DCEAF3] bg-[linear-gradient(135deg,#FBFDFF_0%,#F3FAFE_100%)] p-6 shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#21A5EC]">Medical center profile</p>
            <h2 className="mt-3 text-3xl font-semibold text-[#053F56]">{detail.profile.name}</h2>
            <p className="mt-3 text-sm text-slate-500">{detail.profile.location}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Badge
                label={detail.profile.verification_status}
                className={verificationBadgeClass[detail.profile.verification_status]}
              />
              <Badge
                label={detail.profile.is_active ? "Active" : "Inactive"}
                className={
                  detail.profile.is_active
                    ? "border-green-200 bg-green-50 text-green-800"
                    : "border-slate-200 bg-slate-100 text-slate-700"
                }
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-white p-4">
              <p className="text-xs uppercase tracking-wide text-slate-400">Admins</p>
              <p className="mt-2 text-xl font-semibold text-[#053F56]">{summary?.admins ?? 0}</p>
            </div>
            <div className="rounded-2xl bg-white p-4">
              <p className="text-xs uppercase tracking-wide text-slate-400">Doctors</p>
              <p className="mt-2 text-xl font-semibold text-[#053F56]">{summary?.doctors ?? 0}</p>
            </div>
            <div className="rounded-2xl bg-white p-4">
              <p className="text-xs uppercase tracking-wide text-slate-400">Receptionists</p>
              <p className="mt-2 text-xl font-semibold text-[#053F56]">{summary?.receptionists ?? 0}</p>
            </div>
            <div className="rounded-2xl bg-white p-4">
              <p className="text-xs uppercase tracking-wide text-slate-400">Active Queues</p>
              <p className="mt-2 text-xl font-semibold text-[#053F56]">{summary?.queues ?? 0}</p>
            </div>
          </div>
        </div>
      </section>

      {actionError ? (
        <div className="rounded-2xl border border-red-100 bg-red-50 px-5 py-4 text-sm text-red-700">{actionError}</div>
      ) : null}

      {isFallbackDetail ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800">
          Showing a verification-backed summary because the extended admin medical center detail endpoint is not mounted in this environment. Verification review remains available.
        </div>
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
          {activeTab === "profile" ? (
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="rounded-2xl bg-[#F7FAFC] p-5">
                <h3 className="text-lg font-semibold text-[#053F56]">Profile summary</h3>
                <div className="mt-4 space-y-3 text-sm text-slate-600">
                  <p><span className="font-semibold text-slate-800">Created:</span> {formatDate(detail.profile.created_at)}</p>
                  <p><span className="font-semibold text-slate-800">Phone:</span> {detail.profile.phone || "Not provided"}</p>
                  <p><span className="font-semibold text-slate-800">Email:</span> {detail.profile.email || "Not provided"}</p>
                  <p><span className="font-semibold text-slate-800">Verified at:</span> {formatDate(detail.profile.verified_at)}</p>
                  <p><span className="font-semibold text-slate-800">Verification notes:</span> {detail.profile.verification_notes || "None"}</p>
                </div>
              </div>
              <div className="rounded-2xl bg-[#F7FAFC] p-5">
                <h3 className="text-lg font-semibold text-[#053F56]">Specialties</h3>
                <div className="mt-4 flex flex-wrap gap-2">
                  {detail.profile.specialties.length === 0 ? (
                    <p className="text-sm text-slate-500">No specialties configured.</p>
                  ) : (
                    detail.profile.specialties.map((specialty) => (
                      <span key={specialty.id} className="rounded-full bg-white px-3 py-1.5 text-sm font-medium text-slate-700">
                        {specialty.name}
                      </span>
                    ))
                  )}
                </div>
              </div>
              <div className="rounded-2xl bg-[#F7FAFC] p-5 lg:col-span-2">
                <h3 className="text-lg font-semibold text-[#053F56]">Center admins</h3>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  {detail.linked_data.center_admins.map((admin) => (
                    <div key={admin.id} className="rounded-2xl bg-white p-4">
                      <p className="font-semibold text-[#053F56]">{admin.name}</p>
                      <p className="mt-1 text-sm text-slate-500">{admin.email}</p>
                      <p className="mt-2 text-xs uppercase tracking-wide text-slate-400">
                        Added {formatDate(admin.created_at)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : null}

          {activeTab === "doctors" ? (
            <div className="grid gap-6 xl:grid-cols-2">
              <div>
                <h3 className="text-lg font-semibold text-[#053F56]">Assigned doctors</h3>
                <div className="mt-4 max-h-[420px] space-y-3 overflow-y-auto pr-1">
                  {detail.linked_data.assigned_doctors.length === 0 ? (
                    <EmptyState text="No doctor relationships found." />
                  ) : (
                    detail.linked_data.assigned_doctors.map((doctor) => (
                      <div key={doctor.id} className="rounded-2xl border border-gray-200 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold text-[#053F56]">{doctor.name || doctor.email}</p>
                            <p className="text-sm text-slate-500">{doctor.email}</p>
                          </div>
                          <Badge label={doctor.status} className="border-slate-200 bg-slate-100 text-slate-700" />
                        </div>
                        <p className="mt-3 text-sm text-slate-600">
                          Specialty: {doctor.doctor_specialty || "Not provided"}
                        </p>
                        <p className="mt-1 text-sm text-slate-600">
                          Clinic specialty: {doctor.clinic_specialty || "Not assigned"}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-[#053F56]">Doctor join requests</h3>
                <div className="mt-4 max-h-[420px] space-y-3 overflow-y-auto pr-1">
                  {detail.linked_data.doctor_join_requests.length === 0 ? (
                    <EmptyState text="No pending join requests." />
                  ) : (
                    detail.linked_data.doctor_join_requests.map((request) => (
                      <div key={request.id} className="rounded-2xl border border-gray-200 p-4">
                        <p className="font-semibold text-[#053F56]">{request.name}</p>
                        <p className="text-sm text-slate-500">{request.email}</p>
                        <p className="mt-3 text-sm text-slate-600">
                          Specialization: {request.specialization || "Not provided"}
                        </p>
                        <p className="mt-1 text-xs uppercase tracking-wide text-slate-400">
                          Requested {formatDate(request.created_at)}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          ) : null}

          {activeTab === "schedules" ? (
            <div>
              <h3 className="text-lg font-semibold text-[#053F56]">Schedules</h3>
              <div className="mt-4 max-h-[460px] space-y-3 overflow-y-auto pr-1">
                {detail.linked_data.schedules.length === 0 ? (
                  <EmptyState text="No schedules configured." />
                ) : (
                  detail.linked_data.schedules.map((schedule) => (
                    <div key={schedule.id} className="rounded-2xl border border-gray-200 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="font-semibold text-[#053F56]">{schedule.doctor_name}</p>
                          <p className="text-sm text-slate-500">{schedule.date} • {schedule.start_time} - {schedule.end_time}</p>
                        </div>
                        <Badge
                          label={schedule.is_active ? "Active" : "Disabled"}
                          className={
                            schedule.is_active
                              ? "border-green-200 bg-green-50 text-green-800"
                              : "border-slate-200 bg-slate-100 text-slate-700"
                          }
                        />
                      </div>
                      <p className="mt-3 text-sm text-slate-600">
                        {schedule.specialization || "General"} • Slot {schedule.slot_duration} min • Max patients {schedule.max_patients}
                      </p>
                      {schedule.invalid_reason ? (
                        <p className="mt-2 text-sm text-red-600">Invalid reason: {schedule.invalid_reason}</p>
                      ) : null}
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : null}

          {activeTab === "receptionists" ? (
            <div>
              <h3 className="text-lg font-semibold text-[#053F56]">Receptionists</h3>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {detail.linked_data.receptionists.length === 0 ? (
                  <EmptyState text="No receptionists linked to this center." />
                ) : (
                  detail.linked_data.receptionists.map((receptionist) => (
                    <div key={receptionist.id} className="rounded-2xl border border-gray-200 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-[#053F56]">{receptionist.name}</p>
                          <p className="text-sm text-slate-500">{receptionist.email}</p>
                        </div>
                        <Badge label={receptionist.status} className="border-slate-200 bg-slate-100 text-slate-700" />
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-600">
                        <span className="rounded-full bg-[#F7FAFC] px-3 py-1">Queue: {receptionist.permissions?.can_manage_queue ? "Yes" : "No"}</span>
                        <span className="rounded-full bg-[#F7FAFC] px-3 py-1">Appointments: {receptionist.permissions?.can_manage_appointments ? "Yes" : "No"}</span>
                        <span className="rounded-full bg-[#F7FAFC] px-3 py-1">Check-in: {receptionist.permissions?.can_check_in ? "Yes" : "No"}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : null}

          {activeTab === "queues" ? (
            <div>
              <h3 className="text-lg font-semibold text-[#053F56]">Queues</h3>
              <div className="mt-4 max-h-[460px] space-y-3 overflow-y-auto pr-1">
                {detail.linked_data.queues.length === 0 ? (
                  <EmptyState text="No queues found." />
                ) : (
                  detail.linked_data.queues.map((queue) => (
                    <div key={queue.id} className="rounded-2xl border border-gray-200 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-semibold text-[#053F56]">Queue #{queue.id}</p>
                        <Badge label={queue.status} className="border-slate-200 bg-slate-100 text-slate-700" />
                      </div>
                      <p className="mt-3 text-sm text-slate-600">
                        Doctor #{queue.doctor_id} • Schedule #{queue.schedule_id || "N/A"} • Shift date {queue.shift_date || "N/A"}
                      </p>
                      <p className="mt-1 text-xs uppercase tracking-wide text-slate-400">
                        Started {formatDate(queue.started_at)} • Created {formatDate(queue.created_at)}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : null}

          {activeTab === "bookings" ? (
            <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
              <div className="rounded-2xl bg-[#F7FAFC] p-5">
                <h3 className="text-lg font-semibold text-[#053F56]">Today booking stats</h3>
                <div className="mt-4 space-y-3 text-sm text-slate-600">
                  <p><span className="font-semibold text-slate-800">Total:</span> {detail.linked_data.appointments.stats.total}</p>
                  <p><span className="font-semibold text-slate-800">Upcoming:</span> {detail.linked_data.appointments.stats.upcoming}</p>
                  <p><span className="font-semibold text-slate-800">Completed:</span> {detail.linked_data.appointments.stats.completed}</p>
                  <p><span className="font-semibold text-slate-800">Missed:</span> {detail.linked_data.appointments.stats.missed}</p>
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-[#053F56]">Today appointments</h3>
                <div className="mt-4 max-h-[420px] space-y-3 overflow-y-auto pr-1">
                  {detail.linked_data.appointments.appointments.length === 0 ? (
                    <EmptyState text="No appointments for today." />
                  ) : (
                    detail.linked_data.appointments.appointments.map((appointment) => (
                      <div key={appointment.id} className="rounded-2xl border border-gray-200 p-4">
                        <div className="flex items-center justify-between gap-3">
                          <p className="font-semibold text-[#053F56]">{appointment.patientName}</p>
                          <Badge label={appointment.status} className="border-slate-200 bg-slate-100 text-slate-700" />
                        </div>
                        <p className="mt-3 text-sm text-slate-600">
                          {appointment.time} • {appointment.doctorName}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          ) : null}

          {activeTab === "prescriptions" ? (
            <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
              <div className="rounded-2xl bg-[#F7FAFC] p-5">
                <h3 className="text-lg font-semibold text-[#053F56]">Prescription analytics</h3>
                <div className="mt-4 space-y-3 text-sm text-slate-600">
                  <p><span className="font-semibold text-slate-800">Generated total:</span> {detail.activity.prescriptions_generated_count}</p>
                  <p><span className="font-semibold text-slate-800">Bookings today:</span> {detail.activity.bookings_count_today}</p>
                  <p><span className="font-semibold text-slate-800">Active queues:</span> {detail.activity.active_queues_count}</p>
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-[#053F56]">Recent prescriptions</h3>
                <div className="mt-4 max-h-[420px] space-y-3 overflow-y-auto pr-1">
                  {detail.activity.recent_prescriptions.length === 0 ? (
                    <EmptyState text="No prescriptions generated yet." />
                  ) : (
                    detail.activity.recent_prescriptions.map((prescription) => (
                      <div key={prescription.id} className="rounded-2xl border border-gray-200 p-4">
                        <p className="font-semibold text-[#053F56]">{prescription.patient_name}</p>
                        <p className="mt-1 text-sm text-slate-500">Doctor: {prescription.doctor_name}</p>
                        <p className="mt-3 text-xs uppercase tracking-wide text-slate-400">
                          Issued {formatDate(prescription.issued_at)}
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
