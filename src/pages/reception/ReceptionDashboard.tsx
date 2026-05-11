import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CalendarDays,
  CheckCircle2,
  CheckSquare,
  Clock3,
  Eye,
  ListOrdered,
  Sparkles,
  UserPlus,
  Users,
} from "lucide-react";
import Button from "../../components/ui/Button";
import PageLoader from "../../components/ui/PageLoader";
import { EmptyState, InlineAlert, StatusBadge } from "../../components/reception/ReceptionUI";
import {
  endQueue,
  getReceptionDashboard,
  getReceptionSessionDoctors,
  pauseQueue,
  startQueue,
} from "../../services/reception.service";
import type {
  QueueStatus,
  ReceptionCapability,
  ReceptionDashboardMetric,
  ReceptionDashboardSummary,
  ReceptionSession,
  ReceptionSessionDoctor,
} from "../../types/reception.types";

type Notice = {
  tone: "success" | "danger" | "warning" | "info";
  message: string;
};

type DashboardSession = ReceptionSession & {
  doctorImageUrl: string | null;
  initials: string;
};

type SessionStatusKey = "not_started" | "live" | "paused" | "completed" | "cancelled";

const TODAY = new Date().toISOString().slice(0, 10);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getMetricValue(dashboard: ReceptionDashboardSummary, key: ReceptionDashboardMetric["key"]) {
  return dashboard.metrics.find((metric) => metric.key === key)?.value ?? null;
}

function getCapability(capabilities: ReceptionCapability[], key: ReceptionCapability["key"]) {
  return capabilities.find((capability) => capability.key === key)?.enabled ?? false;
}

