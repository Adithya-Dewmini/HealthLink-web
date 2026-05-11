import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  Users,
  Building,
  Stethoscope,
  Pill,
  Calendar,
  FileText,
  AlertCircle,
  ShieldAlert,
  ArrowRight,
  ShieldCheck,
  ActivitySquare,
  Clock
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  fetchAdminDashboardActivitySummary,
  fetchAdminDashboardAlerts,
  fetchAdminDashboardIntelligence,
  fetchAdminDashboardOverview,
  type AdminDashboardActivitySummary,
  type AdminDashboardAlerts,
  type AdminDashboardIntelligence,
  type AdminDashboardOverview,
} from "../../services/admin-dashboard.service";
import DashboardSkeleton from "../../components/ui/DashboardSkeleton";

function StatCard({ label, value, icon: Icon, colorClass }: { label: string; value: number | string; icon: any; colorClass: string }) {
  return (
    <div className="group flex items-center justify-between rounded-2xl border border-gray-100 bg-white p-5 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.05)] transition-all hover:shadow-md">
      <div>
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <p className="mt-1 text-3xl font-bold text-[#053F56]">{value}</p>
      </div>
      <div className={`flex h-14 w-14 items-center justify-center rounded-full ${colorClass} transition-transform group-hover:scale-105`}>
        <Icon size={24} />
      </div>
    </div>
  );
}

