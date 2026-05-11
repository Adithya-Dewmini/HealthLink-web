export type QueueStatus = "not_started" | "live" | "paused" | "completed";

export type VisitStatus =
  | "scheduled"
  | "checked_in"
  | "waiting"
  | "in_consultation"
  | "completed"
  | "missed"
  | "cancelled"
  | "late";

export type ReceptionCapabilityKey =
  | "queue_access"
  | "appointments"
  | "check_in"
  | "schedule_management";

export type ReceptionPermissions = Record<ReceptionCapabilityKey, boolean>;

export type ReceptionCapability = {
  key: ReceptionCapabilityKey;
  label: string;
  description: string;
  enabled: boolean;
};

export type ReceptionDashboardMetric = {
  key:
    | "todays_sessions"
    | "active_queues"
    | "waiting_patients"
    | "checked_in_patients"
    | "completed_visits"
    | "missed_visits"
    | "late_arrivals"
    | "walk_ins";
  label: string;
  value: number | null;
  detail: string;
};

export type ReceptionSession = {
  id: number;
  doctorId: number;
  doctorName: string;
  specialty: string;
  medicalCenterId: string;
  medicalCenterName: string;
  date: string;
  startTime: string;
  endTime: string;
  appointmentCount: number;
  queueId: number | null;
  queueStatus: QueueStatus;
  waitingCount: number;
  checkedInCount: number;
  completedCount: number;
  missedCount: number;
  coverageStatus: "covered" | "needs_attention" | "not_started";
  canOpenQueue: boolean;
  canStartQueue: boolean;
};

export type ReceptionDashboardSummary = {
  clinic: { id: string; name: string };
  metrics: ReceptionDashboardMetric[];
  todaySessions: ReceptionSession[];
  queueAttention: ReceptionQueue[];
  recentCheckIns: ReceptionVisit[];
  capabilities: ReceptionCapability[];
};

export type ReceptionQueue = {
  queueId: number | null;
  sessionId: number;
  doctorId: number;
  doctorName: string;
  doctorProfileImage?: string | null;
  specialty: string;
  medicalCenterId: string;
  medicalCenterName?: string;
  sessionDate: string;
  startTime: string;
  endTime: string;
  queueStatus: QueueStatus;
  currentToken: number | null;
  currentPatient: { tokenNumber: number; patientName: string } | null;
  nextToken: number | null;
  nextPatient: { tokenNumber: number; patientName: string } | null;
  waitingCount: number;
  checkedInCount: number;
  withDoctorCount: number;
  completedCount: number;
  missedCount: number;
  lateCount: number;
  avgWaitMinutes: number;
};

export type ReceptionQueuePatient = {
  id: number;
  patientId: number;
  tokenNumber: number;
  status: "CHECKED_IN" | "WAITING" | "LATE" | "WITH_DOCTOR" | "COMPLETED" | "MISSED";
  patientName: string;
  profileImage?: string | null;
  phone: string | null;
  bookingTime: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  missedAt?: string | null;
};

export type ReceptionQueueDetail = {
  clinic: { id: string; name: string };
  queue: ReceptionQueue;
  currentPatient: ReceptionQueuePatient | null;
  nextPatient: ReceptionQueuePatient | null;
  checkedInPatients: ReceptionQueuePatient[];
  waitingPatients: ReceptionQueuePatient[];
  latePatients: ReceptionQueuePatient[];
  withDoctorPatients: ReceptionQueuePatient[];
  missedPatients: ReceptionQueuePatient[];
  completedPatients: ReceptionQueuePatient[];
};

export type ReceptionVisit = {
  appointmentId: number;
  bookingId: number;
  bookingNumber: string;
  patientId: number;
  patientName: string;
  patientPhone: string | null;
  patientNic?: string | null;
  doctorId: number;
  doctorName: string;
  specialty: string;
  clinicId: string;
  clinicName: string;
  sessionId: number | null;
  sessionDate: string;
  startTime: string | null;
  endTime: string | null;
  appointmentTime: string;
  tokenNumber: number | null;
  visitStatus: VisitStatus;
  bookingSource: string;
  createdAt: string;
  queueId: number | null;
  queueStatus: QueueStatus | null;
};

export type ReceptionVisitFilters = {
  filter?: string;
  date?: string;
  search?: string;
  doctorId?: number | null;
  sessionId?: number | null;
  page?: number;
  limit?: number;
};

export type ReceptionVisitsResult = {
  visits: ReceptionVisit[];
  summary: {
    todaysVisits: number;
    checkedIn: number;
    waiting: number;
    completed: number;
  };
  doctors: Array<{
    doctorId: number;
    doctorName: string;
    specialty: string | null;
  }>;
  sessions: Array<{
    id: number;
    doctorId: number;
    doctorName: string;
    specialty: string;
    date: string;
    startTime: string;
    endTime: string;
    slotDuration: number;
    maxPatients: number;
  }>;
  pagination: {
    page: number;
    limit: number;
    count: number;
  };
};

