import { api, getApiErrorMessage } from "./api";

export type PaymentRedirectStatus =
  | "paid"
  | "pending"
  | "cancelled"
  | "failed"
  | "refunded";

export type PaymentRedirectQuery = {
  orderId: number | null;
  paymentId: number | null;
  gatewayOrderId: string | null;
  statusCode: string | null;
  paymentStatus: PaymentRedirectStatus | null;
};

export type PaymentStatusSummary = {
  orderId: number;
  orderStatus: string;
  paymentMethod: string | null;
  paymentStatus: PaymentRedirectStatus | null;
  paidAt: string | null;
  amount: number;
  currency: string;
  gatewayPaymentId: string | null;
  invoiceId: number | null;
  invoiceNo: string | null;
  updatedAt: string | null;
  message: string;
  payment: {
    id: number;
    gateway: string;
    gatewayPaymentId: string | null;
    gatewayOrderId: string | null;
    status: PaymentRedirectStatus;
    method: string | null;
    cardNoMasked: string | null;
    statusMessage: string | null;
    verifiedAt: string | null;
    createdAt: string;
    updatedAt: string;
  } | null;
  invoice: {
    id: number;
    invoiceNo: string;
    subtotal: number;
    deliveryFee: number;
    serviceFee: number;
    discount: number;
    total: number;
    currency: string;
    pdfUrl: string | null;
    issuedAt: string;
    createdAt: string;
    updatedAt: string;
  } | null;
};

const parsePositiveInteger = (value: string | null) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

const mapGatewayStatusCode = (statusCode: string | null): PaymentRedirectStatus | null => {
  if (statusCode === "2") return "paid";
  if (statusCode === "0") return "pending";
  if (statusCode === "-1") return "cancelled";
  if (statusCode === "-3") return "refunded";
  if (typeof statusCode === "string" && statusCode.trim()) return "failed";
  return null;
};

const extractOrderIdFromGatewayOrderId = (gatewayOrderId: string | null) => {
  if (!gatewayOrderId) return null;
  const match = gatewayOrderId.match(/^HLPAY-(\d+)-/i);
  return match ? Number(match[1]) : null;
};

export const parsePaymentRedirectQuery = (searchParams: URLSearchParams): PaymentRedirectQuery => {
  const gatewayOrderId = searchParams.get("order_id")?.trim() || null;
  const directOrderId =
    parsePositiveInteger(searchParams.get("custom_1")) ??
    parsePositiveInteger(searchParams.get("orderId")) ??
    parsePositiveInteger(searchParams.get("order_id"));

  return {
    orderId: directOrderId ?? extractOrderIdFromGatewayOrderId(gatewayOrderId),
    paymentId:
      parsePositiveInteger(searchParams.get("custom_2")) ??
      parsePositiveInteger(searchParams.get("payment_id")) ??
      parsePositiveInteger(searchParams.get("paymentId")),
    gatewayOrderId,
    statusCode: searchParams.get("status_code")?.trim() || null,
    paymentStatus: mapGatewayStatusCode(searchParams.get("status_code")?.trim() || null),
  };
};

export async function fetchPaymentStatus(orderId: number) {
  try {
    const response = await api.get<PaymentStatusSummary>(`/api/payments/pharmacy-orders/${orderId}/status`);
    return response.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Unable to load payment status."));
  }
}
