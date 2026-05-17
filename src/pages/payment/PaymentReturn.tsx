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
const PAYMENT_RETURN_POLL_INTERVAL_MS = 2_500;

const PAGE = {
  pageBg: "#F4FAFF",
  cardBg: "#FFFFFF",
  softBg: "#F9FCFF",
  textPrimary: "#0B4F6C",
  textSecondary: "#5E738A",
  accent: "#1EA7FD",
  accentLight: "#2EA8FF",
  border: "#DDEAF3",
  successBg: "#EAFBF1",
  successText: "#138A4D",
  pendingBg: "#EAF7FF",
  pendingText: "#0B7DB5",
  failedBg: "#FFF1F2",
  failedText: "#D92D20",
};

const formatMoney = (amount: number, currency: string) =>
  new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: currency || "LKR",
    maximumFractionDigits: 2,
  }).format(amount);

const getStatusTheme = (status: PaymentRedirectStatus | null) => {
  if (status === "paid") {
    return {
      bg: PAGE.successBg,
      text: PAGE.successText,
      badge: "Paid",
      title: "Payment completed",
    };
  }
  if (status === "failed") {
    return {
      bg: PAGE.failedBg,
      text: PAGE.failedText,
      badge: "Failed",
      title: "Payment failed",
    };
  }
  if (status === "cancelled") {
    return {
      bg: PAGE.failedBg,
      text: PAGE.failedText,
      badge: "Cancelled",
      title: "Payment cancelled",
    };
  }
  return {
    bg: PAGE.pendingBg,
    text: PAGE.pendingText,
    badge: "Processing",
    title: "Payment processing",
  };
};

const resolveDescription = (status: PaymentRedirectStatus | null, summary: PaymentStatusSummary | null) => {
  if (status === "paid") {
    return summary?.invoice?.invoiceNo
      ? `Payment successful. Invoice ${summary.invoice.invoiceNo} is ready.`
      : "Payment successful. Your invoice is being prepared.";
  }
  if (status === "failed") {
    return "The payment was not completed. Please try again from the app.";
  }
  if (status === "cancelled") {
    return "You cancelled the payment. Your order is still pending payment.";
  }
  return "Payment confirmation is still pending. You can return to the app and check order status anytime.";
};

const LoadingSection = ({ title }: { title: string }) => (
  <div
    className="rounded-[24px] border p-5"
    style={{ background: PAGE.softBg, borderColor: PAGE.border }}
  >
    <p className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: PAGE.textSecondary }}>
      {title}
    </p>
    <div className="mt-4 space-y-3">
      <div className="h-5 w-40 animate-pulse rounded-full bg-slate-200" />
      <div className="h-4 w-52 animate-pulse rounded-full bg-slate-100" />
      <div className="h-4 w-32 animate-pulse rounded-full bg-slate-100" />
    </div>
  </div>
);

const DetailRow = ({
  label,
  value,
}: {
  label: string;
  value: string;
}) => (
  <div className="flex items-start justify-between gap-4 py-2">
    <span className="text-sm" style={{ color: PAGE.textSecondary }}>
      {label}
    </span>
    <span className="text-right text-sm font-semibold" style={{ color: PAGE.textPrimary }}>
      {value}
    </span>
  </div>
);

