import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  CalendarDays,
  Clock3,
  Eye,
  Phone,
  RotateCcw,
  Search,
  SendToBack,
  UserPlus,
  UserRoundX,
  Users,
} from "lucide-react";
import PermissionState from "../../components/reception/PermissionState";
import { InlineAlert } from "../../components/reception/ReceptionUI";
import {
  getReceptionPermissions,
  getReceptionSessions,
  getReceptionVisits,
  markVisitMissed,
  moveVisitToQueue,
} from "../../services/reception.service";
import type {
  ReceptionPermissions,
  ReceptionSession,
  ReceptionVisit,
  VisitStatus,
} from "../../types/reception.types";

type ExceptionStatus = "late" | "missed" | "skipped" | "cancelled" | "re_added" | "waiting";
type StatusTab = "late" | "missed" | "skipped" | "cancelled";
type StatusFilter = "all" | ExceptionStatus;
type TimeFilter = "today" | "week";
type NoticeTone = "success" | "danger" | "warning" | "info";

type LateMissedPatient = {
  id: number;
  bookingId: number;
  patientId: number;
  patientName: string;
  patientImageUrl: string | null;
  phone: string | null;
  appointmentTime: string;
  delayMinutes: number | null;
  doctorName: string;
  specialization: string;
  roomNumber: string;
  bookingReference: string;
  sessionId: number | null;
  status: ExceptionStatus;
  notes: string;
  reason: string;
  source?: ReceptionVisit;
};

type Notice = {
  tone: NoticeTone;
  message: string;
};

