import { useEffect, useMemo, useState } from "react";
import {
  fetchAdminMonitorBookings,
  fetchAdminMonitorPrescriptions,
  fetchAdminMonitorQueues,
  fetchAdminMonitorSessions,
  type AdminMonitorBookingsResponse,
  type AdminMonitorPrescriptionItem,
  type AdminMonitorPrescriptionsResponse,
  type AdminMonitorQueueItem,
  type AdminMonitorSessionItem,
} from "../../services/admin-monitor.service";
import DashboardSkeleton from "../../components/ui/DashboardSkeleton";

type MonitorTab = "queues" | "sessions" | "bookings" | "prescriptions";

const tabs: Array<{ key: MonitorTab; label: string }> = [
  { key: "queues", label: "Queues" },
  { key: "sessions", label: "Sessions" },
  { key: "bookings", label: "Bookings" },
  { key: "prescriptions", label: "Prescriptions" },
];

const queueStatusBadgeClass: Record<string, string> = {
  active: "border-emerald-200 bg-emerald-50 text-emerald-800",
  paused: "border-amber-200 bg-amber-50 text-amber-800",
  ended: "border-slate-200 bg-slate-100 text-slate-700",
};

const sessionStatusBadgeClass: Record<string, string> = {
  active: "border-emerald-200 bg-emerald-50 text-emerald-800",
  upcoming: "border-sky-200 bg-sky-50 text-sky-800",
  completed: "border-slate-200 bg-slate-100 text-slate-700",
};

