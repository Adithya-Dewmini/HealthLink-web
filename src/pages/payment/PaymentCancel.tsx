import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { getDefaultRouteForUser } from "../../services/auth.service";
import { parsePaymentRedirectQuery } from "../../services/payment-status.service";
import { openMobileDeepLink } from "../../utils/mobileDeepLinks";

export default function PaymentCancelPage() {
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const query = useMemo(() => parsePaymentRedirectQuery(searchParams), [searchParams]);
  const dashboardHref = user ? getDefaultRouteForUser(user) : "/login";
  const ordersHref = user?.role === "pharmacist" ? "/pharmacy/orders" : dashboardHref;
  const retryPath = query.orderId ? `payment/status/${query.orderId}` : "patient/orders";
  const retryFallbackHref = query.orderId ? ordersHref : ordersHref;

  const handleBackToCheckout = useCallback(() => {
    openMobileDeepLink(retryPath, retryFallbackHref);
  }, [retryFallbackHref, retryPath]);

  const handleOpenDashboard = useCallback(() => {
    openMobileDeepLink("patient/dashboard", dashboardHref);
  }, [dashboardHref]);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#FFF4E8_0%,_#FFF9F4_40%,_#FFFFFF_100%)] px-4 py-12">
      <div className="mx-auto max-w-2xl rounded-[32px] border border-[#F1D7BF] bg-white p-8 shadow-[0_35px_90px_-55px_rgba(91,52,20,0.45)]">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#F28B45]">Payment cancelled</p>
        <h1 className="mt-3 text-3xl font-semibold text-[#053F56]">Payment was not completed</h1>
        <p className="mt-3 text-sm leading-7 text-slate-600">
          The checkout session was cancelled before confirmation. You can return to your orders and start a new payment attempt when you are ready.
        </p>

        <div className="mt-8 rounded-3xl border border-amber-200 bg-amber-50 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">Reference</p>
          <p className="mt-2 text-lg font-semibold text-[#053F56]">
            Order {query.orderId ?? "Unavailable"}
          </p>
          <p className="mt-1 text-sm text-slate-600">
            Gateway order: {query.gatewayOrderId ?? "Unavailable"}
          </p>
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleBackToCheckout}
            className="inline-flex rounded-2xl bg-[linear-gradient(135deg,#0F5AA3_0%,#21A5EC_100%)] px-5 py-3 text-sm font-semibold !text-white no-underline shadow-[0_12px_30px_-18px_rgba(33,165,236,0.8)]"
          >
            Back to checkout
          </button>
          <button
            type="button"
            onClick={handleOpenDashboard}
            className="inline-flex rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 no-underline"
          >
            Return to dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
