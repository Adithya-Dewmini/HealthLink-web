import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Clock3,
  DoorOpen,
  Loader2,
  Pause,
  Play,
  RotateCcw,
  ShieldAlert,
  SkipForward,
  Stethoscope,
  Users,
} from "lucide-react";
import PermissionState from "../../components/reception/PermissionState";
import { InlineAlert } from "../../components/reception/ReceptionUI";
import { resolveApiAssetUrl } from "../../services/api";
import {
  endQueue,
  getReceptionPermissions,
  getReceptionQueueBySession,
  getReceptionSessionDoctors,
  getReceptionSessions,
  getReceptionVisits,
  pauseQueue,
  resumeQueue,
  startQueue,
} from "../../services/reception.service";
import type {
  QueueStatus,
  ReceptionPermissions,
  ReceptionQueueDetail,
  ReceptionQueuePatient,
  ReceptionSession,
  ReceptionSessionDoctor,
  ReceptionVisit,
} from "../../types/reception.types";

type SessionDetailStatus = "not_started" | "live" | "paused" | "completed" | "cancelled";
type PatientPreviewFilter = "waiting" | "serving" | "completed" | "missed" | "walkins";
type NoticeTone = "success" | "danger" | "warning" | "info";

type Notice = {
  tone: NoticeTone;
  message: string;
};

type SessionDetail = {
  id: number;
  doctorName: string;
  doctorImageUrl: string | null;
  initials: string;
  specialization: string;
  medicalCenterName: string;
  roomNumber: string;
  date: string;
  startTime: string;
  endTime: string;
  status: SessionDetailStatus;
  queueStatus: QueueStatus;
  queueId: number | null;
};

type QueueSummary = {
  nowServing: string;
  nextPatient: string;
  waitingCount: number;
  checkedInCount: number;
  completedCount: number;
  missedLateCount: number;
  walkInCount: number;
};

type PatientPreview = {
  id: number;
  queueNumber: string;
  patientName: string;
  appointmentTime: string;
  type: "Booked" | "Walk-in";
  status: ReceptionQueuePatient["status"];
};

const patientFilters: Array<{ key: PatientPreviewFilter; label: string }> = [
  { key: "waiting", label: "Waiting" },
  { key: "serving", label: "Now Serving" },
  { key: "completed", label: "Completed" },
  { key: "missed", label: "Missed" },
  { key: "walkins", label: "Walk-ins" },
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function resolveDoctorImageUrl(candidate: unknown) {
  if (!isRecord(candidate)) return null;
  const keys = ["doctorProfileImage", "profileImageUrl", "avatarUrl", "image_url", "profile_image", "imageUrl"];

  for (const key of keys) {
    const value = candidate[key];
    if (typeof value === "string" && value.trim()) return resolveApiAssetUrl(value);
  }

  return null;
}

function getInitials(name: string) {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() || "")
      .join("") || "DR"
  );
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

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}

function statusFromQueue(status: QueueStatus): SessionDetailStatus {
  if (status === "live") return "live";
  if (status === "paused") return "paused";
  if (status === "completed") return "completed";
  return "not_started";
}

function statusLabel(status: SessionDetailStatus) {
  const labels: Record<SessionDetailStatus, string> = {
    not_started: "Not Started",
    live: "Queue Live",
    paused: "Paused",
    completed: "Completed",
    cancelled: "Cancelled",
  };

  return labels[status];
}

function statusClasses(status: SessionDetailStatus) {
  const classes: Record<SessionDetailStatus, string> = {
    not_started: "border-slate-200 bg-slate-100 text-slate-700",
    live: "border-emerald-200 bg-emerald-50 text-emerald-700",
    paused: "border-amber-200 bg-amber-50 text-amber-800",
    completed: "border-sky-200 bg-sky-50 text-sky-700",
    cancelled: "border-red-200 bg-red-50 text-red-700",
  };

  return classes[status];
}

function patientStatusLabel(status: ReceptionQueuePatient["status"]) {
  const labels: Record<ReceptionQueuePatient["status"], string> = {
    CHECKED_IN: "Checked-in",
    WAITING: "Waiting",
    LATE: "Late",
    WITH_DOCTOR: "Now Serving",
    COMPLETED: "Completed",
    MISSED: "Missed",
  };

  return labels[status];
}

