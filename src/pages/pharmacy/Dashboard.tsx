import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  AlertTriangle,
  ClipboardList,
  DollarSign,
  PackageSearch,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  BarChart,
  Bar,
} from "recharts";
import Card from "../../components/ui/Card";
import DashboardSkeleton from "../../components/ui/DashboardSkeleton";
import {
  fetchPharmacyAnalyticsDashboard,
  type PharmacyAnalyticsDashboard,
} from "../../services/pharmacy-analytics.service";

const formatMoney = (value: number) => `LKR ${Math.round(value).toLocaleString()}`;

function MetricCard({
  label,
  value,
  detail,
  icon: Icon,
  tone = "sky",
}: {
  label: string;
  value: string;
  detail: string;
  icon: typeof DollarSign;
  tone?: "sky" | "emerald" | "violet" | "amber";
}) {
  const toneClasses = {
    sky: "from-sky-500/15 via-white to-cyan-500/10 text-sky-700 bg-sky-50",
    emerald: "from-emerald-500/15 via-white to-teal-500/10 text-emerald-700 bg-emerald-50",
    violet: "from-violet-500/15 via-white to-fuchsia-500/10 text-violet-700 bg-violet-50",
    amber: "from-amber-500/18 via-white to-orange-500/12 text-amber-700 bg-amber-50",
  } as const;

  return (
    <section className="relative overflow-hidden rounded-[30px] border border-white/60 bg-gradient-to-br p-5 shadow-[0_24px_80px_-42px_rgba(15,23,42,0.45)] backdrop-blur-sm">
      <div className={`absolute inset-0 bg-gradient-to-br ${toneClasses[tone].split(" ").slice(0, 3).join(" ")}`} />
      <div className="relative flex items-start justify-between gap-4">
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-[0.26em] text-slate-500">{label}</span>
          <strong className="mt-3 block text-[2rem] font-semibold tracking-tight text-slate-950">{value}</strong>
          <span className="mt-2 block text-sm font-medium text-slate-600">{detail}</span>
        </div>
        <div className={`rounded-2xl p-3 ${toneClasses[tone].split(" ").slice(3).join(" ")}`}>
          <Icon size={18} />
        </div>
      </div>
    </section>
  );
}

