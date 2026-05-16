export type MedicalCenterStatus =
  | "ACTIVE"
  | "INACTIVE"
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "LIVE"
  | "PAUSED"
  | "COMPLETED"
  | "WAITING"
  | "CHECKED_IN"
  | "UNKNOWN";

export type MedicalCenterSummary = {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  status: string | null;
};

export type MedicalCenterDashboard = {
  center: MedicalCenterSummary | null;
  stats: {
    doctors: number;
    receptionists: number;
    liveQueues: number;
    todayAppointments: number;
  };
};

export type MedicalCenterDoctor = {
  id: string;
  doctorId: number | null;
  doctorProfileId: number | null;
  inviteId: string | null;
  name: string | null;
  email: string;
  profileImage: string | null;
  specialization: string | null;
  clinicSpecialtyId: string | null;
  clinicSpecialty: string | null;
  status: "PENDING" | "ACTIVE" | "INACTIVE" | "REJECTED" | string;
  joinedAt: string;
  isPinned: boolean;
  isHidden: boolean;
};

export type MedicalCenterDoctorJoinRequest = {
  id: string;
  doctorId: number;
  medicalCenterId: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | string;
  createdAt: string;
  doctorName: string;
  doctorEmail: string;
  specialization: string | null;
};

export type MedicalCenterDoctorInviteResponse = {
  message: string;
  invite: {
    id: string;
    email: string;
    status: string;
    expiresAt: string;
    relationshipStatus?: string | null;
  };
  emailSent: boolean;
  emailError: string | null;
};

export type ReceptionistPermissions = {
  queue_access: boolean;
  appointments: boolean;
  check_in: boolean;
  schedule_management: boolean;
};

export type MedicalCenterReceptionist = {
  id: string;
  userId: number;
  name: string;
  email: string;
  phone: string;
  status: "PENDING" | "ACTIVE" | "DISABLED";
  isPasswordSet: boolean;
  createdAt: string;
  permissions: ReceptionistPermissions;
};

export type MedicalCenterReceptionistPermissionsPayload = {
  receptionist: {
    id: string;
    userId: number;
    name: string;
    email: string;
    status: string;
    isPasswordSet: boolean;
  };
  permissions: ReceptionistPermissions;
};

export type MedicalCenterScheduleSlot = {
  time: string;
  available: boolean;
  remainingCapacity: number | null;
};

export type MedicalCenterSchedule = {
  id: number;
  medicalCenterId: string;
  doctorId: number;
  doctorProfileId: number;
  date: string;
  startTime: string;
  endTime: string;
  roomNumber: string | null;
  slotDuration: number;
  maxPatients: number;
  isActive: boolean;
  source: "manual" | "routine";
  routineId: number | null;
  invalidReason: string | null;
  invalidatedAt: string | null;
  createdAt: string;
  updatedAt: string;
  clinicName: string | null;
  clinicType: string | null;
  doctorName: string | null;
  doctorEmail: string | null;
  specialization: string | null;
  slots: MedicalCenterScheduleSlot[];
};

export type MedicalCenterSchedulePreview = {
  ok: boolean;
  availability: {
    id: number;
    dayOfWeek: number;
    startTime: string;
    endTime: string;
  } | null;
  slots: MedicalCenterScheduleSlot[];
  warning: string | null;
};

export type MedicalCenterQueue = {
  id: number;
  medicalCenterId: string;
  doctorId: number | null;
  scheduleId: number | null;
  status: string;
  currentTokenNumber: number | null;
  currentPatientId: number | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export type MedicalCenterAppointment = {
  id: number;
  patientId: number | null;
  doctorId: number | null;
  medicalCenterId: string;
  sessionId: number | null;
  queueId: number | null;
  date: string;
  time: string | null;
  status: string | null;
  patientName: string;
  doctorName: string;
  createdAt: string | null;
};

export type MedicalCenterActionResponse<T = unknown> = {
  message: string;
} & T;