function patientStatusClasses(status: ReceptionQueuePatient["status"]) {
  if (status === "COMPLETED") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "MISSED") return "border-red-200 bg-red-50 text-red-700";
  if (status === "LATE") return "border-amber-200 bg-amber-50 text-amber-800";
  if (status === "WITH_DOCTOR") return "border-sky-200 bg-sky-50 text-sky-700";
  return "border-slate-200 bg-slate-100 text-slate-700";
}

function buildRoomFallback(session: ReceptionSession) {
  // TODO: Replace room fallback when receptionist session details API returns room assignment.
  return `Room ${String((session.doctorId % 6) + 1).padStart(2, "0")}`;
}

function buildSessionDetail(
  session: ReceptionSession,
  doctors: ReceptionSessionDoctor[],
  queueDetail: ReceptionQueueDetail | null
): SessionDetail {
  const doctor =
    doctors.find((item) => item.doctorId === session.doctorId) ||
    doctors.find((item) => item.doctorName.trim().toLowerCase() === session.doctorName.trim().toLowerCase());
  const queue = queueDetail?.queue;
  const queueStatus = queue?.queueStatus || session.queueStatus;

  return {
    id: session.id,
    doctorName: session.doctorName,
    doctorImageUrl: resolveDoctorImageUrl(doctor) || resolveDoctorImageUrl(queue) || resolveDoctorImageUrl(session),
    initials: getInitials(session.doctorName),
    specialization: session.specialty || doctor?.specialization || "General Medicine",
    medicalCenterName: session.medicalCenterName || queue?.medicalCenterName || "Medical center",
    roomNumber: buildRoomFallback(session),
    date: session.date,
    startTime: session.startTime,
    endTime: session.endTime,
    status: statusFromQueue(queueStatus),
    queueStatus,
    queueId: queue?.queueId || session.queueId,
  };
}

function isWalkInSource(source: string | null | undefined) {
  return String(source || "").toLowerCase().includes("walk");
}

function buildVisitSourceMap(visits: ReceptionVisit[]) {
  const byPatientId = new Map<number, ReceptionVisit>();
  visits.forEach((visit) => {
    if (!byPatientId.has(visit.patientId)) {
      byPatientId.set(visit.patientId, visit);
    }
  });
  return byPatientId;
}

function buildQueueSummaryFromPatients(detail: ReceptionQueueDetail | null, patients: PatientPreview[]): QueueSummary {
  return {
    nowServing: detail?.currentPatient
      ? `#${detail.currentPatient.tokenNumber} - ${detail.currentPatient.patientName}`
      : "No patient is being served yet.",
    nextPatient: detail?.nextPatient
      ? `#${detail.nextPatient.tokenNumber} - ${detail.nextPatient.patientName}`
      : "No next patient queued.",
    waitingCount: detail?.waitingPatients.length || 0,
    checkedInCount: detail?.checkedInPatients.length || 0,
    completedCount: detail?.completedPatients.length || 0,
    missedLateCount: (detail?.missedPatients.length || 0) + (detail?.latePatients.length || 0),
    walkInCount: patients.filter((patient) => patient.type === "Walk-in").length,
  };
}

function toPatientPreview(patient: ReceptionQueuePatient, sourceVisit?: ReceptionVisit): PatientPreview {
  const isWalkIn = patient.isWalkIn === true || isWalkInSource(sourceVisit?.bookingSource);
  return {
    id: patient.id,
    queueNumber: `#${patient.tokenNumber}`,
    patientName: patient.patientName,
    appointmentTime: formatClock(patient.bookingTime || sourceVisit?.appointmentTime || null),
    type: isWalkIn ? "Walk-in" : "Booked",
    status: patient.status,
  };
}

function buildPatientPreview(detail: ReceptionQueueDetail | null, visitSourceMap: Map<number, ReceptionVisit>) {
  if (!detail) return [];

  const uniquePatients = new Map<number, ReceptionQueuePatient>();
  [
    detail.currentPatient,
    detail.nextPatient,
    ...detail.checkedInPatients,
    ...detail.waitingPatients,
    ...detail.latePatients,
    ...detail.withDoctorPatients,
    ...detail.completedPatients,
    ...detail.missedPatients,
  ]
    .filter((patient): patient is ReceptionQueuePatient => Boolean(patient))
    .forEach((patient) => uniquePatients.set(patient.id, patient));

  return Array.from(uniquePatients.values()).map((patient) =>
    toPatientPreview(patient, visitSourceMap.get(patient.patientId))
  );
}

