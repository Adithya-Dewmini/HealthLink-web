export type AdminManagedUserRole =
  | "admin"
  | "medical_center_admin"
  | "doctor"
  | "receptionist"
  | "pharmacist"
  | "patient";

export type VerificationLinkedState = "approved" | "pending" | "rejected" | "not_applicable";

export type AdminUserListItem = {
  id: string;
  name: string;
  email: string;
  role: AdminManagedUserRole;
  is_active: boolean;
  created_at: string;
  verification_linked_state: VerificationLinkedState;
  affiliation: {
    center_name: string | null;
    pharmacy_name: string | null;
    display: string;
  };
};

export type AdminUserListResponse = {
  items: AdminUserListItem[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

export type AdminUserDetails = {
  data_mode?: "full" | "fallback";
  identity: {
    id: string;
    name: string;
    email: string;
    role: AdminManagedUserRole;
    created_at: string;
    is_active: boolean;
    last_login_at: string | null;
  };
  linked_domain_records: {
    owned_medical_center: {
      id: string;
      name: string;
      verification_status: string | null;
      is_active: boolean | null;
    } | null;
    doctor_profile: {
      id: number;
      specialization: string | null;
      verification_status: string | null;
      medical_center_id: string | null;
    } | null;
    clinic_associations: Array<{
      relationship_id: string;
      medical_center_id: string;
      medical_center_name: string;
      status: string;
      joined_at: string;
    }>;
    pharmacy_associations: Array<{
      pharmacy_id: string;
      pharmacy_name: string;
      verification_status: string | null;
      is_active: boolean | null;
      linked_at: string;
    }>;
    receptionist_assignment: {
      id: number;
      medical_center_id: string | null;
      medical_center_name: string | null;
      phone: string | null;
    } | null;
    patient_profile: {
      id: number;
      phone: string | null;
      city: string | null;
      blood_group: string | null;
      gender: string | null;
    } | null;
  };
  activity_summary: {
    bookings_count: number;
    consultations_count: number;
    prescriptions_count: number;
    recent_activity: Array<{
      type: "booking" | "consultation" | "prescription" | "sale";
      title: string;
      occurred_at: string;
      context: string | null;
    }>;
  };
  audit_summary: {
    recent_actions: Array<{
      id: string;
      action: string;
      created_at: string;
    }>;
    activation_logs: Array<{
      id: string;
      action: string;
      created_at: string;
    }>;
  };
};

export type AdminCreateUserInput = {
  name: string;
  email: string;
};

export type AdminCreatedUserResponse = {
  id: string;
  name: string;
  email: string;
  role: "admin";
  is_active: boolean;
  setup_link: string | null;
  setup_token_expires_at: string;
};
