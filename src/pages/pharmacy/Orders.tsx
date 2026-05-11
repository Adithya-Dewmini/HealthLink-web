import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Activity,
  ArrowRight,
  ChevronDown,
  PackageCheck,
  RefreshCw,
  Search,
  Truck,
  Wallet,
  X,
} from "lucide-react";
import PharmacyWorkspaceSkeleton from "../../components/ui/PharmacyWorkspaceSkeleton";
import {
  fetchPharmacyOrders,
  getAllowedOrderTransitions,
  ORDER_STATUS_LABELS,
  updatePharmacyOrderStatus,
  type PharmacyOrder,
  type PharmacyOrderStatus,
} from "../../services/pharmacy-operations.service";

const formatMoney = (value: number) => `LKR ${Math.round(value).toLocaleString()}`;

type OrderStatusTab = "all" | "active" | "ready" | "completed" | "cancelled";
type OrderTypeTab = "all" | "pickup" | "delivery" | "prescription" | "marketplace";
type SidebarStatusView = "all" | "new" | "pending" | "in_progress" | "completed" | "cancelled";

const statusClasses: Record<PharmacyOrderStatus, string> = {
  pending: "bg-amber-100 text-amber-800 border border-amber-200",
  confirmed: "bg-sky-100 text-sky-800 border border-sky-200",
  preparing: "bg-violet-100 text-violet-800 border border-violet-200",
  awaiting_substitution_approval: "bg-yellow-100 text-yellow-800 border border-yellow-200",
  partially_ready: "bg-orange-100 text-orange-800 border border-orange-200",
  ready_for_pickup: "bg-emerald-100 text-emerald-800 border border-emerald-200",
  out_for_delivery: "bg-blue-100 text-blue-800 border border-blue-200",
  delivered: "bg-cyan-100 text-cyan-800 border border-cyan-200",
  completed: "bg-emerald-100 text-emerald-800 border border-emerald-200",
  cancelled: "bg-rose-100 text-rose-800 border border-rose-200",
};

const statusTabConfig: Array<{ key: OrderStatusTab; label: string }> = [
  { key: "active", label: "Active" },
  { key: "ready", label: "Ready" },
  { key: "completed", label: "Completed" },
  { key: "cancelled", label: "Cancelled" },
  { key: "all", label: "All Orders" },
];

const typeTabConfig: Array<{ key: OrderTypeTab; label: string }> = [
  { key: "all", label: "All Types" },
  { key: "pickup", label: "Pickup" },
  { key: "delivery", label: "Delivery" },
  { key: "prescription", label: "Prescription" },
  { key: "marketplace", label: "Marketplace" },
];

const isSidebarStatusView = (value: string | null): value is SidebarStatusView =>
  value === "new" ||
  value === "pending" ||
  value === "in_progress" ||
  value === "completed" ||
  value === "cancelled" ||
  value === "all";

function matchesSidebarView(order: PharmacyOrder, view: SidebarStatusView) {
  if (view === "all") return true;
  if (view === "new") return order.status === "pending";
  if (view === "pending") return ["pending", "confirmed", "awaiting_substitution_approval"].includes(order.status);
  if (view === "in_progress") return ["preparing", "partially_ready", "out_for_delivery"].includes(order.status);
  if (view === "completed") return ["completed", "delivered"].includes(order.status);
  return order.status === "cancelled";
}

function matchesStatusTab(order: PharmacyOrder, tab: OrderStatusTab) {
  if (tab === "all") return true;
  if (tab === "active") {
    return ["pending", "awaiting_substitution_approval", "confirmed", "preparing", "partially_ready"].includes(
      order.status
    );
  }
  if (tab === "ready") {
    return ["ready_for_pickup", "out_for_delivery"].includes(order.status);
  }
  if (tab === "completed") {
    return ["completed", "delivered"].includes(order.status);
  }
  return order.status === "cancelled";
}

function matchesTypeTab(order: PharmacyOrder, tab: OrderTypeTab) {
  if (tab === "all") return true;
  if (tab === "pickup") return order.fulfillmentType === "pickup" && !order.prescriptionId;
  if (tab === "delivery") return order.fulfillmentType === "delivery";
  if (tab === "prescription") return Boolean(order.prescriptionId);
  return !order.prescriptionId;
}

