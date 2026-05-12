import { api, getApiErrorMessage } from "./api";
import type {
  PatientRegistrationPayload,
  QueueStatus,
  RawReceptionDashboardPayload,
  RawReceptionQueueCard,
  RawReceptionQueueDetailPayload,
  RawReceptionQueuePayload,
  ReceptionActionResponse,
  ReceptionCapability,
  ReceptionDashboardSummary,
  ReceptionPatient,
  ReceptionPermissions,
  ReceptionQueue,
  ReceptionQueueDetail,
  ReceptionQueuePatient,
  ReceptionRoutineDay,
  ReceptionSessionSchedule,
  ReceptionSession,
  ReceptionSessionDoctor,
  ReceptionAvailabilityState,
  ReceptionAvailabilityWindow,
  ReceptionVisit,
  ReceptionVisitFilters,
  ReceptionVisitsResult,
  VisitStatus,
  WalkInPayload,
} from "../types/reception.types";

const CAPABILITY_COPY: Array<Omit<ReceptionCapability, "enabled">> = [
  {
    key: "queue_access",
    label: "Queue management",
    description: "Start queues, call patients, add walk-ins, and manage live queue flow.",
  },
  {
    key: "appointments",
    label: "Visit management",
    description: "Review appointments, update visit state, and manage daily operations.",
  },
  {
    key: "check_in",
    label: "Patient check-in",
    description: "Check in booked patients and register basic patient records.",
  },
  {
    key: "schedule_management",
    label: "Session coverage",
    description: "View doctor session coverage and schedule capacity.",
  },
];

const normalizeQueueStatus = (status?: string | null): QueueStatus => {
  const normalized = String(status || "").trim().toUpperCase();
  if (normalized === "LIVE") return "live";
  if (normalized === "PAUSED") return "paused";
  if (normalized === "COMPLETED" || normalized === "ENDED") return "completed";
  return "not_started";
};

const toApiQueueStatus = (status: QueueStatus) => {
  if (status === "live") return "LIVE";
  if (status === "paused") return "PAUSED";
  if (status === "completed") return "COMPLETED";
  return "IDLE";
};

const normalizeVisitStatus = (status?: string | null): VisitStatus => {
  const normalized = String(status || "").trim().toLowerCase();
  if (normalized === "booked" || normalized === "scheduled") return "scheduled";
  if (normalized === "checked_in" || normalized === "confirmed") return "checked_in";
  if (normalized === "with_doctor" || normalized === "in_progress" || normalized === "in_consultation") {
    return "in_consultation";
  }
  if (
    normalized === "waiting" ||
    normalized === "completed" ||
    normalized === "missed" ||
    normalized === "cancelled" ||
    normalized === "late"
  ) {
    return normalized;
  }
  return "scheduled";
};

const normalizeQueuePatientStatus = (status?: string | null): ReceptionQueuePatient["status"] => {
  const normalized = String(status || "").trim().toUpperCase();
  if (normalized === "CHECKED_IN" || normalized === "CONFIRMED") return "CHECKED_IN";
  if (normalized === "LATE") return "LATE";
  if (normalized === "WITH_DOCTOR") return "WITH_DOCTOR";
  if (normalized === "COMPLETED") return "COMPLETED";
  if (normalized === "MISSED") return "MISSED";
  return "WAITING";
};

const toError = (error: unknown, fallback: string) => new Error(getApiErrorMessage(error, fallback));

const toCapabilities = (permissions: ReceptionPermissions): ReceptionCapability[] =>
  CAPABILITY_COPY.map((capability) => ({
    ...capability,
    enabled: Boolean(permissions[capability.key]),
  }));

