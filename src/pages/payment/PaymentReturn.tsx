import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { getDefaultRouteForUser } from "../../services/auth.service";
import {
  fetchPublicPaymentRedirectStatus,
  parsePaymentRedirectQuery,
  type PaymentRedirectStatus,
  type PaymentStatusSummary,
} from "../../services/payment-status.service";
import { openMobileDeepLink } from "../../utils/mobileDeepLinks";

const PAYMENT_RETURN_POLL_WINDOW_MS = 60_000;
const PAYMENT_RETURN_POLL_INTERVAL_MS = 3_000;

const statusToneClass: Record<NonNullable<PaymentRedirectStatus>, string> = {
  paid: "border-emerald-200 bg-emerald-50 text-emerald-800",
  pending: "border-sky-200 bg-sky-50 text-sky-800",
  cancelled: "border-amber-200 bg-amber-50 text-amber-800",
  failed: "border-rose-200 bg-rose-50 text-rose-800",
  refunded: "border-slate-200 bg-slate-100 text-slate-700",
};

const formatMoney = (amount: number, currency: string) =>
  new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: currency || "LKR",
    maximumFractionDigits: 2,
  }).format(amount);

const resolveTitle = (status: PaymentRedirectStatus | null) => {
  if (status === "paid") return "Payment completed";
  if (status === "failed") return "Payment could not be confirmed";
  if (status === "cancelled") return "Payment was cancelled";
  if (status === "refunded") return "Payment refunded";
  return "Payment processing";
};

const resolveDescription = (status: PaymentRedirectStatus | null) => {
  if (status === "paid") {
    return "Your payment has been confirmed. The order is now ready for processing.";
  }

  if (status === "failed") {
    return "The gateway returned an unsuccessful payment result. You can retry from your orders screen.";
  }

  if (status === "cancelled") {
    return "The payment session was cancelled before completion.";
  }

  if (status === "refunded") {
    return "This payment was marked as refunded by the gateway or system.";
  }

  return "We received the gateway return. Payment verification may still be completing in the background.";
};

