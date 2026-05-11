import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  Clock3,
  DoorOpen,
  Eye,
  Loader2,
  Play,
  RefreshCcw,
  Search,
  Stethoscope,
  UserCheck,
  UserRoundX,
  Users,
} from "lucide-react";
import PermissionState from "../../components/reception/PermissionState";
import { InlineAlert } from "../../components/reception/ReceptionUI";
import {
  getReceptionPermissions,
  getReceptionSessionDoctors,
  getReceptionSessions,
  startQueue,
} from "../../services/reception.service";
import type {
  QueueStatus,
  ReceptionPermissions,
  ReceptionSession,
  ReceptionSessionDoctor,
} from "../../types/reception.types";

type SessionViewStatus =
  | "not_started"
  | "live"
  | "paused"
  | "completed"
  | "cancelled"
  | "doctor_arrived"
  | "doctor_delayed";

type StatusTab = "all" | "upcoming" | "live" | "completed" | "cancelled";
type NoticeTone = "success" | "danger" | "warning" | "info";

type Notice = {
  tone: NoticeTone;
  message: string;
};

type TodaySessionItem = {
  id: number;
  doctorId: number;
  doctorName: string;
  doctorImageUrl: string | null;
  initials: string;
  specialization: string;
  roomNumber: string;
  startTime: string;
  endTime: string;
  bookedPatients: number;
  walkIns: number;
  status: SessionViewStatus;
  queueStatus: QueueStatus;
  medicalCenterName: string;
  canStartQueue: boolean;
  source: ReceptionSession;
};

type UnknownRecord = Record<string, unknown>;

const TODAY = new Date().toISOString().slice(0, 10);

const tabLabels: Array<{ key: StatusTab; label: string }> = [
  { key: "all", label: "All" },
  { key: "upcoming", label: "Upcoming" },
  { key: "live", label: "Live" },
  { key: "completed", label: "Completed" },
  { key: "cancelled", label: "Cancelled" },
];

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null;
}

function resolveDoctorImageUrl(candidate: unknown): string | null {
  if (!isRecord(candidate)) return null;

  const possibleKeys = [
    "doctorProfileImage",
    "profileImageUrl",
    "avatarUrl",
    "image_url",
    "profile_image",
    "imageUrl",
  ] as const;

  for (const key of possibleKeys) {
    const value = candidate[key];
    if (typeof value === "string" && value.trim()) return value;
  }

  return null;
}

function getInitials(name: string) {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");

  return initials || "DR";
}