const normalizeQueue = (queue: RawReceptionQueueCard, clinicName?: string): ReceptionQueue => {
  const queueStatus = normalizeQueueStatus(queue.queueStatus);
  return {
    queueId: queue.queueId,
    sessionId: Number(queue.sessionId),
    doctorId: Number(queue.doctorId),
    doctorName: queue.doctorName || "Doctor",
    doctorProfileImage: typeof queue.doctorProfileImage === "string" ? queue.doctorProfileImage : null,
    specialty: queue.specialty || "General practice",
    medicalCenterId: queue.medicalCenterId,
    medicalCenterName: clinicName,
    sessionDate: queue.sessionDate,
    startTime: String(queue.startTime || "").slice(0, 5),
    endTime: String(queue.endTime || "").slice(0, 5),
    queueStatus,
    currentToken: queue.currentToken,
    currentPatient: queue.currentPatient,
    nextToken: queue.nextToken,
    nextPatient: queue.nextPatient,
    waitingCount: Number(queue.waitingCount || 0),
    checkedInCount: Number(queue.waitingCount || 0),
    withDoctorCount: Number(queue.withDoctorCount || 0),
    completedCount: Number(queue.completedCount || 0),
    missedCount: Number(queue.missedCount || 0),
    lateCount: 0,
    avgWaitMinutes: Number(queue.avgWaitMinutes || 0),
  };
};

const normalizeQueuePayload = (payload: RawReceptionQueuePayload) => {
  const clinicName = payload.clinic?.name || "Clinic";
  const allQueues = (payload.allQueues || []).map((queue) => normalizeQueue(queue, clinicName));
  return {
    clinic: payload.clinic,
    date: payload.date,
    summary: payload.summary,
    liveQueues: allQueues.filter((queue) => queue.queueStatus === "live"),
    upcomingQueues: allQueues.filter((queue) => ["not_started", "paused"].includes(queue.queueStatus)),
    completedQueues: allQueues.filter((queue) => queue.queueStatus === "completed"),
    endedQueues: allQueues.filter((queue) => queue.queueStatus === "completed"),
    allQueues,
  };
};

const normalizeQueuePatient = (patient: ReceptionQueuePatient): ReceptionQueuePatient => ({
  ...patient,
  status: normalizeQueuePatientStatus(patient.status),
  phone: patient.phone ?? null,
  bookingTime: patient.bookingTime ?? null,
  isWalkIn: patient.isWalkIn ?? false,
});

const normalizeVisit = (visit: ReceptionVisit): ReceptionVisit => ({
  ...visit,
  bookingNumber: visit.bookingNumber || `HL-${visit.bookingId}`,
  patientNic: visit.patientNic ?? null,
  patientPhone: visit.patientPhone ?? null,
  visitStatus: normalizeVisitStatus(visit.visitStatus),
  queueStatus: visit.queueStatus ? normalizeQueueStatus(visit.queueStatus) : null,
});

const normalizePatient = (patient: Partial<ReceptionPatient> & { id: number; name?: string | null }): ReceptionPatient => {
  const fullName = patient.fullName || patient.name || "Patient";
  const lastVisit = patient.lastVisit || patient.last_visit || null;
  const isRecent = Boolean(patient.isRecent ?? patient.is_recent);

  return {
    id: patient.id,
    fullName,
    name: fullName,
    phone: patient.phone ?? null,
    nic: patient.nic ?? null,
    dob: patient.dob ?? null,
    gender: patient.gender ?? null,
    address: patient.address ?? null,
    emergencyContact: patient.emergencyContact ?? null,
    lastVisit,
    last_visit: lastVisit,
    isRecent,
    is_recent: isRecent,
  };
};

type RawReceptionSessionSchedule = {
  id: number;
  date: string;
  doctor_id?: number | null;
  start_time: string;
  end_time: string;
  slot_duration: number;
  max_patients: number;
  is_active: boolean;
  clinic_name?: string | null;
  source?: string | null;
  booked_count?: number | null;
  available_count?: number | null;
  doctor_name?: string | null;
};

