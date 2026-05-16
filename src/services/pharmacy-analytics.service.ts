import { api, getApiErrorMessage } from "./api";

export type PharmacyAnalyticsDashboard = {
  overview: {
    totalOrders: number;
    completedOrders: number;
    pendingOrders: number;
    cancelledOrders: number;
    totalRevenue: number;
    fulfillmentSuccessRate: number;
    cancellationRate: number;
    prescriptionVolume: number;
  };
  topMedicines: Array<{
    medicineId: number;
    name: string;
    imageUrl?: string | null;
    quantitySold: number;
    revenue: number;
  }>;
  lowStockMedicines: Array<{
    medicineId: number;
    name: string;
    imageUrl?: string | null;
    quantity: number;
    reservedQuantity: number;
    availableStock: number;
  }>;
  orderTrends: Array<{
    date: string;
    orderCount: number;
    revenue: number;
  }>;
  forecastHighlights: Array<{
    medicineId: number;
    name: string;
    predictedDemand: number;
    recommendedReorderQuantity: number;
    shortageRisk: "low" | "medium" | "high";
  }>;
};

export type PharmacyForecastDetail = {
  medicineId: number;
  forecast: {
    predictedDemand: number;
    recommendedReorderQuantity: number;
    shortageRisk: "low" | "medium" | "high";
    next30Days?: Array<{
      date: string;
      predictedDemand: number;
    }>;
  } | null;
  source: "service" | "fallback" | "unavailable";
};

export async function fetchPharmacyAnalyticsDashboard() {
  try {
    const response = await api.get<PharmacyAnalyticsDashboard>("/api/pharmacy/analytics/dashboard");
    return response.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Unable to load pharmacy dashboard."));
  }
}

export async function fetchPharmacyForecast(medicineId: number) {
  try {
    const response = await api.get<PharmacyForecastDetail>(`/api/pharmacy/analytics/forecast/${medicineId}`);
    return response.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Unable to load medicine forecast."));
  }
}