function patientMatchesFilter(patient: PatientPreview, filter: PatientPreviewFilter) {
  if (filter === "waiting") return patient.status === "WAITING" || patient.status === "CHECKED_IN" || patient.status === "LATE";
  if (filter === "serving") return patient.status === "WITH_DOCTOR";
  if (filter === "completed") return patient.status === "COMPLETED";
  if (filter === "missed") return patient.status === "MISSED";
  return patient.type === "Walk-in";
}

function DoctorAvatar({ imageUrl, initials, name }: { imageUrl: string | null; initials: string; name: string }) {
  const [failed, setFailed] = useState(false);

  if (imageUrl && !failed) {
    return (
      <img
        src={imageUrl}
        alt={name}
        className="h-20 w-20 rounded-3xl border border-white/20 object-cover shadow-[0_18px_42px_rgba(6,26,46,0.22)]"
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <div className="flex h-20 w-20 items-center justify-center rounded-3xl border border-white/20 bg-white/15 text-xl font-bold text-white">
      {initials}
    </div>
  );
}

function StatusPill({ status }: { status: SessionDetailStatus }) {
  return (
    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${statusClasses(status)}`}>
      {statusLabel(status)}
    </span>
  );
}

function ActionButton({
  children,
  disabled,
  onClick,
  tone = "secondary",
}: {
  children: ReactNode;
  disabled?: boolean;
  onClick: () => void;
  tone?: "primary" | "secondary" | "danger";
}) {
  const toneClasses =
    tone === "primary"
      ? "border-[#0EA5E9] bg-[#0EA5E9] text-white hover:bg-[#0284C7]"
      : tone === "danger"
        ? "border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
        : "border-[#D8E7F3] bg-white text-[#0B3558] hover:bg-[#EFF8FF]";

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition ${toneClasses} disabled:cursor-not-allowed disabled:opacity-45`}
    >
      {children}
    </button>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Users;
  label: string;
  value: number | string;
}) {
  return (
    <div className="rounded-3xl border border-[#D8E7F3] bg-white p-5 shadow-[0_16px_42px_rgba(6,26,46,0.06)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-[#64748B]">{label}</p>
          <p className="mt-2 text-lg font-bold text-[#0F172A]">{value}</p>
        </div>
        <div className="rounded-2xl bg-[#EFF8FF] p-3 text-[#0EA5E9]">
          <Icon size={18} />
        </div>
      </div>
    </div>
  );
}