const normalizeSessionSchedule = (item: RawReceptionSessionSchedule): ReceptionSessionSchedule => {
  const bookedCount = Number(item.booked_count || 0);
  const maxPatients = Number(item.max_patients || 0);
  const availableSlots = Number(item.available_count ?? Math.max(0, maxPatients - bookedCount));

  return {
    id: Number(item.id),
    date: String(item.date || ""),
    doctorId: Number(item.doctor_id || 0),
    startTime: String(item.start_time || "").slice(0, 5),
    endTime: String(item.end_time || "").slice(0, 5),
    slotDuration: Number(item.slot_duration || 0),
    maxPatients,
    isActive: item.is_active !== false,
    clinicName: item.clinic_name ?? null,
    source: String(item.source || "manual").toLowerCase() === "routine" ? "routine" : "manual",
    bookedCount,
    availableSlots,
    doctorName: item.doctor_name ?? null,
  };
};

const buildSession = (
  queue: ReceptionQueue,
  appointmentCount: number,
  permissions: ReceptionPermissions
): ReceptionSession => ({
  id: queue.sessionId,
  doctorId: queue.doctorId,
  doctorName: queue.doctorName,
  specialty: queue.specialty,
  medicalCenterId: queue.medicalCenterId,
  medicalCenterName: queue.medicalCenterName || "Clinic",
  date: queue.sessionDate,
  startTime: queue.startTime,
  endTime: queue.endTime,
  appointmentCount,
  queueId: queue.queueId,
  queueStatus: queue.queueStatus,
  waitingCount: queue.waitingCount,
  checkedInCount: queue.checkedInCount,
  completedCount: queue.completedCount,
  missedCount: queue.missedCount,
  coverageStatus:
    queue.queueStatus === "live" || queue.queueStatus === "paused"
      ? "covered"
      : queue.waitingCount > 0 || appointmentCount > 0
        ? "needs_attention"
        : "not_started",
  canOpenQueue: permissions.queue_access,
  canStartQueue: permissions.queue_access && queue.queueStatus === "not_started",
});

const buildVisitQuery = (filters?: ReceptionVisitFilters) => {
  const query = new URLSearchParams();
  if (filters?.filter) query.set("filter", filters.filter);
  if (filters?.date) query.set("date", filters.date);
  if (filters?.search) query.set("search", filters.search);
  if (filters?.doctorId) query.set("doctorId", String(filters.doctorId));
  if (filters?.sessionId) query.set("sessionId", String(filters.sessionId));
  if (filters?.page) query.set("page", String(filters.page));
  if (filters?.limit) query.set("limit", String(filters.limit));
  return query.toString();
};

export async function getReceptionPermissions() {
  try {
    const response = await api.get<ReceptionPermissions>("/api/reception/permissions");
    return response.data;
  } catch (error) {
    throw toError(error, "Failed to load permissions.");
  }
}

export async function getReceptionQueues() {
  try {
    const response = await api.get<RawReceptionQueuePayload>("/api/reception/queues");
    return normalizeQueuePayload(response.data);
  } catch (error) {
    throw toError(error, "Failed to load queues.");
  }
}

export async function getReceptionQueueBySession(sessionId: number) {
  try {
    const response = await api.get<RawReceptionQueueDetailPayload>(
      `/api/reception/queues/session/${encodeURIComponent(String(sessionId))}`
    );
    return normalizeQueueDetail(response.data);
  } catch (error) {
    throw toError(error, "Failed to load queue details.");
  }
}

export async function getReceptionQueueById(queueId: number) {
  try {
    const response = await api.get<RawReceptionQueueDetailPayload>(
      `/api/reception/queues/${encodeURIComponent(String(queueId))}`
    );
    return normalizeQueueDetail(response.data);
  } catch (error) {
    throw toError(error, "Failed to load queue details.");
  }
}

export async function getReceptionQueueDetail(params: { queueId?: number | null; sessionId?: number | null }) {
  if (params.queueId) return getReceptionQueueById(params.queueId);
  if (params.sessionId) return getReceptionQueueBySession(params.sessionId);

  try {
    const response = await api.get<RawReceptionQueueDetailPayload>("/api/reception/queue/detail");
    return normalizeQueueDetail(response.data);
  } catch (error) {
    throw toError(error, "Failed to load queue details.");
  }
}

