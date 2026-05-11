import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Eye,
  Loader2,
  Phone,
  RefreshCcw,
  RotateCcw,
  Search,
  SendToBack,
  SkipForward,
  Stethoscope,
  UserCheck,
  UserRoundX,
  Users,
} from "lucide-react";
import PermissionState from "../../components/reception/PermissionState";
import { InlineAlert } from "../../components/reception/ReceptionUI";
import { resolveApiAssetUrl } from "../../services/api";
import {
  callNextPatient,
  getReceptionPermissions,
  getReceptionQueueBySession,
  getReceptionQueues,
  markQueueCurrentPatientCompleted,
  markQueueCurrentPatientMissed,
} from "../../services/reception.service";
import type {
  QueueStatus,
  ReceptionPermissions,
  ReceptionQueue,
  ReceptionQueueDetail,
  ReceptionQueuePatient,
} from "../../types/reception.types";

type QueueTab = "waiting" | "checked_in" | "serving" | "completed" | "missed" | "walkins" | "all";
type PatientType = "Booked" | "Walk-in";
type QueuePatientStatus =
  | "CHECKED_IN"
  | "WAITING"
  | "LATE"
  | "WITH_DOCTOR"
  | "COMPLETED"
  | "MISSED"
  | "SKIPPED"
  | "CANCELLED";
type NoticeTone = "success" | "danger" | "warning" | "info";

type Notice = {
  tone: NoticeTone;
  message: string;
};

type ActiveSession = {
  id: number;
  queueId: number | null;
  doctorName: string;
  doctorImageUrl: string | null;
  specialization: string;
  roomNumber: string;
  startTime: string;
  endTime: string;
  queueStatus: QueueStatus;
};

type QueuePatient = {
  id: number;
  queueNumber: number;
  patientName: string;
  patientImageUrl: string | null;
  phone: string | null;
  appointmentTime: string | null;
  type: PatientType;
  status: QueuePatientStatus;
  waitingMinutes: number | null;
  reason: string | null;
  isWalkIn: boolean;
};

type QueueSummary = {
  waiting: number;
  checkedIn: number;
  nowServing: number;
  completed: number;
  missed: number;
  walkIns: number;
};

const queueTabs: Array<{ key: QueueTab; label: string }> = [
  { key: "waiting", label: "Waiting" },
  { key: "checked_in", label: "Checked-in" },
  { key: "serving", label: "Now Serving" },
  { key: "completed", label: "Completed" },
  { key: "missed", label: "Missed" },
  { key: "walkins", label: "Walk-ins" },
  { key: "all", label: "All" },
];

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

function formatClock(value: string | null | undefined) {
  if (!value) return "Not set";
  const [hourPart = "0", minutePart = "00"] = String(value).split(":");
  const hour = Number(hourPart);
  if (!Number.isFinite(hour)) return value;
  const minute = minutePart.padStart(2, "0").slice(0, 2);
  const period = hour >= 12 ? "PM" : "AM";
  return `${hour % 12 || 12}:${minute} ${period}`;
}

function formatDateLabel() {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date());
}