function formatClock(value: string) {
  const [hourPart = "0", minutePart = "00"] = String(value || "").split(":");
  const hour = Number(hourPart);
  const minute = minutePart.padStart(2, "0").slice(0, 2);
  if (Number.isNaN(hour)) return String(value || "Not set");

  const period = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minute} ${period}`;
}

function formatSessionTime(startTime: string, endTime: string) {
  return `${formatClock(startTime)} - ${formatClock(endTime)}`;
}

function formatDateLabel(dateValue: string) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(`${dateValue}T00:00:00`));
}

function getStatusFromSession(session: ReceptionSession): SessionViewStatus {
  if (session.queueStatus === "live") return "live";
  if (session.queueStatus === "paused") return "paused";
  if (session.queueStatus === "completed") return "completed";
  return "not_started";
}

function getStatusLabel(status: SessionViewStatus) {
  const labels: Record<SessionViewStatus, string> = {
    not_started: "Not Started",
    live: "Queue Live",
    paused: "Paused",
    completed: "Completed",
    cancelled: "Cancelled",
    doctor_arrived: "Doctor Arrived",
    doctor_delayed: "Doctor Delayed",
  };

  return labels[status];
}

function getStatusClasses(status: SessionViewStatus) {
  const classes: Record<SessionViewStatus, string> = {
    not_started: "border-slate-200 bg-slate-100 text-slate-700",
    live: "border-emerald-200 bg-emerald-50 text-emerald-700",
    paused: "border-amber-200 bg-amber-50 text-amber-800",
    completed: "border-sky-200 bg-sky-50 text-sky-700",
    cancelled: "border-red-200 bg-red-50 text-red-700",
    doctor_arrived: "border-teal-200 bg-teal-50 text-teal-700",
    doctor_delayed: "border-orange-200 bg-orange-50 text-orange-700",
  };

  return classes[status];
}

function statusMatchesTab(status: SessionViewStatus, tab: StatusTab) {
  if (tab === "all") return true;
  if (tab === "upcoming") {
    return ["not_started", "doctor_arrived", "doctor_delayed"].includes(status);
  }
  if (tab === "live") return ["live", "paused"].includes(status);
  return status === tab;
}

function buildRoomFallback(session: ReceptionSession) {
  // TODO: Replace room fallback when receptionist sessions API returns room assignment.
  return `Room ${String((session.doctorId % 6) + 1).padStart(2, "0")}`;
}

function mapSessions(
  sessions: ReceptionSession[],
  doctors: ReceptionSessionDoctor[],
  overrides: Record<number, SessionViewStatus>
): TodaySessionItem[] {
  return sessions.map((session) => {
    const doctor =
      doctors.find((item) => item.doctorId === session.doctorId) ||
      doctors.find(
        (item) =>
          item.doctorName.trim().toLowerCase() === session.doctorName.trim().toLowerCase()
      );

    return {
      id: session.id,
      doctorId: session.doctorId,
      doctorName: session.doctorName,
      doctorImageUrl: resolveDoctorImageUrl(doctor) || resolveDoctorImageUrl(session),
      initials: getInitials(session.doctorName),
      specialization: session.specialty || doctor?.specialization || "General Medicine",
      roomNumber: buildRoomFallback(session),
      startTime: session.startTime,
      endTime: session.endTime,
      bookedPatients: session.appointmentCount,
      // TODO: Replace walk-in fallback when queue/session API returns per-session walk-ins.
      walkIns: 0,
      status: overrides[session.id] || getStatusFromSession(session),
      queueStatus: session.queueStatus,
      medicalCenterName: session.medicalCenterName || "Medical center",
      canStartQueue: session.canStartQueue,
      source: session,
    };
  });
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof CalendarDays;
  label: string;
  value: number;
  tone: string;
}) {
  return (
    <div className="rounded-2xl border border-[#D8E7F3] bg-white p-4 shadow-[0_14px_34px_rgba(6,26,46,0.06)]">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-[#64748B]">{label}</p>
          <p className="mt-2 text-2xl font-bold text-[#0F172A]">{value}</p>
        </div>
        <div className={`rounded-2xl border p-3 ${tone}`}>
          <Icon size={18} />
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: SessionViewStatus }) {
  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getStatusClasses(status)}`}
    >
      {getStatusLabel(status)}
    </span>
  );
}