function normalizeQueueDetail(payload: RawReceptionQueueDetailPayload): ReceptionQueueDetail {
  const queue = normalizeQueue(payload.queue, payload.clinic.name);
  const waitingPatients = (payload.waitingPatients || []).map(normalizeQueuePatient);
  const withDoctorPatients = (payload.withDoctorPatients || []).map(normalizeQueuePatient);
  const missedPatients = (payload.missedPatients || []).map(normalizeQueuePatient);
  const completedPatients = (payload.completedPatients || []).map(normalizeQueuePatient);
  const checkedInPatients = waitingPatients.filter((patient) => patient.status === "CHECKED_IN");
  const latePatients = waitingPatients.filter((patient) => patient.status === "LATE");

  return {
    clinic: payload.clinic,
    queue,
    currentPatient: payload.currentPatient ? normalizeQueuePatient(payload.currentPatient) : null,
    nextPatient: payload.nextPatient ? normalizeQueuePatient(payload.nextPatient) : null,
    checkedInPatients,
    waitingPatients: waitingPatients.filter((patient) => patient.status === "WAITING"),
    latePatients,
    withDoctorPatients,
    missedPatients,
    completedPatients,
  };
}

async function queueAction(
  path: string,
  payload: { sessionId?: number | null; queueId?: number | null },
  fallback: string
) {
  try {
    const response = await api.post<ReceptionActionResponse>(path, payload);
    return { ...response.data, message: response.data.message || "Queue updated." };
  } catch (error) {
    throw toError(error, fallback);
  }
}

export function startQueue(sessionId: number) {
  return queueAction("/api/reception/queue/start", { sessionId }, "Failed to start queue.");
}

export function pauseQueue(queueId: number) {
  return queueAction(
    `/api/reception/queues/${encodeURIComponent(String(queueId))}/pause`,
    { queueId },
    "Failed to pause queue."
  );
}

export function resumeQueue(queueId: number) {
  return queueAction(
    `/api/reception/queues/${encodeURIComponent(String(queueId))}/resume`,
    { queueId },
    "Failed to resume queue."
  );
}

export function callNextPatient(queueId: number) {
  return queueAction(
    `/api/reception/queues/${encodeURIComponent(String(queueId))}/next`,
    { queueId },
    "Failed to call next patient."
  );
}

export function endQueue(queueId: number) {
  return queueAction(
    `/api/reception/queues/${encodeURIComponent(String(queueId))}/end`,
    { queueId },
    "Failed to end queue."
  );
}

export function markQueueCurrentPatientMissed(queueId: number) {
  return queueAction(
    `/api/reception/queues/${encodeURIComponent(String(queueId))}/miss`,
    { queueId },
    "Failed to mark patient missed."
  );
}

export function markQueueCurrentPatientCompleted(queueId: number) {
  return queueAction(
    `/api/reception/queues/${encodeURIComponent(String(queueId))}/complete`,
    { queueId },
    "Failed to complete current patient."
  );
}

export async function getReceptionVisits(filters?: ReceptionVisitFilters) {
  const query = buildVisitQuery(filters);
  try {
    const response = await api.get<ReceptionVisitsResult>(`/api/reception/visits${query ? `?${query}` : ""}`);
    return {
      ...response.data,
      visits: (response.data.visits || []).map(normalizeVisit),
    };
  } catch (error) {
    throw toError(error, "Failed to load visits.");
  }
}

async function visitAction(visitId: number, action: string, fallback: string) {
  try {
    const response = await api.post<ReceptionActionResponse>(`/api/reception/visits/${visitId}/${action}`);
    return { ...response.data, message: response.data.message || "Visit updated." };
  } catch (error) {
    throw toError(error, fallback);
  }
}

export function checkInVisit(visitId: number) {
  return visitAction(visitId, "check-in", "Failed to check in patient.");
}

export async function markVisitLate(visitId: number) {
  return checkInVisit(visitId);
}

export function markVisitMissed(visitId: number) {
  return visitAction(visitId, "mark-missed", "Failed to mark visit missed.");
}

export function cancelVisit(visitId: number) {
  return visitAction(visitId, "cancel", "Failed to cancel visit.");
}