const tabs: Array<{ key: StatusTab; label: string }> = [
  { key: "late", label: "Late Patients" },
  { key: "missed", label: "Missed Patients" },
  { key: "skipped", label: "Skipped Patients" },
  { key: "cancelled", label: "Cancelled Patients" },
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

function calculateDelayMinutes(appointmentTime: string, status: ExceptionStatus) {
  if (status !== "late") return null;
  const [hourPart = "0", minutePart = "0"] = appointmentTime.split(":");
  const hour = Number(hourPart);
  const minute = Number(minutePart);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
  const appointment = new Date();
  appointment.setHours(hour, minute, 0, 0);
  return Math.max(0, Math.floor((Date.now() - appointment.getTime()) / 60000));
}

function statusFromVisit(status: VisitStatus): ExceptionStatus | null {
  if (status === "late") return "late";
  if (status === "missed") return "missed";
  if (status === "cancelled") return "cancelled";
  return null;
}

function buildRoomFallback(visit: ReceptionVisit) {
  const seed = visit.sessionId || visit.doctorId || 1;
  // TODO: Replace room fallback when late/missed API returns room assignment.
  return `Room ${String((seed % 6) + 1).padStart(2, "0")}`;
}

function mapVisitToException(visit: ReceptionVisit): LateMissedPatient | null {
  const status = statusFromVisit(visit.visitStatus);
  if (!status) return null;
  return {
    id: visit.appointmentId,
    bookingId: visit.bookingId,
    patientId: visit.patientId,
    patientName: visit.patientName,
    patientImageUrl: null,
    phone: visit.patientPhone,
    appointmentTime: visit.appointmentTime,
    delayMinutes: calculateDelayMinutes(visit.appointmentTime, status),
    doctorName: visit.doctorName,
    specialization: visit.specialty || "General Medicine",
    roomNumber: buildRoomFallback(visit),
    bookingReference: visit.bookingNumber,
    sessionId: visit.sessionId,
    status,
    notes: "",
    reason: visit.bookingSource || "Appointment exception",
    source: visit,
  };
}

function statusLabel(status: ExceptionStatus) {
  const labels: Record<ExceptionStatus, string> = {
    late: "Late",
    missed: "Missed",
    skipped: "Skipped",
    cancelled: "Cancelled",
    re_added: "Re-added",
    waiting: "Waiting",
  };
  return labels[status];
}

function statusClasses(status: ExceptionStatus) {
  if (status === "late" || status === "skipped") return "border-amber-200 bg-amber-50 text-amber-800";
  if (status === "missed") return "border-orange-200 bg-orange-50 text-orange-700";
  if (status === "cancelled") return "border-red-200 bg-red-50 text-red-700";
  if (status === "re_added") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  return "border-sky-200 bg-sky-50 text-sky-700";
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
  tone?: "primary" | "secondary" | "danger" | "warning";
}) {
  const classes =
    tone === "primary"
      ? "border-[#0EA5E9] bg-[#0EA5E9] text-white hover:bg-[#0284C7]"
      : tone === "danger"
        ? "border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
        : tone === "warning"
          ? "border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100"
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

function StatusPill({ status }: { status: ExceptionStatus }) {
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

function EmptyState({ searchActive, tab }: { searchActive: boolean; tab: StatusTab }) {
  const title =
    searchActive
      ? "No matching patients found."
      : tab === "late"
        ? "No late patients right now."
        : tab === "missed"
          ? "No missed appointments today."
          : tab === "skipped"
            ? "No skipped patients right now."
            : "No cancelled patients today.";

  const helper = searchActive
    ? "Try changing the tab, session, or search keyword."
    : tab === "late"
      ? "Patients who pass the late threshold will appear here."
      : tab === "missed"
        ? "Missed patients will appear here after they are marked missed."
        : "Patients will appear here when this exception status is recorded.";

  return (
    <div className="rounded-3xl border border-dashed border-[#B7DDF5] bg-[#F8FAFC] p-10 text-center">
      <h3 className="text-xl font-bold text-[#0F172A]">{title}</h3>
      <p className="mt-2 text-sm text-[#64748B]">{helper}</p>
    </div>
  );
}

function PatientCard({
  onMarkMissed,
  onMoveToEnd,
  onReadd,
  onViewPatient,
  onViewSession,
  patient,
}: {
  onMarkMissed: (patient: LateMissedPatient) => void;
  onMoveToEnd: (patient: LateMissedPatient) => void;
  onReadd: (patient: LateMissedPatient) => void;
  onViewPatient: (patient: LateMissedPatient) => void;
  onViewSession: (patient: LateMissedPatient) => void;
  patient: LateMissedPatient;
}) {
  const delayWarning = patient.status === "late" && (patient.delayMinutes || 0) >= 15;
  const canCall = Boolean(patient.phone);

  return (
    <article className="rounded-3xl border border-[#D8E7F3] bg-white p-5 shadow-[0_14px_34px_rgba(6,26,46,0.05)]">
      <div className="grid gap-5 xl:grid-cols-[minmax(280px,1fr)_minmax(340px,1.2fr)_auto] xl:items-center">
        <div className="flex min-w-0 items-start gap-4">
          <Avatar name={patient.patientName} />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="truncate text-lg font-bold text-[#0F172A]">{patient.patientName}</h3>
              <StatusPill status={patient.status} />
            </div>
            <p className="mt-1 text-sm text-[#64748B]">Phone: {patient.phone || "No phone"}</p>
            <p className="mt-2 text-xs font-semibold text-[#0B3558]">Ref {patient.bookingReference}</p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-[#D8E7F3] bg-[#F8FAFC] px-4 py-3">
            <p className="text-xs font-semibold text-[#64748B]">Appointment</p>
            <p className="mt-1 font-bold text-[#0F172A]">{formatClock(patient.appointmentTime)}</p>
            <p className="mt-1 text-xs font-semibold text-[#64748B]">
              Delay: {patient.delayMinutes !== null ? `${patient.delayMinutes} min` : "Not tracked"}
            </p>
          </div>
          <div className="rounded-2xl border border-[#D8E7F3] bg-[#F8FAFC] px-4 py-3">
            <p className="text-xs font-semibold text-[#64748B]">Doctor / Session</p>
            <p className="mt-1 font-bold text-[#0F172A]">{patient.doctorName}</p>
            <p className="mt-1 text-xs font-semibold text-[#64748B]">
              {patient.specialization} • {patient.roomNumber}
            </p>
          </div>
        </div>

        <div className="space-y-3 xl:text-right">
          {delayWarning ? (
            <p className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
              Patient is 15+ minutes late. Recommended: move to end or mark missed.
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2 xl:justify-end">
            {canCall ? (
              <a
                href={`tel:${patient.phone}`}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#D8E7F3] bg-white px-3.5 py-2 text-sm font-semibold text-[#0B3558] transition hover:bg-[#EFF8FF]"
                aria-label={`Call ${patient.patientName}`}
              >
                <Phone size={14} />
                Call Patient
              </a>
            ) : null}
            {(patient.status === "late" || patient.status === "skipped" || patient.status === "waiting") ? (
              <ActionButton onClick={() => onMoveToEnd(patient)} tone="warning">
                <SendToBack size={14} />
                Move to End
              </ActionButton>
            ) : null}
            {(patient.status === "late" || patient.status === "skipped") ? (
              <ActionButton onClick={() => onMarkMissed(patient)} tone="danger">
                <UserRoundX size={14} />
                Mark Missed
              </ActionButton>
            ) : null}
            {(patient.status === "missed" || patient.status === "skipped") ? (
              <ActionButton onClick={() => onReadd(patient)} tone="primary">
                <UserPlus size={14} />
                Re-add to Queue
              </ActionButton>
            ) : null}
            {patient.status === "missed" ? (
              <Link
                to="/receptionist/bookings"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#D8E7F3] bg-white px-3.5 py-2 text-sm font-semibold text-[#0B3558] transition hover:bg-[#EFF8FF]"
              >
                <RotateCcw size={14} />
                Reschedule
              </Link>
            ) : null}
            {patient.status === "cancelled" ? (
              <Link
                to="/receptionist/bookings"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#D8E7F3] bg-white px-3.5 py-2 text-sm font-semibold text-[#0B3558] transition hover:bg-[#EFF8FF]"
              >
                <RotateCcw size={14} />
                Rebook
              </Link>
            ) : null}
            <ActionButton onClick={() => onViewSession(patient)}>
              <Eye size={14} />
              View Session
            </ActionButton>
            <ActionButton onClick={() => onViewPatient(patient)}>
              <Eye size={14} />
              View Patient
            </ActionButton>
          </div>
        </div>
      </div>
      {patient.notes || patient.reason ? (
        <p className="mt-4 rounded-2xl border border-[#D8E7F3] bg-[#F8FAFC] px-4 py-3 text-sm text-[#64748B]">
          {patient.notes || patient.reason}
        </p>
      ) : null}
    </article>
  );
}

export default function ReceptionLateMissedPage() {
  const navigate = useNavigate();
  const [permissions, setPermissions] = useState<ReceptionPermissions | null>(null);
  const [patients, setPatients] = useState<LateMissedPatient[]>([]);
  const [sessions, setSessions] = useState<ReceptionSession[]>([]);
  const [activeTab, setActiveTab] = useState<StatusTab>("late");
  const [search, setSearch] = useState("");
  const [sessionFilter, setSessionFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("today");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState<Notice | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const permissionData = await getReceptionPermissions();
      setPermissions(permissionData);

      if (!permissionData.appointments) {
        setPatients([]);
        setError("");
        return;
      }

      const [visits, sessionData] = await Promise.all([
        getReceptionVisits({ filter: timeFilter === "today" ? "today" : "all", limit: 200 }),
        getReceptionSessions().catch(() => [] as ReceptionSession[]),
      ]);

      setPatients(visits.visits.map(mapVisitToException).filter((item): item is LateMissedPatient => Boolean(item)));
      setSessions(sessionData);
      setError("");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to load late and missed patients.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeFilter]);

  const tabCounts = useMemo(
    () => ({
      late: patients.filter((patient) => patient.status === "late").length,
      missed: patients.filter((patient) => patient.status === "missed").length,
      skipped: patients.filter((patient) => patient.status === "skipped").length,
      cancelled: patients.filter((patient) => patient.status === "cancelled").length,
    }),
    [patients]
  );

  const summary = useMemo(
    () => ({
      late: tabCounts.late,
      missed: tabCounts.missed,
      skipped: tabCounts.skipped,
      cancelled: tabCounts.cancelled,
      reAdded: patients.filter((patient) => patient.status === "re_added").length,
    }),
    [patients, tabCounts]
  );

  const filteredPatients = useMemo(() => {
    const query = search.trim().toLowerCase();
    return patients.filter((patient) => {
      if (patient.status !== activeTab) return false;
      if (statusFilter !== "all" && patient.status !== statusFilter) return false;
      if (sessionFilter && String(patient.sessionId || "") !== sessionFilter) return false;
      if (!query) return true;
      return [
        patient.patientName,
        patient.phone || "",
        patient.doctorName,
        patient.roomNumber,
        patient.bookingReference,
        patient.specialization,
      ].some((value) => value.toLowerCase().includes(query));
    });
  }, [activeTab, patients, search, sessionFilter, statusFilter]);

  const updateStatus = (patient: LateMissedPatient, status: ExceptionStatus, message: string) => {
    setPatients((current) => current.map((item) => (item.id === patient.id ? { ...item, status } : item)));
    setNotice({ tone: "success", message });
  };

  const handleMoveToEnd = (patient: LateMissedPatient) => {
    // TODO: Connect move-to-end action to backend queue API.
    updateStatus(patient, "waiting", `${patient.patientName} moved to the end locally.`);
  };

  const handleReadd = async (patient: LateMissedPatient) => {
    if (patient.source) {
      try {
        const response = await moveVisitToQueue(patient.source.bookingId);
        setNotice({ tone: "success", message: response.message || "Patient re-added to queue." });
        await load();
        return;
      } catch (caughtError) {
        setNotice({
          tone: "danger",
          message: caughtError instanceof Error ? caughtError.message : "Could not re-add patient.",
        });
        return;
      }
    }

    // TODO: Connect re-add action to backend queue API for skipped/local patients.
    updateStatus(patient, "re_added", `${patient.patientName} re-added locally.`);
  };

  const handleMarkMissed = async (patient: LateMissedPatient) => {
    const confirmed = window.confirm(`Mark ${patient.patientName} as missed?`);
    if (!confirmed) return;

    if (patient.source) {
      try {
        const response = await markVisitMissed(patient.source.bookingId);
        setNotice({ tone: "success", message: response.message || "Patient marked missed." });
        await load();
        return;
      } catch (caughtError) {
        setNotice({
          tone: "danger",
          message: caughtError instanceof Error ? caughtError.message : "Could not mark patient missed.",
        });
        return;
      }
    }

    // TODO: Connect mark-missed action to backend API for skipped/local patients.
    updateStatus(patient, "missed", `${patient.patientName} marked missed locally.`);
  };

  if (loading) return <LoadingState />;

  if (error) {
    return (
      <div className="space-y-4">
        <InlineAlert tone="danger" message={error} />
        <ActionButton onClick={() => void load()} tone="primary">Retry</ActionButton>
      </div>
    );
  }

  if (!permissions?.appointments) {
    return (
      <PermissionState
        title="Late and missed management is not assigned"
        message="This receptionist account cannot manage delayed arrivals until appointment access is enabled."
      />
    );
  }

  const searchActive = Boolean(search.trim() || sessionFilter || statusFilter !== "all");

  return (
    <div className="min-h-[calc(100vh-140px)] space-y-6 rounded-[32px] bg-[linear-gradient(180deg,#F8FAFC_0%,#EFF8FF_100%)] p-5 md:p-6">
      {notice ? <InlineAlert tone={notice.tone} message={notice.message} /> : null}

      <section className="rounded-[28px] border border-white/15 bg-[linear-gradient(135deg,#061A2E,#0B3558)] p-6 text-white shadow-[0_24px_70px_rgba(6,26,46,0.24)]">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold text-[#BAE6FD]">
              <AlertTriangle size={14} />
              Front Desk
            </div>
            <h1 className="mt-4 text-3xl font-bold tracking-tight">Late / Missed</h1>
            <p className="mt-2 text-sm text-sky-100">Manage delayed arrivals and missed appointments</p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm font-semibold">
            <CalendarDays size={16} />
            {formatDateLabel()}
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <SummaryCard icon={Clock3} label="Late Patients" value={summary.late} />
        <SummaryCard icon={UserRoundX} label="Missed Patients" value={summary.missed} />
        <SummaryCard icon={SendToBack} label="Skipped Patients" value={summary.skipped} />
        <SummaryCard icon={AlertTriangle} label="Cancelled" value={summary.cancelled} />
        <SummaryCard icon={UserPlus} label="Re-added Today" value={summary.reAdded} />
      </section>

      <section className="rounded-[28px] border border-[#D8E7F3] bg-white p-5 shadow-[0_18px_48px_rgba(6,26,46,0.06)]">
        <p className="text-sm font-semibold text-[#0EA5E9]">Exception filters</p>
        <h2 className="mt-1 text-2xl font-bold text-[#0F172A]">Find delayed patients</h2>
        <div className="mt-5 grid gap-3 xl:grid-cols-[minmax(0,1fr)_220px_170px_160px]">
          <label className="flex h-12 items-center gap-3 rounded-2xl border border-[#D8E7F3] bg-white px-4">
            <Search size={17} className="text-[#64748B]" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search patient, phone, doctor, room, or booking ref"
              className="w-full bg-transparent text-sm font-medium text-[#0F172A] outline-none placeholder:text-[#64748B]"
            />
          </label>
          <select value={sessionFilter} onChange={(event) => setSessionFilter(event.target.value)} className="h-12 rounded-2xl border border-[#D8E7F3] bg-white px-4 text-sm font-semibold text-[#0F172A] outline-none">
            <option value="">All Sessions</option>
            {sessions.map((session) => (
              <option key={session.id} value={session.id}>
                {session.doctorName} • {formatClock(session.startTime)}
              </option>
            ))}
          </select>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as StatusFilter)} className="h-12 rounded-2xl border border-[#D8E7F3] bg-white px-4 text-sm font-semibold text-[#0F172A] outline-none">
            <option value="all">All statuses</option>
            <option value="late">Late</option>
            <option value="missed">Missed</option>
            <option value="skipped">Skipped</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <select value={timeFilter} onChange={(event) => setTimeFilter(event.target.value as TimeFilter)} className="h-12 rounded-2xl border border-[#D8E7F3] bg-white px-4 text-sm font-semibold text-[#0F172A] outline-none">
            <option value="today">Today</option>
            <option value="week">This Week</option>
          </select>
        </div>
      </section>

      <section className="rounded-[28px] border border-[#D8E7F3] bg-white p-5 shadow-[0_18px_48px_rgba(6,26,46,0.06)]">
        <div className="flex flex-wrap gap-2">
          {tabs.map((tab) => {
            const selected = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition ${
                  selected
                    ? "border-[#0EA5E9] bg-[#EFF8FF] text-[#0B3558]"
                    : "border-[#D8E7F3] bg-white text-[#64748B] hover:bg-[#F8FAFC]"
                }`}
              >
                {tab.label}
                <span className="rounded-full bg-white px-2 py-0.5 text-xs text-[#0B3558]">{tabCounts[tab.key]}</span>
              </button>
            );
          })}
        </div>

        <div className="mt-5 space-y-3">
          {filteredPatients.length === 0 ? (
            <EmptyState searchActive={searchActive} tab={activeTab} />
          ) : (
            filteredPatients.map((patient) => (
              <PatientCard
                key={`${patient.id}-${patient.status}`}
                patient={patient}
                onMarkMissed={(target) => void handleMarkMissed(target)}
                onMoveToEnd={handleMoveToEnd}
                onReadd={(target) => void handleReadd(target)}
                onViewPatient={() => setNotice({ tone: "info", message: "Patient detail route is not available yet." })}
                onViewSession={(target) =>
                  target.sessionId
                    ? navigate(`/receptionist/sessions/${target.sessionId}`)
                    : setNotice({ tone: "warning", message: "No session is attached to this patient." })
                }
              />
            ))
          )}
        </div>
      </section>
    </div>
  );
}
