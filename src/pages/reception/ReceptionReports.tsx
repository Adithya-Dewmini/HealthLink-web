import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Download,
  Eye,
  Stethoscope,
  UserCheck,
  UserRoundX,
  Users,
} from "lucide-react";
import PermissionState from "../../components/reception/PermissionState";
import { InlineAlert } from "../../components/reception/ReceptionUI";
import {
  getReceptionPermissions,
  getReceptionQueues,
  getReceptionSessions,
  getReceptionVisits,
} from "../../services/reception.service";
import type {
  ReceptionPermissions,
  ReceptionQueue,
  ReceptionSession,
  ReceptionVisit,
} from "../../types/reception.types";

type DateRange = "today" | "yesterday" | "week" | "month" | "custom";

type ReportFilters = {
  dateRange: DateRange;
  doctorId: string;
  sessionId: string;
  customDate: string;
};

type ReceptionReportSummary = {
  totalPatients: number;
  completedConsultations: number;
  missedAppointments: number;
  lateArrivals: number;
  walkIns: number;
  averageWaitingMinutes: number;
};

type PatientFlowBreakdown = {
  booked: number;
  checkedIn: number;
  waiting: number;
  nowServing: number;
  completed: number;
  missed: number;
  cancelled: number;
  walkIns: number;
};

type DoctorSessionReport = {
  id: number;
  doctorName: string;
  specialization: string;
  roomNumber: string;
  sessionTime: string;
  bookedPatients: number;
  walkIns: number;
  completed: number;
  missedLate: number;
  averageWaitMinutes: number;
  status: string;
};

type Notice = {
  tone: "success" | "danger" | "warning" | "info";
  message: string;
};

const TODAY = new Date().toISOString().slice(0, 10);