export function moveVisitToQueue(visitId: number) {
  return visitAction(visitId, "send-to-queue", "Failed to move patient to queue.");
}

export function completeVisit(visitId: number) {
  return visitAction(visitId, "complete", "Failed to complete visit.");
}

export async function addWalkIn(payload: WalkInPayload) {
  const path = payload.queueId
    ? `/api/reception/queues/${encodeURIComponent(String(payload.queueId))}/walkin`
    : "/api/reception/queue/walkin";

  try {
    const response = await api.post<ReceptionActionResponse>(path, payload);
    return { ...response.data, message: response.data.message || "Walk-in added to queue." };
  } catch (error) {
    throw toError(error, "Failed to add walk-in patient.");
  }
}

export async function searchPatients(query = "") {
  try {
    const response = await api.get<Array<Partial<ReceptionPatient> & { id: number; name?: string | null }>>(
      "/api/reception/patients"
    );
    const patients = response.data.map(normalizePatient);
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return patients;
    return patients.filter((patient) =>
      [patient.fullName, patient.phone, patient.nic]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalizedQuery))
    );
  } catch (error) {
    throw toError(error, "Failed to load patients.");
  }
}

export async function registerPatient(payload: PatientRegistrationPayload) {
  try {
    const response = await api.post<ReceptionActionResponse>("/api/reception/patient/register", {
      name: payload.fullName,
      phone: payload.phone,
      sessionId: payload.sessionId,
      addToQueue: payload.addToQueue,
      nic: payload.nic,
      dob: payload.dob,
      gender: payload.gender,
      address: payload.address,
      emergencyContact: payload.emergencyContact,
    });
    return { ...response.data, message: response.data.message || "Patient registered." };
  } catch (error) {
    throw toError(error, "Failed to register patient.");
  }
}

export async function getReceptionSessionDoctors() {
  try {
    const response = await api.get<ReceptionSessionDoctor[]>("/api/reception/sessions/doctors");
    return response.data;
  } catch (error) {
    throw toError(error, "Failed to load doctors.");
  }
}

export async function getReceptionSessionAvailabilityState(doctorUserId: number) {
  try {
    const response = await api.get<ReceptionAvailabilityState>(
      `/api/reception/sessions/doctors/${encodeURIComponent(String(doctorUserId))}/availability-state`
    );
    return response.data;
  } catch (error) {
    throw toError(error, "Failed to load doctor availability.");
  }
}

export async function getReceptionSessionAvailability(doctorUserId: number, date: string) {
  try {
    const response = await api.get<ReceptionAvailabilityWindow[]>(
      `/api/reception/sessions/doctors/${encodeURIComponent(String(doctorUserId))}/availability`,
      { params: { date } }
    );
    return Array.isArray(response.data) ? response.data : [];
  } catch (error) {
    throw toError(error, "Failed to load doctor availability.");
  }
}

export async function getReceptionSessionSchedules(doctorUserId: number, activeOnly = false) {
  try {
    const response = await api.get<RawReceptionSessionSchedule[]>(
      `/api/reception/sessions/doctors/${encodeURIComponent(String(doctorUserId))}/schedules`,
      { params: { active_only: activeOnly ? "true" : "false" } }
    );
    return Array.isArray(response.data) ? response.data.map(normalizeSessionSchedule) : [];
  } catch (error) {
    throw toError(error, "Failed to load doctor schedules.");
  }
}

export async function getReceptionSessionRoutine(doctorUserId: number) {
  try {
    const response = await api.get<ReceptionRoutineDay[]>(
      `/api/reception/sessions/doctors/${encodeURIComponent(String(doctorUserId))}/schedules/routine`
    );
    return Array.isArray(response.data) ? response.data : [];
  } catch (error) {
    throw toError(error, "Failed to load doctor routines.");
  }
}

