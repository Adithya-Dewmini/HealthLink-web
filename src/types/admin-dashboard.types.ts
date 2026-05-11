export type AdminDashboardStats = {
  total_users: number;
  active_medical_centers: number;
  active_pharmacies: number;
  active_doctors: number;
  live_queues: number;
  active_sessions: number;
  today_bookings: number;
  today_prescriptions: number;
};

export type AdminDashboardRecentAction = {
  id: string;
  timestamp: string;
  actor: {
    id: number | null;
    name: string | null;
  };
  action: string;
  action_label: string;
  entity_type: string | null;
  entity_id: string | null;
  context: string | null;
};

export type AdminDashboardOverview = {
  stats: AdminDashboardStats;
  recent_admin_actions: AdminDashboardRecentAction[];
};

export type AdminDashboardAlerts = {
  pending_verifications: {
    clinics: number;
    doctors: number;
    pharmacies: number;
  };
  inactive_centers_with_users: {
    count: number;
    items: Array<{
      id: string;
      name: string;
      linked_users_count: number;
    }>;
  };
  doctors_pending_requests: {
    count: number;
    items: Array<{
      id: string;
      doctor_name: string;
      clinic_name: string;
      created_at: string;
    }>;
  };
  pharmacy_alerts: {
    low_stock_count: number;
    expiring_count: number;
    items: Array<{
      pharmacy_id: string | null;
      pharmacy_name: string;
      medicine_name: string;
      quantity: number;
      expiry_date: string | null;
      alert_type: "low_stock" | "expiring";
    }>;
  };
};

export type AdminDashboardActivitySummary = {
  queues_live_now: number;
  sessions_live_now: number;
  prescriptions_today: number;
  dispensations_today: number;
};

export type AdminDashboardIntelligence = {
  fulfillment_rate: number;
  cancellation_rate: number;
  total_prescription_orders: number;
  platform_growth_30d: {
    users: number;
    orders: number;
    prescriptions: number;
  };
  busiest_pharmacies: Array<{
    pharmacy_id: number;
    pharmacy_name: string;
    order_count: number;
    revenue: number;
  }>;
  queue_traffic: Array<{
    date: string;
    count: number;
  }>;
  medicine_demand: Array<{
    medicine_id: number;
    name: string;
    demand_count: number;
  }>;
};
