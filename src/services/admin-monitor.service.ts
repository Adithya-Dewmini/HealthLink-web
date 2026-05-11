import { api, getApiErrorMessage } from "./api";
import type {
  AdminMonitorBookingsResponse,
  AdminMonitorPrescriptionsResponse,
  AdminMonitorQueuesResponse,
  AdminMonitorSessionsResponse,
} from "../types/admin-monitor.types";

export type {
  AdminMonitorQueueItem,
  AdminMonitorQueueStatus,
  AdminMonitorQueuesResponse,
  AdminMonitorSessionItem,
  AdminMonitorSessionsResponse,
  AdminMonitorSessionStatus,
  AdminMonitorBookingsResponse,
  AdminMonitorPrescriptionItem,
  AdminMonitorPrescriptionStatus,
  AdminMonitorPrescriptionsResponse,
} from "../types/admin-monitor.types";

export async function fetchAdminMonitorQueues() {
  try {
    const response = await api.get<AdminMonitorQueuesResponse>("/api/admin/monitor/queues");
    return response.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Unable to load live queues."));
  }
}

export async function fetchAdminMonitorSessions() {
  try {
    const response = await api.get<AdminMonitorSessionsResponse>("/api/admin/monitor/sessions");
    return response.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Unable to load active sessions."));
  }
}

export async function fetchAdminMonitorBookings() {
  try {
    const response = await api.get<AdminMonitorBookingsResponse>("/api/admin/monitor/bookings");
    return response.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Unable to load booking monitor."));
  }
}

export async function fetchAdminMonitorPrescriptions() {
  try {
    const response = await api.get<AdminMonitorPrescriptionsResponse>("/api/admin/monitor/prescriptions");
    return response.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Unable to load prescription monitor."));
  }
}
