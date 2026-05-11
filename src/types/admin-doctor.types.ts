export type DoctorVerificationStatus = "pending" | "approved" | "rejected";

export type AdminDoctorListItem = {
  id: string;
  name: string;
  email: string;
  specialization: string | null;
  verification_status: DoctorVerificationStatus;
  is_active: boolean;
  is_visible: boolean;
  created_at: string;
  active_clinic_count: number;
  pending_requests_count: number;
};

export type AdminDoctorAssociation = {
  relationship_id: string;
  clinic_id: string;
  clinic_name: string;
  clinic_location: string;
  relationship_status: string;
  role_in_clinic: string | null;
  joined_at: string;
  updated_at: string;
};

export type AdminDoctorJoinRequest = {
  id: string;
  clinic_id: string;
  clinic_name: string;
  status: string;
  created_at: string;
  updated_at: string;
};

export type AdminDoctorInvite = {
  id: string;
  clinic_id: string;
  clinic_name: string;
  email: string;
  status: string;
  expires_at: string;
  created_at: string;
};

export type AdminDoctorSchedule = {
  id: number;
  clinic_id: string;
  clinic_name: string;
  clinic_type: string | null;
  date: string;
  start_time: string;
  end_time: string;
  slot_duration: number;
  max_patients: number;
  is_active: boolean;
  invalid_reason: string | null;
  invalidated_at: string | null;
  status: "active" | "inactive";
  time_slots: Array<{
    time: string;
    available: boolean;
    remaining_capacity: number | null;
  }>;
};

export type AdminDoctorDetails = {
  profile: {
    id: string;
    user_id: number;
    name: string;
    email: string;
    specialization: string | null;
    experience_years: number | null;
    verification_status: DoctorVerificationStatus;
    verified_at: string | null;
    verification_notes: string | null;
    is_active: boolean;
    is_visible: boolean;
    created_at: string;
  };
  activity_summary: {
    total_consultations: number;
    prescriptions_issued: number;
    active_schedules: number;
    availability_summary: Array<{
      day: string;
      start_time: string;
      end_time: string;
      is_active: boolean;
    }>;
    recent_activity: Array<{
      type: "consultation" | "prescription" | "schedule" | "association" | "request" | "invite";
      title: string;
      context: string | null;
      occurred_at: string;
      status: string | null;
    }>;
  };
  relationships: {
    clinic_associations: AdminDoctorAssociation[];
    join_requests: AdminDoctorJoinRequest[];
    invite_history: AdminDoctorInvite[];
  };
};