function StatusBadge({ status }: { status: PharmacyOrderStatus }) {
  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${statusClasses[status]}`}>
      {ORDER_STATUS_LABELS[status]}
    </span>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: typeof Activity;
}) {
  return (
    <section className="rounded-[22px] border border-slate-200 bg-white px-5 py-4 shadow-[0_18px_60px_-46px_rgba(15,23,42,0.3)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">{label}</div>
          <div className="mt-3 text-[1.9rem] font-semibold tracking-tight text-slate-950">{value}</div>
        </div>
        <div className="rounded-2xl bg-sky-50 p-3 text-sky-600">
          <Icon size={18} />
        </div>
      </div>
    </section>
  );
}

function FilterChip({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition ${
        active
          ? "border-slate-900 bg-slate-900 text-white"
          : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
      }`}
    >
      <span>{label}</span>
      <span
        className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
          active ? "bg-white/15 text-white" : "bg-slate-100 text-slate-500"
        }`}
      >
        {count}
      </span>
    </button>
  );
}

function OrderActionModal({
  order,
  busy,
  onClose,
  onStatusChange,
}: {
  order: PharmacyOrder | null;
  busy: boolean;
  onClose: () => void;
  onStatusChange: (status: PharmacyOrderStatus) => void;
}) {
  if (!order) return null;

  const allowedTransitions = getAllowedOrderTransitions(order);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-950/45 p-4 backdrop-blur-md">
      <div className="flex h-full w-full max-w-2xl flex-col overflow-hidden rounded-[30px] border border-white/70 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] shadow-[0_45px_140px_-55px_rgba(15,23,42,0.8)]">
        <div className="border-b border-slate-100 px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-sky-700/70">Order details</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">Order #{order.id}</h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full bg-slate-100 p-3 text-slate-600 transition hover:bg-slate-200 hover:text-slate-900"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          <div className="space-y-5">
            <section className="rounded-[22px] border border-slate-200 bg-white p-5">
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <StatusBadge status={order.status} />
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                  {order.fulfillmentType === "delivery" ? "Delivery" : "Pickup"}
                </span>
                <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">
                  {order.prescriptionId ? "Prescription" : "Marketplace"}
                </span>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-[18px] bg-slate-50 p-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Customer</div>
                  <div className="mt-2 font-semibold text-slate-900">{order.patientName || "Patient order"}</div>
                  <div className="mt-1 text-sm text-slate-500">{order.patientEmail || "No email available"}</div>
                </div>
                <div className="rounded-[18px] bg-slate-50 p-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Created</div>
                  <div className="mt-2 font-semibold text-slate-900">{new Date(order.createdAt).toLocaleDateString()}</div>
                  <div className="mt-1 text-sm text-slate-500">{new Date(order.createdAt).toLocaleTimeString()}</div>
                </div>
                <div className="rounded-[18px] bg-slate-50 p-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Total</div>
                  <div className="mt-2 text-2xl font-semibold text-slate-900">{formatMoney(order.total)}</div>
                  <div className="mt-1 text-sm text-slate-500">
                    {order.discountTotal > 0 ? `${formatMoney(order.discountTotal)} discounts` : "No discounts"}
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-[22px] border border-slate-200 bg-white p-5">
              <div className="mb-4 flex items-center justify-between">
                <span className="text-base font-semibold text-slate-900">Order items</span>
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                  {order.items.length} item{order.items.length === 1 ? "" : "s"}
                </span>
              </div>
              <div className="space-y-3">
                {order.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-4 rounded-[18px] border border-slate-100 bg-slate-50 px-4 py-3"
                  >
                    <div>
                      <div className="font-semibold text-slate-900">
                        {item.quantity} x {item.name}
                      </div>
                      <div className="mt-1 text-xs text-slate-500">
                        {item.requiresPrescription ? "Prescription medicine" : "Marketplace medicine"}
                      </div>
                    </div>
                    <div className="text-sm font-bold text-slate-700">{formatMoney(item.totalPrice)}</div>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-[22px] border border-slate-200 bg-white p-5">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Order details</div>
              <div className="mt-4 space-y-3 text-sm text-slate-600">
                <div>Type: {order.fulfillmentType === "delivery" ? "Delivery" : "Pickup"}</div>
                <div>Source: {order.prescriptionId ? "Prescription order" : "Marketplace order"}</div>
                {order.prescriptionId ? <div>Prescription ID: {order.prescriptionId}</div> : null}
                {order.notes ? <div>Note: {order.notes}</div> : null}
                {order.deliveryContactName ? <div>Contact: {order.deliveryContactName}</div> : null}
                {order.deliveryContactPhone ? <div>Phone: {order.deliveryContactPhone}</div> : null}
                {order.deliveryAddress ? (
                  <div>
                    Delivery:{" "}
                    {[
                      order.deliveryAddress.line1,
                      order.deliveryAddress.line2,
                      order.deliveryAddress.city,
                      order.deliveryAddress.district,
                    ]
                      .filter(Boolean)
                      .join(", ")}
                  </div>
                ) : null}
              </div>
            </section>

            <section className="rounded-[22px] border border-slate-200 bg-white p-5">
              <div className="mb-4 flex items-center justify-between">
                <span className="text-base font-semibold text-slate-900">Take action</span>
                {allowedTransitions[0] ? (
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                    Next: {ORDER_STATUS_LABELS[allowedTransitions[0]]}
                  </span>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-2">
                {allowedTransitions.length === 0 ? (
                  <span className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-500">
                    No more status updates
                  </span>
                ) : (
                  allowedTransitions.map((status, index) => (
                    <button
                      key={status}
                      type="button"
                      disabled={busy}
                      onClick={() => onStatusChange(status)}
                      className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                        index === 0
                          ? "bg-slate-900 text-white hover:bg-slate-800"
                          : "border border-slate-200 bg-white text-slate-700 hover:border-sky-200 hover:bg-sky-50 hover:text-sky-800"
                      }`}
                    >
                      {index === 0 ? <ArrowRight size={15} /> : null}
                      {busy ? "Updating..." : ORDER_STATUS_LABELS[status]}
                    </button>
                  ))
                )}
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