function formatWaiting(minutes: number | null) {
  if (minutes === null) return "Not tracked";
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `Waiting ${minutes} min`;
  return `Waiting ${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

function calculateWaitingMinutes(appointmentTime: string | null) {
  if (!appointmentTime) return null;
  const [hours, minutes] = appointmentTime.split(":").map((part) => Number(part));
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  const appointment = new Date();
  appointment.setHours(hours, minutes, 0, 0);
  return Math.max(0, Math.floor((Date.now() - appointment.getTime()) / 60000));
}

function queueStatusLabel(status: QueueStatus) {
  if (status === "live") return "Live";
  if (status === "paused") return "Paused";
  if (status === "completed") return "Completed";
  return "Not Started";
}

function queueStatusClasses(status: QueueStatus) {
  if (status === "live") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "paused") return "border-amber-200 bg-amber-50 text-amber-800";
  if (status === "completed") return "border-sky-200 bg-sky-50 text-sky-700";
  return "border-slate-200 bg-slate-100 text-slate-700";
}

function patientStatusLabel(status: QueuePatientStatus) {
  const labels: Record<QueuePatientStatus, string> = {
    CHECKED_IN: "Checked-in",
    WAITING: "Waiting",
    LATE: "Late",
    WITH_DOCTOR: "Now Serving",
    COMPLETED: "Completed",
    MISSED: "Missed",
    SKIPPED: "Skipped",
    CANCELLED: "Cancelled",
  };
  return labels[status];
}

function patientStatusClasses(status: QueuePatientStatus) {
  if (status === "CHECKED_IN") return "border-sky-200 bg-sky-50 text-sky-700";
  if (status === "WAITING") return "border-amber-200 bg-amber-50 text-amber-800";
  if (status === "WITH_DOCTOR") return "border-cyan-200 bg-cyan-50 text-cyan-700";
  if (status === "COMPLETED") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "MISSED" || status === "CANCELLED") return "border-red-200 bg-red-50 text-red-700";
  if (status === "SKIPPED" || status === "LATE") return "border-orange-200 bg-orange-50 text-orange-700";
  return "border-slate-200 bg-slate-100 text-slate-700";
}

function buildRoomFallback(queue: ReceptionQueue) {
  // TODO: Replace room fallback when receptionist queue API returns room assignment.
  return `Room ${String((queue.doctorId % 6) + 1).padStart(2, "0")}`;
}

function toActiveSession(queue: ReceptionQueue): ActiveSession {
  return {
    id: queue.sessionId,
    queueId: queue.queueId,
    doctorName: queue.doctorName,
    doctorImageUrl: queue.doctorProfileImage ? resolveApiAssetUrl(queue.doctorProfileImage) : null,
    specialization: queue.specialty || "General Medicine",
    roomNumber: buildRoomFallback(queue),
    startTime: queue.startTime,
    endTime: queue.endTime,
    queueStatus: queue.queueStatus,
  };
}

function toQueuePatient(patient: ReceptionQueuePatient): QueuePatient {
  return {
    id: patient.id,
    queueNumber: patient.tokenNumber,
    patientName: patient.patientName,
    patientImageUrl: patient.profileImage ? resolveApiAssetUrl(patient.profileImage) : null,
    phone: patient.phone,
    appointmentTime: patient.bookingTime,
    // TODO: Replace booked fallback when queue patient API returns booked/walk-in source.
    type: "Booked",
    status: patient.status,
    waitingMinutes: calculateWaitingMinutes(patient.bookingTime),
    reason: null,
    isWalkIn: false,
  };
}

function buildPatients(detail: ReceptionQueueDetail | null) {
  if (!detail) return [];

  const patients = new Map<number, QueuePatient>();
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
    .forEach((patient) => patients.set(patient.id, toQueuePatient(patient)));

  return Array.from(patients.values()).sort((a, b) => a.queueNumber - b.queueNumber);
}

function summarizePatients(patients: QueuePatient[]): QueueSummary {
  return {
    waiting: patients.filter((patient) => patient.status === "WAITING" || patient.status === "LATE").length,
    checkedIn: patients.filter((patient) => patient.status === "CHECKED_IN").length,
    nowServing: patients.filter((patient) => patient.status === "WITH_DOCTOR").length,
    completed: patients.filter((patient) => patient.status === "COMPLETED").length,
    missed: patients.filter((patient) => patient.status === "MISSED").length,
    walkIns: patients.filter((patient) => patient.isWalkIn).length,
  };
}

function matchesTab(patient: QueuePatient, tab: QueueTab) {
  if (tab === "all") return true;
  if (tab === "waiting") return patient.status === "WAITING" || patient.status === "LATE";
  if (tab === "checked_in") return patient.status === "CHECKED_IN";
  if (tab === "serving") return patient.status === "WITH_DOCTOR";
  if (tab === "completed") return patient.status === "COMPLETED";
  if (tab === "missed") return patient.status === "MISSED";
  return patient.isWalkIn;
}

function canCall(patient: QueuePatient) {
  return patient.status === "CHECKED_IN" || patient.status === "WAITING" || patient.status === "LATE";
}

function StatusPill({ status }: { status: QueuePatientStatus }) {
  return (
    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${patientStatusClasses(status)}`}>
      {patientStatusLabel(status)}
    </span>
  );
}

