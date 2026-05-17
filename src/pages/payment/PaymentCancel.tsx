import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { getDefaultRouteForUser } from "../../services/auth.service";
import { parsePaymentRedirectQuery } from "../../services/payment-status.service";
import { openMobileDeepLink } from "../../utils/mobileDeepLinks";

const PAGE = {
  pageBg: "#F4FAFF",
  cardBg: "#FFFFFF",
  softBg: "#F9FCFF",
  textPrimary: "#0B4F6C",
  textSecondary: "#5E738A",
  accent: "#1EA7FD",
  accentLight: "#2EA8FF",
  border: "#DDEAF3",
  cancelBg: "#FFF1F2",
  cancelText: "#D92D20",
};

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

export default function PaymentCancelPage() {
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const query = useMemo(() => parsePaymentRedirectQuery(searchParams), [searchParams]);
  const dashboardHref = user ? getDefaultRouteForUser(user) : "/login";
  const ordersFallbackHref = user?.role === "pharmacist" ? "/pharmacy/orders" : dashboardHref;
  const retryPath = query.orderId ? `payment/status/${query.orderId}` : "patient/orders";

  const handleBackToCheckout = useCallback(() => {
    openMobileDeepLink(retryPath, ordersFallbackHref);
  }, [ordersFallbackHref, retryPath]);

  const handleOpenOrders = useCallback(() => {
    openMobileDeepLink("patient/orders", ordersFallbackHref);
  }, [ordersFallbackHref]);

  const handleOpenDashboard = useCallback(() => {
    openMobileDeepLink("patient/dashboard", dashboardHref);
  }, [dashboardHref]);

  return (
    <div className="min-h-screen px-4 py-10" style={{ background: PAGE.pageBg }}>
      <div
        className="mx-auto w-full max-w-2xl rounded-[30px] border p-5 shadow-[0_30px_80px_-55px_rgba(11,79,108,0.25)] sm:p-8"
        style={{ background: PAGE.cardBg, borderColor: PAGE.border }}
      >
        <div
          className="rounded-[24px] border p-5 sm:p-6"
          style={{ background: PAGE.cancelBg, borderColor: PAGE.border }}
        >
          <p className="text-xs font-semibold uppercase tracking-[0.22em]" style={{ color: PAGE.accent }}>
            Payment Cancelled
          </p>
          <span
            className="mt-4 inline-flex rounded-full bg-white px-3 py-1 text-xs font-bold uppercase tracking-[0.12em]"
            style={{ color: PAGE.cancelText }}
          >
            Cancelled
          </span>
          <h1 className="mt-4 text-[2rem] font-semibold leading-tight sm:text-[2.35rem]" style={{ color: PAGE.textPrimary }}>
            Payment cancelled
          </h1>
          <p className="mt-3 text-sm leading-7 sm:text-[15px]" style={{ color: PAGE.textSecondary }}>
            You cancelled the payment. Your order is still pending payment.
          </p>
        </div>

        <div className="mt-6 rounded-[24px] border p-5" style={{ background: PAGE.softBg, borderColor: PAGE.border }}>
          <p className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: PAGE.textSecondary }}>
            Order Details
          </p>
          <div className="mt-3">
            <DetailRow label="Order" value={query.orderId ? `#${query.orderId}` : "Unavailable"} />
            <DetailRow label="Gateway order" value={query.gatewayOrderId ?? "Unavailable"} />
            <DetailRow label="Payment state" value="Pending payment" />
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleBackToCheckout}
            className="inline-flex min-h-[48px] items-center justify-center rounded-2xl px-5 py-3 text-sm font-semibold text-white"
            style={{ background: `linear-gradient(135deg, ${PAGE.accent} 0%, ${PAGE.accentLight} 100%)` }}
          >
            Back to checkout
          </button>
          <button
            type="button"
            onClick={handleOpenOrders}
            className="inline-flex min-h-[48px] items-center justify-center rounded-2xl border px-5 py-3 text-sm font-semibold"
            style={{ borderColor: PAGE.border, background: PAGE.cardBg, color: PAGE.textPrimary }}
          >
            Open orders
          </button>
          <button
            type="button"
            onClick={handleOpenDashboard}
            className="inline-flex min-h-[48px] items-center justify-center rounded-2xl border px-5 py-3 text-sm font-semibold"
            style={{ borderColor: PAGE.border, background: PAGE.cardBg, color: PAGE.textPrimary }}
          >
            Return to dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