function DoctorAvatar({
  imageUrl,
  initials,
  name,
}: {
  imageUrl: string | null;
  initials: string;
  name: string;
}) {
  const [failed, setFailed] = useState(false);

  if (imageUrl && !failed) {
    return (
      <img
        src={imageUrl}
        alt={name}
        className="h-14 w-14 rounded-2xl border border-[#D8E7F3] object-cover shadow-sm"
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[#D8E7F3] bg-[#EFF8FF] text-sm font-bold text-[#0B3558] shadow-sm">
      {initials}
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
  const toneClass =
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
      className={`inline-flex items-center justify-center gap-2 rounded-xl border px-3.5 py-2 text-sm font-semibold transition ${toneClass} disabled:cursor-not-allowed disabled:opacity-45`}
    >
      {children}
    </button>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((item) => (
        <div
          key={item}
          className="h-32 animate-pulse rounded-3xl border border-[#D8E7F3] bg-white/80"
        />
      ))}
    </div>
  );
}

function EmptySessionsState({
  filtered,
  onReset,
}: {
  filtered: boolean;
  onReset: () => void;
}) {
  return (
    <div className="rounded-3xl border border-dashed border-[#B7DDF5] bg-white px-6 py-10 text-center shadow-[0_16px_40px_rgba(6,26,46,0.05)]">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#EFF8FF] text-[#0EA5E9]">
        <CalendarDays size={24} />
      </div>
      <h3 className="mt-5 text-xl font-bold text-[#0F172A]">
        {filtered ? "No matching sessions found." : "No sessions scheduled for today."}
      </h3>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-[#64748B]">
        {filtered
          ? "Try changing the status tab or search keyword."
          : "When sessions are assigned to this medical center, they will appear here."}
      </p>
      {filtered ? (
        <button
          type="button"
          onClick={onReset}
          className="mt-5 rounded-xl border border-[#D8E7F3] bg-white px-4 py-2 text-sm font-semibold text-[#0B3558] hover:bg-[#EFF8FF]"
        >
          Reset filters
        </button>
      ) : null}
    </div>
  );
}

function SessionCard({
  canUseQueue,
  isBusy,
  onCancel,
  onMarkArrived,
  onMarkDelayed,
  onStartQueue,
  onView,
  session,
}: {
  canUseQueue: boolean;
  isBusy: boolean;
  onCancel: (session: TodaySessionItem) => void;
  onMarkArrived: (session: TodaySessionItem) => void;
  onMarkDelayed: (session: TodaySessionItem) => void;
  onStartQueue: (session: TodaySessionItem) => void;
  onView: (session: TodaySessionItem) => void;
  session: TodaySessionItem;
}) {
  const isTerminal = ["completed", "cancelled"].includes(session.status);
  const isUpcoming = ["not_started", "doctor_arrived", "doctor_delayed"].includes(session.status);
  const canStart = canUseQueue && isUpcoming && session.canStartQueue;
  const canMarkArrived = canUseQueue && ["not_started", "doctor_delayed"].includes(session.status);
  const canMarkDelayed = canUseQueue && session.status === "not_started";
  const canCancel = canUseQueue && !isTerminal;

  return (
    <article className="rounded-3xl border border-[#D8E7F3] bg-white p-5 shadow-[0_18px_48px_rgba(6,26,46,0.07)] transition hover:-translate-y-0.5 hover:shadow-[0_22px_54px_rgba(6,26,46,0.11)]">
      <div className="grid gap-5 xl:grid-cols-[minmax(260px,1.2fr)_minmax(360px,1.45fr)_minmax(280px,0.95fr)] xl:items-center">
        <div className="flex min-w-0 items-start gap-4">
          <DoctorAvatar
            imageUrl={session.doctorImageUrl}
            initials={session.initials}
            name={session.doctorName}
          />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="truncate text-lg font-bold text-[#0F172A]">{session.doctorName}</h3>
              <StatusBadge status={session.status} />
            </div>
            <p className="mt-1 text-sm font-medium text-[#0B3558]">{session.specialization}</p>
            <p className="mt-1 text-sm text-[#64748B]">{session.medicalCenterName}</p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-[#D8E7F3] bg-[#F8FAFC] px-4 py-3">
            <p className="text-xs font-semibold text-[#64748B]">Room</p>
            <p className="mt-1 font-bold text-[#0F172A]">{session.roomNumber}</p>
          </div>
          <div className="rounded-2xl border border-[#D8E7F3] bg-[#F8FAFC] px-4 py-3">
            <p className="text-xs font-semibold text-[#64748B]">Session time</p>
            <p className="mt-1 font-bold text-[#0F172A]">
              {formatSessionTime(session.startTime, session.endTime)}
            </p>
          </div>
          <div className="rounded-2xl border border-[#D8E7F3] bg-[#F8FAFC] px-4 py-3">
            <p className="text-xs font-semibold text-[#64748B]">Booked</p>
            <p className="mt-1 font-bold text-[#0F172A]">{session.bookedPatients} patients</p>
          </div>
          <div className="rounded-2xl border border-[#D8E7F3] bg-[#F8FAFC] px-4 py-3">
            <p className="text-xs font-semibold text-[#64748B]">Walk-ins</p>
            <p className="mt-1 font-bold text-[#0F172A]">{session.walkIns}</p>
          </div>
        </div>

        <div className="space-y-3 xl:text-right">
          <div className="flex flex-wrap gap-2 xl:justify-end">
            <ActionButton onClick={() => onView(session)}>
              <Eye size={15} />
              View Session
            </ActionButton>
            <ActionButton
              disabled={!canStart || isBusy}
              onClick={() => onStartQueue(session)}
              tone="primary"
            >
              {isBusy ? <Loader2 size={15} className="animate-spin" /> : <Play size={15} />}
              Start Queue
            </ActionButton>
          </div>
          <div className="flex flex-wrap gap-2 xl:justify-end">
            <ActionButton disabled={!canMarkArrived} onClick={() => onMarkArrived(session)}>
              <UserCheck size={15} />
              Mark Doctor Arrived
            </ActionButton>
            <ActionButton disabled={!canMarkDelayed} onClick={() => onMarkDelayed(session)}>
              <Clock3 size={15} />
              Mark Doctor Delayed
            </ActionButton>
            <ActionButton disabled={!canCancel} onClick={() => onCancel(session)} tone="danger">
              <UserRoundX size={15} />
              Cancel Session
            </ActionButton>
          </div>
          {!canUseQueue ? (
            <p className="text-xs font-medium text-[#64748B]">
              Queue actions are disabled for this receptionist account.
            </p>
          ) : null}
        </div>
      </div>
    </article>
  );
}

export default function ReceptionSessionCoveragePage() {
  const navigate = useNavigate();
  const [permissions, setPermissions] = useState<ReceptionPermissions | null>(null);
  const [baseSessions, setBaseSessions] = useState<ReceptionSession[]>([]);
  const [doctors, setDoctors] = useState<ReceptionSessionDoctor[]>([]);
  const [localStatusBySessionId, setLocalStatusBySessionId] = useState<Record<number, SessionViewStatus>>({});
  const [activeTab, setActiveTab] = useState<StatusTab>("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [busySessionId, setBusySessionId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState<Notice | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const permissionData = await getReceptionPermissions();
      setPermissions(permissionData);

      if (!permissionData.schedule_management) {
        setBaseSessions([]);
        setDoctors([]);
        setError("");
        return;
      }

      const [sessionData, doctorData] = await Promise.all([
        getReceptionSessions(),
        getReceptionSessionDoctors().catch(() => [] as ReceptionSessionDoctor[]),
      ]);

      setBaseSessions(sessionData.filter((session) => session.date === TODAY));
      setDoctors(doctorData);
      setError("");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to load today sessions.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const sessions = useMemo(
    () => mapSessions(baseSessions, doctors, localStatusBySessionId),
    [baseSessions, doctors, localStatusBySessionId]
  );

  const tabCounts = useMemo(() => {
    return tabLabels.reduce<Record<StatusTab, number>>(
      (acc, tab) => {
        acc[tab.key] = sessions.filter((session) => statusMatchesTab(session.status, tab.key)).length;
        return acc;
      },
      { all: 0, upcoming: 0, live: 0, completed: 0, cancelled: 0 }
    );
  }, [sessions]);

  const filteredSessions = useMemo(() => {
    const query = search.trim().toLowerCase();

    return sessions.filter((session) => {
      if (!statusMatchesTab(session.status, activeTab)) return false;
      if (!query) return true;

      return [
        session.doctorName,
        session.specialization,
        session.roomNumber,
        session.medicalCenterName,
        getStatusLabel(session.status),
      ].some((value) => value.toLowerCase().includes(query));
    });
  }, [activeTab, search, sessions]);

  const summary = useMemo(
    () => ({
      total: sessions.length,
      upcoming: tabCounts.upcoming,
      live: tabCounts.live,
      completed: tabCounts.completed,
      cancelled: tabCounts.cancelled,
    }),
    [sessions.length, tabCounts]
  );

  const handleStartQueue = async (session: TodaySessionItem) => {
    if (!permissions?.queue_access) return;
    setBusySessionId(session.id);
    try {
      const response = await startQueue(session.id);
      setNotice({ tone: "success", message: response.message || "Queue started." });
      await load();
    } catch (caughtError) {
      setNotice({
        tone: "danger",
        message: caughtError instanceof Error ? caughtError.message : "Unable to start queue.",
      });
    } finally {
      setBusySessionId(null);
    }
  };

  const handleMarkArrived = (session: TodaySessionItem) => {
    // TODO: Replace local state update when backend exposes doctor arrival status endpoint.
    setLocalStatusBySessionId((current) => ({ ...current, [session.id]: "doctor_arrived" }));
    setNotice({ tone: "success", message: `${session.doctorName} marked as arrived.` });
  };

  const handleMarkDelayed = (session: TodaySessionItem) => {
    // TODO: Replace local state update when backend exposes doctor delay status endpoint.
    setLocalStatusBySessionId((current) => ({ ...current, [session.id]: "doctor_delayed" }));
    setNotice({ tone: "warning", message: `${session.doctorName} marked as delayed.` });
  };

  const handleCancel = (session: TodaySessionItem) => {
    const confirmed = window.confirm(`Cancel today's session for ${session.doctorName}?`);
    if (!confirmed) return;

    // TODO: Replace local state update when backend exposes a safe cancel-session endpoint.
    setLocalStatusBySessionId((current) => ({ ...current, [session.id]: "cancelled" }));
    setNotice({ tone: "danger", message: `${session.doctorName}'s session was cancelled locally.` });
  };

  const resetFilters = () => {
    setActiveTab("all");
    setSearch("");
  };

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-160px)] rounded-[32px] bg-[linear-gradient(180deg,#F8FAFC_0%,#EFF8FF_100%)] p-6">
        <LoadingSkeleton />
      </div>
    );
  }

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
        title="Today sessions are not assigned"
        message="This receptionist account cannot review doctor sessions until schedule management is enabled."
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
              <Stethoscope size={14} />
              Reception Desk
            </div>
            <h1 className="mt-4 text-3xl font-bold tracking-tight">Today Sessions</h1>
            <p className="mt-2 text-sm text-sky-100">Manage today&apos;s clinic sessions and queues</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm font-semibold text-white">
              {formatDateLabel(TODAY)}
            </div>
            <button
              type="button"
              onClick={() => void load()}
              className="inline-flex items-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/15"
            >
              <RefreshCcw size={16} />
              Refresh
            </button>
          </div>
        </div>

        <label className="mt-6 block max-w-3xl">
          <span className="sr-only">Search sessions</span>
          <div className="flex h-14 items-center gap-3 rounded-2xl border border-white/25 bg-white px-4 text-[#0F172A] shadow-sm">
            <Search size={18} className="text-[#64748B]" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search doctor, specialty, room, or session"
              className="h-12 w-full bg-transparent text-sm font-medium outline-none placeholder:text-[#64748B]"
            />
          </div>
        </label>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <SummaryCard
          icon={CalendarDays}
          label="Total Sessions"
          value={summary.total}
          tone="border-sky-200 bg-sky-50 text-[#0EA5E9]"
        />
        <SummaryCard
          icon={Clock3}
          label="Upcoming"
          value={summary.upcoming}
          tone="border-slate-200 bg-slate-50 text-[#0B3558]"
        />
        <SummaryCard
          icon={Play}
          label="Live"
          value={summary.live}
          tone="border-emerald-200 bg-emerald-50 text-[#10B981]"
        />
        <SummaryCard
          icon={CheckCircle2}
          label="Completed"
          value={summary.completed}
          tone="border-sky-200 bg-sky-50 text-[#0EA5E9]"
        />
        <SummaryCard
          icon={AlertCircle}
          label="Cancelled"
          value={summary.cancelled}
          tone="border-red-200 bg-red-50 text-[#EF4444]"
        />
      </section>

      <section className="rounded-[28px] border border-[#D8E7F3] bg-white p-5 shadow-[0_18px_48px_rgba(6,26,46,0.06)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold text-[#0EA5E9]">Clinic workflow</p>
            <h2 className="mt-1 text-2xl font-bold text-[#0F172A]">Doctor sessions assigned for today</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {tabLabels.map((tab) => {
              const selected = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition ${
                    selected
                      ? "border-[#0EA5E9] bg-[#EFF8FF] text-[#0B3558] shadow-sm"
                      : "border-[#D8E7F3] bg-white text-[#64748B] hover:bg-[#F8FAFC]"
                  }`}
                >
                  {tab.label}
                  <span className="rounded-full bg-white px-2 py-0.5 text-xs text-[#0B3558]">
                    {tabCounts[tab.key]}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-5 space-y-4">
          {sessions.length === 0 ? (
            <EmptySessionsState filtered={false} onReset={resetFilters} />
          ) : filteredSessions.length === 0 ? (
            <EmptySessionsState filtered onReset={resetFilters} />
          ) : (
            filteredSessions.map((session) => (
              <SessionCard
                key={session.id}
                canUseQueue={Boolean(permissions.queue_access)}
                isBusy={busySessionId === session.id}
                session={session}
                onCancel={handleCancel}
                onMarkArrived={handleMarkArrived}
                onMarkDelayed={handleMarkDelayed}
                onStartQueue={(target) => void handleStartQueue(target)}
                onView={(target) => navigate(`/receptionist/sessions/${target.id}`)}
              />
            ))
          )}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-3xl border border-[#D8E7F3] bg-white p-5 shadow-[0_14px_34px_rgba(6,26,46,0.05)]">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-[#EFF8FF] p-3 text-[#0EA5E9]">
              <DoorOpen size={20} />
            </div>
            <div>
              <p className="text-sm font-semibold text-[#64748B]">Next workflow</p>
              <p className="font-bold text-[#0F172A]">Open the correct queue from the session card.</p>
            </div>
          </div>
        </div>
        <div className="rounded-3xl border border-[#D8E7F3] bg-white p-5 shadow-[0_14px_34px_rgba(6,26,46,0.05)]">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-emerald-50 p-3 text-[#10B981]">
              <Users size={20} />
            </div>
            <div>
              <p className="text-sm font-semibold text-[#64748B]">Patient load</p>
              <p className="font-bold text-[#0F172A]">
                {sessions.reduce((sum, item) => sum + item.bookedPatients, 0)} booked patients today.
              </p>
            </div>
          </div>
        </div>
        <div className="rounded-3xl border border-[#D8E7F3] bg-white p-5 shadow-[0_14px_34px_rgba(6,26,46,0.05)]">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-amber-50 p-3 text-[#F59E0B]">
              <AlertCircle size={20} />
            </div>
            <div>
              <p className="text-sm font-semibold text-[#64748B]">Reception focus</p>
              <p className="font-bold text-[#0F172A]">Confirm doctor arrival before queue pressure builds.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