function QueueStatusPill({ status }: { status: QueueStatus }) {
  return (
    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${queueStatusClasses(status)}`}>
      {queueStatusLabel(status)}
    </span>
  );
}

function Avatar({
  imageUrl,
  name,
  size = "md",
}: {
  imageUrl: string | null;
  name: string;
  size?: "sm" | "md" | "lg";
}) {
  const [failed, setFailed] = useState(false);
  const dimensions = size === "lg" ? "h-16 w-16 rounded-3xl" : size === "sm" ? "h-10 w-10 rounded-2xl" : "h-12 w-12 rounded-2xl";

  if (imageUrl && !failed) {
    return (
      <img
        src={imageUrl}
        alt={name}
        className={`${dimensions} shrink-0 border border-[#D8E7F3] object-cover shadow-sm`}
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <div className={`${dimensions} flex shrink-0 items-center justify-center border border-[#D8E7F3] bg-[#EFF8FF] text-sm font-bold text-[#0B3558] shadow-sm`}>
      {getInitials(name)}
    </div>
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
  const classes =
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
      className={`inline-flex items-center justify-center gap-2 rounded-xl border px-3.5 py-2 text-sm font-semibold transition ${classes} disabled:cursor-not-allowed disabled:opacity-45`}
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
  value: number;
}) {
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

function EmptyQueueState() {
  return (
    <div className="rounded-[32px] border border-[#D8E7F3] bg-white p-10 text-center shadow-[0_18px_48px_rgba(6,26,46,0.06)]">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#EFF8FF] text-[#0EA5E9]">
        <Stethoscope size={24} />
      </div>
      <h1 className="mt-5 text-2xl font-bold text-[#0F172A]">No active queue right now.</h1>
      <p className="mt-2 text-sm text-[#64748B]">
        Start a queue from Today Sessions when the doctor is ready.
      </p>
      <Link
        to="/receptionist/sessions"
        className="mt-6 inline-flex rounded-xl bg-[#0EA5E9] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#0284C7]"
      >
        View Today Sessions
      </Link>
    </div>
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

function PatientCard({
  busy,
  onCall,
  onComplete,
  onMarkMissed,
  onMoveToEnd,
  onReadd,
  onRecall,
  onSkip,
  onView,
  patient,
  queueLive,
}: {
  busy: boolean;
  onCall: (patient: QueuePatient) => void;
  onComplete: (patient: QueuePatient) => void;
  onMarkMissed: (patient: QueuePatient) => void;
  onMoveToEnd: (patient: QueuePatient) => void;
  onReadd: (patient: QueuePatient) => void;
  onRecall: (patient: QueuePatient) => void;
  onSkip: (patient: QueuePatient) => void;
  onView: (patient: QueuePatient) => void;
  patient: QueuePatient;
  queueLive: boolean;
}) {
  const isServing = patient.status === "WITH_DOCTOR";
  const isMissed = patient.status === "MISSED";
  const isCompleted = patient.status === "COMPLETED";

  return (
    <article className="rounded-3xl border border-[#D8E7F3] bg-white p-5 shadow-[0_14px_34px_rgba(6,26,46,0.05)]">
      <div className="grid gap-4 xl:grid-cols-[94px_minmax(260px,1fr)_auto] xl:items-center">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-[#061A2E] px-3 py-2 text-lg font-bold text-white">
            #{patient.queueNumber}
          </div>
          <Avatar imageUrl={patient.patientImageUrl} name={patient.patientName} size="sm" />
        </div>

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-lg font-bold text-[#0F172A]">{patient.patientName}</h3>
            <StatusPill status={patient.status} />
          </div>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-[#64748B]">
            <span>{patient.type}</span>
            <span>{formatClock(patient.appointmentTime)}</span>
            <span>{formatWaiting(patient.waitingMinutes)}</span>
            {patient.phone ? <span className="inline-flex items-center gap-1"><Phone size={13} /> {patient.phone}</span> : null}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 xl:justify-end">
          {canCall(patient) ? (
            <>
              <ActionButton disabled={!queueLive || busy} onClick={() => onCall(patient)} tone="primary">
                <SkipForward size={14} />
                Call
              </ActionButton>
              <ActionButton disabled={busy} onClick={() => onMoveToEnd(patient)}>
                <SendToBack size={14} />
                Move to End
              </ActionButton>
              <ActionButton disabled={busy} onClick={() => onMarkMissed(patient)} tone="danger">
                <UserRoundX size={14} />
                Mark Missed
              </ActionButton>
            </>
          ) : null}

          {isServing ? (
            <>
              <ActionButton disabled={busy} onClick={() => onComplete(patient)} tone="primary">
                <CheckCircle2 size={14} />
                Complete
              </ActionButton>
              <ActionButton disabled={busy} onClick={() => onRecall(patient)}>
                <RotateCcw size={14} />
                Recall
              </ActionButton>
              <ActionButton disabled={busy} onClick={() => onSkip(patient)}>
                <SendToBack size={14} />
                Skip
              </ActionButton>
            </>
          ) : null}

          {isMissed ? (
            <ActionButton disabled={busy} onClick={() => onReadd(patient)}>
              <UserCheck size={14} />
              Re-add to Queue
            </ActionButton>
          ) : null}

          <ActionButton disabled={busy && !isCompleted} onClick={() => onView(patient)}>
            <Eye size={14} />
            View
          </ActionButton>
        </div>
      </div>
    </article>
  );
}

export default function ReceptionQueuesPage() {
  const location = useLocation();
  const params = useParams();
  const navigate = useNavigate();
  const [permissions, setPermissions] = useState<ReceptionPermissions | null>(null);
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null);
  const [patients, setPatients] = useState<QueuePatient[]>([]);
  const [activeTab, setActiveTab] = useState<QueueTab>("waiting");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState<Notice | null>(null);

  const requestedSessionId = useMemo(() => {
    const routeSessionId = params.sessionId ? Number(params.sessionId) : null;
    if (routeSessionId && Number.isFinite(routeSessionId)) return routeSessionId;

    const queryValue = new URLSearchParams(location.search).get("sessionId");
    const querySessionId = queryValue ? Number(queryValue) : null;
    return querySessionId && Number.isFinite(querySessionId) ? querySessionId : null;
  }, [location.search, params.sessionId]);

  const load = async () => {
    setLoading(true);
    try {
      const [permissionData, queueData] = await Promise.all([getReceptionPermissions(), getReceptionQueues()]);
      setPermissions(permissionData);

      if (!permissionData.queue_access) {
        setActiveSession(null);
        setPatients([]);
        setError("");
        return;
      }

      const selectedQueue =
        (requestedSessionId
          ? queueData.allQueues.find((queue) => queue.sessionId === requestedSessionId)
          : null) ||
        queueData.liveQueues[0] ||
        queueData.upcomingQueues[0] ||
        queueData.allQueues[0] ||
        null;

      if (!selectedQueue) {
        setActiveSession(null);
        setPatients([]);
        setError("");
        return;
      }

      const detail = await getReceptionQueueBySession(selectedQueue.sessionId).catch(() => null);
      const sessionSource = detail?.queue ? { ...selectedQueue, ...detail.queue } : selectedQueue;
      setActiveSession(toActiveSession(sessionSource));
      setPatients(buildPatients(detail));
      setError("");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to load live queue.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // TODO: Subscribe to realtime queue updates when socket client is available.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestedSessionId]);

  const summary = useMemo(() => summarizePatients(patients), [patients]);
  const nowServing = useMemo(() => patients.find((patient) => patient.status === "WITH_DOCTOR") || null, [patients]);
  const nextPatient = useMemo(
    () =>
      patients.find((patient) => patient.status === "WAITING") ||
      patients.find((patient) => patient.status === "CHECKED_IN") ||
      patients.find((patient) => patient.status === "LATE") ||
      null,
    [patients]
  );

  const filteredPatients = useMemo(() => {
    const query = search.trim().toLowerCase();
    return patients.filter((patient) => {
      if (!matchesTab(patient, activeTab)) return false;
      if (!query) return true;
      return [
        patient.patientName,
        patient.phone || "",
        String(patient.queueNumber),
        patientStatusLabel(patient.status),
      ].some((value) => value.toLowerCase().includes(query));
    });
  }, [activeTab, patients, search]);

  const runBackendAction = async (label: string, action: () => Promise<{ message: string }>) => {
    setBusyAction(label);
    try {
      const response = await action();
      setNotice({ tone: "success", message: response.message });
      await load();
    } catch (caughtError) {
      setNotice({
        tone: "danger",
        message: caughtError instanceof Error ? caughtError.message : "Queue action failed.",
      });
    } finally {
      setBusyAction(null);
    }
  };

  const updatePatientStatus = (patientId: number, status: QueuePatientStatus) => {
    setPatients((current) =>
      current.map((patient) =>
        patient.id === patientId
          ? { ...patient, status, waitingMinutes: status === "WAITING" ? 0 : patient.waitingMinutes }
          : patient
      )
    );
  };

  const movePatientToEnd = (patientId: number) => {
    setPatients((current) => {
      const target = current.find((patient) => patient.id === patientId);
      if (!target) return current;
      return [...current.filter((patient) => patient.id !== patientId), { ...target, status: "WAITING" }];
    });
  };

  const handleCallNext = () => {
    if (!activeSession?.queueId || activeSession.queueStatus !== "live" || !nextPatient) return;
    void runBackendAction("call-next", () => callNextPatient(Number(activeSession.queueId)));
  };

  const handleCallPatient = (patient: QueuePatient) => {
    if (patient.id !== nextPatient?.id) {
      // TODO: Connect row-level call to backend API when available.
      setNotice({ tone: "info", message: "Calling a specific row is local-only until backend supports row-level queue actions." });
      setPatients((current) =>
        current.map((item) =>
          item.id === patient.id
            ? { ...item, status: "WITH_DOCTOR" }
            : item.status === "WITH_DOCTOR"
              ? { ...item, status: "WAITING" }
              : item
        )
      );
      return;
    }

    handleCallNext();
  };

  const handleComplete = (patient: QueuePatient) => {
    if (patient.status === "WITH_DOCTOR" && activeSession?.queueId) {
      void runBackendAction("complete", () => markQueueCurrentPatientCompleted(Number(activeSession.queueId)));
      return;
    }

    // TODO: Connect row-level complete to backend API.
    updatePatientStatus(patient.id, "COMPLETED");
    setNotice({ tone: "success", message: `${patient.patientName} marked completed locally.` });
  };

  const handleMarkMissed = (patient: QueuePatient) => {
    if (patient.status === "WITH_DOCTOR" && activeSession?.queueId) {
      void runBackendAction("miss", () => markQueueCurrentPatientMissed(Number(activeSession.queueId)));
      return;
    }

    // TODO: Connect row-level missed/no-show to backend API.
    updatePatientStatus(patient.id, "MISSED");
    setNotice({ tone: "warning", message: `${patient.patientName} marked missed locally.` });
  };

  const handleSkip = (patient: QueuePatient) => {
    // TODO: Connect skip patient to backend API.
    movePatientToEnd(patient.id);
    setNotice({ tone: "info", message: `${patient.patientName} moved back to the waiting queue locally.` });
  };

  const handleMoveToEnd = (patient: QueuePatient) => {
    // TODO: Connect move-to-end to backend API.
    movePatientToEnd(patient.id);
    setNotice({ tone: "info", message: `${patient.patientName} moved to the end locally.` });
  };

  const handleReadd = (patient: QueuePatient) => {
    // TODO: Connect re-add missed patient to backend API.
    updatePatientStatus(patient.id, "WAITING");
    setNotice({ tone: "success", message: `${patient.patientName} re-added locally.` });
  };

  const handleRecall = (patient: QueuePatient) => {
    // TODO: Connect patient recall to backend API.
    setNotice({ tone: "info", message: `Recall sent locally for ${patient.patientName}.` });
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

  if (!permissions?.queue_access) {
    return (
      <PermissionState
        title="Live queue is not assigned"
        message="This receptionist account cannot manage live queues until queue access is enabled."
      />
    );
  }

  if (!activeSession) return <EmptyQueueState />;

  const queueLive = activeSession.queueStatus === "live";

  return (
    <div className="min-h-[calc(100vh-140px)] space-y-6 rounded-[32px] bg-[linear-gradient(180deg,#F8FAFC_0%,#EFF8FF_100%)] p-5 md:p-6">
      {notice ? <InlineAlert tone={notice.tone} message={notice.message} /> : null}

      <section className="rounded-[28px] border border-white/15 bg-[linear-gradient(135deg,#061A2E,#0B3558)] p-6 text-white shadow-[0_24px_70px_rgba(6,26,46,0.24)]">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold text-[#BAE6FD]">
              <Stethoscope size={14} />
              <QueueStatusPill status={activeSession.queueStatus} />
            </div>
            <h1 className="mt-4 text-3xl font-bold tracking-tight">Live Queue</h1>
            <p className="mt-2 text-sm text-sky-100">Manage patient flow for the active clinic session</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <div className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm font-semibold">
              <CalendarDays size={16} />
              {formatDateLabel()}
            </div>
            <button
              type="button"
              onClick={() => void load()}
              className="inline-flex items-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-sm font-semibold transition hover:bg-white/15"
            >
              <RefreshCcw size={16} />
              Refresh
            </button>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-[#D8E7F3] bg-white p-5 shadow-[0_16px_42px_rgba(6,26,46,0.06)]">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <Avatar imageUrl={activeSession.doctorImageUrl} name={activeSession.doctorName} size="lg" />
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-2xl font-bold text-[#0F172A]">{activeSession.doctorName}</h2>
                <QueueStatusPill status={activeSession.queueStatus} />
              </div>
              <p className="mt-1 font-semibold text-[#0B3558]">{activeSession.specialization}</p>
              <p className="mt-1 text-sm text-[#64748B]">
                {activeSession.roomNumber} • {formatClock(activeSession.startTime)} - {formatClock(activeSession.endTime)}
              </p>
            </div>
          </div>
          <ActionButton onClick={() => navigate(`/receptionist/sessions/${activeSession.id}`)}>
            <Eye size={15} />
            View Session
          </ActionButton>
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-2">
        <section className="rounded-[28px] border border-[#D8E7F3] bg-white p-6 shadow-[0_18px_48px_rgba(6,26,46,0.06)]">
          <p className="text-sm font-semibold text-[#0EA5E9]">Current patient</p>
          <h2 className="mt-1 text-2xl font-bold text-[#0F172A]">Now Serving</h2>
          {nowServing ? (
            <div className="mt-5 rounded-3xl border border-cyan-200 bg-cyan-50 p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                  <div className="rounded-2xl bg-[#061A2E] px-4 py-3 text-2xl font-bold text-white">
                    #{nowServing.queueNumber}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-[#0F172A]">{nowServing.patientName}</h3>
                    <p className="mt-1 text-sm text-[#64748B]">
                      {nowServing.type} • {formatClock(nowServing.appointmentTime)} • {patientStatusLabel(nowServing.status)}
                    </p>
                    {nowServing.reason ? <p className="mt-1 text-sm text-[#64748B]">{nowServing.reason}</p> : null}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <ActionButton disabled={Boolean(busyAction)} onClick={() => handleRecall(nowServing)}>
                    <RotateCcw size={14} />
                    Recall Patient
                  </ActionButton>
                  <ActionButton disabled={Boolean(busyAction)} onClick={() => handleComplete(nowServing)} tone="primary">
                    <CheckCircle2 size={14} />
                    Mark Completed
                  </ActionButton>
                  <ActionButton disabled={Boolean(busyAction)} onClick={() => handleSkip(nowServing)}>
                    <SendToBack size={14} />
                    Skip
                  </ActionButton>
                  <ActionButton disabled={Boolean(busyAction)} onClick={() => handleMarkMissed(nowServing)} tone="danger">
                    <UserRoundX size={14} />
                    Mark No-show
                  </ActionButton>
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-5 rounded-3xl border border-dashed border-[#B7DDF5] bg-[#F8FAFC] p-8 text-center">
              <p className="text-lg font-bold text-[#0F172A]">No patient is being served yet.</p>
              <ActionButton disabled={!queueLive || !nextPatient || Boolean(busyAction)} onClick={handleCallNext} tone="primary">
                {busyAction === "call-next" ? <Loader2 size={15} className="animate-spin" /> : <SkipForward size={15} />}
                Call Next Patient
              </ActionButton>
            </div>
          )}
        </section>

        <section className="rounded-[28px] border border-[#D8E7F3] bg-white p-6 shadow-[0_18px_48px_rgba(6,26,46,0.06)]">
          <p className="text-sm font-semibold text-[#0EA5E9]">Ready to call</p>
          <h2 className="mt-1 text-2xl font-bold text-[#0F172A]">Next Patient</h2>
          {nextPatient ? (
            <div className="mt-5 rounded-3xl border border-[#D8E7F3] bg-[#F8FAFC] p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-2xl font-bold text-[#0B3558]">#{nextPatient.queueNumber}</p>
                  <h3 className="mt-1 text-xl font-bold text-[#0F172A]">{nextPatient.patientName}</h3>
                  <p className="mt-1 text-sm text-[#64748B]">
                    {formatClock(nextPatient.appointmentTime)} • {nextPatient.type} • {formatWaiting(nextPatient.waitingMinutes)}
                  </p>
                </div>
                <ActionButton disabled={!queueLive || Boolean(busyAction)} onClick={handleCallNext} tone="primary">
                  {busyAction === "call-next" ? <Loader2 size={15} className="animate-spin" /> : <SkipForward size={15} />}
                  Call Next Patient
                </ActionButton>
              </div>
            </div>
          ) : (
            <div className="mt-5 rounded-3xl border border-dashed border-[#B7DDF5] bg-[#F8FAFC] p-8 text-center text-sm font-semibold text-[#64748B]">
              No waiting patients available.
            </div>
          )}
        </section>
      </div>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <SummaryCard icon={Users} label="Waiting" value={summary.waiting} />
        <SummaryCard icon={UserCheck} label="Checked-in" value={summary.checkedIn} />
        <SummaryCard icon={Stethoscope} label="Now Serving" value={summary.nowServing} />
        <SummaryCard icon={CheckCircle2} label="Completed" value={summary.completed} />
        <SummaryCard icon={AlertTriangle} label="Missed" value={summary.missed} />
        <SummaryCard icon={Clock3} label="Walk-ins" value={summary.walkIns} />
      </section>

      <section className="rounded-[28px] border border-[#D8E7F3] bg-white p-5 shadow-[0_18px_48px_rgba(6,26,46,0.06)]">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-sm font-semibold text-[#0EA5E9]">Patient flow</p>
            <h2 className="mt-1 text-2xl font-bold text-[#0F172A]">Queue Workspace</h2>
          </div>
          <label className="flex h-12 min-w-0 items-center gap-3 rounded-2xl border border-[#D8E7F3] bg-white px-4 xl:w-[360px]">
            <Search size={17} className="text-[#64748B]" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search patient, queue number, or phone"
              className="w-full bg-transparent text-sm font-medium text-[#0F172A] outline-none placeholder:text-[#64748B]"
            />
          </label>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {queueTabs.map((tab) => {
            const selected = activeTab === tab.key;
            const count = patients.filter((patient) => matchesTab(patient, tab.key)).length;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                  selected
                    ? "border-[#0EA5E9] bg-[#EFF8FF] text-[#0B3558]"
                    : "border-[#D8E7F3] bg-white text-[#64748B] hover:bg-[#F8FAFC]"
                }`}
              >
                {tab.label} <span className="ml-1 text-xs">{count}</span>
              </button>
            );
          })}
        </div>

        <div className="mt-5 space-y-3">
          {filteredPatients.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-[#B7DDF5] bg-[#F8FAFC] p-8 text-center">
              <h3 className="text-lg font-bold text-[#0F172A]">
                {activeTab === "waiting"
                  ? "No patients waiting."
                  : activeTab === "checked_in"
                    ? "No checked-in patients yet."
                    : activeTab === "missed"
                      ? "No missed patients."
                      : activeTab === "completed"
                        ? "No completed patients yet."
                        : "No patients found."}
              </h3>
              <p className="mt-2 text-sm text-[#64748B]">Queue patients will appear here as the session moves.</p>
            </div>
          ) : (
            filteredPatients.map((patient) => (
              <PatientCard
                key={patient.id}
                busy={Boolean(busyAction)}
                patient={patient}
                queueLive={queueLive}
                onCall={handleCallPatient}
                onComplete={handleComplete}
                onMarkMissed={handleMarkMissed}
                onMoveToEnd={handleMoveToEnd}
                onReadd={handleReadd}
                onRecall={handleRecall}
                onSkip={handleSkip}
                onView={() => navigate(`/receptionist/live-queue?sessionId=${activeSession.id}`)}
              />
            ))
          )}
        </div>
      </section>
    </div>
  );
}
