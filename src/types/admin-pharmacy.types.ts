export type PharmacyVerificationStatus = "pending" | "approved" | "rejected" | "suspended";

export type AdminPharmacyListItem = {
  id: string;
  name: string;
  location: string;
  verification_status: PharmacyVerificationStatus;
  is_active: boolean;
  last_active_at: string | null;
  inventory_size: number;
  dispensing_count: number;
  demand_log_count: number;
};

export type AdminPharmacyAssociation = {
  user_id: number;
  pharmacy_id: string;
  name: string;
  email: string;
  role: string | null;
  linked_at: string;
};

export type AdminPharmacyInventoryAlert = {
  medicine_id: number;
  medicine_name: string;
  quantity: number;
  unit_price: number | null;
  expiry_date: string | null;
  severity: "low_stock" | "expiring";
};

export type AdminPharmacyDispensedPrescription = {
  id: string;
  issued_at: string | null;
  dispensed_at: string | null;
  patient_name: string | null;
  doctor_name: string | null;
  medicine_count: number;
  sale_total: number | null;
};

export type AdminPharmacyVerificationDocument = {
  id: string;
  document_type: string;
  file_url: string;
  uploaded_at: string;
};

export type AdminPharmacyVerificationReview = {
  id: string;
  status: string;
  note: string | null;
  reviewed_at: string;
  reviewer_name: string | null;
  reviewer_email: string | null;
};

export type AdminPharmacyDetails = {
  profile: {
    id: string;
    name: string;
    location: string;
    verification_status: PharmacyVerificationStatus;
    verified_at: string | null;
    verification_notes: string | null;
    is_active: boolean;
    last_active_at: string | null;
    created_at: string;
  };
  associations: {
    pharmacists: AdminPharmacyAssociation[];
  };
  inventory_summary: {
    total_medicines: number;
    low_stock_items: number;
    expiring_items: number;
    alerts: AdminPharmacyInventoryAlert[];
  };
  activity: {
    recent_prescriptions_dispensed: AdminPharmacyDispensedPrescription[];
    total_sales_today: number;
    total_sales_week: number;
    dispensing_count_today: number;
    dispensing_count_week: number;
    demand_logs: Array<{
      medicine_id: number;
      medicine_name: string | null;
      quantity: number;
      source: string | null;
      created_at: string | null;
    }>;
  };
  verification: {
    documents: AdminPharmacyVerificationDocument[];
    review_history: AdminPharmacyVerificationReview[];
  };
};

export type AdminPharmacyActivity = {
  dispensing_stats: {
    today: number;
    week: number;
  };
  sales_summary: {
    today: number;
    week: number;
  };
  demand_trends: Array<{
    date: string;
    count: number;
    quantity: number;
  }>;
  prescription_usage: {
    total_dispensed_prescriptions: number;
    recent_prescriptions: AdminPharmacyDispensedPrescription[];
  };
};
