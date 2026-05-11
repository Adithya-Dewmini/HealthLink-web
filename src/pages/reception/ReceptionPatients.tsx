import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import {
  CalendarDays,
  Clock3,
  Edit3,
  Eye,
  Loader2,
  Search,
  Stethoscope,
  UserCheck,
  UserPlus,
  Users,
} from "lucide-react";
import PermissionState from "../../components/reception/PermissionState";
import { InlineAlert } from "../../components/reception/ReceptionUI";
import {
  getReceptionPermissions,
  getReceptionVisits,
  searchPatients,
} from "../../services/reception.service";
import type {
  ReceptionPermissions,
  ReceptionVisit,
  VisitStatus,
} from "../../types/reception.types";

type TodayBookingStatus = "none" | "booked" | "checked_in" | "late" | "missed" | "cancelled" | "completed";
type PatientFilter = "all" | "today" | "recent" | "no_upcoming";
type NoticeTone = "success" | "danger" | "warning" | "info";

type UpcomingAppointment = {
  bookingId: number;
  sessionId: number | null;
  doctorName: string;
  specialization: string;
  roomNumber: string;
  appointmentDate: string;
  appointmentTime: string;
  status: TodayBookingStatus;
};

type ReceptionPatientRecord = {
  id: number;
  patientId: number;
  patientName: string;
  patientImageUrl: string | null;
  age: number | null;
  gender: string | null;
  phone: string | null;
  nic: string | null;
  lastVisitDate: string | null;
  upcomingAppointment: UpcomingAppointment | null;
  todayBookingStatus: TodayBookingStatus;
  doctorName: string | null;
  appointmentTime: string | null;
  bookingId: number | null;
  sessionId: number | null;
};

type Notice = {
  tone: NoticeTone;
  message: string;
};

const TODAY = new Date().toISOString().slice(0, 10);

const filters: Array<{ key: PatientFilter; label: string }> = [
  { key: "all", label: "All Patients" },
  { key: "today", label: "Has Appointment Today" },
  { key: "recent", label: "Recently Visited" },
  { key: "no_upcoming", label: "No Upcoming Booking" },
];

function formatDateLabel() {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date());
}

function formatClock(value: string | null | undefined) {
  if (!value) return "Not set";
  const [hourPart = "0", minutePart = "00"] = String(value).split(":");
  const hour = Number(hourPart);
  if (!Number.isFinite(hour)) return value;
  const minute = minutePart.padStart(2, "0").slice(0, 2);
  const period = hour >= 12 ? "PM" : "AM";
  return `${hour % 12 || 12}:${minute} ${period}`;
}

function getInitials(name: string) {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() || "")
      .join("") || "PT"
  );
}

function buildRoomFallback(visit: ReceptionVisit) {
  const seed = visit.sessionId || visit.doctorId || 1;
  // TODO: Replace room fallback when patient lookup API returns room assignment.
  return `Room ${String((seed % 6) + 1).padStart(2, "0")}`;
}

function mapVisitStatus(status: VisitStatus): TodayBookingStatus {
  if (status === "scheduled") return "booked";
  if (status === "checked_in" || status === "waiting" || status === "in_consultation") return "checked_in";
  if (status === "late") return "late";
  if (status === "missed") return "missed";
  if (status === "cancelled") return "cancelled";
  return "completed";
}

function statusLabel(status: TodayBookingStatus) {
  const labels: Record<TodayBookingStatus, string> = {
    none: "No booking",
    booked: "Booked",
    checked_in: "Checked-in",
    late: "Late",
    missed: "Missed",
    cancelled: "Cancelled",
    completed: "Completed",
  };
  return labels[status];
}

function statusClasses(status: TodayBookingStatus) {
  if (status === "booked") return "border-sky-200 bg-sky-50 text-sky-700";
  if (status === "checked_in") return "border-cyan-200 bg-cyan-50 text-cyan-700";
  if (status === "late") return "border-amber-200 bg-amber-50 text-amber-800";
  if (status === "completed") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "missed" || status === "cancelled") return "border-red-200 bg-red-50 text-red-700";
  return "border-slate-200 bg-slate-100 text-slate-700";
}