export default function PaymentReturnPage() {
  const [searchParams] = useSearchParams();
  const { isInitializing, user } = useAuth();
  const query = useMemo(() => parsePaymentRedirectQuery(searchParams), [searchParams]);
  const [status, setStatus] = useState<PaymentStatusSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isPollingStatus, setIsPollingStatus] = useState(false);
  const [pollSecondsRemaining, setPollSecondsRemaining] = useState(0);
  const [pollTimedOut, setPollTimedOut] = useState(false);

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
          redirectParams: searchParams,
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
  }, [isInitializing, query.gatewayOrderId, query.orderId, query.paymentId, searchParams]);

  useEffect(() => {
    if (!query.orderId || loading) {
      return undefined;
    }

    const currentStatus = status?.paymentStatus ?? query.paymentStatus ?? null;
    if (currentStatus !== "pending") {
      setIsPollingStatus(false);
      setPollSecondsRemaining(0);
      setPollTimedOut(false);
      return undefined;
    }

    const startedAt = Date.now();
    const endAt = startedAt + PAYMENT_RETURN_POLL_WINDOW_MS;

    setIsPollingStatus(true);
    setPollTimedOut(false);
    setPollSecondsRemaining(Math.ceil(PAYMENT_RETURN_POLL_WINDOW_MS / 1000));

    const countdownInterval = window.setInterval(() => {
      const remainingMs = endAt - Date.now();
      if (remainingMs <= 0) {
        setPollSecondsRemaining(0);
        setIsPollingStatus(false);
        setPollTimedOut(true);
        window.clearInterval(countdownInterval);
        return;
      }
      setPollSecondsRemaining(Math.ceil(remainingMs / 1000));
    }, 1000);

    const refreshInterval = window.setInterval(() => {
      if (Date.now() >= endAt) {
        setIsPollingStatus(false);
        setPollTimedOut(true);
        window.clearInterval(refreshInterval);
        return;
      }

      void fetchPublicPaymentRedirectStatus({
        orderId: query.orderId!,
        paymentId: query.paymentId,
        gatewayOrderId: query.gatewayOrderId,
        redirectParams: searchParams,
      })
        .then((nextStatus) => {
          setStatus(nextStatus);
          setError("");
          if (nextStatus.paymentStatus && nextStatus.paymentStatus !== "pending") {
            setIsPollingStatus(false);
            setPollTimedOut(false);
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
  }, [loading, query.gatewayOrderId, query.orderId, query.paymentId, query.paymentStatus, searchParams, status?.paymentStatus]);

  const resolvedStatus = status?.paymentStatus ?? query.paymentStatus ?? null;
  const statusTheme = getStatusTheme(resolvedStatus);
  const dashboardHref = user ? getDefaultRouteForUser(user) : "/login";
  const ordersFallbackHref = user?.role === "pharmacist" ? "/pharmacy/orders" : dashboardHref;
  const orderDetailsPath = query.orderId ? `patient/orders/${query.orderId}` : "patient/orders";
  const invoice = status?.invoice ?? null;

  const handleOpenDashboard = useCallback(() => {
    openMobileDeepLink("patient/dashboard", dashboardHref);
  }, [dashboardHref]);

  const handleOpenOrders = useCallback(() => {
    openMobileDeepLink("patient/orders", ordersFallbackHref);
  }, [ordersFallbackHref]);

  const handleOpenOrderDetails = useCallback(() => {
    openMobileDeepLink(orderDetailsPath, ordersFallbackHref);
  }, [orderDetailsPath, ordersFallbackHref]);

  return (
    <div className="min-h-screen px-4 py-10" style={{ background: PAGE.pageBg }}>
      <div
        className="mx-auto w-full max-w-2xl rounded-[30px] border p-5 shadow-[0_30px_80px_-55px_rgba(11,79,108,0.35)] sm:p-8"
        style={{ background: PAGE.cardBg, borderColor: PAGE.border }}
      >
        <div
          className="rounded-[24px] border p-5 sm:p-6"
          style={{ background: statusTheme.bg, borderColor: PAGE.border }}
        >
          <p className="text-xs font-semibold uppercase tracking-[0.22em]" style={{ color: PAGE.accent }}>
            Payment Return
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <span
              className="inline-flex rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.12em]"
              style={{ background: "#FFFFFF", color: statusTheme.text }}
            >
              {statusTheme.badge}
            </span>
            {loading ? (
              <span className="text-sm font-medium" style={{ color: PAGE.textSecondary }}>
                Checking payment confirmation...
              </span>
            ) : null}
          </div>
          <h1 className="mt-4 text-[2rem] font-semibold leading-tight sm:text-[2.35rem]" style={{ color: PAGE.textPrimary }}>
            {statusTheme.title}
          </h1>
          <p className="mt-3 text-sm leading-7 sm:text-[15px]" style={{ color: PAGE.textSecondary }}>
            {loading
              ? "Checking payment confirmation… This usually takes a few seconds after PayHere returns."
              : resolveDescription(resolvedStatus, status)}
          </p>
          {isPollingStatus ? (
            <div className="mt-4 rounded-2xl bg-white/80 px-4 py-3 text-sm" style={{ color: PAGE.pendingText }}>
              <div className="font-semibold">Checking payment confirmation…</div>
              <div className="mt-1">
                This usually takes a few seconds after PayHere returns. Auto-refresh continues for about{" "}
                {pollSecondsRemaining} second{pollSecondsRemaining === 1 ? "" : "s"}.
              </div>
            </div>
          ) : null}
          {pollTimedOut && resolvedStatus === "pending" ? (
            <div className="mt-4 rounded-2xl bg-white/80 px-4 py-3 text-sm" style={{ color: PAGE.pendingText }}>
              Payment is still pending. You can return to the app and check your order status later.
            </div>
          ) : null}
        </div>

        {error ? (
          <div className="mt-5 rounded-2xl border px-4 py-3 text-sm" style={{ borderColor: PAGE.border, background: PAGE.failedBg, color: PAGE.failedText }}>
            {error}
          </div>
        ) : null}

        <div className="mt-6 grid gap-4">
          {loading ? (
            <>
              <LoadingSection title="Order details" />
              <LoadingSection title="Payment details" />
              <LoadingSection title="Invoice" />
            </>
          ) : (
            <>
              <div className="rounded-[24px] border p-5" style={{ background: PAGE.softBg, borderColor: PAGE.border }}>
                <p className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: PAGE.textSecondary }}>
                  Order Details
                </p>
                <div className="mt-3">
                  <DetailRow label="Order" value={query.orderId ? `#${query.orderId}` : "Unavailable"} />
                  <DetailRow
                    label="Gateway order"
                    value={query.gatewayOrderId ?? status?.payment?.gatewayOrderId ?? "Unavailable"}
                  />
                  {status?.updatedAt ? (
                    <DetailRow
                      label="Last updated"
                      value={new Date(status.updatedAt).toLocaleString("en-LK")}
                    />
                  ) : null}
                </div>
              </div>

              <div className="rounded-[24px] border p-5" style={{ background: PAGE.softBg, borderColor: PAGE.border }}>
                <p className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: PAGE.textSecondary }}>
                  Payment Details
                </p>
                <div className="mt-3">
                  <DetailRow label="Status" value={statusTheme.badge} />
                  <DetailRow
                    label="Amount"
                    value={status ? formatMoney(status.amount, status.currency) : "Pending confirmation"}
                  />
                  {status?.payment?.gatewayPaymentId ? (
                    <DetailRow label="Gateway payment" value={status.payment.gatewayPaymentId} />
                  ) : null}
                  {status?.paidAt ? (
                    <DetailRow
                      label="Confirmed at"
                      value={new Date(status.paidAt).toLocaleString("en-LK")}
                    />
                  ) : null}
                </div>
              </div>

              {invoice ? (
                <div className="rounded-[24px] border p-5" style={{ background: PAGE.softBg, borderColor: PAGE.border }}>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: PAGE.textSecondary }}>
                    Invoice Details
                  </p>
                  <div className="mt-3">
                    <DetailRow label="Invoice number" value={invoice.invoiceNo} />
                    <DetailRow label="Invoice status" value={invoice.status || "Issued"} />
                    <DetailRow label="Invoice amount" value={formatMoney(invoice.amount ?? invoice.total, invoice.currency)} />
                    <DetailRow label="Issued at" value={new Date(invoice.issuedAt).toLocaleString("en-LK")} />
                    <DetailRow
                      label="Email status"
                      value={invoice.emailedAt ? `Sent ${new Date(invoice.emailedAt).toLocaleString("en-LK")}` : "Pending email"}
                    />
                  </div>
                </div>
              ) : (
                <div className="rounded-[24px] border p-5" style={{ background: PAGE.softBg, borderColor: PAGE.border }}>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: PAGE.textSecondary }}>
                    Invoice
                  </p>
                  <p className="mt-3 text-sm leading-7" style={{ color: PAGE.textSecondary }}>
                    {resolvedStatus === "paid"
                      ? "Invoice details will appear here once the payment confirmation finishes syncing."
                      : "Invoice will appear after payment confirmation."}
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleOpenDashboard}
            className="inline-flex min-h-[48px] items-center justify-center rounded-2xl px-5 py-3 text-sm font-semibold text-white"
            style={{ background: `linear-gradient(135deg, ${PAGE.accent} 0%, ${PAGE.accentLight} 100%)` }}
          >
            Return to dashboard
          </button>
          <button
            type="button"
            onClick={handleOpenOrders}
            className="inline-flex min-h-[48px] items-center justify-center rounded-2xl border px-5 py-3 text-sm font-semibold"
            style={{ borderColor: PAGE.border, background: PAGE.cardBg, color: PAGE.textPrimary }}
          >
            Open orders
          </button>
          {query.orderId ? (
            <button
              type="button"
              onClick={handleOpenOrderDetails}
              className="inline-flex min-h-[48px] items-center justify-center rounded-2xl border px-5 py-3 text-sm font-semibold"
              style={{ borderColor: PAGE.border, background: PAGE.cardBg, color: PAGE.textPrimary }}
            >
              Open order details
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