function SectionCard({ children, title, subtitle }: { children: ReactNode; title: string; subtitle: string }) {
  return (
    <section className="rounded-[28px] border border-[#D8E7F3] bg-white p-5 shadow-[0_18px_48px_rgba(6,26,46,0.06)]">
      <p className="text-sm font-semibold text-[#0EA5E9]">{subtitle}</p>
      <h2 className="mt-1 text-2xl font-bold text-[#0F172A]">{title}</h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function LoadingState() {
  return (
    <div className="min-h-[calc(100vh-140px)] rounded-[32px] bg-[linear-gradient(180deg,#F8FAFC_0%,#EFF8FF_100%)] p-6">
      <div className="space-y-4">
        {[1, 2, 3].map((item) => (
          <div key={item} className="h-36 animate-pulse rounded-3xl border border-[#D8E7F3] bg-white/80" />
        ))}
      </div>
    </div>
  );
}

function NotFoundState({ onBack }: { onBack: () => void }) {
  return (
    <div className="rounded-[32px] border border-[#D8E7F3] bg-white p-10 text-center shadow-[0_18px_48px_rgba(6,26,46,0.06)]">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-[#EF4444]">
        <ShieldAlert size={24} />
      </div>
      <h1 className="mt-5 text-2xl font-bold text-[#0F172A]">Session not found</h1>
      <p className="mt-2 text-sm text-[#64748B]">The selected session could not be loaded.</p>
      <button
        type="button"
        onClick={onBack}
        className="mt-6 rounded-xl bg-[#0EA5E9] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#0284C7]"
      >
        Back to Today Sessions
      </button>
    </div>
  );
}

export default function ReceptionSessionManagementPage() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const parsedSessionId = Number(sessionId);
  const [permissions, setPermissions] = useState<ReceptionPermissions | null>(null);
  const [session, setSession] = useState<SessionDetail | null>(null);
  const [queueDetail, setQueueDetail] = useState<ReceptionQueueDetail | null>(null);
  const [patients, setPatients] = useState<PatientPreview[]>([]);
  const [activePatientFilter, setActivePatientFilter] = useState<PatientPreviewFilter>("waiting");
  const [loading, setLoading] = useState(true);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState<Notice | null>(null);

  const load = async () => {
    if (!Number.isFinite(parsedSessionId)) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const permissionData = await getReceptionPermissions();
      setPermissions(permissionData);

      if (!permissionData.schedule_management) {
        setSession(null);
        setError("");
        return;
      }

      const [sessions, doctors, detail, visitsResult] = await Promise.all([
        getReceptionSessions(),
        getReceptionSessionDoctors().catch(() => [] as ReceptionSessionDoctor[]),
        getReceptionQueueBySession(parsedSessionId).catch(() => null),
        getReceptionVisits({ filter: "today", sessionId: parsedSessionId, limit: 200 }).catch(() => ({
          visits: [] as ReceptionVisit[],
        })),
      ]);
      const selectedSession = sessions.find((item) => item.id === parsedSessionId) || null;

      if (!selectedSession) {
        setSession(null);
        setQueueDetail(null);
        setPatients([]);
        setError("");
        return;
      }

      const visitSourceMap = buildVisitSourceMap(visitsResult.visits);
      const patientPreview = buildPatientPreview(detail, visitSourceMap);
      setSession(buildSessionDetail(selectedSession, doctors, detail));
      setQueueDetail(detail);
      setPatients(patientPreview);
      setError("");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to load session details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  const queueSummary = useMemo(() => buildQueueSummaryFromPatients(queueDetail, patients), [patients, queueDetail]);
  const filteredPatients = useMemo(
    () => patients.filter((patient) => patientMatchesFilter(patient, activePatientFilter)),
    [activePatientFilter, patients]
  );

  const alerts = useMemo(() => {
    const items: string[] = [];
    if (!session) return items;
    if (session.status === "paused") items.push("Session paused. Resume queue when the doctor is ready.");
    if (session.status === "not_started") items.push("Queue not started yet.");
    if (queueSummary.waitingCount >= 10) items.push("Too many waiting patients. Queue pressure is increasing.");
    if (queueSummary.missedLateCount > 0) items.push("Missed or late patients need follow-up.");
    return items;
  }, [queueSummary.missedLateCount, queueSummary.waitingCount, session]);

  const runQueueAction = async (label: string, action: () => Promise<{ message: string }>) => {
    setBusyAction(label);
    try {
      const response = await action();
      setNotice({ tone: "success", message: response.message });
      await load();
    } catch (caughtError) {
      setNotice({
        tone: "danger",
        message: caughtError instanceof Error ? caughtError.message : "Session action failed.",
      });
    } finally {
      setBusyAction(null);
    }
  };

  const handleEndSession = () => {
    if (!session?.queueId) return;
    const confirmed = window.confirm("End this session queue? Waiting patients may be marked missed by the backend.");
    if (!confirmed) return;
    void runQueueAction("end", () => endQueue(Number(session.queueId)));
  };

  if (loading) return <LoadingState />;

  if (error) {
    return (
      <div className="space-y-4">
        <InlineAlert tone="danger" message={error} />
        <button
          type="button"
          onClick={() => void load()}
          className="rounded-xl bg-[#0EA5E9] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0284C7]"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!permissions?.schedule_management) {
    return (
      <PermissionState
        title="Session management is not assigned"
        message="This receptionist account cannot manage doctor sessions until schedule management is enabled."
      />
    );
  }

  if (!session) return <NotFoundState onBack={() => navigate("/receptionist/sessions")} />;

  const canUseQueue = Boolean(permissions.queue_access);
  const canStart = canUseQueue && session.status === "not_started";
  const canPause = canUseQueue && session.status === "live" && Boolean(session.queueId);
  const canResume = canUseQueue && session.status === "paused" && Boolean(session.queueId);
  const canEnd = canUseQueue && ["live", "paused"].includes(session.status) && Boolean(session.queueId);

  return (
    <div className="min-h-[calc(100vh-140px)] space-y-6 rounded-[32px] bg-[linear-gradient(180deg,#F8FAFC_0%,#EFF8FF_100%)] p-5 md:p-6">
      <button
        type="button"
        onClick={() => navigate("/receptionist/sessions")}
        className="inline-flex items-center gap-2 rounded-xl border border-[#D8E7F3] bg-white px-4 py-2 text-sm font-semibold text-[#0B3558] shadow-sm hover:bg-[#EFF8FF]"
      >
        <ArrowLeft size={16} />
        Back to Today Sessions
      </button>

      {notice ? <InlineAlert tone={notice.tone} message={notice.message} /> : null}

      <section className="rounded-[30px] border border-white/15 bg-[linear-gradient(135deg,#061A2E,#0B3558)] p-6 text-white shadow-[0_24px_70px_rgba(6,26,46,0.24)]">
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <DoctorAvatar imageUrl={session.doctorImageUrl} initials={session.initials} name={session.doctorName} />
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <p className="text-sm font-semibold text-[#BAE6FD]">Selected doctor session</p>
                <StatusPill status={session.status} />
              </div>
              <h1 className="mt-3 text-3xl font-bold tracking-tight">{session.doctorName}</h1>
              <p className="mt-2 text-sky-100">{session.specialization}</p>
              <div className="mt-4 flex flex-wrap gap-3 text-sm text-sky-50">
                <span className="rounded-full bg-white/10 px-3 py-1">{session.medicalCenterName}</span>
                <span className="rounded-full bg-white/10 px-3 py-1">{session.roomNumber}</span>
                <span className="rounded-full bg-white/10 px-3 py-1">
                  {formatDate(session.date)}, {formatClock(session.startTime)} - {formatClock(session.endTime)}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 xl:max-w-md xl:justify-end">
            <ActionButton disabled={!canStart || busyAction === "start"} onClick={() => void runQueueAction("start", () => startQueue(session.id))} tone="primary">
              {busyAction === "start" ? <Loader2 size={15} className="animate-spin" /> : <Play size={15} />}
              Start Queue
            </ActionButton>
            <ActionButton disabled={!canPause || busyAction === "pause"} onClick={() => void runQueueAction("pause", () => pauseQueue(Number(session.queueId)))}>
              <Pause size={15} />
              Pause Queue
            </ActionButton>
            <ActionButton disabled={!canResume || busyAction === "resume"} onClick={() => void runQueueAction("resume", () => resumeQueue(Number(session.queueId)))}>
              <RotateCcw size={15} />
              Resume Queue
            </ActionButton>
            <ActionButton disabled={!canEnd || busyAction === "end"} onClick={handleEndSession} tone="danger">
              <CheckCircle2 size={15} />
              End Session
            </ActionButton>
            <ActionButton onClick={() => navigate(`/receptionist/live-queue?sessionId=${session.id}`)}>
              <SkipForward size={15} />
              Open Live Queue
            </ActionButton>
          </div>
        </div>
        {!canUseQueue ? (
          <p className="mt-5 rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm text-sky-100">
            Queue actions are disabled because queue access is not assigned to this receptionist account.
          </p>
        ) : null}
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-7">
        <SummaryCard icon={Stethoscope} label="Now Serving" value={queueSummary.nowServing} />
        <SummaryCard icon={SkipForward} label="Next Patient" value={queueSummary.nextPatient} />
        <SummaryCard icon={Users} label="Waiting" value={queueSummary.waitingCount} />
        <SummaryCard icon={DoorOpen} label="Checked-in" value={queueSummary.checkedInCount} />
        <SummaryCard icon={CheckCircle2} label="Completed" value={queueSummary.completedCount} />
        <SummaryCard icon={AlertTriangle} label="Missed / Late" value={queueSummary.missedLateCount} />
        <SummaryCard icon={Clock3} label="Walk-ins" value={queueSummary.walkInCount} />
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.75fr)]">
        <div className="space-y-6">
          <SectionCard title="Queue progress" subtitle="Session flow">
            <div className="grid gap-3 md:grid-cols-5">
              {[
                { label: "Booked", value: session.queueId ? queueSummary.checkedInCount + queueSummary.waitingCount + queueSummary.completedCount + queueSummary.missedLateCount : 0 },
                { label: "Checked-in", value: queueSummary.checkedInCount },
                { label: "Waiting", value: queueSummary.waitingCount },
                { label: "Now Serving", value: queueDetail?.currentPatient ? 1 : 0 },
                { label: "Completed", value: queueSummary.completedCount },
              ].map((step) => (
                <div key={step.label} className="rounded-2xl border border-[#D8E7F3] bg-[#F8FAFC] p-4">
                  <p className="text-sm font-semibold text-[#64748B]">{step.label}</p>
                  <p className="mt-2 text-2xl font-bold text-[#0F172A]">{step.value}</p>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Patient preview" subtitle="Compact queue view">
            <div className="flex flex-wrap gap-2">
              {patientFilters.map((filter) => {
                const selected = activePatientFilter === filter.key;
                const count = patients.filter((patient) => patientMatchesFilter(patient, filter.key)).length;
                return (
                  <button
                    key={filter.key}
                    type="button"
                    onClick={() => setActivePatientFilter(filter.key)}
                    className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                      selected
                        ? "border-[#0EA5E9] bg-[#EFF8FF] text-[#0B3558]"
                        : "border-[#D8E7F3] bg-white text-[#64748B] hover:bg-[#F8FAFC]"
                    }`}
                  >
                    {filter.label} <span className="ml-1 text-xs">{count}</span>
                  </button>
                );
              })}
            </div>

            <div className="mt-5 space-y-3">
              {patients.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-[#B7DDF5] bg-[#F8FAFC] p-8 text-center">
                  <h3 className="text-lg font-bold text-[#0F172A]">No patients in this session yet.</h3>
                  <p className="mt-2 text-sm text-[#64748B]">
                    Booked and walk-in patients will appear here once added.
                  </p>
                </div>
              ) : filteredPatients.length === 0 ? (
                <div className="rounded-2xl border border-[#D8E7F3] bg-[#F8FAFC] p-5 text-sm font-medium text-[#64748B]">
                  No patients match this preview filter.
                </div>
              ) : (
                filteredPatients.slice(0, 6).map((patient) => (
                  <div
                    key={`${patient.id}-${patient.status}`}
                    className="grid gap-3 rounded-2xl border border-[#D8E7F3] bg-white p-4 sm:grid-cols-[90px_minmax(0,1fr)_140px_120px_auto] sm:items-center"
                  >
                    <p className="font-bold text-[#0B3558]">{patient.queueNumber}</p>
                    <div>
                      <p className="font-bold text-[#0F172A]">{patient.patientName}</p>
                      <p className="text-sm text-[#64748B]">{patient.appointmentTime}</p>
                    </div>
                    <p className="text-sm font-semibold text-[#64748B]">{patient.type}</p>
                    <span className={`w-fit rounded-full border px-3 py-1 text-xs font-semibold ${patientStatusClasses(patient.status)}`}>
                      {patientStatusLabel(patient.status)}
                    </span>
                    <button
                      type="button"
                      onClick={() => navigate(`/receptionist/live-queue?sessionId=${session.id}`)}
                      className="rounded-xl border border-[#D8E7F3] bg-white px-3 py-2 text-sm font-semibold text-[#0B3558] hover:bg-[#EFF8FF]"
                    >
                      View Queue
                    </button>
                  </div>
                ))
              )}
            </div>
          </SectionCard>
        </div>

        <SectionCard title="Session notes / alerts" subtitle="Reception signals">
          <div className="space-y-3">
            {alerts.length === 0 ? (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
                No urgent session alerts.
              </div>
            ) : (
              alerts.map((alert) => (
                <div key={alert} className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
                  {alert}
                </div>
              ))
            )}
            <div className="rounded-2xl border border-[#D8E7F3] bg-[#F8FAFC] p-4 text-sm leading-6 text-[#64748B]">
              Keep this session overview synced with the live queue before calling the next patient.
            </div>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