export type ReceptionPatient = {
  id: number;
  fullName: string;
  name: string;
  phone: string | null;
  nic: string | null;
  dob: string | null;
  gender: string | null;
  address: string | null;
  emergencyContact: string | null;
  lastVisit: string | null;
  last_visit: string | null;
  isRecent: boolean;
  is_recent: boolean;
};

export type PatientRegistrationPayload = {
  fullName: string;
  phone?: string;
  nic?: string;
  dob?: string;
  gender?: string;
  address?: string;
  emergencyContact?: string;
  sessionId?: number | null;
  addToQueue?: boolean;
};

export type WalkInPayload = {
  name: string;
  phone?: string;
  priority?: "normal" | "urgent" | "emergency";
  queueId?: number | null;
  sessionId?: number | null;
};

export type ReceptionActionResponse<T = unknown> = {
  success?: boolean;
  message: string;
  data?: T;
};

export type ReceptionSessionDoctor = {
  relationshipId: string;
  doctorId: number;
  doctorUserId: number;
  doctorName: string;
  doctorProfileImage?: string | null;
  email: string;
  specialization: string | null;
  clinicSpecialty: string | null;
  medicalCenterId: string;
  availabilitySummary: string[];
  todaySessionCount: number;
  upcomingSessionCount: number;
  status: string;
};

export type ReceptionAvailabilityWindow = {
  id: number | string;
  day?: string | null;
  day_of_week?: number | null;
  start_time: string;
  end_time: string;
  max_patients?: number | null;
  is_active?: boolean;
};

export type ReceptionAvailabilityStateKey =
  | "sunday"
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday";

export type ReceptionAvailabilityState = {
  availability?: Partial<
    Record<ReceptionAvailabilityStateKey, Array<{ id: string; start: string; end: string }>>
  >;
};

export type ReceptionRoutineShift = {
  id: string;
  clinicId: string;
  clinicName: string;
  startTime: string;
  endTime: string;
  slotDuration: number;
  maxPatients: number;
};

export type ReceptionRoutineDay = {
  day: string;
  dayKey: number;
  routines: ReceptionRoutineShift[];
};

export type ReceptionSessionScheduleSource = "routine" | "manual";

export type ReceptionSessionSchedule = {
  id: number;
  date: string;
  doctorId: number;
  startTime: string;
  endTime: string;
  slotDuration: number;
  maxPatients: number;
  isActive: boolean;
  clinicName: string | null;
  source: ReceptionSessionScheduleSource;
  bookedCount: number;
  availableSlots: number;
  doctorName?: string | null;
};

export type RawReceptionDashboardPayload = {
  clinic: { id: string; name: string };
  activeSession: {
    id: number;
    doctorName: string;
    startTime: string;
    endTime: string;
    status: string;
  } | null;
  queue: {
    waitingCount: number;
    currentPatient?: { patient_name?: string | null } | null;
    averageWaitMinutes: number;
  } | null;
  nextPatient: {
    token_number: number;
    patient_name: string;
  } | null;
  stats: {
    totalPatients: number;
    todayAppointments: number;
    missedToday: number;
    inQueue: number;
  };
};

export type RawReceptionQueueCard = {
  queueId: number | null;
  sessionId: number;
  doctorId: number;
  doctorName: string;
  doctorProfileImage?: string | null;
  specialty: string;
  medicalCenterId: string;
  sessionDate: string;
  startTime: string;
  endTime: string;
  queueStatus: string;
  currentToken: number | null;
  currentPatient: { tokenNumber: number; patientName: string } | null;
  nextToken: number | null;
  nextPatient: { tokenNumber: number; patientName: string } | null;
  waitingCount: number;
  withDoctorCount: number;
  completedCount: number;
  missedCount: number;
  avgWaitMinutes: number;
};

export type RawReceptionQueuePayload = {
  clinic: { id: string; name: string };
  date: string;
  summary: {
    activeQueues: number;
    waitingPatients: number;
    withDoctor: number;
    completedToday: number;
  };
  liveQueues: RawReceptionQueueCard[];
  upcomingQueues: RawReceptionQueueCard[];
  completedQueues: RawReceptionQueueCard[];
  endedQueues: RawReceptionQueueCard[];
  allQueues: RawReceptionQueueCard[];
};

export type RawReceptionQueueDetailPayload = {
  clinic: { id: string; name: string };
  queue: RawReceptionQueueCard;
  currentPatient: ReceptionQueuePatient | null;
  nextPatient: ReceptionQueuePatient | null;
  waitingPatients: ReceptionQueuePatient[];
  withDoctorPatients: ReceptionQueuePatient[];
  missedPatients: ReceptionQueuePatient[];
  completedPatients: ReceptionQueuePatient[];
};