export default function PaymentReturnPage() {
  const [searchParams] = useSearchParams();
  const { isInitializing, user } = useAuth();
  const query = useMemo(() => parsePaymentRedirectQuery(searchParams), [searchParams]);
  const [status, setStatus] = useState<PaymentStatusSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isPollingStatus, setIsPollingStatus] = useState(false);
  const [pollSecondsRemaining, setPollSecondsRemaining] = useState(0);

  useEffect(() => {
    if (isInitializing) {
      return;
    }

    let active = true;

    const load = async () => {
      if (!query.orderId) {
        if (active) setLoading(false);
        return;
      }

      try {
        const nextStatus = await fetchPublicPaymentRedirectStatus({
          orderId: query.orderId,
          paymentId: query.paymentId,
          gatewayOrderId: query.gatewayOrderId,
        });
        if (!active) return;
        setStatus(nextStatus);
        setError("");
      } catch (caughtError) {
        if (!active) return;
        setError(caughtError instanceof Error ? caughtError.message : "Unable to load payment status.");
      } finally {
        if (active) setLoading(false);
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, [isInitializing, query.gatewayOrderId, query.orderId, query.paymentId]);

  useEffect(() => {
    if (!query.orderId || loading) {
      return undefined;
    }

    const currentStatus = status?.paymentStatus ?? query.paymentStatus ?? null;
    if (currentStatus !== "pending") {
      setIsPollingStatus(false);
      setPollSecondsRemaining(0);
      return undefined;
    }

    const startedAt = Date.now();
    const endAt = startedAt + PAYMENT_RETURN_POLL_WINDOW_MS;

    setIsPollingStatus(true);
    setPollSecondsRemaining(Math.ceil(PAYMENT_RETURN_POLL_WINDOW_MS / 1000));

    const countdownInterval = window.setInterval(() => {
      const remainingMs = endAt - Date.now();
      if (remainingMs <= 0) {
        setPollSecondsRemaining(0);
        setIsPollingStatus(false);
        window.clearInterval(countdownInterval);
        return;
      }

      setPollSecondsRemaining(Math.ceil(remainingMs / 1000));
    }, 1000);

    const refreshInterval = window.setInterval(() => {
      if (Date.now() >= endAt) {
        setIsPollingStatus(false);
        window.clearInterval(refreshInterval);
        return;
      }

      void fetchPublicPaymentRedirectStatus({
        orderId: query.orderId!,
        paymentId: query.paymentId,
        gatewayOrderId: query.gatewayOrderId,
      })
        .then((nextStatus) => {
          setStatus(nextStatus);
          setError("");
          if (nextStatus.paymentStatus && nextStatus.paymentStatus !== "pending") {
            setIsPollingStatus(false);
            setPollSecondsRemaining(0);
            window.clearInterval(refreshInterval);
            window.clearInterval(countdownInterval);
          }
        })
        .catch((caughtError) => {
          setError(caughtError instanceof Error ? caughtError.message : "Unable to load payment status.");
        });
    }, PAYMENT_RETURN_POLL_INTERVAL_MS);

    return () => {
      window.clearInterval(refreshInterval);
      window.clearInterval(countdownInterval);
    };
  }, [loading, query.gatewayOrderId, query.orderId, query.paymentId, query.paymentStatus, status?.paymentStatus]);

  const resolvedStatus = status?.paymentStatus ?? query.paymentStatus ?? null;
  const dashboardHref = user ? getDefaultRouteForUser(user) : "/login";
  const ordersHref = user?.role === "pharmacist" ? "/pharmacy/orders" : dashboardHref;
  const orderDeepLinkPath = query.orderId ? `patient/orders/${query.orderId}` : "patient/orders";

  const handleOpenDashboard = useCallback(() => {
    openMobileDeepLink("patient/dashboard", dashboardHref);
  }, [dashboardHref]);

  const handleOpenOrders = useCallback(() => {
    openMobileDeepLink(orderDeepLinkPath, ordersHref);
  }, [orderDeepLinkPath, ordersHref]);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#E4F6FF_0%,_#F8FBFE_45%,_#FFFFFF_100%)] px-4 py-12">
      <div className="mx-auto max-w-3xl rounded-[32px] border border-[#D6EAF7] bg-white p-8 shadow-[0_35px_90px_-55px_rgba(5,63,86,0.5)]">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#21A5EC]">Payment return</p>
        <h1 className="mt-3 text-3xl font-semibold text-[#053F56]">{resolveTitle(resolvedStatus)}</h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
          {status?.message || resolveDescription(resolvedStatus)}
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <span
            className={`inline-flex rounded-full border px-3 py-1 text-sm font-semibold ${
              resolvedStatus ? statusToneClass[resolvedStatus] : "border-sky-200 bg-sky-50 text-sky-800"
            }`}
          >
            {resolvedStatus ? resolvedStatus.replace(/_/g, " ") : "processing"}
          </span>
          {loading ? (
            <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-sm font-semibold text-slate-600">
              Checking latest status...
            </span>
          ) : null}
        </div>

        {isPollingStatus ? (
          <div className="mt-4 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
            <div className="font-semibold">Refreshing payment status...</div>
            <div className="mt-1 text-sky-700">
              We are checking for the verified PayHere callback. Auto-refresh continues for about{" "}
              {pollSecondsRemaining} second{pollSecondsRemaining === 1 ? "" : "s"}.
            </div>
          </div>
        ) : null}

        {error ? (
          <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {error}
          </div>
        ) : null}

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Order</p>
            <p className="mt-2 text-2xl font-semibold text-[#053F56]">{query.orderId ?? "Unavailable"}</p>
            <p className="mt-3 text-sm text-slate-500">
              Gateway order: {query.gatewayOrderId ?? status?.payment?.gatewayOrderId ?? "Unavailable"}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Payment record: {query.paymentId ?? status?.payment?.id ?? "Unavailable"}
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Status</p>
            <p className="mt-2 text-2xl font-semibold text-[#053F56]">
              {status?.paymentStatus ? status.paymentStatus.replace(/_/g, " ") : "Pending verification"}
            </p>
            <p className="mt-3 text-sm text-slate-500">
              Amount: {status ? formatMoney(status.amount, status.currency) : "Unavailable"}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Invoice: {status?.invoice?.invoiceNo ?? "Not issued yet"}
            </p>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleOpenDashboard}
            className="inline-flex rounded-2xl bg-[linear-gradient(135deg,#0F5AA3_0%,#21A5EC_100%)] px-5 py-3 text-sm font-semibold !text-white no-underline shadow-[0_12px_30px_-18px_rgba(33,165,236,0.8)]"
          >
            Return to dashboard
          </button>
          <button
            type="button"
            onClick={handleOpenOrders}
            className="inline-flex rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 no-underline"
          >
            Open orders
          </button>
        </div>
      </div>
    </div>
  );
}