function calculateAge(dob: string | null) {
  if (!dob) return null;
  const birthDate = new Date(dob);
  if (Number.isNaN(birthDate.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDelta = today.getMonth() - birthDate.getMonth();
  if (monthDelta < 0 || (monthDelta === 0 && today.getDate() < birthDate.getDate())) age -= 1;
  return age;
}

function getLatestVisit(visits: ReceptionVisit[]) {
  return [...visits].sort((a, b) => `${b.sessionDate} ${b.appointmentTime}`.localeCompare(`${a.sessionDate} ${a.appointmentTime}`))[0] || null;
}

function getUpcomingVisit(visits: ReceptionVisit[]) {
  return [...visits]
    .filter((visit) => visit.sessionDate >= TODAY && !["cancelled", "missed", "completed"].includes(visit.visitStatus))
    .sort((a, b) => `${a.sessionDate} ${a.appointmentTime}`.localeCompare(`${b.sessionDate} ${b.appointmentTime}`))[0] || null;
}

function buildPatientRecords(
  patients: Awaited<ReturnType<typeof searchPatients>>,
  visits: ReceptionVisit[]
): ReceptionPatientRecord[] {
  const visitsByPatient = new Map<number, ReceptionVisit[]>();
  visits.forEach((visit) => {
    const current = visitsByPatient.get(visit.patientId) || [];
    current.push(visit);
    visitsByPatient.set(visit.patientId, current);
  });

  const records = patients.map((patient) => {
    const patientVisits = visitsByPatient.get(patient.id) || [];
    const latestVisit = getLatestVisit(patientVisits);
    const upcomingVisit = getUpcomingVisit(patientVisits);
    const todayVisit = patientVisits.find((visit) => visit.sessionDate === TODAY && !["cancelled", "missed", "completed"].includes(visit.visitStatus));

    return {
      id: patient.id,
      patientId: patient.id,
      patientName: patient.fullName || patient.name,
      patientImageUrl: null,
      age: calculateAge(patient.dob),
      gender: patient.gender,
      phone: patient.phone,
      nic: patient.nic,
      lastVisitDate: latestVisit?.sessionDate || patient.lastVisit || null,
      upcomingAppointment: upcomingVisit
        ? {
            bookingId: upcomingVisit.bookingId,
            sessionId: upcomingVisit.sessionId,
            doctorName: upcomingVisit.doctorName,
            specialization: upcomingVisit.specialty || "General Medicine",
            roomNumber: buildRoomFallback(upcomingVisit),
            appointmentDate: upcomingVisit.sessionDate,
            appointmentTime: upcomingVisit.appointmentTime,
            status: mapVisitStatus(upcomingVisit.visitStatus),
          }
        : null,
      todayBookingStatus: todayVisit ? mapVisitStatus(todayVisit.visitStatus) : "none",
      doctorName: todayVisit?.doctorName || upcomingVisit?.doctorName || null,
      appointmentTime: todayVisit?.appointmentTime || upcomingVisit?.appointmentTime || null,
      bookingId: todayVisit?.bookingId || upcomingVisit?.bookingId || null,
      sessionId: todayVisit?.sessionId || upcomingVisit?.sessionId || null,
    };
  });

  visits.forEach((visit) => {
    if (records.some((record) => record.patientId === visit.patientId)) return;
    const patientVisits = visitsByPatient.get(visit.patientId) || [];
    const latestVisit = getLatestVisit(patientVisits);
    const upcomingVisit = getUpcomingVisit(patientVisits);
    const todayVisit = patientVisits.find((item) => item.sessionDate === TODAY);
    records.push({
      id: visit.patientId,
      patientId: visit.patientId,
      patientName: visit.patientName,
      patientImageUrl: null,
      age: null,
      gender: null,
      phone: visit.patientPhone,
      nic: visit.patientNic || null,
      lastVisitDate: latestVisit?.sessionDate || null,
      upcomingAppointment: upcomingVisit
        ? {
            bookingId: upcomingVisit.bookingId,
            sessionId: upcomingVisit.sessionId,
            doctorName: upcomingVisit.doctorName,
            specialization: upcomingVisit.specialty || "General Medicine",
            roomNumber: buildRoomFallback(upcomingVisit),
            appointmentDate: upcomingVisit.sessionDate,
            appointmentTime: upcomingVisit.appointmentTime,
            status: mapVisitStatus(upcomingVisit.visitStatus),
          }
        : null,
      todayBookingStatus: todayVisit ? mapVisitStatus(todayVisit.visitStatus) : "none",
      doctorName: todayVisit?.doctorName || upcomingVisit?.doctorName || null,
      appointmentTime: todayVisit?.appointmentTime || upcomingVisit?.appointmentTime || null,
      bookingId: todayVisit?.bookingId || upcomingVisit?.bookingId || null,
      sessionId: todayVisit?.sessionId || upcomingVisit?.sessionId || null,
    });
  });

  return records;
}

function ActionButton({
  children,
  disabled,
  onClick,
  tone = "secondary",
}: {
  children: ReactNode;
  disabled?: boolean;
  onClick?: () => void;
  tone?: "primary" | "secondary";
}) {
  const classes =
    tone === "primary"
      ? "border-[#0EA5E9] bg-[#0EA5E9] text-white hover:bg-[#0284C7]"
      : "border-[#D8E7F3] bg-white text-[#0B3558] hover:bg-[#EFF8FF]";

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-2 rounded-xl border px-3.5 py-2 text-sm font-semibold transition ${classes} disabled:cursor-not-allowed disabled:opacity-45`}
    >
      {children}
    </button>
  );
}

function StatusPill({ status }: { status: TodayBookingStatus }) {
  return (
    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${statusClasses(status)}`}>
      {statusLabel(status)}
    </span>
  );
}