function dateLabel() {
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

function addDays(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function buildRoomFallback(sessionId: number | null, doctorId: number) {
  const seed = sessionId || doctorId || 1;
  // TODO: Replace room fallback when reports API returns room assignment.
  return `Room ${String((seed % 6) + 1).padStart(2, "0")}`;
}

function statusLabel(status: string) {
  if (status === "live") return "Live";
  if (status === "paused") return "Paused";
  if (status === "completed") return "Completed";
  return "Not Started";
}

function statusClasses(status: string) {
  if (status === "live") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "paused") return "border-amber-200 bg-amber-50 text-amber-800";
  if (status === "completed") return "border-sky-200 bg-sky-50 text-sky-700";
  return "border-slate-200 bg-slate-100 text-slate-700";
}

function matchesDateRange(visit: ReceptionVisit, filters: ReportFilters) {
  if (filters.dateRange === "today") return visit.sessionDate === TODAY;
  if (filters.dateRange === "yesterday") return visit.sessionDate === addDays(-1);
  if (filters.dateRange === "custom") return visit.sessionDate === filters.customDate;
  if (filters.dateRange === "week") return visit.sessionDate >= addDays(-6) && visit.sessionDate <= TODAY;
  return visit.sessionDate.slice(0, 7) === TODAY.slice(0, 7);
}

function estimateWait(visit: ReceptionVisit) {
  if (!visit.appointmentTime || !["waiting", "in_consultation", "completed"].includes(visit.visitStatus)) return 0;
  const [hourPart = "0", minutePart = "0"] = visit.appointmentTime.split(":");
  const hour = Number(hourPart);
  const minute = Number(minutePart);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return 0;
  const appointment = new Date();
  appointment.setHours(hour, minute, 0, 0);
  return Math.max(0, Math.min(90, Math.floor((Date.now() - appointment.getTime()) / 60000)));
}

function ActionButton({
  children,
  disabled,
  onClick,
}: {
  children: ReactNode;
  disabled?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#D8E7F3] bg-white px-4 py-2.5 text-sm font-semibold text-[#0B3558] transition hover:bg-[#EFF8FF] disabled:cursor-not-allowed disabled:opacity-45"
    >
      {children}
    </button>
  );
}

function SummaryCard({
  helper,
  icon: Icon,
  label,
  value,
}: {
  helper: string;
  icon: typeof Users;
  label: string;
  value: number | string;
}) {
  return (
    <div className="rounded-2xl border border-[#D8E7F3] bg-white p-4 shadow-[0_14px_34px_rgba(6,26,46,0.06)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-[#64748B]">{label}</p>
          <p className="mt-2 text-2xl font-bold text-[#0F172A]">{value}</p>
          <p className="mt-1 text-xs font-semibold text-[#64748B]">{helper}</p>
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

function FlowRow({ label, value, max }: { label: string; value: number; max: number }) {
  const width = max > 0 ? Math.max(6, Math.round((value / max) * 100)) : 0;
  return (
    <div className="rounded-2xl border border-[#D8E7F3] bg-[#F8FAFC] p-4">
      <div className="flex items-center justify-between gap-4">
        <p className="font-semibold text-[#0F172A]">{label}</p>
        <p className="text-sm font-bold text-[#0B3558]">{value}</p>
      </div>
      <div className="mt-3 h-2 rounded-full bg-[#D8E7F3]">
        <div className="h-2 rounded-full bg-[#0EA5E9]" style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}

export default function ReceptionReportsPage() {
  const navigate = useNavigate();
  const [permissions, setPermissions] = useState<ReceptionPermissions | null>(null);
  const [visits, setVisits] = useState<ReceptionVisit[]>([]);
  const [sessions, setSessions] = useState<ReceptionSession[]>([]);
  const [queues, setQueues] = useState<ReceptionQueue[]>([]);
  const [filters, setFilters] = useState<ReportFilters>({
    dateRange: "today",
    doctorId: "",
    sessionId: "",
    customDate: TODAY,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState<Notice | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const permissionData = await getReceptionPermissions();
      setPermissions(permissionData);

      if (!permissionData.appointments) {
        setVisits([]);
        setSessions([]);
        setQueues([]);
        setError("");
        return;
      }

      const [visitData, sessionData, queueData] = await Promise.all([
        getReceptionVisits({ filter: "all", limit: 300 }),
        getReceptionSessions().catch(() => [] as ReceptionSession[]),
        getReceptionQueues().catch(() => ({ allQueues: [] as ReceptionQueue[] })),
      ]);
      setVisits(visitData.visits);
      setSessions(sessionData);
      setQueues(queueData.allQueues);
      setError("");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to load reports.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const filteredVisits = useMemo(() => {
    return visits.filter((visit) => {
      if (!matchesDateRange(visit, filters)) return false;
      if (filters.doctorId && String(visit.doctorId) !== filters.doctorId) return false;
      if (filters.sessionId && String(visit.sessionId || "") !== filters.sessionId) return false;
      return true;
    });
  }, [filters, visits]);

  const doctors = useMemo(() => {
    const map = new Map<number, string>();
    visits.forEach((visit) => map.set(visit.doctorId, visit.doctorName));
    sessions.forEach((session) => map.set(session.doctorId, session.doctorName));
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [sessions, visits]);

  const summary = useMemo<ReceptionReportSummary>(() => {
    const waits = filteredVisits.map(estimateWait).filter((value) => value > 0);
    return {
      totalPatients: filteredVisits.length,
      completedConsultations: filteredVisits.filter((visit) => visit.visitStatus === "completed").length,
      missedAppointments: filteredVisits.filter((visit) => visit.visitStatus === "missed").length,
      lateArrivals: filteredVisits.filter((visit) => visit.visitStatus === "late").length,
      walkIns: filteredVisits.filter((visit) => visit.bookingSource?.toLowerCase().includes("walk")).length,
      averageWaitingMinutes: waits.length ? Math.round(waits.reduce((sum, value) => sum + value, 0) / waits.length) : 0,
    };
  }, [filteredVisits]);

  const flow = useMemo<PatientFlowBreakdown>(() => {
    return {
      booked: filteredVisits.filter((visit) => visit.visitStatus === "scheduled").length,
      checkedIn: filteredVisits.filter((visit) => visit.visitStatus === "checked_in").length,
      waiting: filteredVisits.filter((visit) => visit.visitStatus === "waiting").length,
      nowServing: filteredVisits.filter((visit) => visit.visitStatus === "in_consultation").length,
      completed: filteredVisits.filter((visit) => visit.visitStatus === "completed").length,
      missed: filteredVisits.filter((visit) => visit.visitStatus === "missed").length,
      cancelled: filteredVisits.filter((visit) => visit.visitStatus === "cancelled").length,
      walkIns: filteredVisits.filter((visit) => visit.bookingSource?.toLowerCase().includes("walk")).length,
    };
  }, [filteredVisits]);

  const sessionReports = useMemo<DoctorSessionReport[]>(() => {
    return sessions
      .filter((session) => !filters.doctorId || String(session.doctorId) === filters.doctorId)
      .filter((session) => !filters.sessionId || String(session.id) === filters.sessionId)
      .map((session) => {
        const sessionVisits = filteredVisits.filter((visit) => visit.sessionId === session.id);
        const queue = queues.find((item) => item.sessionId === session.id);
        const waits = sessionVisits.map(estimateWait).filter((value) => value > 0);
        return {
          id: session.id,
          doctorName: session.doctorName,
          specialization: session.specialty || "General Medicine",
          roomNumber: buildRoomFallback(session.id, session.doctorId),
          sessionTime: `${formatClock(session.startTime)} - ${formatClock(session.endTime)}`,
          bookedPatients: sessionVisits.length || session.appointmentCount,
          walkIns: sessionVisits.filter((visit) => visit.bookingSource?.toLowerCase().includes("walk")).length,
          completed: sessionVisits.filter((visit) => visit.visitStatus === "completed").length,
          missedLate: sessionVisits.filter((visit) => visit.visitStatus === "missed" || visit.visitStatus === "late").length,
          averageWaitMinutes: waits.length ? Math.round(waits.reduce((sum, value) => sum + value, 0) / waits.length) : queue?.avgWaitMinutes || 0,
          status: statusLabel(session.queueStatus),
        };
      });
  }, [filteredVisits, filters.doctorId, filters.sessionId, queues, sessions]);

  const insights = useMemo(() => {
    const messages: string[] = [];
    if (summary.lateArrivals > 0) messages.push("Late arrivals increased today. Review missed patients before ending sessions.");
    if (summary.walkIns > summary.totalPatients / 2 && summary.totalPatients > 0) {
      messages.push("Walk-ins are higher than booked patients for this period.");
    }
    if (summary.averageWaitingMinutes <= 20) messages.push("Average waiting time is within acceptable range.");
    if (summary.missedAppointments > 0) messages.push("Missed appointments need front-desk follow-up.");
    return messages.length ? messages : ["No report data found for operational insights yet."];
  }, [summary]);

  if (loading) return <LoadingState />;

  if (error) {
    return (
      <div className="space-y-4">
        <InlineAlert tone="danger" message={error} />
        <ActionButton onClick={() => void load()}>Retry</ActionButton>
      </div>
    );
  }

  if (!permissions?.appointments) {
    return (
      <PermissionState
        title="Reports are not assigned"
        message="This receptionist account cannot review operational reports until appointment access is enabled."
      />
    );
  }

  const maxFlow = Math.max(...Object.values(flow), 1);

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
            <h1 className="mt-4 text-3xl font-bold tracking-tight">Reports</h1>
            <p className="mt-2 text-sm text-sky-100">Review front-desk activity and patient flow</p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm font-semibold">
            <CalendarDays size={16} />
            {dateLabel()}
          </div>
        </div>
      </section>

      <section className="rounded-[28px] border border-[#D8E7F3] bg-white p-5 shadow-[0_18px_48px_rgba(6,26,46,0.06)]">
        <p className="text-sm font-semibold text-[#0EA5E9]">Report filters</p>
        <h2 className="mt-1 text-2xl font-bold text-[#0F172A]">Select report scope</h2>
        <div className="mt-5 grid gap-3 xl:grid-cols-[180px_220px_220px_180px_auto_auto]">
          <label className="block">
            <span className="text-sm font-semibold text-[#0B3558]">Date range</span>
            <select value={filters.dateRange} onChange={(event) => setFilters((current) => ({ ...current, dateRange: event.target.value as DateRange }))} className="mt-2 h-12 w-full rounded-2xl border border-[#D8E7F3] bg-white px-4 text-sm font-semibold text-[#0F172A] outline-none">
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="custom">Custom</option>
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-[#0B3558]">Doctor</span>
            <select value={filters.doctorId} onChange={(event) => setFilters((current) => ({ ...current, doctorId: event.target.value }))} className="mt-2 h-12 w-full rounded-2xl border border-[#D8E7F3] bg-white px-4 text-sm font-semibold text-[#0F172A] outline-none">
              <option value="">All Doctors</option>
              {doctors.map((doctor) => <option key={doctor.id} value={doctor.id}>{doctor.name}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-[#0B3558]">Session</span>
            <select value={filters.sessionId} onChange={(event) => setFilters((current) => ({ ...current, sessionId: event.target.value }))} className="mt-2 h-12 w-full rounded-2xl border border-[#D8E7F3] bg-white px-4 text-sm font-semibold text-[#0F172A] outline-none">
              <option value="">All Sessions</option>
              {sessions.map((session) => (
                <option key={session.id} value={session.id}>{session.doctorName} • {formatClock(session.startTime)}</option>
              ))}
            </select>
          </label>
          {filters.dateRange === "custom" ? (
            <label className="block">
              <span className="text-sm font-semibold text-[#0B3558]">Custom date</span>
              <input type="date" value={filters.customDate} onChange={(event) => setFilters((current) => ({ ...current, customDate: event.target.value }))} className="mt-2 h-12 w-full rounded-2xl border border-[#D8E7F3] bg-white px-4 text-sm font-semibold text-[#0F172A] outline-none" />
            </label>
          ) : null}
          <div className="flex items-end">
            <ActionButton disabled onClick={() => undefined}>
              <Download size={15} />
              Download CSV
            </ActionButton>
          </div>
          <div className="flex items-end">
            {/* TODO: Connect report export when backend/report service is available. */}
            <ActionButton disabled onClick={() => setNotice({ tone: "info", message: "TODO: Connect report export when backend/report service is available." })}>
              <Download size={15} />
              Download PDF
            </ActionButton>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <SummaryCard icon={Users} label="Total Patients" value={summary.totalPatients} helper="All matching visits" />
        <SummaryCard icon={CheckCircle2} label="Completed Consultations" value={summary.completedConsultations} helper="Finished patient flow" />
        <SummaryCard icon={UserRoundX} label="Missed Appointments" value={summary.missedAppointments} helper="Needs follow-up" />
        <SummaryCard icon={AlertTriangle} label="Late Arrivals" value={summary.lateArrivals} helper="Delayed check-ins" />
        <SummaryCard icon={UserCheck} label="Walk-ins" value={summary.walkIns} helper="Unbooked arrivals" />
        <SummaryCard icon={Clock3} label="Average Waiting Time" value={`${summary.averageWaitingMinutes} min`} helper="Estimated from visits" />
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.25fr)]">
        <section className="rounded-[28px] border border-[#D8E7F3] bg-white p-5 shadow-[0_18px_48px_rgba(6,26,46,0.06)]">
          <p className="text-sm font-semibold text-[#0EA5E9]">Patient flow breakdown</p>
          <h2 className="mt-1 text-2xl font-bold text-[#0F172A]">Status counts</h2>
          <div className="mt-5 space-y-3">
            {[
              ["Booked", flow.booked],
              ["Checked-in", flow.checkedIn],
              ["Waiting", flow.waiting],
              ["Now Serving", flow.nowServing],
              ["Completed", flow.completed],
              ["Missed", flow.missed],
              ["Cancelled", flow.cancelled],
              ["Walk-ins", flow.walkIns],
            ].map(([label, value]) => (
              <FlowRow key={String(label)} label={String(label)} value={Number(value)} max={maxFlow} />
            ))}
          </div>
        </section>

        <section className="rounded-[28px] border border-[#D8E7F3] bg-white p-5 shadow-[0_18px_48px_rgba(6,26,46,0.06)]">
          <p className="text-sm font-semibold text-[#0EA5E9]">Operational insights</p>
          <h2 className="mt-1 text-2xl font-bold text-[#0F172A]">Front-desk notes</h2>
          <div className="mt-5 space-y-3">
            {insights.map((item) => (
              <div key={item} className="rounded-2xl border border-[#D8E7F3] bg-[#F8FAFC] px-4 py-3 text-sm font-semibold text-[#0B3558]">
                {item}
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="rounded-[28px] border border-[#D8E7F3] bg-white p-5 shadow-[0_18px_48px_rgba(6,26,46,0.06)]">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold text-[#0EA5E9]">Doctor session summary</p>
            <h2 className="mt-1 text-2xl font-bold text-[#0F172A]">Sessions</h2>
          </div>
          <p className="text-sm font-semibold text-[#64748B]">{sessionReports.length} sessions</p>
        </div>
        <div className="mt-5 space-y-3">
          {sessionReports.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-[#B7DDF5] bg-[#F8FAFC] p-10 text-center">
              <h3 className="text-xl font-bold text-[#0F172A]">No report data found.</h3>
              <p className="mt-2 text-sm text-[#64748B]">Try changing the selected date, doctor, or session.</p>
            </div>
          ) : (
            sessionReports.map((session) => (
              <article key={session.id} className="rounded-3xl border border-[#D8E7F3] bg-white p-5 shadow-[0_14px_34px_rgba(6,26,46,0.05)]">
                <div className="grid gap-4 xl:grid-cols-[minmax(260px,1fr)_minmax(420px,1.4fr)_auto] xl:items-center">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-bold text-[#0F172A]">{session.doctorName}</h3>
                      <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusClasses(session.status.toLowerCase().replace(" ", "_"))}`}>
                        {session.status}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-[#64748B]">{session.specialization} • {session.roomNumber}</p>
                    <p className="mt-1 text-sm font-semibold text-[#0B3558]">{session.sessionTime}</p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-5">
                    {[
                      ["Booked", session.bookedPatients],
                      ["Walk-ins", session.walkIns],
                      ["Completed", session.completed],
                      ["Missed/Late", session.missedLate],
                      ["Avg wait", `${session.averageWaitMinutes}m`],
                    ].map(([label, value]) => (
                      <div key={String(label)} className="rounded-2xl border border-[#D8E7F3] bg-[#F8FAFC] px-3 py-3">
                        <p className="text-xs font-semibold text-[#64748B]">{label}</p>
                        <p className="mt-1 font-bold text-[#0F172A]">{value}</p>
                      </div>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-2 xl:justify-end">
                    <ActionButton onClick={() => navigate(`/receptionist/sessions/${session.id}`)}>
                      <Eye size={14} />
                      View Session
                    </ActionButton>
                    <ActionButton onClick={() => navigate(`/receptionist/live-queue?sessionId=${session.id}`)}>
                      <Eye size={14} />
                      View Queue
                    </ActionButton>
                  </div>
                </div>
              </article>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
