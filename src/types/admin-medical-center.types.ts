export type MedicalCenterVerificationStatus = "pending" | "approved" | "rejected";

export type AdminMedicalCenterListItem = {
  id: string;
  name: string;
  location: string;
  verification_status: MedicalCenterVerificationStatus;
  is_active: boolean;
  created_at: string;
  active_doctors_count: number;
  receptionists_count: number;
  live_queues_count: number;
  today_bookings_count: number;
};

export type AdminMedicalCenterSpecialty = {
  id: string;
  name: string;
  clinic_id: string;
  created_at: string;
};

export type AdminMedicalCenterAdmin = {
  id: number;
  name: string;
  email: string;
  created_at: string;
};

export type AdminMedicalCenterDoctorAssignment = {
  id: string;
  doctor_id: number | null;
  doctor_profile_id: number | null;
  invite_id: string | null;
  name: string | null;
  email: string;
  profile_image: string | null;
  doctor_specialty: string | null;
  clinic_specialty_id: string | null;
  clinic_specialty: string | null;
  status: string;
  is_pinned: boolean;
  is_hidden: boolean;
  joined_at: string;
};

export type AdminMedicalCenterDoctor = {
  relationship_id: string;
  doctor_user_id: number;
  doctor_profile_id: number | null;
  name: string;
  email: string;
  specialization: string | null;
  clinic_specialty: string | null;
  relationship_status: string;
  verification_status: MedicalCenterVerificationStatus;
  joined_at: string;
};

export type AdminMedicalCenterJoinRequest = {
  id: string;
  doctor_id: number;
  name: string;
  email: string;
  specialization: string | null;
  status: string;
  created_at: string;
};

export type AdminMedicalCenterReceptionist = {
  id: number;
  user_id: number;
  name: string;
  email: string;
  phone: string | null;
  is_password_set: boolean;
  status: string;
  created_at: string;
  permissions: {
    can_manage_queue: boolean;
    can_manage_appointments: boolean;
    can_check_in: boolean;
  };
};

export type AdminMedicalCenterSchedule = {
  id: number;
  doctor_id: number;
  doctor_name: string;
  doctor_email: string;
  specialization: string | null;
  date: string;
  start_time: string;
  end_time: string;
  slot_duration: number;
  max_patients: number;
  is_active: boolean;
  invalid_reason: string | null;
  invalidated_at: string | null;
  status: string;
  clinic_name?: string | null;
  clinic_type?: string | null;
};

export type AdminMedicalCenterQueue = {
  id: number;
  doctor_id: number;
  status: string;
  started_at: string | null;
  created_at: string;
  shift_id: number | null;
  shift_date: string | null;
  medical_center_id: string;
  schedule_id: number | null;
};

export type AdminMedicalCenterAppointments = {
  stats: {
    total: number;
    completed: number;
    missed: number;
    upcoming: number;
  };
  appointments: Array<{
    id: number;
    doctorId: number;
    patientName: string;
    doctorName: string;
    time: string;
    status: string;
    date: string;
  }>;
};

export type AdminMedicalCenterPrescription = {
  id: string;
  issued_at: string | null;
  dispensed_at: string | null;
  patient_name: string;
  doctor_name: string;
};

export type AdminMedicalCenterActivity = {
  bookings_count_today: number;
  active_queues_count: number;
  prescriptions_generated_count: number;
  recent_prescriptions: AdminMedicalCenterPrescription[];
  booking_trend: Array<{ date: string; count: number }>;
  prescription_trend: Array<{ date: string; count: number }>;
};

export type AdminMedicalCenterDetails = {
  profile: {
    id: string;
    name: string;
    location: string;
    phone: string | null;
    email: string | null;
    created_at: string;
    verification_status: MedicalCenterVerificationStatus;
    verified_at: string | null;
    verification_notes: string | null;
    is_active: boolean;
    specialties: AdminMedicalCenterSpecialty[];
  };
  linked_data: {
    center_admins: AdminMedicalCenterAdmin[];
    assigned_doctors: AdminMedicalCenterDoctorAssignment[];
    doctor_join_requests: AdminMedicalCenterJoinRequest[];
    receptionists: AdminMedicalCenterReceptionist[];
    schedules: AdminMedicalCenterSchedule[];
    queues: AdminMedicalCenterQueue[];
    appointments: AdminMedicalCenterAppointments;
    prescriptions: AdminMedicalCenterPrescription[];
  };
  activity: AdminMedicalCenterActivity;
};
