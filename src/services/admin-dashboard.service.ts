import { api, getApiErrorMessage } from "./api";
import type {
  AdminDashboardActivitySummary,
  AdminDashboardAlerts,
  AdminDashboardIntelligence,
  AdminDashboardOverview,
} from "../types/admin-dashboard.types";

export type {
  AdminDashboardActivitySummary,
  AdminDashboardAlerts,
  AdminDashboardIntelligence,
  AdminDashboardOverview,
  AdminDashboardRecentAction,
  AdminDashboardStats,
} from "../types/admin-dashboard.types";

export async function fetchAdminDashboardOverview() {
  try {
    const response = await api.get<AdminDashboardOverview>("/api/admin/dashboard");
    return response.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Unable to load dashboard overview."));
  }
}

export async function fetchAdminDashboardAlerts() {
  try {
    const response = await api.get<AdminDashboardAlerts>("/api/admin/alerts");
    return response.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Unable to load dashboard alerts."));
  }
}

export async function fetchAdminDashboardActivitySummary() {
  try {
    const response = await api.get<AdminDashboardActivitySummary>("/api/admin/activity-summary");
    return response.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Unable to load dashboard activity summary."));
  }
}

export async function fetchAdminDashboardIntelligence() {
  try {
    const response = await api.get<AdminDashboardIntelligence>("/api/admin/intelligence");
    return response.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Unable to load dashboard intelligence."));
  }
}