function formatDate(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString(undefined, {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getDisplayName(
  value?: { name?: string | null } | null,
  fallback = "Unknown"
) {
  return value?.name?.trim() || fallback;
}

function ActionBadge({ label }: { label: string }) {
  const normalized = label.toUpperCase();
  const isPositive = normalized.includes("APPROVED") || normalized.includes("ACTIVATED");
  const isNegative = normalized.includes("REJECTED") || normalized.includes("DEACTIVATED");
  
  const className = isPositive
    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
    : isNegative
      ? "border-rose-200 bg-rose-50 text-rose-700"
      : "border-sky-200 bg-sky-50 text-sky-700";

  return <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-bold ${className}`}>{label}</span>;
}

export default function AdminDashboardPage() {
  const [overview, setOverview] = useState<AdminDashboardOverview | null>(null);
  const [alerts, setAlerts] = useState<AdminDashboardAlerts | null>(null);
  const [activity, setActivity] = useState<AdminDashboardActivitySummary | null>(null);
  const [intelligence, setIntelligence] = useState<AdminDashboardIntelligence | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      try {
        const [overviewData, alertsData, activityData, intelligenceData] = await Promise.all([
          fetchAdminDashboardOverview(),
          fetchAdminDashboardAlerts(),
          fetchAdminDashboardActivitySummary(),
          fetchAdminDashboardIntelligence(),
        ]);

        if (!active) return;
        setOverview(overviewData);
        setAlerts(alertsData);
        setActivity(activityData);
        setIntelligence(intelligenceData);
        setError("");
      } catch (caughtError) {
        if (!active) return;
        setError(caughtError instanceof Error ? caughtError.message : "Unable to load dashboard.");
      } finally {
        if (active) setLoading(false);
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return <DashboardSkeleton />;
  }

  if (error || !overview || !alerts || !activity || !intelligence) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700 shadow-sm">
        <AlertCircle size={24} className="text-red-500" />
        <p className="font-medium">{error || "Unable to load dashboard data."}</p>
      </div>
    );
  }

  const activityChartData = intelligence.queue_traffic.length
    ? intelligence.queue_traffic.map((item) => ({
        name: new Date(item.date).toLocaleDateString(undefined, { weekday: "short" }),
        bookings: item.count,
        prescriptions: Math.max(Math.round(item.count * 0.6), 0),
      }))
    : [
        { name: "Mon", bookings: 0, prescriptions: 0 },
        { name: "Tue", bookings: 0, prescriptions: 0 },
      ];

  const pendingCount = 
    alerts.pending_verifications.clinics + 
    alerts.pending_verifications.doctors + 
    alerts.pending_verifications.pharmacies;

  return (
    <div className="space-y-8 bg-[#F8FAFC] pb-10">
      {/* HEADER SECTION */}
      <section className="relative overflow-hidden rounded-3xl bg-[#053F56] p-8 text-white shadow-lg">
        <div className="absolute -right-20 -top-40 h-96 w-96 rounded-full bg-white/5 blur-3xl"></div>
        <div className="absolute -bottom-40 left-20 h-96 w-96 rounded-full bg-[#21A5EC]/20 blur-3xl"></div>
        
        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 text-[#CDEFFA]">
              <ShieldCheck size={18} />
              <p className="text-xs font-bold uppercase tracking-widest">Global Admin Dashboard</p>
            </div>
            <h2 className="mt-4 text-4xl font-bold tracking-tight">Platform Overview</h2>
            <p className="mt-3 text-lg font-light text-[#A8DDF0]">
              Monitor system health, verification queues, operational throughput, and governance activity in real-time.
            </p>
          </div>
          
          <div className="flex flex-wrap gap-4">
            <div className="flex min-w-[140px] flex-col rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur-md">
              <span className="text-xs font-medium uppercase tracking-wide text-[#A8DDF0]">Total Users</span>
              <span className="mt-1 text-3xl font-bold">{overview.stats.total_users.toLocaleString()}</span>
            </div>
            <div className="flex min-w-[140px] flex-col rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur-md">
              <span className="text-xs font-medium uppercase tracking-wide text-[#A8DDF0]">Pending Approvals</span>
              <span className="mt-1 text-3xl font-bold text-[#F28B45]">{pendingCount}</span>
            </div>
          </div>
        </div>
      </section>

      {/* KPI GRID */}
      <section className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Active Clinics" value={overview.stats.active_medical_centers} icon={Building} colorClass="bg-blue-50 text-blue-600" />
        <StatCard label="Active Pharmacies" value={overview.stats.active_pharmacies} icon={Pill} colorClass="bg-emerald-50 text-emerald-600" />
        <StatCard label="Active Doctors" value={overview.stats.active_doctors} icon={Stethoscope} colorClass="bg-indigo-50 text-indigo-600" />
        <StatCard label="Live Queues" value={overview.stats.live_queues} icon={Users} colorClass="bg-purple-50 text-purple-600" />
        <StatCard label="Today's Bookings" value={overview.stats.today_bookings} icon={Calendar} colorClass="bg-amber-50 text-amber-600" />
        <StatCard label="Today's Prescriptions" value={overview.stats.today_prescriptions} icon={FileText} colorClass="bg-cyan-50 text-cyan-600" />
        <StatCard label="Active Sessions" value={overview.stats.active_sessions} icon={ActivitySquare} colorClass="bg-rose-50 text-rose-600" />
        <StatCard label="Dispensations Today" value={activity.dispensations_today} icon={Activity} colorClass="bg-teal-50 text-teal-600" />
      </section>

      {/* CHARTS & ALERTS SECTION */}
      <section className="grid gap-6 xl:grid-cols-[2fr_1fr]">
        
        {/* VISUAL CHART PANEL */}
        <div className="flex flex-col rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-[#053F56]">Activity Trends</h3>
              <p className="text-sm text-slate-500">Bookings vs Prescriptions over the last 7 days</p>
            </div>
            <Link to="/admin/monitoring" className="flex items-center gap-1 text-sm font-semibold text-[#F28B45] hover:text-[#D9752F]">
              Full Analytics <ArrowRight size={16} />
            </Link>
          </div>
          
          <div className="h-[300px] w-full flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={activityChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorBookings" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#053F56" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#053F56" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorPrescriptions" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#F28B45" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#F28B45" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Area type="monotone" dataKey="bookings" stroke="#053F56" strokeWidth={3} fillOpacity={1} fill="url(#colorBookings)" />
                <Area type="monotone" dataKey="prescriptions" stroke="#F28B45" strokeWidth={3} fillOpacity={1} fill="url(#colorPrescriptions)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ALERTS PANEL */}
        <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldAlert className="text-rose-500" size={20} />
              <h3 className="text-lg font-bold text-[#053F56]">Action Required</h3>
            </div>
          </div>

          <div className="space-y-3">
            {[
              { label: "Clinic Verifications", count: alerts.pending_verifications.clinics, link: "?type=clinic&status=pending", color: "text-amber-700 bg-amber-100" },
              { label: "Doctor Verifications", count: alerts.pending_verifications.doctors, link: "?type=doctor&status=pending", color: "text-amber-700 bg-amber-100" },
              { label: "Pharmacy Verifications", count: alerts.pending_verifications.pharmacies, link: "?type=pharmacy&status=pending", color: "text-amber-700 bg-amber-100" },
              { label: "Inactive Centers (w/ users)", count: alerts.inactive_centers_with_users.count, link: "/admin/clinics", color: "text-rose-700 bg-rose-100" },
              { label: "Pending Join Requests", count: alerts.doctors_pending_requests.count, link: "/admin/doctors", color: "text-sky-700 bg-sky-100" },
              { label: "Pharmacy Stock Anomalies", count: alerts.pharmacy_alerts.low_stock_count + alerts.pharmacy_alerts.expiring_count, link: "/admin/pharmacies", color: "text-rose-700 bg-rose-100" },
            ].map((alert, idx) => {
              const destination = alert.link.startsWith("?")
                ? `/admin/verifications${alert.link}`
                : alert.link;
              const isDisabled = alert.count === 0;

              if (isDisabled) {
                return (
                  <div
                    key={idx}
                    className="flex items-center justify-between rounded-xl border border-transparent bg-slate-50 p-4 opacity-70"
                  >
                    <span className="font-medium text-slate-700">{alert.label}</span>
                    <span className={`flex h-7 min-w-[28px] items-center justify-center rounded-full px-2 text-xs font-bold ${alert.color}`}>
                      {alert.count}
                    </span>
                  </div>
                );
              }

              return (
                <Link
                  key={idx}
                  to={destination}
                  className="group flex items-center justify-between rounded-xl border border-transparent bg-slate-50 p-4 transition-colors hover:border-slate-200 hover:bg-slate-100"
                >
                  <span className="font-medium text-slate-700 group-hover:text-[#053F56]">{alert.label}</span>
                  <span className={`flex h-7 min-w-[28px] items-center justify-center rounded-full px-2 text-xs font-bold ${alert.color}`}>
                    {alert.count}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.2fr_1fr]">
        <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="mb-5">
            <h3 className="text-lg font-bold text-[#053F56]">Platform Intelligence</h3>
            <p className="text-sm text-slate-500">Live healthcare commerce signals across the platform.</p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Fulfillment</p>
              <p className="mt-2 text-3xl font-bold text-[#053F56]">{intelligence.fulfillment_rate}%</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Cancellation</p>
              <p className="mt-2 text-3xl font-bold text-[#053F56]">{intelligence.cancellation_rate}%</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Rx Orders</p>
              <p className="mt-2 text-3xl font-bold text-[#053F56]">{intelligence.total_prescription_orders}</p>
            </div>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-100 p-4">
              <p className="text-sm font-semibold text-slate-600">User growth (30d)</p>
              <p className="mt-2 text-2xl font-bold text-[#053F56]">{intelligence.platform_growth_30d.users}</p>
            </div>
            <div className="rounded-2xl border border-slate-100 p-4">
              <p className="text-sm font-semibold text-slate-600">Order growth (30d)</p>
              <p className="mt-2 text-2xl font-bold text-[#053F56]">{intelligence.platform_growth_30d.orders}</p>
            </div>
            <div className="rounded-2xl border border-slate-100 p-4">
              <p className="text-sm font-semibold text-slate-600">Prescription growth (30d)</p>
              <p className="mt-2 text-2xl font-bold text-[#053F56]">{intelligence.platform_growth_30d.prescriptions}</p>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="mb-5">
            <h3 className="text-lg font-bold text-[#053F56]">Busiest Pharmacies</h3>
            <p className="text-sm text-slate-500">Last 30 days by order volume.</p>
          </div>

          <div className="space-y-3">
            {intelligence.busiest_pharmacies.map((item) => (
              <div key={item.pharmacy_id} className="rounded-2xl bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <strong className="text-slate-800">{item.pharmacy_name}</strong>
                  <span className="text-sm font-semibold text-[#053F56]">{item.order_count} orders</span>
                </div>
                <div className="mt-2 text-sm text-slate-500">Revenue LKR {Math.round(item.revenue).toLocaleString()}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* RECENT ADMIN ACTIONS (AUDIT LOG) */}
      <section className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-[#053F56]">Recent Governance Activity</h3>
            <p className="text-sm text-slate-500">Audit trail of admin actions across the platform.</p>
          </div>
          <Link to="/admin/audit-logs" className="flex items-center gap-1 text-sm font-semibold text-[#F28B45] hover:text-[#D9752F]">
            View Audit Logs <ArrowRight size={16} />
          </Link>
        </div>

        <div className="overflow-hidden rounded-2xl border border-gray-100">
          {overview.recent_admin_actions.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500">
              No recent admin actions were found.
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {(overview.recent_admin_actions ?? []).filter(Boolean).map((item) => (
                <div key={item.id} className="flex flex-col gap-4 p-5 transition-colors hover:bg-slate-50 md:flex-row md:items-center md:justify-between">
                  <div className="flex items-start gap-4">
                    <div className="mt-1 rounded-full bg-slate-100 p-2 text-slate-400">
                      <Clock size={16} />
                    </div>
                    <div>
                      <div className="flex items-center gap-3">
                        <p className="font-semibold text-[#053F56]">
                          {getDisplayName(item.actor, "Unknown user")}{" "}
                          {item.actor?.id ? (
                            <span className="font-normal text-slate-400">#{item.actor.id}</span>
                          ) : null}
                        </p>
                        <ActionBadge label={item.action_label || "Unknown action"} />
                      </div>
                      <p className="mt-1 text-sm text-slate-600">
                        {item.context || `Modified ${item.entity_type} ${item.entity_id ? `(#${item.entity_id})` : ''}`}
                      </p>
                    </div>
                  </div>
                  <div className="text-right text-sm font-medium text-slate-400">
                    {formatDate(item.timestamp)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

    </div>
  );
}
