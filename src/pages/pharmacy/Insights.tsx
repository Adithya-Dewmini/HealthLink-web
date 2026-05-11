import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, BrainCircuit, TrendingUp, Waves } from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import Card from "../../components/ui/Card";
import PharmacyWorkspaceSkeleton from "../../components/ui/PharmacyWorkspaceSkeleton";
import {
  fetchPharmacyAnalyticsDashboard,
  fetchPharmacyForecast,
  type PharmacyAnalyticsDashboard,
  type PharmacyForecastDetail,
} from "../../services/pharmacy-analytics.service";

function InsightStat({
  label,
  value,
  detail,
  icon: Icon,
  tone = "sky",
}: {
  label: string;
  value: string;
  detail: string;
  icon: typeof TrendingUp;
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

export default function InsightsPage() {
  const [dashboard, setDashboard] = useState<PharmacyAnalyticsDashboard | null>(null);
  const [selectedMedicineId, setSelectedMedicineId] = useState<number | null>(null);
  const [forecast, setForecast] = useState<PharmacyForecastDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [forecastLoading, setForecastLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      try {
        const data = await fetchPharmacyAnalyticsDashboard();
        if (!active) return;
        setDashboard(data);
        setSelectedMedicineId(data.lowStockMedicines[0]?.medicineId ?? data.topMedicines[0]?.medicineId ?? null);
        setError("");
      } catch (caughtError) {
        if (!active) return;
        setError(caughtError instanceof Error ? caughtError.message : "Unable to load insights.");
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!selectedMedicineId) {
      setForecast(null);
      return;
    }
    let active = true;
    const load = async () => {
      setForecastLoading(true);
      try {
        const data = await fetchPharmacyForecast(selectedMedicineId);
        if (!active) return;
        setForecast(data);
      } catch {
        if (!active) return;
        setForecast(null);
      } finally {
        if (active) setForecastLoading(false);
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, [selectedMedicineId]);

  const orderTrend = useMemo(
    () =>
      dashboard?.orderTrends.map((item) => ({
        label: new Date(item.date).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
        orders: item.orderCount,
        revenue: item.revenue,
      })) ?? [],
    [dashboard]
  );

  const forecastTrend = useMemo(
    () =>
      forecast?.forecast?.next30Days?.map((item) => ({
        label: new Date(item.date).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
        predictedDemand: item.predictedDemand,
      })) ?? [],
    [forecast]
  );

  if (loading) {
    return (
      <PharmacyWorkspaceSkeleton
        heroLabel="Demand Intelligence"
        heroTitle="Loading forecast pressure, stock risk, and sales momentum."
        heroCopy="Insight signals are being prepared from analytics, order history, and forecast service responses."
        cardLabel="Insight panel loading"
      />
    );
  }

  if (error || !dashboard) {
    return <div className="rounded-[24px] border border-rose-200 bg-rose-50 p-6 text-rose-700">{error || "Unable to load insights."}</div>;
  }

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-[34px] border border-white/70 bg-[#0F172A] p-8 text-white shadow-[0_40px_120px_-55px_rgba(15,23,42,0.85)]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(56,189,248,0.34),_transparent_30%),radial-gradient(circle_at_bottom_left,_rgba(168,85,247,0.2),_transparent_28%)]" />
        <div className="relative grid gap-8 xl:grid-cols-[1.5fr_1fr]">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.38em] text-sky-200/80">Demand Intelligence</p>
            <h2 className="mt-4 max-w-2xl text-4xl font-semibold tracking-tight text-white">
              Turn forecast pressure, stock risk, and order momentum into faster pharmacy decisions.
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300">
              This workspace groups the existing analytics into clearer operational categories: what is selling fast,
              what may run short, and what should be reordered before patient demand breaks flow.
            </p>
          </div>
          <div className="grid gap-4">
            <div className="rounded-[28px] border border-sky-300/20 bg-gradient-to-br from-sky-500/18 to-cyan-400/8 p-5 backdrop-blur-sm">
              <div className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-100">Forecast alerts</div>
              <div className="mt-3 text-3xl font-semibold text-white">{dashboard.forecastHighlights.length}</div>
              <p className="mt-2 text-sm text-sky-50/85">Live demand alerts from the forecasting service.</p>
            </div>
            <div className="rounded-[28px] border border-amber-300/20 bg-gradient-to-br from-amber-500/18 to-orange-400/8 p-5 backdrop-blur-sm">
              <div className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-100">Low stock signals</div>
              <div className="mt-3 text-3xl font-semibold text-white">{dashboard.lowStockMedicines.length}</div>
              <p className="mt-2 text-sm text-amber-50/85">Medicines needing fast replenishment attention.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <InsightStat label="Total orders" value={String(dashboard.overview.totalOrders)} detail="Demand volume across marketplace and Rx commerce" icon={TrendingUp} tone="sky" />
        <InsightStat label="Pending now" value={String(dashboard.overview.pendingOrders)} detail="Open orders still affecting fulfillment pressure" icon={Waves} tone="violet" />
        <InsightStat label="Low stock" value={String(dashboard.lowStockMedicines.length)} detail="Medicines at risk after reservations" icon={AlertTriangle} tone="amber" />
        <InsightStat label="Forecast alerts" value={String(dashboard.forecastHighlights.length)} detail="Medicines with modeled demand pressure" icon={BrainCircuit} tone="emerald" />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <Card title="Order Momentum" subtitle="Recent order trend and revenue shape" accent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={orderTrend}>
                <defs>
                  <linearGradient id="insightOrdersFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.24} />
                    <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0.04} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} />
                <Tooltip />
                <Area type="monotone" dataKey="orders" stroke="#0ea5e9" fill="url(#insightOrdersFill)" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Forecast Focus" subtitle="Select a medicine to inspect demand pressure" accent>
          <div className="space-y-3">
            {[...dashboard.lowStockMedicines.slice(0, 3), ...dashboard.topMedicines.slice(0, 3)]
              .filter((item, index, array) => array.findIndex((entry) => entry.medicineId === item.medicineId) === index)
              .map((item) => (
                <button
                  key={item.medicineId}
                  type="button"
                  onClick={() => setSelectedMedicineId(item.medicineId)}
                  className={`w-full rounded-[22px] border px-4 py-4 text-left transition ${
                    selectedMedicineId === item.medicineId
                      ? "border-sky-200 bg-sky-50"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <div className="font-semibold text-slate-900">{item.name}</div>
                  {"availableStock" in item ? (
                    <div className="mt-1 text-sm text-slate-500">{item.availableStock} available after reservations</div>
                  ) : (
                    <div className="mt-1 text-sm text-slate-500">{item.quantitySold} units sold recently</div>
                  )}
                </button>
              ))}
          </div>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_1fr_1fr]">
        <Card title="Fast-moving medicines" subtitle="Top commercial movers" accent>
          <div className="space-y-3">
            {dashboard.topMedicines.map((item) => (
              <div key={item.medicineId} className="rounded-[24px] border border-slate-200/70 bg-white/80 p-4">
                <div className="flex items-center justify-between gap-3">
                  <strong className="text-slate-900">{item.name}</strong>
                  <span className="text-sm font-semibold text-slate-700">{item.quantitySold} sold</span>
                </div>
                <div className="mt-2 text-sm text-slate-500">Revenue contribution LKR {Math.round(item.revenue).toLocaleString()}</div>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Stock pressure" subtitle="Medicines that may fail demand soon" accent>
          <div className="space-y-3">
            {dashboard.lowStockMedicines.map((item) => (
              <div key={item.medicineId} className="rounded-[24px] border border-slate-200/70 bg-white/80 p-4">
                <div className="flex items-center justify-between gap-3">
                  <strong className="text-slate-900">{item.name}</strong>
                  <span className="text-sm font-semibold text-rose-600">{item.availableStock} available</span>
                </div>
                <div className="mt-2 text-sm text-slate-500">
                  {item.quantity} total stock • {item.reservedQuantity} reserved
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Forecast detail" subtitle={forecast?.source === "service" ? "Forecast service response" : "Forecast status"} accent>
          {forecastLoading ? (
            <div className="rounded-[24px] bg-slate-50 p-6 text-sm text-slate-500">Loading forecast detail...</div>
          ) : !forecast?.forecast ? (
            <div className="rounded-[24px] bg-slate-50 p-6 text-sm text-slate-500">
              Forecast service is offline or the selected medicine has no detailed forecast yet.
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-[22px] bg-slate-50 p-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Predicted demand</div>
                  <div className="mt-2 text-2xl font-semibold text-slate-900">{forecast.forecast.predictedDemand}</div>
                </div>
                <div className="rounded-[22px] bg-slate-50 p-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Recommended reorder</div>
                  <div className="mt-2 text-2xl font-semibold text-slate-900">{forecast.forecast.recommendedReorderQuantity}</div>
                </div>
              </div>
              <div className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700">
                Shortage risk: {forecast.forecast.shortageRisk}
              </div>
              {forecastTrend.length > 0 ? (
                <div className="h-[180px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={forecastTrend}>
                      <defs>
                        <linearGradient id="forecastTrendFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.24} />
                          <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.04} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                      <XAxis dataKey="label" tickLine={false} axisLine={false} />
                      <YAxis tickLine={false} axisLine={false} />
                      <Tooltip />
                      <Area type="monotone" dataKey="predictedDemand" stroke="#8b5cf6" fill="url(#forecastTrendFill)" strokeWidth={3} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ) : null}
            </div>
          )}
        </Card>
      </section>
    </div>
  );
}