function Badge({ label, className }: { label: string; className: string }) {
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${className}`}>{label}</span>;
}

function StatCard({
  label,
  value,
  accent = "text-[#053F56]",
}: {
  label: string;
  value: string | number;
  accent?: string;
}) {
  return (
    <div className="rounded-2xl bg-white/12 p-4 backdrop-blur">
      <p className="text-xs uppercase tracking-wide text-[#FDECDD]">{label}</p>
      <p className={`mt-2 text-2xl font-semibold ${accent}`.replace("text-[#053F56]", "text-white")}>{value}</p>
    </div>
  );
}

function Panel({
  title,
  children,
  action,
}: {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-lg font-semibold text-[#053F56]">{title}</h3>
        {action}
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function formatTimestamp(value: string | null | undefined) {
  if (!value) return "Not available";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString(undefined, {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function QueueTable({ items }: { items: AdminMonitorQueueItem[] }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-gray-200">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-[#F8FBFD]">
          <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
            <th className="px-4 py-3">Clinic</th>
            <th className="px-4 py-3">Doctor</th>
            <th className="px-4 py-3">Session</th>
            <th className="px-4 py-3">Waiting</th>
            <th className="px-4 py-3">Current Token</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Started</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 bg-white">
          {items.map((item, index) => (
            <tr key={`${item.session_id || "queue"}-${item.doctor_name}-${index}`}>
              <td className="px-4 py-4 text-sm font-semibold text-[#053F56]">{item.clinic_name}</td>
              <td className="px-4 py-4 text-sm text-slate-700">{item.doctor_name}</td>
              <td className="px-4 py-4 text-sm text-slate-700">{item.session_id ? `#${item.session_id}` : "Ad hoc"}</td>
              <td className="px-4 py-4">
                <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${item.waiting_count >= 10 ? "bg-red-50 text-red-700" : "bg-slate-100 text-slate-700"}`}>
                  {item.waiting_count}
                </span>
              </td>
              <td className="px-4 py-4 text-sm text-slate-700">{item.current_token ?? "None"}</td>
              <td className="px-4 py-4">
                <Badge label={item.queue_status} className={queueStatusBadgeClass[item.queue_status]} />
              </td>
              <td className="px-4 py-4 text-sm text-slate-500">{formatTimestamp(item.started_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SessionTable({ items }: { items: AdminMonitorSessionItem[] }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-gray-200">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-[#F8FBFD]">
          <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
            <th className="px-4 py-3">Doctor</th>
            <th className="px-4 py-3">Clinic</th>
            <th className="px-4 py-3">Time Range</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Booked Patients</th>
            <th className="px-4 py-3">Queue</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 bg-white">
          {items.map((item) => (
            <tr key={item.session_id}>
              <td className="px-4 py-4 text-sm font-semibold text-[#053F56]">{item.doctor_name}</td>
              <td className="px-4 py-4 text-sm text-slate-700">{item.clinic_name}</td>
              <td className="px-4 py-4 text-sm text-slate-700">{item.start_time} - {item.end_time}</td>
              <td className="px-4 py-4">
                <Badge label={item.status} className={sessionStatusBadgeClass[item.status]} />
              </td>
              <td className="px-4 py-4 text-sm text-slate-700">{item.booked_patients_count}</td>
              <td className="px-4 py-4 text-sm text-slate-700">
                <span className="inline-flex items-center gap-2">
                  <span className={`h-2.5 w-2.5 rounded-full ${item.queue_active ? "bg-emerald-500" : "bg-slate-300"}`} />
                  {item.queue_active ? "Active" : "Inactive"}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function BookingsView({ data }: { data: AdminMonitorBookingsResponse }) {
  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <div className="rounded-2xl bg-[#F7FAFC] p-4">
          <p className="text-xs uppercase tracking-wide text-slate-400">Today</p>
          <p className="mt-2 text-2xl font-semibold text-[#053F56]">{data.today_total_bookings}</p>
        </div>
        <div className="rounded-2xl bg-[#F7FAFC] p-4">
          <p className="text-xs uppercase tracking-wide text-slate-400">Completed</p>
          <p className="mt-2 text-2xl font-semibold text-[#053F56]">{data.completed}</p>
        </div>
        <div className="rounded-2xl bg-[#FFF6F0] p-4">
          <p className="text-xs uppercase tracking-wide text-[#D9752F]">Missed</p>
          <p className="mt-2 text-2xl font-semibold text-[#D9752F]">{data.missed}</p>
        </div>
        <div className="rounded-2xl bg-[#FFF3F3] p-4">
          <p className="text-xs uppercase tracking-wide text-red-500">Cancelled</p>
          <p className="mt-2 text-2xl font-semibold text-red-700">{data.cancelled}</p>
        </div>
        <div className="rounded-2xl bg-[#EEF9F3] p-4">
          <p className="text-xs uppercase tracking-wide text-emerald-500">In Progress</p>
          <p className="mt-2 text-2xl font-semibold text-emerald-700">{data.consultations_in_progress}</p>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200">
        <div className="border-b border-gray-200 px-4 py-3">
          <p className="text-sm font-semibold text-[#053F56]">Peak Hours</p>
        </div>
        <div className="divide-y divide-gray-100">
          {data.peak_hours_data.length === 0 ? (
            <p className="px-4 py-6 text-sm text-slate-500">No booking activity recorded today.</p>
          ) : (
            data.peak_hours_data.map((item) => (
              <div key={item.hour} className="flex items-center justify-between gap-4 px-4 py-3">
                <span className="text-sm text-slate-600">{item.hour}</span>
                <div className="flex min-w-[180px] items-center gap-3">
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-[#21A5EC]"
                      style={{
                        width: `${Math.max(
                          8,
                          (item.bookings_count /
                            Math.max(...data.peak_hours_data.map((entry) => entry.bookings_count), 1)) *
                            100
                        )}%`,
                      }}
                    />
                  </div>
                  <span className="w-8 text-right text-sm font-semibold text-[#053F56]">
                    {item.bookings_count}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function PrescriptionsView({ items, data }: { items: AdminMonitorPrescriptionItem[]; data: AdminMonitorPrescriptionsResponse }) {
  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl bg-[#F7FAFC] p-4">
          <p className="text-xs uppercase tracking-wide text-slate-400">Generated Today</p>
          <p className="mt-2 text-2xl font-semibold text-[#053F56]">{data.total_prescriptions_today}</p>
        </div>
        <div className="rounded-2xl bg-[#EEF9F3] p-4">
          <p className="text-xs uppercase tracking-wide text-emerald-500">Dispensed</p>
          <p className="mt-2 text-2xl font-semibold text-emerald-700">{data.dispensed_count}</p>
        </div>
        <div className="rounded-2xl bg-[#FFF6F0] p-4">
          <p className="text-xs uppercase tracking-wide text-[#D9752F]">Pending</p>
          <p className="mt-2 text-2xl font-semibold text-[#D9752F]">{data.pending_count}</p>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-[#F8FBFD]">
            <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <th className="px-4 py-3">Prescription</th>
              <th className="px-4 py-3">Doctor</th>
              <th className="px-4 py-3">Clinic</th>
              <th className="px-4 py-3">Pharmacy</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Issued</th>
              <th className="px-4 py-3">Dispensed</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {items.map((item) => (
              <tr key={item.id}>
                <td className="px-4 py-4 text-sm font-semibold text-[#053F56]">#{item.id}</td>
                <td className="px-4 py-4 text-sm text-slate-700">{item.doctor_name || "Unknown"}</td>
                <td className="px-4 py-4 text-sm text-slate-700">{item.clinic_name || "Unknown"}</td>
                <td className="px-4 py-4 text-sm text-slate-700">{item.linked_pharmacy || "Not linked"}</td>
                <td className="px-4 py-4">
                  <Badge
                    label={item.status}
                    className={
                      item.status === "dispensed"
                        ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                        : "border-amber-200 bg-amber-50 text-amber-800"
                    }
                  />
                </td>
                <td className="px-4 py-4 text-sm text-slate-500">{formatTimestamp(item.issued_at)}</td>
                <td className="px-4 py-4 text-sm text-slate-500">{formatTimestamp(item.dispensed_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function SystemMonitoringPage() {
  const [activeTab, setActiveTab] = useState<MonitorTab>("queues");
  const [queues, setQueues] = useState<AdminMonitorQueueItem[]>([]);
  const [sessions, setSessions] = useState<AdminMonitorSessionItem[]>([]);
  const [bookings, setBookings] = useState<AdminMonitorBookingsResponse | null>(null);
  const [prescriptions, setPrescriptions] = useState<AdminMonitorPrescriptionsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [tabErrors, setTabErrors] = useState<Partial<Record<MonitorTab, string>>>({});
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const load = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const [queuesResult, sessionsResult, bookingsResult, prescriptionsResult] = await Promise.allSettled([
        fetchAdminMonitorQueues(),
        fetchAdminMonitorSessions(),
        fetchAdminMonitorBookings(),
        fetchAdminMonitorPrescriptions(),
      ]);

      const nextErrors: Partial<Record<MonitorTab, string>> = {};

      if (queuesResult.status === "fulfilled") {
        setQueues(queuesResult.value.items);
        setLastUpdated(queuesResult.value.generated_at || new Date().toISOString());
      } else {
        setQueues([]);
        nextErrors.queues =
          queuesResult.reason instanceof Error
            ? queuesResult.reason.message
            : "Unable to load live queues.";
      }

      if (sessionsResult.status === "fulfilled") {
        setSessions(sessionsResult.value.items);
        setLastUpdated((current) => current || sessionsResult.value.generated_at || new Date().toISOString());
      } else {
        setSessions([]);
        nextErrors.sessions =
          sessionsResult.reason instanceof Error
            ? sessionsResult.reason.message
            : "Unable to load active sessions.";
      }

      if (bookingsResult.status === "fulfilled") {
        setBookings(bookingsResult.value);
      } else {
        setBookings(null);
        nextErrors.bookings =
          bookingsResult.reason instanceof Error
            ? bookingsResult.reason.message
            : "Unable to load booking monitor.";
      }

      if (prescriptionsResult.status === "fulfilled") {
        setPrescriptions(prescriptionsResult.value);
      } else {
        setPrescriptions(null);
        nextErrors.prescriptions =
          prescriptionsResult.reason instanceof Error
            ? prescriptionsResult.reason.message
            : "Unable to load prescription monitor.";
      }

      setTabErrors(nextErrors);
      setError(
        Object.keys(nextErrors).length === tabs.length
          ? "Unable to load system monitoring data."
          : ""
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void load();

    const intervalId = window.setInterval(() => {
      void load(true);
    }, 30000);

    return () => window.clearInterval(intervalId);
  }, []);

  const summary = useMemo(
    () => ({
      liveQueues: queues.filter((item) => item.queue_status === "active").length,
      activeSessions: sessions.filter((item) => item.status === "active").length,
      bookingsToday: bookings?.today_total_bookings ?? 0,
      prescriptionsToday: prescriptions?.total_prescriptions_today ?? 0,
    }),
    [bookings, prescriptions, queues, sessions]
  );

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-3xl border border-[#DCEAF3] bg-[linear-gradient(135deg,#053F56_0%,#0C6488_45%,#1AB0C8_100%)] p-6 text-white shadow-sm">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#D6F6FA]">
              Live Operations
            </p>
            <h2 className="mt-3 text-3xl font-semibold">System monitoring</h2>
            <p className="mt-3 text-sm text-[#E6FAFD]">
              Track live queues, active sessions, same-day booking flow, consultations in progress,
              and prescription movement across the platform.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <StatCard label="Live Queues" value={summary.liveQueues} />
            <StatCard label="Active Sessions" value={summary.activeSessions} />
            <StatCard label="Bookings Today" value={summary.bookingsToday} />
            <StatCard label="Prescriptions Today" value={summary.prescriptionsToday} />
          </div>
        </div>
      </section>

      <Panel
        title="Operations feed"
        action={
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-2 text-sm text-slate-500">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
              Auto-refresh 30s
            </span>
            <button
              type="button"
              onClick={() => void load(true)}
              disabled={refreshing}
              className="rounded-full bg-[#053F56] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0D5E80] disabled:opacity-50"
            >
              {refreshing ? "Refreshing..." : "Refresh"}
            </button>
          </div>
        }
      >
        <div className="flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                activeTab === tab.key
                  ? "bg-[#053F56] text-white"
                  : "bg-[#F4F8FB] text-slate-600 hover:bg-[#E5F0F7]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {lastUpdated ? (
          <p className="mt-4 text-xs uppercase tracking-wide text-slate-400">
            Last updated {formatTimestamp(lastUpdated)}
          </p>
        ) : null}

        {loading ? (
          <div className="mt-6">
            <DashboardSkeleton />
          </div>
        ) : error ? (
          <div className="mt-6 rounded-2xl border border-red-100 bg-red-50 px-5 py-4 text-sm text-red-700">
            {error}
          </div>
        ) : (
          <div className="mt-6">
            {tabErrors[activeTab] ? (
              <div className="mb-4 rounded-2xl border border-red-100 bg-red-50 px-5 py-4 text-sm text-red-700">
                {tabErrors[activeTab]}
              </div>
            ) : null}

            {activeTab === "queues" ? (
              tabErrors.queues ? null :
              queues.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[#8ED4E6] bg-[#F3FCFE] px-5 py-10 text-sm text-slate-500">
                  No queue activity found for today.
                </div>
              ) : (
                <QueueTable items={queues} />
              )
            ) : null}

            {activeTab === "sessions" ? (
              tabErrors.sessions ? null :
              sessions.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[#8ED4E6] bg-[#F3FCFE] px-5 py-10 text-sm text-slate-500">
                  No sessions found for today.
                </div>
              ) : (
                <SessionTable items={sessions} />
              )
            ) : null}

            {activeTab === "bookings" && bookings && !tabErrors.bookings ? <BookingsView data={bookings} /> : null}

            {activeTab === "prescriptions" && prescriptions ? (
              tabErrors.prescriptions ? null :
              prescriptions.recent_prescriptions.length === 0 &&
              prescriptions.total_prescriptions_today === 0 ? (
                <div className="rounded-2xl border border-dashed border-[#8ED4E6] bg-[#F3FCFE] px-5 py-10 text-sm text-slate-500">
                  No prescription activity found for today.
                </div>
              ) : (
                <PrescriptionsView
                  data={prescriptions}
                  items={prescriptions.recent_prescriptions}
                />
              )
            ) : null}
          </div>
        )}
      </Panel>
    </div>
  );
}