function resolveDoctorImageUrl(candidate: unknown): string | null {
  if (!isRecord(candidate)) return null;

  const keys = [
    "doctorProfileImage",
    "profileImageUrl",
    "avatarUrl",
    "image_url",
    "profile_image",
    "imageUrl",
  ] as const;

  for (const key of keys) {
    const value = candidate[key];
    if (typeof value === "string" && value.trim()) return value;
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

function formatSessionTime(startTime: string, endTime: string) {
  const baseDate = `${TODAY}T`;
  const start = new Date(`${baseDate}${String(startTime || "").slice(0, 5)}:00`);
  const end = new Date(`${baseDate}${String(endTime || "").slice(0, 5)}:00`);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return `${String(startTime || "").slice(0, 5)} - ${String(endTime || "").slice(0, 5)}`;
  }

  return `${start.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })} - ${end.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  })}`;
}

function getQueueStatusLabel(status: QueueStatus) {
  if (status === "not_started") return "Not Started";
  if (status === "live") return "Queue Live";
  if (status === "paused") return "Paused";
  return "Completed";
}

function getQueueStatusTone(status: SessionStatusKey | QueueStatus) {
  if (status === "live" || status === "completed") return "success";
  if (status === "paused") return "warning";
  if (status === "cancelled") return "danger";
  return "info";
}

function getUpcomingStatus(session: ReceptionSession): SessionStatusKey {
  if (session.queueStatus === "completed") return "completed";
  if (session.queueStatus === "live") return "live";
  if (session.queueStatus === "paused") return "paused";
  return "not_started";
}

function mergeSessionsWithDoctors(
  sessions: ReceptionSession[],
  doctors: ReceptionSessionDoctor[]
): DashboardSession[] {
  return sessions.map((session) => {
    const doctor =
      doctors.find((item) => item.doctorId === session.doctorId) ||
      doctors.find((item) => item.doctorName.trim().toLowerCase() === session.doctorName.trim().toLowerCase());

    return {
      ...session,
      doctorImageUrl: resolveDoctorImageUrl(doctor),
      initials: getInitials(session.doctorName),
    };
  });
}

function SummaryCard({
  helper,
  icon: Icon,
  label,
  tone,
  value,
}: {
  helper: string;
  icon: typeof CalendarDays;
  label: string;
  tone: string;
  value: number | string;
}) {
  return (
    <div className="group relative overflow-hidden rounded-[20px] border border-[#D8E7F3] bg-white p-5 shadow-[0_16px_42px_-30px_rgba(6,26,46,0.32)] transition hover:-translate-y-0.5 hover:border-[#0EA5E9]/45 hover:shadow-[0_22px_54px_-32px_rgba(11,53,88,0.34)]">
      <div className="absolute inset-x-0 top-0 h-1 bg-[#0EA5E9]" />
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-[#64748B]">{label}</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-[#0F172A]">{value}</p>
          <p className="mt-2 text-sm leading-5 text-[#64748B]">{helper}</p>
        </div>
        <span className={`flex h-12 w-12 items-center justify-center rounded-[16px] border border-[#D8E7F3] shadow-sm ${tone}`}>
          <Icon size={18} />
        </span>
      </div>
      <div className="mt-5 flex items-center gap-2 text-xs font-semibold text-[#0B3558]">
        <span className="h-2 w-2 rounded-full bg-[#0EA5E9]" />
        Clinic signal
      </div>
    </div>
  );
}

function WorkflowPill({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof CalendarDays;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-full border border-white/15 bg-white/10 px-4 py-2.5 shadow-sm">
      <div className="flex items-center gap-3">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#0EA5E9] text-white">
          <Icon size={14} />
        </span>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#38BDF8]">{label}</p>
          <p className="text-sm font-semibold text-white">{value}</p>
        </div>
      </div>
    </div>
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
  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt={name}
        className="h-14 w-14 rounded-full border border-slate-200 object-cover"
        onError={(event) => {
          event.currentTarget.style.display = "none";
          const fallback = event.currentTarget.nextElementSibling;
          if (fallback instanceof HTMLElement) fallback.style.display = "flex";
        }}
      />
    );
  }

  return (
    <div className="flex h-14 w-14 items-center justify-center rounded-full border border-slate-200 bg-slate-100 text-sm font-semibold text-slate-700">
      {initials}
    </div>
  );
}

function AvatarFallback({ initials }: { initials: string }) {
  return (
    <div
      style={{ display: "none" }}
      className="flex h-14 w-14 items-center justify-center rounded-full border border-slate-200 bg-slate-100 text-sm font-semibold text-slate-700"
    >
      {initials}
    </div>
  );
}

function CompactEmptySession({ onViewSessions }: { onViewSessions: () => void }) {
  return (
    <div className="rounded-[20px] border border-[#D8E7F3] bg-white p-5 shadow-[0_16px_42px_-32px_rgba(6,26,46,0.28)]">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#EFF8FF] text-[#0EA5E9]">
            <CalendarDays size={20} />
          </div>
          <div>
            <p className="text-sm font-semibold text-[#0F172A]">No active session right now</p>
            <p className="mt-1 text-sm leading-6 text-[#64748B]">
              Start a session from Today Sessions when the doctor arrives.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onViewSessions}
          className="inline-flex min-h-11 items-center justify-center rounded-[14px] border border-[#D8E7F3] bg-white px-4 text-sm font-semibold text-[#0B3558] transition hover:bg-[#EFF8FF]"
        >
          View Today Sessions
        </button>
      </div>
    </div>
  );
}