function Avatar({ name }: { name: string }) {
  return (
    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[#D8E7F3] bg-[#EFF8FF] text-sm font-bold text-[#0B3558]">
      {getInitials(name)}
    </div>
  );
}

function SummaryCard({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-[#D8E7F3] bg-white p-4 shadow-[0_14px_34px_rgba(6,26,46,0.06)]">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-[#64748B]">{label}</p>
          <p className="mt-2 text-2xl font-bold text-[#0F172A]">{value}</p>
        </div>
        <div className="rounded-2xl bg-[#EFF8FF] p-3 text-[#0EA5E9]">
          <Icon size={18} />
        </div>
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="min-h-[calc(100vh-140px)] rounded-[32px] bg-[linear-gradient(180deg,#F8FAFC_0%,#EFF8FF_100%)] p-6">
      <div className="space-y-4">
        {[1, 2, 3].map((item) => (
          <div key={item} className="h-32 animate-pulse rounded-3xl border border-[#D8E7F3] bg-white/80" />
        ))}
      </div>
    </div>
  );
}

function EmptyState({ query }: { query: string }) {
  return (
    <div className="rounded-3xl border border-dashed border-[#B7DDF5] bg-[#F8FAFC] p-10 text-center">
      <h3 className="text-xl font-bold text-[#0F172A]">{query.trim() ? "No patients found." : "Search for a patient."}</h3>
      <p className="mt-2 text-sm text-[#64748B]">
        {query.trim()
          ? "Try searching by name, phone, NIC, or patient ID."
          : "Use name, phone number, NIC, or patient ID to find records."}
      </p>
    </div>
  );
}

function PatientCard({
  onCheckIn,
  onView,
  patient,
}: {
  onCheckIn: (patient: ReceptionPatientRecord) => void;
  onView: (patient: ReceptionPatientRecord) => void;
  patient: ReceptionPatientRecord;
}) {
  const canCheckIn = patient.todayBookingStatus === "booked" || patient.todayBookingStatus === "late";

  return (
    <article className="rounded-3xl border border-[#D8E7F3] bg-white p-5 shadow-[0_14px_34px_rgba(6,26,46,0.05)]">
      <div className="grid gap-5 xl:grid-cols-[minmax(280px,1fr)_minmax(340px,1.2fr)_auto] xl:items-center">
        <div className="flex min-w-0 items-start gap-4">
          <Avatar name={patient.patientName} />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="truncate text-lg font-bold text-[#0F172A]">{patient.patientName}</h3>
              <StatusPill status={patient.todayBookingStatus} />
            </div>
            <p className="mt-1 text-sm text-[#64748B]">
              {patient.age ? `Age ${patient.age}` : "Age not recorded"} {patient.gender ? `• ${patient.gender}` : ""}
            </p>
            <p className="mt-1 text-sm text-[#64748B]">Phone: {patient.phone || "No phone"}</p>
            <p className="mt-1 text-sm text-[#64748B]">NIC / ID: {patient.nic || patient.patientId}</p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-[#D8E7F3] bg-[#F8FAFC] px-4 py-3">
            <p className="text-xs font-semibold text-[#64748B]">Last visit</p>
            <p className="mt-1 font-bold text-[#0F172A]">{patient.lastVisitDate || "Not available"}</p>
          </div>
          <div className="rounded-2xl border border-[#D8E7F3] bg-[#F8FAFC] px-4 py-3">
            <p className="text-xs font-semibold text-[#64748B]">Upcoming</p>
            <p className="mt-1 font-bold text-[#0F172A]">
              {patient.upcomingAppointment
                ? `${patient.upcomingAppointment.appointmentDate === TODAY ? "Today" : patient.upcomingAppointment.appointmentDate} ${formatClock(patient.upcomingAppointment.appointmentTime)}`
                : "No upcoming booking"}
            </p>
            <p className="mt-1 text-xs font-semibold text-[#64748B]">
              {patient.upcomingAppointment
                ? `${patient.upcomingAppointment.doctorName} • ${patient.upcomingAppointment.specialization}`
                : "Ready for booking"}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 xl:justify-end">
          <ActionButton onClick={() => onView(patient)}>
            <Eye size={14} />
            View Profile
          </ActionButton>
          <ActionButton onClick={() => window.location.assign("/receptionist/bookings")}>
            <CalendarDays size={14} />
            Book Appointment
          </ActionButton>
          <ActionButton onClick={() => window.location.assign("/receptionist/walk-ins")}>
            <UserPlus size={14} />
            Add Walk-in
          </ActionButton>
          <ActionButton disabled={!canCheckIn} onClick={() => onCheckIn(patient)} tone="primary">
            <UserCheck size={14} />
            Check-in
          </ActionButton>
          <ActionButton disabled onClick={() => undefined}>
            <Edit3 size={14} />
            Update Contact
          </ActionButton>
        </div>
      </div>
    </article>
  );
}

export default function ReceptionPatientsPage() {
  const navigate = useNavigate();
  const [permissions, setPermissions] = useState<ReceptionPermissions | null>(null);
  const [records, setRecords] = useState<ReceptionPatientRecord[]>([]);
  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<PatientFilter>("all");
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState<Notice | null>(null);
  const [selectedPatient, setSelectedPatient] = useState<ReceptionPatientRecord | null>(null);

  const load = async (nextQuery = query) => {
    setLoading(true);
    try {
      const permissionData = await getReceptionPermissions();
      setPermissions(permissionData);

      if (!permissionData.check_in && !permissionData.appointments) {
        setRecords([]);
        setError("");
        return;
      }

      const [patientData, visitData] = await Promise.all([
        searchPatients(nextQuery),
        getReceptionVisits({ filter: "all", limit: 200 }).catch(() => ({ visits: [] as ReceptionVisit[] })),
      ]);
      setRecords(buildPatientRecords(patientData, visitData.visits));
      setError("");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to load patients.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(async () => {
      setSearching(true);
      try {
        const [patientData, visitData] = await Promise.all([
          searchPatients(query),
          getReceptionVisits({ filter: "all", limit: 200 }).catch(() => ({ visits: [] as ReceptionVisit[] })),
        ]);
        setRecords(buildPatientRecords(patientData, visitData.visits));
      } catch (caughtError) {
        setNotice({
          tone: "danger",
          message: caughtError instanceof Error ? caughtError.message : "Unable to search patients.",
        });
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => window.clearTimeout(timeout);
  }, [query]);

  const filteredRecords = useMemo(() => {
    return records.filter((record) => {
      if (activeFilter === "today") return record.todayBookingStatus !== "none";
      if (activeFilter === "recent") return Boolean(record.lastVisitDate);
      if (activeFilter === "no_upcoming") return !record.upcomingAppointment;
      return true;
    });
  }, [activeFilter, records]);

  const summary = useMemo(
    () => ({
      total: records.length,
      today: records.filter((record) => record.todayBookingStatus !== "none").length,
      checkedIn: records.filter((record) => record.todayBookingStatus === "checked_in").length,
      recent: records.filter((record) => Boolean(record.lastVisitDate)).length,
    }),
    [records]
  );

  if (loading) return <LoadingState />;

  if (error) {
    return (
      <div className="space-y-4">
        <InlineAlert tone="danger" message={error} />
        <ActionButton onClick={() => void load()} tone="primary">Retry</ActionButton>
      </div>
    );
  }

  if (!permissions?.check_in && !permissions?.appointments) {
    return (
      <PermissionState
        title="Patient lookup is not assigned"
        message="This receptionist account cannot search patient records until patient or appointment access is enabled."
      />
    );
  }

  return (
    <div className="min-h-[calc(100vh-140px)] space-y-6 rounded-[32px] bg-[linear-gradient(180deg,#F8FAFC_0%,#EFF8FF_100%)] p-5 md:p-6">
      {notice ? <InlineAlert tone={notice.tone} message={notice.message} /> : null}

      <section className="rounded-[28px] border border-white/15 bg-[linear-gradient(135deg,#061A2E,#0B3558)] p-6 text-white shadow-[0_24px_70px_rgba(6,26,46,0.24)]">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold text-[#BAE6FD]">
              <Users size={14} />
              Reception Desk
            </div>
            <h1 className="mt-4 text-3xl font-bold tracking-tight">Patients</h1>
            <p className="mt-2 text-sm text-sky-100">Search patient records and start front-desk actions</p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm font-semibold">
            <CalendarDays size={16} />
            {formatDateLabel()}
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard icon={Users} label="Total Patients" value={summary.total} />
        <SummaryCard icon={CalendarDays} label="Appointments Today" value={summary.today} />
        <SummaryCard icon={UserCheck} label="Checked-in Today" value={summary.checkedIn} />
        <SummaryCard icon={Clock3} label="Recent Visits" value={summary.recent} />
      </section>

      <section className="rounded-[28px] border border-[#D8E7F3] bg-white p-5 shadow-[0_18px_48px_rgba(6,26,46,0.06)]">
        <p className="text-sm font-semibold text-[#0EA5E9]">Patient search</p>
        <h2 className="mt-1 text-2xl font-bold text-[#0F172A]">Find records</h2>
        <label className="mt-5 flex h-14 items-center gap-3 rounded-2xl border border-[#D8E7F3] bg-white px-4">
          <Search size={18} className="text-[#64748B]" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by patient name, phone, NIC, or patient ID"
            className="w-full bg-transparent text-sm font-medium text-[#0F172A] outline-none placeholder:text-[#64748B]"
          />
          {searching ? <Loader2 size={16} className="animate-spin text-[#0EA5E9]" /> : null}
        </label>
        <div className="mt-4 flex flex-wrap gap-2">
          {filters.map((filter) => {
            const selected = activeFilter === filter.key;
            return (
              <button
                key={filter.key}
                type="button"
                onClick={() => setActiveFilter(filter.key)}
                className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                  selected
                    ? "border-[#0EA5E9] bg-[#EFF8FF] text-[#0B3558]"
                    : "border-[#D8E7F3] bg-white text-[#64748B] hover:bg-[#F8FAFC]"
                }`}
              >
                {filter.label}
              </button>
            );
          })}
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {[
          ["New Booking", "/receptionist/bookings", CalendarDays],
          ["Add Walk-in", "/receptionist/walk-ins", UserPlus],
          ["Check-in", "/receptionist/check-in", UserCheck],
          ["Today Sessions", "/receptionist/sessions", Stethoscope],
        ].map(([label, to, Icon]) => {
          const IconComponent = Icon as typeof CalendarDays;
          return (
            <button
              key={String(label)}
              type="button"
              onClick={() => navigate(String(to))}
              className="flex items-center justify-between rounded-2xl border border-[#D8E7F3] bg-white p-4 text-left shadow-[0_14px_34px_rgba(6,26,46,0.05)] transition hover:-translate-y-0.5 hover:border-[#0EA5E9]"
            >
              <span className="font-bold text-[#0F172A]">{String(label)}</span>
              <span className="rounded-2xl bg-[#EFF8FF] p-3 text-[#0EA5E9]">
                <IconComponent size={18} />
              </span>
            </button>
          );
        })}
      </section>

      <section className="rounded-[28px] border border-[#D8E7F3] bg-white p-5 shadow-[0_18px_48px_rgba(6,26,46,0.06)]">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold text-[#0EA5E9]">Patient results</p>
            <h2 className="mt-1 text-2xl font-bold text-[#0F172A]">Records</h2>
          </div>
          <p className="text-sm font-semibold text-[#64748B]">{filteredRecords.length} shown</p>
        </div>

        <div className="mt-5 space-y-3">
          {filteredRecords.length === 0 ? (
            <EmptyState query={query} />
          ) : (
            filteredRecords.map((patient) => (
              <PatientCard
                key={patient.patientId}
                patient={patient}
                onView={setSelectedPatient}
                onCheckIn={(target) =>
                  target.bookingId
                    ? navigate("/receptionist/check-in")
                    : setNotice({ tone: "warning", message: "This patient has no check-in-ready booking today." })
                }
              />
            ))
          )}
        </div>
      </section>

      {selectedPatient ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-[#061A2E]/45 px-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-[28px] border border-[#D8E7F3] bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-[#0EA5E9]">Patient profile preview</p>
                <h2 className="mt-1 text-2xl font-bold text-[#0F172A]">{selectedPatient.patientName}</h2>
                <p className="mt-1 text-sm text-[#64748B]">Patient ID {selectedPatient.patientId}</p>
              </div>
              <ActionButton onClick={() => setSelectedPatient(null)}>Close</ActionButton>
            </div>
            <div className="mt-6 grid gap-3 md:grid-cols-2">
              {[
                ["Phone", selectedPatient.phone || "Not recorded"],
                ["NIC", selectedPatient.nic || "Not recorded"],
                ["Age", selectedPatient.age ? String(selectedPatient.age) : "Not recorded"],
                ["Gender", selectedPatient.gender || "Not recorded"],
                ["Last visit", selectedPatient.lastVisitDate || "Not available"],
                [
                  "Upcoming",
                  selectedPatient.upcomingAppointment
                    ? `${selectedPatient.upcomingAppointment.appointmentDate} ${formatClock(selectedPatient.upcomingAppointment.appointmentTime)} with ${selectedPatient.upcomingAppointment.doctorName}`
                    : "No upcoming booking",
                ],
              ].map(([label, value]) => (
                <div key={label} className="rounded-2xl border border-[#D8E7F3] bg-[#F8FAFC] p-4">
                  <p className="text-xs font-semibold text-[#64748B]">{label}</p>
                  <p className="mt-1 font-bold text-[#0F172A]">{value}</p>
                </div>
              ))}
            </div>
            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <ActionButton onClick={() => navigate("/receptionist/bookings")}>Book Appointment</ActionButton>
              <ActionButton onClick={() => navigate("/receptionist/walk-ins")}>Add Walk-in</ActionButton>
              <ActionButton disabled>Update Contact</ActionButton>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