function OrderTableRow({
  order,
  busy,
  onOpen,
  onStatusChange,
}: {
  order: PharmacyOrder;
  busy: boolean;
  onOpen: () => void;
  onStatusChange: (status: PharmacyOrderStatus) => void;
}) {
  const primaryAction = getAllowedOrderTransitions(order)[0];
  const firstItem = order.items[0];

  return (
    <tr className="border-b border-slate-100 last:border-none hover:bg-slate-50/70">
      <td className="px-4 py-4 align-top">
        <input type="checkbox" className="mt-1 h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500" />
      </td>
      <td className="px-4 py-4 align-top">
        <div className="font-semibold text-sky-700">#{order.id}</div>
      </td>
      <td className="px-4 py-4 align-top">
        <div className="font-semibold text-slate-950">{order.patientName || "Patient order"}</div>
        <div className="mt-1 text-sm text-slate-500">{order.patientEmail || "No email available"}</div>
      </td>
      <td className="px-4 py-4 align-top">
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">
            {order.prescriptionId ? "Prescription" : "Marketplace"}
          </span>
        </div>
      </td>
      <td className="px-4 py-4 align-top">
        <div className="font-medium text-slate-900">{order.items.length}</div>
        <div className="mt-1 text-xs text-slate-500">{firstItem?.name || "Order item"}</div>
      </td>
      <td className="px-4 py-4 align-top text-sm text-slate-600">
        <div className="font-medium text-slate-900">{new Date(order.createdAt).toLocaleDateString()}</div>
        <div className="mt-1 text-slate-500">{new Date(order.createdAt).toLocaleTimeString()}</div>
      </td>
      <td className="px-4 py-4 align-top font-semibold text-slate-950">{formatMoney(order.total)}</td>
      <td className="px-4 py-4 align-top">
        <StatusBadge status={order.status} />
      </td>
      <td className="px-4 py-4 align-top">
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
          {order.fulfillmentType === "delivery" ? "Delivery" : "Pickup"}
        </span>
      </td>
      <td className="px-4 py-4 align-top">
        <div className="flex items-center justify-end gap-2">
          {primaryAction ? (
            <button
              type="button"
              onClick={() => onStatusChange(primaryAction)}
              disabled={busy}
              className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busy ? "Updating..." : ORDER_STATUS_LABELS[primaryAction]}
            </button>
          ) : null}
          <button
            type="button"
            onClick={onOpen}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-sky-200 hover:bg-sky-50 hover:text-sky-800"
          >
            Actions
            <ChevronDown size={14} />
          </button>
        </div>
      </td>
    </tr>
  );
}