function ForecastAlertCard({
  name,
  predictedDemand,
  recommendedReorderQuantity,
  shortageRisk,
}: PharmacyAnalyticsDashboard["forecastHighlights"][number]) {
  const riskTone = {
    low: "bg-emerald-100 text-emerald-700",
    medium: "bg-amber-100 text-amber-700",
    high: "bg-rose-100 text-rose-700",
  } as const;

  return (
    <div className="rounded-[24px] border border-slate-200/80 bg-white/80 p-4 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <strong className="text-sm font-semibold text-slate-900">{name}</strong>
          <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
            <span className="rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-600">
              Demand {predictedDemand}
            </span>
            <span className="rounded-full bg-sky-50 px-3 py-1 font-semibold text-sky-700">
              Reorder {recommendedReorderQuantity}
            </span>
          </div>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] ${riskTone[shortageRisk]}`}>
          {shortageRisk}
        </span>
      </div>
    </div>
  );
}

export default function PharmacyDashboardPage() {
  const [dashboard, setDashboard] = useState<PharmacyAnalyticsDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      try {
        const data = await fetchPharmacyAnalyticsDashboard();
        if (!active) return;
        setDashboard(data);
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

  const trendData = useMemo(
    () =>
      dashboard?.orderTrends.map((item) => ({
        label: new Date(item.date).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
        orders: item.orderCount,
        revenue: item.revenue,
      })) ?? [],
    [dashboard]
  );

  if (loading) {
    return <DashboardSkeleton />;
  }

  if (error || !dashboard) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">
        {error || "Unable to load dashboard data."}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-[34px] border border-white/70 bg-[#0F172A] p-8 text-white shadow-[0_40px_120px_-55px_rgba(15,23,42,0.85)]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(56,189,248,0.34),_transparent_30%),radial-gradient(circle_at_bottom_left,_rgba(16,185,129,0.2),_transparent_28%)]" />
        <div className="relative grid gap-8 xl:grid-cols-[1.5fr_1fr]">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.38em] text-sky-200/80">Pharmacy Command</p>
            <h2 className="mt-4 max-w-2xl text-4xl font-semibold tracking-tight text-white">
              Run inventory, fulfillment, and demand with one calmer operating surface.
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300">
              Revenue, stock pressure, prescription volume, and forecast signals stay visible in one place so the team
              can move faster without losing operational context.
            </p>
            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              <div className="rounded-[24px] border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
                <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Revenue closed</div>
                <div className="mt-3 text-2xl font-semibold text-white">{formatMoney(dashboard.overview.totalRevenue)}</div>
              </div>
              <div className="rounded-[24px] border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
                <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Success rate</div>
                <div className="mt-3 text-2xl font-semibold text-white">{dashboard.overview.fulfillmentSuccessRate}%</div>
              </div>
              <div className="rounded-[24px] border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
                <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Live queue</div>
                <div className="mt-3 text-2xl font-semibold text-white">{dashboard.overview.pendingOrders}</div>
              </div>
            </div>
          </div>

          <div className="grid gap-4">
            <div className="rounded-[28px] border border-sky-300/20 bg-gradient-to-br from-sky-500/18 to-cyan-400/8 p-5 backdrop-blur-sm">
              <div className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-200">Forecast Watch</div>
              <div className="mt-3 text-3xl font-semibold text-white">{dashboard.forecastHighlights.length}</div>
              <p className="mt-2 text-sm text-sky-50/85">Medicines currently flagged by the demand model.</p>
            </div>
            <div className="rounded-[28px] border border-emerald-300/20 bg-gradient-to-br from-emerald-500/18 to-teal-400/8 p-5 backdrop-blur-sm">
              <div className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-100">Low Stock Risk</div>
              <div className="mt-3 text-3xl font-semibold text-white">{dashboard.lowStockMedicines.length}</div>
              <p className="mt-2 text-sm text-emerald-50/85">Inventory lines that need attention before they affect orders.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Total Revenue"
          value={formatMoney(dashboard.overview.totalRevenue)}
          detail={`${dashboard.overview.fulfillmentSuccessRate}% fulfillment success`}
          icon={DollarSign}
          tone="sky"
        />
        <MetricCard
          label="Orders"
          value={dashboard.overview.totalOrders.toLocaleString()}
          detail={`${dashboard.overview.pendingOrders} still active`}
          icon={ClipboardList}
          tone="violet"
        />
        <MetricCard
          label="Low Stock"
          value={dashboard.lowStockMedicines.length.toLocaleString()}
          detail="Inventory at risk of shortage"
          icon={AlertTriangle}
          tone="amber"
        />
        <MetricCard
          label="Prescription Volume"
          value={dashboard.overview.prescriptionVolume.toLocaleString()}
          detail={`${dashboard.overview.cancellationRate}% cancellation rate`}
          icon={PackageSearch}
          tone="emerald"
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-4">
        {[
          {
            title: "Review orders",
            description: "Jump straight into active fulfillment and handoff queues.",
            to: "/pharmacy/orders",
            tone: "sky",
          },
          {
            title: "Watch stock",
            description: "Open inventory to catch low stock and expiry pressure early.",
            to: "/pharmacy/inventory",
            tone: "emerald",
          },
          {
            title: "Manage storefront",
            description: "Control visibility, featured products, and Rx-only listing state.",
            to: "/pharmacy/storefront",
            tone: "violet",
          },
          {
            title: "Open insights",
            description: "Read demand alerts, forecast pressure, and top movers.",
            to: "/pharmacy/insights",
            tone: "amber",
          },
        ].map((action) => (
          (() => {
            const toneClasses = {
              sky: {
                shell: "border-sky-200/80 bg-[linear-gradient(145deg,rgba(14,165,233,0.12),rgba(255,255,255,0.96))] hover:border-sky-300/90 hover:shadow-[0_24px_60px_-34px_rgba(14,165,233,0.38)]",
                badge: "bg-sky-100 text-sky-700",
                button: "bg-sky-600 text-white group-hover:bg-sky-700",
              },
              emerald: {
                shell: "border-emerald-200/80 bg-[linear-gradient(145deg,rgba(16,185,129,0.12),rgba(255,255,255,0.96))] hover:border-emerald-300/90 hover:shadow-[0_24px_60px_-34px_rgba(16,185,129,0.34)]",
                badge: "bg-emerald-100 text-emerald-700",
                button: "bg-emerald-600 text-white group-hover:bg-emerald-700",
              },
              violet: {
                shell: "border-violet-200/80 bg-[linear-gradient(145deg,rgba(139,92,246,0.12),rgba(255,255,255,0.96))] hover:border-violet-300/90 hover:shadow-[0_24px_60px_-34px_rgba(139,92,246,0.34)]",
                badge: "bg-violet-100 text-violet-700",
                button: "bg-violet-600 text-white group-hover:bg-violet-700",
              },
              amber: {
                shell: "border-amber-200/80 bg-[linear-gradient(145deg,rgba(245,158,11,0.12),rgba(255,255,255,0.96))] hover:border-amber-300/90 hover:shadow-[0_24px_60px_-34px_rgba(245,158,11,0.34)]",
                badge: "bg-amber-100 text-amber-700",
                button: "bg-amber-500 text-white group-hover:bg-amber-600",
              },
            } as const;

            const tone = toneClasses[action.tone as keyof typeof toneClasses];

            return (
              <Link
                key={action.to}
                to={action.to}
                className={`group rounded-[28px] border p-5 shadow-[0_18px_44px_-32px_rgba(15,23,42,0.34)] transition duration-200 hover:-translate-y-1 ${tone.shell}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <span className={`rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.22em] ${tone.badge}`}>
                    Action
                  </span>
                  <div className="rounded-full border border-slate-200/70 bg-white/85 p-2 text-slate-500 transition group-hover:border-white/80 group-hover:text-slate-900">
                    <ArrowRight size={16} />
                  </div>
                </div>
                <div className="mt-4 text-2xl font-semibold tracking-tight text-slate-950">{action.title}</div>
                <p className="mt-2 min-h-[56px] text-sm leading-6 text-slate-600">{action.description}</p>
                <div className="mt-5 flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-500">Open workspace</span>
                  <span className={`rounded-full px-4 py-2 text-sm font-semibold transition ${tone.button}`}>
                    Open
                  </span>
                </div>
              </Link>
            );
          })()
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.8fr_1fr]">
        <Card title="Revenue Trend" subtitle="Last 30 days" accent>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="pharmacyRevenueFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0f766e" stopOpacity={0.24} />
                    <stop offset="95%" stopColor="#0f766e" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} />
                <Tooltip />
                <Area type="monotone" dataKey="revenue" stroke="#0f766e" fill="url(#pharmacyRevenueFill)" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Forecast Alerts" subtitle="Demand signal" accent>
          <div className="space-y-3">
            {dashboard.forecastHighlights.length === 0 ? (
              <div className="rounded-[24px] bg-slate-50 p-4 text-sm text-slate-500">
                Forecast service is offline or no forecast data is available yet.
              </div>
            ) : (
              dashboard.forecastHighlights.map((item) => <ForecastAlertCard key={item.medicineId} {...item} />)
            )}
          </div>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.2fr_1fr_1fr]">
        <Card title="Top Medicines" subtitle="Fast-moving products" accent>
          <div className="space-y-3">
            {dashboard.topMedicines.map((item) => (
              <div key={item.medicineId} className="flex items-center justify-between rounded-[24px] border border-slate-200/70 bg-white/80 p-4">
                <div>
                  <strong className="text-slate-800">{item.name}</strong>
                  <div className="mt-1 text-sm text-slate-500">{item.quantitySold} units sold</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold text-slate-700">LKR {Math.round(item.revenue).toLocaleString()}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Low Stock" subtitle="Available after reservations" accent>
          <div className="space-y-3">
            {dashboard.lowStockMedicines.slice(0, 6).map((item) => (
              <div key={item.medicineId} className="rounded-[24px] border border-slate-200/70 bg-white/80 p-4">
                <div className="flex items-center justify-between gap-3">
                  <strong className="text-slate-800">{item.name}</strong>
                  <span className="text-sm font-semibold text-rose-600">{item.availableStock} available</span>
                </div>
                <div className="mt-2 text-sm text-slate-500">
                  {item.quantity} total stock • {item.reservedQuantity} reserved
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Order Flow" subtitle="Daily volume" accent>
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} />
                <Tooltip />
                <Bar dataKey="orders" radius={[8, 8, 0, 0]} fill="#0ea5e9" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </section>
    </div>
  );
}