export async function saveReceptionSessionRoutine(
  doctorUserId: number,
  payload: {
    weeks: number;
    routine: Array<{
      day: string;
      dayOfWeek: number;
      shifts: Array<{ start: string; end: string }>;
    }>;
    slotDuration: number;
    maxPatients: number;
  }
) {
  try {
    const response = await api.put<ReceptionActionResponse>(
      `/api/reception/sessions/doctors/${encodeURIComponent(String(doctorUserId))}/routine`,
      payload
    );
    return response.data;
  } catch (error) {
    throw toError(error, "Failed to save routine schedule.");
  }
}

export async function createReceptionManualSession(
  doctorUserId: number,
  payload: {
    date: string;
    start_time: string;
    end_time: string;
    slot_duration: number;
    max_patients: number;
  }
) {
  try {
    const response = await api.post<ReceptionActionResponse>(
      `/api/reception/sessions/doctors/${encodeURIComponent(String(doctorUserId))}/manual`,
      payload
    );
    return response.data;
  } catch (error) {
    throw toError(error, "Failed to create manual session.");
  }
}

export async function updateReceptionSession(
  scheduleId: number,
  payload: {
    doctorId?: number;
    date?: string;
    start_time?: string;
    end_time?: string;
    slot_duration?: number;
    max_patients?: number;
    is_active?: boolean;
  }
) {
  try {
    const response = await api.patch<ReceptionActionResponse>(
      `/api/reception/sessions/${encodeURIComponent(String(scheduleId))}`,
      payload
    );
    return response.data;
  } catch (error) {
    throw toError(error, "Failed to update session.");
  }
}

export async function deleteReceptionSession(scheduleId: number, doctorUserId?: number | null) {
  try {
    const response = await api.delete<ReceptionActionResponse>(
      `/api/reception/sessions/${encodeURIComponent(String(scheduleId))}`,
      {
        params: typeof doctorUserId === "number" ? { doctorId: doctorUserId } : undefined,
      }
    );
    return response.data;
  } catch (error) {
    throw toError(error, "Failed to delete session.");
  }
}

export async function getReceptionSessions() {
  const [permissions, queues, visits] = await Promise.all([
    getReceptionPermissions(),
    getReceptionQueues(),
    getReceptionVisits({ filter: "today", limit: 100 }),
  ]);
  const appointmentCountBySession = new Map<number, number>();
  visits.visits.forEach((visit) => {
    if (!visit.sessionId) return;
    appointmentCountBySession.set(visit.sessionId, (appointmentCountBySession.get(visit.sessionId) || 0) + 1);
  });

  return queues.allQueues.map((queue) =>
    buildSession(queue, appointmentCountBySession.get(queue.sessionId) || 0, permissions)
  );
}

export async function getReceptionDashboard(): Promise<ReceptionDashboardSummary> {
  try {
    const [dashboard, permissions, queues, visits] = await Promise.all([
      api.get<RawReceptionDashboardPayload>("/api/reception/dashboard").then((response) => response.data),
      getReceptionPermissions(),
      getReceptionQueues(),
      getReceptionVisits({ filter: "today", limit: 100 }),
    ]);

    const appointmentCountBySession = new Map<number, number>();
    visits.visits.forEach((visit) => {
      if (!visit.sessionId) return;
      appointmentCountBySession.set(visit.sessionId, (appointmentCountBySession.get(visit.sessionId) || 0) + 1);
    });

    const todaySessions = queues.allQueues.map((queue) =>
      buildSession(queue, appointmentCountBySession.get(queue.sessionId) || 0, permissions)
    );
    const checkedInCount = visits.visits.filter((visit) =>
      ["checked_in", "waiting", "in_consultation"].includes(visit.visitStatus)
    ).length;
    const completedCount = visits.visits.filter((visit) => visit.visitStatus === "completed").length;
    const missedCount = visits.visits.filter((visit) => visit.visitStatus === "missed").length;
    const lateCount = visits.visits.filter((visit) => visit.visitStatus === "late").length;

    return {
      clinic: dashboard.clinic,
      metrics: [
        {
          key: "todays_sessions",
          label: "Today's sessions",
          value: todaySessions.length,
          detail: "Doctor sessions scheduled for today",
        },
        {
          key: "active_queues",
          label: "Active queues",
          value: queues.liveQueues.length,
          detail: "Queues currently live",
        },
        {
          key: "waiting_patients",
          label: "Waiting patients",
          value: queues.summary.waitingPatients,
          detail: "Patients waiting across queues",
        },
        {
          key: "checked_in_patients",
          label: "Checked-in patients",
          value: checkedInCount,
          detail: "Checked in, waiting, or in consultation",
        },
        {
          key: "completed_visits",
          label: "Completed visits",
          value: completedCount,
          detail: "Completed today",
        },
        {
          key: "missed_visits",
          label: "Missed visits",
          value: missedCount || dashboard.stats.missedToday,
          detail: "Marked missed today",
        },
        {
          key: "late_arrivals",
          label: "Late arrivals",
          value: lateCount,
          detail: "Reported by visit status",
        },
        {
          key: "walk_ins",
          label: "Walk-ins",
          value: null,
          detail: "Current API does not return a walk-in total",
        },
      ],
      todaySessions,
      queueAttention: queues.allQueues.filter(
        (queue) => queue.queueStatus === "paused" || queue.waitingCount > 0 || queue.missedCount > 0
      ),
      recentCheckIns: visits.visits
        .filter((visit) => ["checked_in", "waiting", "in_consultation"].includes(visit.visitStatus))
        .slice(0, 6),
      capabilities: toCapabilities(permissions),
    };
  } catch (error) {
    throw toError(error, "Failed to load reception dashboard.");
  }
}