export default function OrdersPage() {
  const [searchParams] = useSearchParams();
  const [orders, setOrders] = useState<PharmacyOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyOrderId, setBusyOrderId] = useState<number | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<PharmacyOrder | null>(null);
  const [search, setSearch] = useState("");
  const [activeStatusTab, setActiveStatusTab] = useState<OrderStatusTab>("all");
  const [activeTypeTab, setActiveTypeTab] = useState<OrderTypeTab>("all");

  const rawSidebarView = searchParams.get("status");
  const sidebarView: SidebarStatusView = isSidebarStatusView(rawSidebarView) ? rawSidebarView : "all";

  const loadOrders = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchPharmacyOrders();
      setOrders(data);
      setError("");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to load pharmacy orders.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  const overview = useMemo(() => {
    const activeOrders = orders.filter((order) =>
      ["pending", "awaiting_substitution_approval", "confirmed", "preparing", "partially_ready"].includes(order.status)
    );
    const deliveryOrders = orders.filter((order) => order.fulfillmentType === "delivery");
    const readyOrders = orders.filter((order) => ["ready_for_pickup", "out_for_delivery"].includes(order.status));
    const revenue = orders
      .filter((order) => ["completed", "delivered"].includes(order.status))
      .reduce((sum, order) => sum + order.total, 0);

    return {
      activeOrders: activeOrders.length,
      readyOrders: readyOrders.length,
      deliveryOrders: deliveryOrders.length,
      revenue,
    };
  }, [orders]);

  const sidebarCounts = useMemo(
    () => ({
      new: orders.filter((order) => matchesSidebarView(order, "new")).length,
      pending: orders.filter((order) => matchesSidebarView(order, "pending")).length,
      in_progress: orders.filter((order) => matchesSidebarView(order, "in_progress")).length,
      completed: orders.filter((order) => matchesSidebarView(order, "completed")).length,
      cancelled: orders.filter((order) => matchesSidebarView(order, "cancelled")).length,
    }),
    [orders]
  );

  const statusCounts = useMemo(
    () => ({
      all: orders.length,
      active: orders.filter((order) => matchesStatusTab(order, "active")).length,
      ready: orders.filter((order) => matchesStatusTab(order, "ready")).length,
      completed: orders.filter((order) => matchesStatusTab(order, "completed")).length,
      cancelled: orders.filter((order) => matchesStatusTab(order, "cancelled")).length,
    }),
    [orders]
  );

  const typeCounts = useMemo(
    () => ({
      all: orders.length,
      pickup: orders.filter((order) => matchesTypeTab(order, "pickup")).length,
      delivery: orders.filter((order) => matchesTypeTab(order, "delivery")).length,
      prescription: orders.filter((order) => matchesTypeTab(order, "prescription")).length,
      marketplace: orders.filter((order) => matchesTypeTab(order, "marketplace")).length,
    }),
    [orders]
  );

  const filteredOrders = useMemo(() => {
    const query = search.trim().toLowerCase();

    return orders.filter((order) => {
      if (!matchesSidebarView(order, sidebarView)) return false;
      if (!matchesStatusTab(order, activeStatusTab)) return false;
      if (!matchesTypeTab(order, activeTypeTab)) return false;
      if (!query) return true;

      return [
        `order ${order.id}`,
        order.patientName,
        order.patientEmail,
        order.notes,
        order.pharmacyName,
        order.prescriptionId,
        ...order.items.map((item) => item.name),
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));
    });
  }, [activeStatusTab, activeTypeTab, orders, search, sidebarView]);

  const handleStatusChange = async (orderId: number, status: PharmacyOrderStatus) => {
    try {
      setBusyOrderId(orderId);
      const updated = await updatePharmacyOrderStatus(orderId, status);
      setOrders((current) => current.map((order) => (order.id === orderId ? updated : order)));
      setSelectedOrder((current) => (current?.id === updated.id ? updated : current));
      setError("");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to update order.");
    } finally {
      setBusyOrderId(null);
    }
  };

  if (loading) {
    return (
      <PharmacyWorkspaceSkeleton
        heroLabel="Order Management"
        heroTitle="Loading pharmacy orders."
        heroCopy="Preparing the fulfillment list."
        cardLabel="Order table loading"
      />
    );
  }

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-sky-700/70">Orders</p>
          <h2 className="mt-2 text-4xl font-semibold tracking-tight text-slate-950">Order management</h2>
          <p className="mt-3 text-sm text-slate-500">
            Manage pharmacy pickup, delivery, marketplace, and prescription orders.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadOrders()}
          className="inline-flex items-center gap-2 self-start rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-sky-200 hover:bg-sky-50 hover:text-sky-800"
        >
          <RefreshCw size={16} />
          Refresh
        </button>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="New Orders" value={sidebarCounts.new.toLocaleString()} icon={Activity} />
        <StatCard label="In Progress" value={sidebarCounts.in_progress.toLocaleString()} icon={Truck} />
        <StatCard label="Ready" value={overview.readyOrders.toLocaleString()} icon={PackageCheck} />
        <StatCard label="Revenue" value={formatMoney(overview.revenue)} icon={Wallet} />
      </section>

      <section className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-[0_24px_80px_-56px_rgba(15,23,42,0.35)]">
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="relative w-full max-w-xl">
              <Search className="pointer-events-none absolute left-4 top-1/2 z-10 size-4 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search order ID, patient, email, prescription, or medicine"
                className="h-12 w-full rounded-[18px] border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm text-slate-700 outline-none transition focus:border-sky-300 focus:bg-white"
              />
            </div>
            <div className="text-sm text-slate-500">
              {filteredOrders.length} visible of {orders.length} orders
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">Order type</div>
              <div className="flex flex-wrap gap-2">
                {typeTabConfig.map((tab) => (
                  <FilterChip
                    key={tab.key}
                    label={tab.label}
                    count={typeCounts[tab.key]}
                    active={activeTypeTab === tab.key}
                    onClick={() => setActiveTypeTab(tab.key)}
                  />
                ))}
              </div>
            </div>

            <div>
              <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">Order status</div>
              <div className="flex flex-wrap gap-2">
                {statusTabConfig.map((tab) => (
                  <FilterChip
                    key={tab.key}
                    label={tab.label}
                    count={statusCounts[tab.key]}
                    active={activeStatusTab === tab.key}
                    onClick={() => setActiveStatusTab(tab.key)}
                  />
                ))}
              </div>
            </div>
          </div>

          {error ? (
            <div className="rounded-[20px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          ) : null}

          <div className="overflow-hidden rounded-[24px] border border-slate-200">
            <div className="overflow-x-auto">
              <table className="min-w-[1100px] w-full border-collapse">
                <thead className="bg-slate-50">
                  <tr className="text-left text-[11px] font-bold uppercase tracking-[0.22em] text-slate-400">
                    <th className="px-4 py-4">
                      <input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500" />
                    </th>
                    <th className="px-4 py-4">Order No.</th>
                    <th className="px-4 py-4">Patient</th>
                    <th className="px-4 py-4">Type</th>
                    <th className="px-4 py-4">Items</th>
                    <th className="px-4 py-4">Date</th>
                    <th className="px-4 py-4">Total</th>
                    <th className="px-4 py-4">Status</th>
                    <th className="px-4 py-4">Fulfillment</th>
                    <th className="px-4 py-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="bg-white">
                  {filteredOrders.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="px-6 py-16 text-center text-slate-500">
                        {search
                          ? "No orders matched your filters."
                          : "No orders are available in this section yet."}
                      </td>
                    </tr>
                  ) : (
                    filteredOrders.map((order) => (
                      <OrderTableRow
                        key={order.id}
                        order={order}
                        busy={busyOrderId === order.id}
                        onOpen={() => setSelectedOrder(order)}
                        onStatusChange={(status) => void handleStatusChange(order.id, status)}
                      />
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-5 py-4 text-sm text-slate-500">
              <button type="button" className="rounded-full px-3 py-1.5 transition hover:bg-white hover:text-slate-700">
                Previous
              </button>
              <div>
                Showing <span className="font-semibold text-slate-700">{filteredOrders.length}</span> order
                {filteredOrders.length === 1 ? "" : "s"}
              </div>
              <button type="button" className="rounded-full px-3 py-1.5 transition hover:bg-white hover:text-slate-700">
                Next
              </button>
            </div>
          </div>
        </div>
      </section>

      <OrderActionModal
        order={selectedOrder}
        busy={busyOrderId === selectedOrder?.id}
        onClose={() => setSelectedOrder(null)}
        onStatusChange={(status) => {
          if (!selectedOrder) return;
          void handleStatusChange(selectedOrder.id, status);
        }}
      />
    </div>
  );
}