function ActiveSessionPanel({
  canQueue,
  onEnd,
  onOpenQueue,
  onPause,
  onStart,
  onViewSessions,
  session,
}: {
  canQueue: boolean;
  onEnd: (session: DashboardSession) => void;
  onOpenQueue: (session: DashboardSession) => void;
  onPause: (session: DashboardSession) => void;
  onStart: (session: DashboardSession) => void;
  onViewSessions: () => void;
  session: DashboardSession | null;
}) {
  if (!session) {
    return <CompactEmptySession onViewSessions={onViewSessions} />;
  }

  const queueIsLive = session.queueStatus === "live";

  return (
    <div className="overflow-hidden rounded-[24px] border border-[#D8E7F3] bg-white p-6 shadow-[0_18px_54px_-34px_rgba(6,26,46,0.34)]">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_380px]">
        <div className="flex items-start gap-4">
          <div className="shrink-0">
            <DoctorAvatar imageUrl={session.doctorImageUrl} initials={session.initials} name={session.doctorName} />
            {session.doctorImageUrl ? <AvatarFallback initials={session.initials} /> : null}
          </div>
          <div>
            <p className="text-xs font-semibold text-[#0B3558]">Active session</p>
            <h2 className="mt-2 text-2xl font-semibold text-[#0F172A]">{session.doctorName}</h2>
            <p className="mt-1 text-sm text-[#64748B]">{session.specialty || "General practice"}</p>
            <p className="mt-1 text-sm text-[#64748B]">{session.medicalCenterName || "Clinic"}</p>
            <p className="mt-4 text-sm font-medium text-[#0F172A]">{`Today ${formatSessionTime(session.startTime, session.endTime)}`}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <StatusBadge label={`Queue Status: ${getQueueStatusLabel(session.queueStatus)}`} tone={getQueueStatusTone(session.queueStatus)} />
              <span className="inline-flex rounded-full border border-[#D8E7F3] bg-[#EFF8FF] px-3 py-1 text-xs font-semibold text-[#0B3558]">
                {session.appointmentCount} appointments
              </span>
            </div>
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <div className="rounded-[16px] border border-[#D8E7F3] bg-[#F8FAFC] px-4 py-3">
                <p className="text-xs font-semibold text-[#64748B]">Waiting</p>
                <p className="mt-2 text-2xl font-semibold text-[#0F172A]">{session.waitingCount}</p>
              </div>
              <div className="rounded-[16px] border border-[#D8E7F3] bg-[#F8FAFC] px-4 py-3">
                <p className="text-xs font-semibold text-[#64748B]">Completed</p>
                <p className="mt-2 text-2xl font-semibold text-[#0F172A]">{session.completedCount}</p>
              </div>
              <div className="rounded-[16px] border border-[#D8E7F3] bg-[#F8FAFC] px-4 py-3">
                <p className="text-xs font-semibold text-[#64748B]">Missed</p>
                <p className="mt-2 text-2xl font-semibold text-[#0F172A]">{session.missedCount}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="rounded-[18px] border border-[#D8E7F3] bg-[#F8FAFC] p-4">
            <p className="text-xs font-semibold text-[#0B3558]">Session controls</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              <Button
                className="!min-h-[48px] !rounded-[14px] !border-[#D8E7F3] !bg-white !text-[#0B3558] hover:!bg-[#EFF8FF]"
                variant="secondary"
                disabled={!canQueue}
                onClick={() => onOpenQueue(session)}
              >
                Open Queue
              </Button>
              <Button
                className="!min-h-[48px] !rounded-[14px] !bg-[#0EA5E9] !text-white hover:!bg-[#0B3558]"
                variant="primary"
                disabled={!canQueue || queueIsLive}
                onClick={() => onStart(session)}
              >
                Start Session
              </Button>
              <Button
                className="!min-h-[48px] !rounded-[14px] !border-[#D8E7F3] !bg-white !text-[#0B3558] hover:!bg-[#EFF8FF]"
                variant="ghost"
                disabled={!canQueue || !queueIsLive || !session.queueId}
                onClick={() => onPause(session)}
              >
                Pause Queue
              </Button>
              <Button
                className="!min-h-[48px] !rounded-[14px] !border-[#FECACA] !bg-[#FEF2F2] !text-[#B91C1C] hover:!bg-[#FEE2E2]"
                variant="danger"
                disabled={!canQueue || !session.queueId}
                onClick={() => onEnd(session)}
              >
                End Session
              </Button>
            </div>
          </div>
          <div className="rounded-[18px] border border-[#D8E7F3] bg-white p-4">
            <p className="text-xs font-semibold text-[#0B3558]">Reception note</p>
            <p className="mt-3 text-sm leading-6 text-[#64748B]">
              Keep this queue moving from the live queue panel once the doctor starts seeing patients.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function UpcomingSessionCard({
  onView,
  session,
}: {
  onView: (session: DashboardSession) => void;
  session: DashboardSession;
}) {
  const status = getUpcomingStatus(session);

  return (
    <div className="rounded-[20px] border border-[#D8E7F3] bg-white p-5 shadow-[0_16px_42px_-32px_rgba(6,26,46,0.24)] transition hover:-translate-y-0.5 hover:border-[#0EA5E9]/50">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="shrink-0">
            <DoctorAvatar imageUrl={session.doctorImageUrl} initials={session.initials} name={session.doctorName} />
            {session.doctorImageUrl ? <AvatarFallback initials={session.initials} /> : null}
          </div>
          <div>
            <h3 className="text-lg font-semibold text-[#0F172A]">{session.doctorName}</h3>
            <p className="mt-1 text-sm text-[#64748B]">{session.specialty || "General practice"}</p>
            <p className="mt-2 text-sm text-[#64748B]">{formatSessionTime(session.startTime, session.endTime)}</p>
            <p className="mt-1 text-sm text-[#64748B]">{session.appointmentCount} booked</p>
          </div>
        </div>
        <div className="shrink-0">
          <StatusBadge label={getQueueStatusLabel(session.queueStatus)} tone={getQueueStatusTone(status)} />
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between gap-3 border-t border-[#D8E7F3] pt-4">
        <div className="text-xs font-medium text-[#64748B]">
          Clinic workflow session
        </div>
        <Button
          className="!rounded-[14px] !border-[#D8E7F3] !bg-white !text-[#0EA5E9] hover:!bg-[#EFF8FF]"
          variant="ghost"
          onClick={() => onView(session)}
        >
          View
        </Button>
      </div>
    </div>
  );
}

export default function ReceptionDashboardPage() {
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState<ReceptionDashboardSummary | null>(null);
  const [sessions, setSessions] = useState<DashboardSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState<Notice | null>(null);
  const [busyAction, setBusyAction] = useState<"start" | "pause" | "end" | null>(null);
  const [busySessionId, setBusySessionId] = useState<number | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [dashboardData, doctors] = await Promise.all([
        getReceptionDashboard(),
        getReceptionSessionDoctors().catch(() => [] as ReceptionSessionDoctor[]),
      ]);
      setDashboard(dashboardData);
      setSessions(mergeSessionsWithDoctors(dashboardData.todaySessions, doctors));
      setError("");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to load receptionist dashboard.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const canQueue = useMemo(
    () => (dashboard ? getCapability(dashboard.capabilities, "queue_access") : false),
    [dashboard]
  );

  const overview = useMemo(() => {
    if (!dashboard) {
      return {
        todaySessions: 0,
        bookedPatients: 0,
        checkedInPatients: 0,
        waitingQueue: 0,
        completedPatients: 0,
        missedLate: 0,
        walkIns: 0,
      };
    }

    return {
      todaySessions: sessions.length,
      bookedPatients: sessions.reduce((sum, session) => sum + session.appointmentCount, 0),
      checkedInPatients: Number(getMetricValue(dashboard, "checked_in_patients") || 0),
      waitingQueue: Number(getMetricValue(dashboard, "waiting_patients") || 0),
      completedPatients: Number(getMetricValue(dashboard, "completed_visits") || 0),
      missedLate:
        Number(getMetricValue(dashboard, "missed_visits") || 0) +
        Number(getMetricValue(dashboard, "late_arrivals") || 0),
      walkIns: Number(getMetricValue(dashboard, "walk_ins") || 0),
    };
  }, [dashboard, sessions]);

  const activeSession = useMemo(
    () =>
      sessions.find((session) => session.queueStatus === "live") ||
      sessions.find((session) => session.queueStatus === "paused") ||
      sessions.find((session) => session.canStartQueue) ||
      null,
    [sessions]
  );

  const upcomingSessions = useMemo(() => {
    if (!activeSession) return sessions;
    return sessions.filter((session) => session.id !== activeSession.id);
  }, [activeSession, sessions]);

  const runAction = async (
    action: "start" | "pause" | "end",
    session: DashboardSession,
    runner: () => Promise<{ message: string }>
  ) => {
    setBusyAction(action);
    setBusySessionId(session.id);
    try {
      const response = await runner();
      setNotice({ tone: "success", message: response.message || "Dashboard action completed." });
      await load();
    } catch (caughtError) {
      setNotice({
        tone: "danger",
        message: caughtError instanceof Error ? caughtError.message : "Unable to complete dashboard action.",
      });
    } finally {
      setBusyAction(null);
      setBusySessionId(null);
    }
  };

  const openQueue = (session: DashboardSession) => {
    const suffix = session.id ? `?sessionId=${encodeURIComponent(String(session.id))}` : "";
    navigate(`/receptionist/live-queue${suffix}`);
  };

  const viewSession = (session: DashboardSession) => {
    navigate(`/receptionist/sessions?sessionId=${encodeURIComponent(String(session.id))}`);
  };

  const handleEndSession = (session: DashboardSession) => {
    if (!session.queueId) return;
    if (!window.confirm(`End the queue for ${session.doctorName}?`)) return;
    void runAction("end", session, () => endQueue(Number(session.queueId)));
  };

  if (loading) return <PageLoader />;

  if (error || !dashboard) {
    return (
      <div className="space-y-4">
        <InlineAlert tone="danger" message={error || "Unable to load receptionist dashboard."} />
        <Button variant="secondary" onClick={() => void load()}>
          Retry
        </Button>
      </div>
    );
  }

  const currentDate = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date());

  return (
    <div className="-m-2 min-h-full rounded-[24px] bg-[linear-gradient(180deg,#F8FAFC_0%,#EFF8FF_100%)] p-2">
      <div className="space-y-6">
      {notice ? <InlineAlert tone={notice.tone} message={notice.message} /> : null}

      <section className="overflow-hidden rounded-[24px] border border-white/10 bg-[linear-gradient(135deg,#061A2E_0%,#0B3558_100%)] p-6 text-white shadow-[0_24px_70px_-42px_rgba(6,26,46,0.6)]">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#38BDF8]">Receptionist Dashboard</p>
            <h1 className="mt-3 text-3xl font-semibold text-white">Reception Desk Control Center</h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-200">Today&apos;s clinic workflow overview</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <WorkflowPill
                icon={Sparkles}
                label="Desk mode"
                value={activeSession ? "Active session in progress" : "Waiting for session start"}
              />
              <WorkflowPill
                icon={ListOrdered}
                label="Next action"
                value={activeSession ? "Open or manage queue" : "Review upcoming sessions"}
              />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:w-[420px]">
            <div className="rounded-[18px] border border-white/15 bg-white/10 px-4 py-4 shadow-sm">
              <p className="text-xs font-semibold text-[#38BDF8]">Current date</p>
              <p className="mt-2 text-sm font-semibold text-white">{currentDate}</p>
            </div>
            <div className="rounded-[18px] border border-[#38BDF8]/35 bg-[#0EA5E9]/15 px-4 py-4 shadow-sm">
              <p className="text-xs font-semibold text-[#38BDF8]">Desk state</p>
              <p className="mt-2 text-sm font-semibold text-white">Today</p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-7">
        <SummaryCard
          icon={CalendarDays}
          label="Today's Sessions"
          value={overview.todaySessions}
          helper="Scheduled doctor sessions"
          tone="bg-sky-50 text-sky-700"
        />
        <SummaryCard
          icon={Users}
          label="Booked Patients"
          value={overview.bookedPatients}
          helper="Appointments attached today"
          tone="bg-indigo-50 text-indigo-700"
        />
        <SummaryCard
          icon={CheckSquare}
          label="Checked-in Patients"
          value={overview.checkedInPatients}
          helper="Already inside visit flow"
          tone="bg-emerald-50 text-emerald-700"
        />
        <SummaryCard
          icon={ListOrdered}
          label="Waiting Queue"
          value={overview.waitingQueue}
          helper="Patients still waiting"
          tone="bg-amber-50 text-amber-700"
        />
        <SummaryCard
          icon={CheckCircle2}
          label="Completed Patients"
          value={overview.completedPatients}
          helper="Finished visits today"
          tone="bg-emerald-50 text-emerald-700"
        />
        <SummaryCard
          icon={Clock3}
          label="Missed / Late"
          value={overview.missedLate}
          helper="Late plus missed signals"
          tone="bg-rose-50 text-rose-700"
        />
        <SummaryCard
          icon={UserPlus}
          label="Walk-ins"
          value={overview.walkIns}
          helper={
            getMetricValue(dashboard, "walk_ins") === null ? "Not reported by current API" : "Walk-ins today"
          }
          tone="bg-slate-100 text-slate-700"
        />
      </section>

      <ActiveSessionPanel
        canQueue={canQueue}
        session={activeSession}
        onOpenQueue={openQueue}
        onStart={(session) => void runAction("start", session, () => startQueue(session.id))}
        onPause={(session) =>
          session.queueId ? void runAction("pause", session, () => pauseQueue(Number(session.queueId))) : undefined
        }
        onViewSessions={() => navigate("/receptionist/sessions")}
        onEnd={handleEndSession}
      />

      <section className="rounded-[24px] border border-[#D8E7F3] bg-white p-6 shadow-[0_18px_54px_-38px_rgba(6,26,46,0.24)]">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-xs font-semibold text-[#0B3558]">Upcoming Sessions</p>
            <h2 className="mt-2 text-2xl font-semibold text-[#0F172A]">Today&apos;s upcoming doctor sessions</h2>
            <p className="mt-2 text-sm text-[#64748B]">Review the next doctors in line and move into session coverage when needed.</p>
          </div>
          {busyAction && busySessionId ? (
            <div className="rounded-full border border-[#D8E7F3] bg-white px-4 py-2 text-sm text-[#64748B] shadow-sm">Updating session...</div>
          ) : null}
        </div>

        {upcomingSessions.length === 0 ? (
          <div className="mt-6">
            <EmptyState title="No sessions scheduled for today." message="No sessions scheduled for today." />
          </div>
        ) : (
          <div className="mt-6 grid gap-4 xl:grid-cols-2">
            {upcomingSessions.map((session) => (
              <UpcomingSessionCard key={session.id} session={session} onView={viewSession} />
            ))}
          </div>
        )}
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.3fr_0.7fr]">
        <div className="rounded-[24px] border border-[#D8E7F3] bg-white p-6 shadow-[0_18px_54px_-38px_rgba(6,26,46,0.22)]">
          <p className="text-sm font-semibold text-[#0B3558]">Clinic Pulse</p>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <div className="rounded-[18px] border border-[#D8E7F3] bg-[#F8FAFC] px-4 py-4">
              <p className="text-sm font-semibold text-[#64748B]">Queue health</p>
              <p className="mt-3 text-xl font-semibold text-[#0F172A]">
                {overview.waitingQueue > 0 ? `${overview.waitingQueue} waiting` : "Flow clear"}
              </p>
              <p className="mt-2 text-sm leading-6 text-[#64748B]">Use the live queue panel to keep the desk moving.</p>
            </div>
            <div className="rounded-[18px] border border-[#D8E7F3] bg-[#F8FAFC] px-4 py-4">
              <p className="text-sm font-semibold text-[#64748B]">Patient readiness</p>
              <p className="mt-3 text-xl font-semibold text-[#0F172A]">
                {overview.checkedInPatients} checked in
              </p>
              <p className="mt-2 text-sm leading-6 text-[#64748B]">Patients already inside the day&apos;s clinical workflow.</p>
            </div>
            <div className="rounded-[18px] border border-[#D8E7F3] bg-[#F8FAFC] px-4 py-4">
              <p className="text-sm font-semibold text-[#64748B]">Follow-up</p>
              <p className="mt-3 text-xl font-semibold text-[#0F172A]">
                {overview.missedLate > 0 ? `${overview.missedLate} issues` : "No desk issues"}
              </p>
              <p className="mt-2 text-sm leading-6 text-[#64748B]">Late and missed visits that may need reception follow-up.</p>
            </div>
          </div>
        </div>

        <div className="rounded-[24px] border border-[#D8E7F3] bg-white p-6 shadow-[0_18px_54px_-38px_rgba(6,26,46,0.22)]">
          <p className="text-sm font-semibold text-[#0B3558]">Quick Guidance</p>
          <h3 className="mt-3 text-2xl font-semibold text-[#0F172A]">Front desk flow</h3>
          <div className="mt-5 space-y-3">
            {[
              "Confirm today's active doctor session.",
              "Check in arrived patients before calling the queue.",
              "Handle late or missed patients before queue pressure grows.",
              "Keep walk-ins separated from booked appointments.",
            ].map((item, index) => (
              <div key={item} className="flex gap-3 rounded-[16px] border border-[#D8E7F3] bg-[#F8FAFC] px-4 py-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#EFF8FF] text-sm font-semibold text-[#0EA5E9]">
                  {index + 1}
                </span>
                <p className="text-sm leading-6 text-[#64748B]">{item}</p>
              </div>
            ))}
          </div>
          <div className="mt-5 rounded-[16px] border border-[#D8E7F3] bg-[#EFF8FF] px-4 py-4">
            <div className="flex items-center gap-2 text-[#0B3558]">
              <Eye size={16} />
              <span className="text-sm font-semibold">Reception focus</span>
            </div>
            <p className="mt-2 text-sm leading-6 text-[#64748B]">
              Keep the session and queue panels in sync before calling the next patient.
            </p>
          </div>
        </div>
      </section>
      </div>
    </div>
  );
}
