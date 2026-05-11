export type MedicalCenterVerificationStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "suspended";

export type AdminMedicalCenterSpecialty = {
  id: number | string;
  name: string;
};

export type AdminMedicalCenterProfile = {
  id: number | string;
  name: string;
  email?: string | null;
  phone?: string | null;
  location?: string | null;
  address?: string | null;
  city?: string | null;
  district?: string | null;
  is_active: boolean;
  verification_status: MedicalCenterVerificationStatus;
  verification_notes?: string | null;
  verified_at?: string | null;
  created_at: string;
  specialties: AdminMedicalCenterSpecialty[];
};

export type AdminMedicalCenterListItem = {
  id: number | string;
  name: string;
  location: string;
  email?: string | null;
  phone?: string | null;
  is_active: boolean;
  verification_status: MedicalCenterVerificationStatus;
  active_doctors_count: number;
  receptionists_count: number;
  live_queues_count: number;
  today_bookings_count: number;
  created_at: string;
};

export type AdminMedicalCenterAdmin = {
  id: number | string;
  name: string;
  email: string;
  phone?: string | null;
  role?: string | null;
  created_at?: string | null;
};

export type AdminMedicalCenterDoctor = {
  id: number | string;
  name: string;
  email?: string | null;
  phone?: string | null;
  specialization?: string | null;
  status?: string | null;
  doctor_specialty?: string | null;
  clinic_specialty?: string | null;
};

export type AdminMedicalCenterDoctorAssignment = AdminMedicalCenterDoctor;

export type AdminMedicalCenterJoinRequest = {
  id: number | string;
  name?: string | null;
  email?: string | null;
  doctor_name?: string | null;
  specialization?: string | null;
  status?: string | null;
  requested_at?: string | null;
  created_at?: string | null;
};

export type AdminMedicalCenterSchedule = {
  id: number | string;
  doctor_name?: string | null;
  date?: string | null;
  day_of_week?: string | number | null;
  start_time?: string | null;
  end_time?: string | null;
  status?: string | null;
  is_active?: boolean;
  specialization?: string | null;
  slot_duration?: number | null;
  max_patients?: number | null;
  invalid_reason?: string | null;
};

export type AdminMedicalCenterReceptionist = {
  id: number | string;
  name: string;
  email?: string | null;
  phone?: string | null;
  status?: string | null;
  permissions?: {
    can_manage_queue?: boolean;
    can_manage_appointments?: boolean;
    can_check_in?: boolean;
  };
};

export type AdminMedicalCenterQueue = {
  id: number | string;
  doctor_name?: string | null;
  doctor_id?: number | string | null;
  current_token?: number | string | null;
  waiting_count?: number;
  status?: string | null;
  started_at?: string | null;
  schedule_id?: number | string | null;
  shift_date?: string | null;
  created_at?: string | null;
};

export type AdminMedicalCenterAppointments = {
  stats: {
    total: number;
    upcoming: number;
    completed: number;
    missed: number;
  };
  appointments: Array<{
    id: number | string;
    patientName?: string | null;
    patient_name?: string | null;
    doctorName?: string | null;
    doctor_name?: string | null;
    appointment_date?: string | null;
    appointment_time?: string | null;
    time?: string | null;
    status?: string | null;
  }>;
};

export type AdminMedicalCenterPrescription = {
  id: number | string;
  patient_name?: string | null;
  doctor_name?: string | null;
  status?: string | null;
  issued_at?: string | null;
};

export type AdminMedicalCenterActivity = {
  prescriptions_generated_count: number;
  bookings_count_today: number;
  active_queues_count: number;
  recent_prescriptions: AdminMedicalCenterPrescription[];
};

export type AdminMedicalCenterDetails = {
  id: number | string;
  profile: AdminMedicalCenterProfile;
  linked_data: {
    center_admins: AdminMedicalCenterAdmin[];
    assigned_doctors: AdminMedicalCenterDoctor[];
    doctor_join_requests: AdminMedicalCenterJoinRequest[];
    schedules: AdminMedicalCenterSchedule[];
    receptionists: AdminMedicalCenterReceptionist[];
    queues: AdminMedicalCenterQueue[];
    appointments: AdminMedicalCenterAppointments;
  };
  activity: AdminMedicalCenterActivity;
};

export type AdminMedicalCentersResponse = {
  items: AdminMedicalCenterListItem[];
  data?: AdminMedicalCenterListItem[];
  pagination: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
  total?: number;
  page?: number;
  pageSize?: number;
  totalPages?: number;
};
