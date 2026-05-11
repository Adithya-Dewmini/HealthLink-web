export type AdminMonitorQueueStatus =
  | "waiting"
  | "active"
  | "paused"
  | "completed"
  | "cancelled"
  | "missed";

export type AdminMonitorSessionStatus =
  | "scheduled"
  | "active"
  | "paused"
  | "completed"
  | "cancelled";

export type AdminMonitorPrescriptionStatus =
  | "draft"
  | "issued"
  | "dispensed"
  | "cancelled"
  | "expired"
  | "pending";

export type AdminMonitorQueueItem = {
  session_id?: number | string | null;
  clinic_name: string;
  doctor_name: string;
  waiting_count: number;
  current_token?: number | string | null;
  queue_status: AdminMonitorQueueStatus;
  started_at?: string | null;
};

export type AdminMonitorQueuesResponse = {
  items: AdminMonitorQueueItem[];
  generated_at?: string;
};

export type AdminMonitorSessionItem = {
  session_id: number | string;
  doctor_name: string;
  clinic_name: string;
  status: AdminMonitorSessionStatus;
  start_time?: string | null;
  end_time?: string | null;
  booked_patients_count: number;
  queue_active: boolean;
};

export type AdminMonitorSessionsResponse = {
  items: AdminMonitorSessionItem[];
  generated_at?: string;
};

export type AdminMonitorBookingItem = {
  id: number | string;
  patient_name?: string | null;
  doctor_name?: string | null;
  clinic_name?: string | null;
  appointment_time?: string | null;
  status?: string | null;
};

export type AdminMonitorBookingsResponse = {
  today_total_bookings: number;
  pending: number;
  confirmed: number;
  completed: number;
  missed: number;
  cancelled: number;
  consultations_in_progress: number;
  peak_hours_data: Array<{
    hour: string;
    bookings_count: number;
  }>;
  items?: AdminMonitorBookingItem[];
};

export type AdminMonitorPrescriptionItem = {
  id: number | string;
  patient_name?: string | null;
  doctor_name?: string | null;
  clinic_name?: string | null;
  linked_pharmacy?: string | null;
  status: AdminMonitorPrescriptionStatus;
  issued_at?: string | null;
  dispensed_at?: string | null;
};

export type AdminMonitorPrescriptionsResponse = {
  total_prescriptions_today: number;
  dispensed_count: number;
  pending_count: number;
  recent_prescriptions: AdminMonitorPrescriptionItem[];
};
