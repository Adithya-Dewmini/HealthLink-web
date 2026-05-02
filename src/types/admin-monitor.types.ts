export type AdminMonitorQueueStatus = "active" | "paused" | "ended";
export type AdminMonitorSessionStatus = "upcoming" | "active" | "completed";
export type AdminMonitorPrescriptionStatus = "pending" | "dispensed";

export type AdminMonitorQueueItem = {
  clinic_name: string;
  doctor_name: string;
  session_id: number | null;
  waiting_count: number;
  current_token: number | null;
  queue_status: AdminMonitorQueueStatus;
  started_at: string | null;
};

export type AdminMonitorSessionItem = {
  session_id: number;
  doctor_name: string;
  clinic_name: string;
  date: string;
  start_time: string;
  end_time: string;
  status: AdminMonitorSessionStatus;
  booked_patients_count: number;
  queue_active: boolean;
};

export type AdminMonitorQueuesResponse = {
  items: AdminMonitorQueueItem[];
  generated_at: string;
};

export type AdminMonitorSessionsResponse = {
  items: AdminMonitorSessionItem[];
  generated_at: string;
};

export type AdminMonitorBookingsResponse = {
  today_total_bookings: number;
  completed: number;
  missed: number;
  cancelled: number;
  consultations_in_progress: number;
  peak_hours_data: Array<{
    hour: string;
    bookings_count: number;
  }>;
};

export type AdminMonitorPrescriptionItem = {
  id: string;
  issued_at: string | null;
  dispensed_at: string | null;
  status: AdminMonitorPrescriptionStatus;
  doctor_name: string | null;
  clinic_name: string | null;
  linked_pharmacy: string | null;
};

export type AdminMonitorPrescriptionsResponse = {
  total_prescriptions_today: number;
  dispensed_count: number;
  pending_count: number;
  recent_prescriptions: AdminMonitorPrescriptionItem[];
};