export function moveQueuePatientToEnd(_queuePatientId: number): Promise<ReceptionActionResponse> {
  return Promise.reject(new Error("Moving a specific queue patient to the end requires a backend endpoint."));
}

export function markQueuePatientCompleted(_queuePatientId: number): Promise<ReceptionActionResponse> {
  return Promise.reject(new Error("Completing a specific queue patient requires a backend endpoint."));
}

export { normalizeQueueStatus, normalizeVisitStatus, toApiQueueStatus };

export const fetchReceptionPermissions = getReceptionPermissions;
export const fetchReceptionDashboard = getReceptionDashboard;
export const fetchReceptionQueues = getReceptionQueues;
export const fetchReceptionQueueDetail = getReceptionQueueDetail;
export const fetchReceptionVisits = getReceptionVisits;
export const fetchReceptionPatients = searchPatients;
export const fetchReceptionSessionDoctors = getReceptionSessionDoctors;
export const fetchReceptionSessionAvailabilityState = getReceptionSessionAvailabilityState;
export const fetchReceptionSessionAvailability = getReceptionSessionAvailability;
export const fetchReceptionSessionSchedules = getReceptionSessionSchedules;
export const fetchReceptionSessionRoutine = getReceptionSessionRoutine;
export const saveReceptionDoctorRoutine = saveReceptionSessionRoutine;
export const createReceptionDoctorManualSession = createReceptionManualSession;
export const patchReceptionSession = updateReceptionSession;
export const removeReceptionSession = deleteReceptionSession;
export const startReceptionQueue = startQueue;
export const pauseReceptionQueue = ({ queueId }: { queueId?: number | null }) => pauseQueue(Number(queueId));
export const resumeReceptionQueue = ({ queueId }: { queueId?: number | null }) => resumeQueue(Number(queueId));
export const nextReceptionQueuePatient = ({ queueId }: { queueId?: number | null }) => callNextPatient(Number(queueId));
export const completeReceptionQueuePatient = ({ queueId }: { queueId?: number | null }) =>
  markQueueCurrentPatientCompleted(Number(queueId));
export const missReceptionQueuePatient = ({ queueId }: { queueId?: number | null }) =>
  markQueueCurrentPatientMissed(Number(queueId));
export const checkInReceptionVisit = checkInVisit;
export const sendReceptionVisitToQueue = moveVisitToQueue;
export const completeReceptionVisit = completeVisit;
export const markReceptionVisitMissed = markVisitMissed;
export const cancelReceptionVisit = cancelVisit;
export const registerReceptionPatient = registerPatient;
