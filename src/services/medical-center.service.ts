import { api, getApiErrorMessage } from "./api";
import type {
  MedicalCenterActionResponse,
  MedicalCenterAppointment,
  MedicalCenterDashboard,
  MedicalCenterDoctor,
  MedicalCenterDoctorInviteResponse,
  MedicalCenterDoctorJoinRequest,
  MedicalCenterQueue,
  MedicalCenterReceptionist,
  MedicalCenterReceptionistPermissionsPayload,
  MedicalCenterSchedule,
  MedicalCenterSchedulePreview,
  ReceptionistPermissions,
} from "../types/medical-center.types";

const toError = (error: unknown, fallback: string) => new Error(getApiErrorMessage(error, fallback));

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const readString = (value: unknown, fallback = "") => (typeof value === "string" ? value : fallback);
const readOptionalString = (value: unknown) =>
  typeof value === "string" && value.trim().length > 0 ? value : null;
const readBoolean = (value: unknown) => value === true;
const readNumber = (value: unknown, fallback = 0) =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;
const readNullableNumber = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) ? value : null;
const readIdString = (value: unknown, fallback = "") => {
  if (typeof value === "string" && value.trim()) return value;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return fallback;
};

const normalizeReceptionistPermissions = (value: unknown): ReceptionistPermissions => {
  if (!isRecord(value)) {
    return {
      queue_access: false,
      appointments: false,
      check_in: false,
      schedule_management: false,
    };
  }

  return {
    queue_access: Boolean(value.queue_access ?? value.can_manage_queue),
    appointments: Boolean(value.appointments ?? value.can_manage_appointments),
    check_in: Boolean(value.check_in ?? value.can_check_in),
    schedule_management: Boolean(value.schedule_management),
  };
};

const normalizeReceptionistStatus = (
  isPasswordSet: boolean,
  status: string
): MedicalCenterReceptionist["status"] => {
  if (!isPasswordSet) return "PENDING";
  if (status.trim().toUpperCase() === "INACTIVE") return "DISABLED";
  return "ACTIVE";
};

const parseDashboard = (value: unknown): MedicalCenterDashboard => {
  const payload = isRecord(value) ? value : {};
  const centerValue = isRecord(payload.center) ? payload.center : null;
  const statsValue = isRecord(payload.stats) ? payload.stats : {};

  return {
    center: centerValue
      ? {
          id: readString(centerValue.id),
          name: readString(centerValue.name, "Medical center"),
          address: readOptionalString(centerValue.address),
          phone: readOptionalString(centerValue.phone),
          email: readOptionalString(centerValue.email),
          status: readOptionalString(centerValue.status),
        }
      : null,
    stats: {
      doctors: readNumber(statsValue.doctors),
      receptionists: readNumber(statsValue.receptionists),
      liveQueues: readNumber(statsValue.liveQueues),
      todayAppointments: readNumber(statsValue.todayAppointments),
    },
  };
};

const parseDoctor = (value: unknown): MedicalCenterDoctor | null => {
  if (!isRecord(value)) return null;
  const id = readIdString(value.id);
  const email = readString(value.email);
  if (!id || !email) return null;

  return {
    id,
    doctorId: readNullableNumber(value.doctor_id),
    doctorProfileId: readNullableNumber(value.doctor_profile_id),
    inviteId: readOptionalString(value.invite_id),
    name: readOptionalString(value.name),
    email,
    profileImage: readOptionalString(value.profile_image),
    specialization: readOptionalString(value.specialization),
    clinicSpecialtyId: readOptionalString(value.clinic_specialty_id),
    clinicSpecialty: readOptionalString(value.clinic_specialty),
    status: readString(value.status, "PENDING"),
    joinedAt: readString(value.joined_at),
    isPinned: readBoolean(value.is_pinned),
    isHidden: readBoolean(value.is_hidden),
  };
};

const parseDoctorJoinRequest = (value: unknown): MedicalCenterDoctorJoinRequest | null => {
  if (!isRecord(value)) return null;
  const id = readIdString(value.id);
  const doctorId = readNumber(value.doctor_id, Number.NaN);
  const medicalCenterId = readString(value.medical_center_id);
  if (!id || !Number.isFinite(doctorId) || !medicalCenterId) return null;

  return {
    id,
    doctorId,
    medicalCenterId,
    status: readString(value.status, "PENDING"),
    createdAt: readString(value.created_at),
    doctorName: readString(value.doctor_name, "Doctor"),
    doctorEmail: readString(value.doctor_email),
    specialization: readOptionalString(value.specialization),
  };
};

const parseDoctorInviteResponse = (value: unknown): MedicalCenterDoctorInviteResponse => {
  const payload = isRecord(value) ? value : {};
  const invite = isRecord(payload.invite) ? payload.invite : {};

  return {
    message: readString(payload.message, "Doctor invite processed successfully."),
    invite: {
      id: readIdString(invite.id),
      email: readString(invite.email),
      status: readString(invite.status, "PENDING"),
      expiresAt: readString(invite.expires_at),
      relationshipStatus: readOptionalString(invite.relationship_status),
    },
    emailSent: readBoolean(payload.emailSent),
    emailError: readOptionalString(payload.emailError),
  };
};

const parseReceptionist = (value: unknown): MedicalCenterReceptionist | null => {
  if (!isRecord(value)) return null;
  const id = readIdString(value.id);
  const userId = readNumber(value.user_id, Number.NaN);
  if (!id || !Number.isFinite(userId)) return null;

  const isPasswordSet = readBoolean(value.is_password_set);
  const status = readString(value.status, "PENDING");

  return {
    id,
    userId,
    name: readString(value.name, "Receptionist"),
    email: readString(value.email),
    phone: readString(value.phone, "No phone added"),
    status: normalizeReceptionistStatus(isPasswordSet, status),
    isPasswordSet,
    createdAt: readString(value.created_at),
    permissions: normalizeReceptionistPermissions(value.permissions),
  };
};

const parseReceptionistPermissionsPayload = (
  value: unknown
): MedicalCenterReceptionistPermissionsPayload => {
  const payload = isRecord(value) ? value : {};
  const receptionist = isRecord(payload.receptionist) ? payload.receptionist : {};

  return {
    receptionist: {
      id: readIdString(receptionist.id),
      userId: readNumber(receptionist.user_id),
      name: readString(receptionist.name, "Receptionist"),
      email: readString(receptionist.email),
      status: readString(receptionist.status, "PENDING"),
      isPasswordSet: readBoolean(receptionist.is_password_set),
    },
    permissions: normalizeReceptionistPermissions(payload.permissions),
  };
};

const parseSchedule = (value: unknown): MedicalCenterSchedule | null => {
  if (!isRecord(value)) return null;
  const id = readNumber(value.id, Number.NaN);
  const doctorId = readNumber(value.doctor_id, Number.NaN);
  const doctorProfileId = readNumber(value.doctor_profile_id, Number.NaN);
  const medicalCenterId = readString(value.medical_center_id);
  if (!Number.isFinite(id) || !Number.isFinite(doctorId) || !Number.isFinite(doctorProfileId) || !medicalCenterId) {
    return null;
  }

  const slots = Array.isArray(value.slots)
    ? value.slots
        .filter(isRecord)
        .map((slot) => ({
          time: readString(slot.time),
          available: readBoolean(slot.available),
          remainingCapacity: readNullableNumber(slot.remainingCapacity),
        }))
    : [];

  return {
    id,
    medicalCenterId,
    doctorId,
    doctorProfileId,
    date: readString(value.date),
    startTime: readString(value.start_time),
    endTime: readString(value.end_time),
    roomNumber: readOptionalString(value.room_number),
    slotDuration: readNumber(value.slot_duration),
    maxPatients: readNumber(value.max_patients),
    isActive: value.is_active !== false,
    source: readString(value.source, "manual") === "routine" ? "routine" : "manual",
    routineId: readNullableNumber(value.routine_id),
    invalidReason: readOptionalString(value.invalid_reason),
    invalidatedAt: readOptionalString(value.invalidated_at),
    createdAt: readString(value.created_at),
    updatedAt: readString(value.updated_at),
    clinicName: readOptionalString(value.clinic_name),
    clinicType: readOptionalString(value.clinic_type),
    doctorName: readOptionalString(value.doctor_name),
    doctorEmail: readOptionalString(value.doctor_email),
    specialization: readOptionalString(value.specialization),
    slots,
  };
};

const parseSchedulePreview = (value: unknown): MedicalCenterSchedulePreview => {
  const payload = isRecord(value) ? value : {};
  const availability = isRecord(payload.availability) ? payload.availability : null;
  const slots = Array.isArray(payload.slots)
    ? payload.slots
        .filter(isRecord)
        .map((slot) => ({
          time: readString(slot.time),
          available: readBoolean(slot.available),
          remainingCapacity: readNullableNumber(slot.remainingCapacity),
        }))
    : [];

  return {
    ok: readBoolean(payload.ok),
    availability: availability
      ? {
          id: readNumber(availability.id),
          dayOfWeek: readNumber(availability.day_of_week),
          startTime: readString(availability.start_time),
          endTime: readString(availability.end_time),
        }
      : null,
    slots,
    warning: readOptionalString(payload.warning),
  };
};

const parseQueue = (value: unknown): MedicalCenterQueue | null => {
  if (!isRecord(value)) return null;
  const id = readNumber(value.id, Number.NaN);
  const medicalCenterId = readString(value.medical_center_id);
  if (!Number.isFinite(id) || !medicalCenterId) return null;

  return {
    id,
    medicalCenterId,
    doctorId: readNullableNumber(value.doctor_id),
    scheduleId: readNullableNumber(value.schedule_id),
    status: readString(value.status, "UNKNOWN"),
    currentTokenNumber: readNullableNumber(value.current_token_number),
    currentPatientId: readNullableNumber(value.current_patient_id),
    createdAt: readOptionalString(value.created_at),
    updatedAt: readOptionalString(value.updated_at),
  };
};

const parseAppointment = (value: unknown): MedicalCenterAppointment | null => {
  if (!isRecord(value)) return null;
  const id = readNumber(value.id, Number.NaN);
  const medicalCenterId = readString(value.medical_center_id);
  if (!Number.isFinite(id) || !medicalCenterId) return null;

  return {
    id,
    patientId: readNullableNumber(value.patient_id),
    doctorId: readNullableNumber(value.doctor_id),
    medicalCenterId,
    sessionId: readNullableNumber(value.session_id),
    queueId: readNullableNumber(value.queue_id),
    date: readString(value.date),
    time: readOptionalString(value.time),
    status: readOptionalString(value.status),
    patientName: readString(value.patient_name, "Patient"),
    doctorName: readString(value.doctor_name, "Doctor"),
    createdAt: readOptionalString(value.created_at),
  };
};

export async function getMedicalCenterDashboard() {
  try {
    const response = await api.get("/api/center/dashboard");
    return parseDashboard(response.data);
  } catch (error) {
    throw toError(error, "Failed to load medical center dashboard.");
  }
}

export async function getMedicalCenterDoctors() {
  try {
    const response = await api.get("/api/center/doctors");
    return Array.isArray(response.data) ? response.data.map(parseDoctor).filter((item): item is MedicalCenterDoctor => item !== null) : [];
  } catch (error) {
    throw toError(error, "Failed to load medical center doctors.");
  }
}

export async function getMedicalCenterDoctorJoinRequests() {
  try {
    const response = await api.get("/api/center/doctors/requests");
    return Array.isArray(response.data)
      ? response.data.map(parseDoctorJoinRequest).filter((item): item is MedicalCenterDoctorJoinRequest => item !== null)
      : [];
  } catch (error) {
    throw toError(error, "Failed to load doctor join requests.");
  }
}

export async function inviteDoctorToMedicalCenter(payload: { email: string; doctorId?: number }) {
  try {
    const response = await api.post("/api/center/doctors/invite", payload);
    return parseDoctorInviteResponse(response.data);
  } catch (error) {
    throw toError(error, "Failed to invite doctor.");
  }
}

export async function resendDoctorInvite(relationshipOrInviteId: string) {
  try {
    const response = await api.post(`/api/center/doctors/invites/${encodeURIComponent(relationshipOrInviteId)}/resend`);
    return parseDoctorInviteResponse(response.data);
  } catch (error) {
    throw toError(error, "Failed to resend doctor invite.");
  }
}

export async function reviewDoctorJoinRequest(requestId: string, action: "APPROVE" | "REJECT") {
  try {
    const response = await api.patch<MedicalCenterActionResponse>(`/api/center/doctors/requests/${encodeURIComponent(requestId)}`, { action });
    return response.data;
  } catch (error) {
    throw toError(error, "Failed to review doctor join request.");
  }
}

export async function updateDoctorRelationshipStatus(relationshipId: string, status: "ACTIVE" | "INACTIVE") {
  try {
    const response = await api.patch<MedicalCenterActionResponse>(`/api/center/doctors/${encodeURIComponent(relationshipId)}/status`, { status });
    return response.data;
  } catch (error) {
    throw toError(error, "Failed to update doctor status.");
  }
}

export async function updateDoctorRelationshipDisplay(
  relationshipId: string,
  payload: { pinned?: boolean; hidden?: boolean }
) {
  try {
    const route = payload.pinned !== undefined ? "pin" : "hide";
    const response = await api.patch<MedicalCenterActionResponse>(
      `/api/center/doctors/${encodeURIComponent(relationshipId)}/${route}`,
      payload
    );
    return response.data;
  } catch (error) {
    throw toError(error, "Failed to update doctor display settings.");
  }
}

export async function removeDoctorRelationship(relationshipId: string) {
  try {
    const response = await api.delete<MedicalCenterActionResponse>(`/api/center/doctors/${encodeURIComponent(relationshipId)}`);
    return response.data;
  } catch (error) {
    throw toError(error, "Failed to remove doctor from medical center.");
  }
}

export async function getMedicalCenterReceptionists() {
  try {
    const response = await api.get("/api/center/receptionists");
    return Array.isArray(response.data)
      ? response.data.map(parseReceptionist).filter((item): item is MedicalCenterReceptionist => item !== null)
      : [];
  } catch (error) {
    throw toError(error, "Failed to load receptionists.");
  }
}

export async function createMedicalCenterReceptionist(payload: { name: string; email: string; phone?: string }) {
  try {
    const response = await api.post("/api/center/receptionists", payload);
    return response.data as {
      message: string;
      receptionist: unknown;
      setupLink?: string;
      webLink?: string;
      expiresAt?: string;
      emailSent?: boolean;
      emailError?: string | null;
    };
  } catch (error) {
    throw toError(error, "Failed to add receptionist.");
  }
}

export async function resendMedicalCenterReceptionistInvite(receptionistId: string) {
  try {
    const response = await api.post(`/api/center/receptionists/${encodeURIComponent(receptionistId)}/resend`);
    return response.data as {
      message: string;
      emailSent?: boolean;
      emailError?: string | null;
    };
  } catch (error) {
    throw toError(error, "Failed to resend receptionist invite.");
  }
}

export async function updateMedicalCenterReceptionistStatus(
  receptionistId: string,
  status: "ACTIVE" | "INACTIVE"
) {
  try {
    const response = await api.patch<MedicalCenterActionResponse>(
      `/api/center/receptionists/${encodeURIComponent(receptionistId)}/status`,
      { status }
    );
    return response.data;
  } catch (error) {
    throw toError(error, "Failed to update receptionist status.");
  }
}

export async function getMedicalCenterReceptionistPermissions(receptionistId: string) {
  try {
    const response = await api.get(`/api/center/receptionists/${encodeURIComponent(receptionistId)}/permissions`);
    return parseReceptionistPermissionsPayload(response.data);
  } catch (error) {
    throw toError(error, "Failed to load receptionist permissions.");
  }
}

export async function updateMedicalCenterReceptionistPermissions(
  receptionistId: string,
  permissions: ReceptionistPermissions
) {
  try {
    const response = await api.patch(`/api/center/receptionists/${encodeURIComponent(receptionistId)}/permissions`, permissions);
    return parseReceptionistPermissionsPayload(response.data);
  } catch (error) {
    throw toError(error, "Failed to update receptionist permissions.");
  }
}

export async function removeMedicalCenterReceptionist(receptionistId: string) {
  try {
    const response = await api.delete<MedicalCenterActionResponse>(
      `/api/center/receptionists/${encodeURIComponent(receptionistId)}`
    );
    return response.data;
  } catch (error) {
    throw toError(error, "Failed to remove receptionist.");
  }
}

export async function getMedicalCenterSchedules(activeOnly = false) {
  try {
    const response = await api.get(`/api/center/schedules${activeOnly ? "?active_only=true" : ""}`);
    return Array.isArray(response.data)
      ? response.data.map(parseSchedule).filter((item): item is MedicalCenterSchedule => item !== null)
      : [];
  } catch (error) {
    throw toError(error, "Failed to load doctor sessions.");
  }
}

export async function previewMedicalCenterSchedule(payload: {
  doctor_id: number;
  date: string;
  start_time: string;
  end_time: string;
  slot_duration: number;
  max_patients: number;
}) {
  try {
    const response = await api.post("/api/center/schedules/preview", payload);
    return parseSchedulePreview(response.data);
  } catch (error) {
    throw toError(error, "Failed to preview schedule.");
  }
}

export async function createMedicalCenterSchedule(payload: {
  doctor_id: number;
  date: string;
  start_time: string;
  end_time: string;
  slot_duration: number;
  max_patients: number;
}) {
  try {
    const response = await api.post("/api/center/schedules", payload);
    return response.data as { message: string; schedule: unknown };
  } catch (error) {
    throw toError(error, "Failed to create schedule.");
  }
}

export async function updateMedicalCenterSchedule(
  scheduleId: number,
  payload: Partial<{
    doctor_id: number;
    date: string;
    start_time: string;
    end_time: string;
    slot_duration: number;
    max_patients: number;
    is_active: boolean;
  }>
) {
  try {
    const response = await api.patch(`/api/center/schedules/${encodeURIComponent(String(scheduleId))}`, payload);
    return response.data as { message: string; schedule: unknown };
  } catch (error) {
    throw toError(error, "Failed to update schedule.");
  }
}

export async function disableMedicalCenterSchedule(scheduleId: number) {
  try {
    const response = await api.delete<MedicalCenterActionResponse>(
      `/api/center/schedules/${encodeURIComponent(String(scheduleId))}`
    );
    return response.data;
  } catch (error) {
    throw toError(error, "Failed to disable schedule.");
  }
}

export async function getMedicalCenterQueues() {
  try {
    const response = await api.get("/api/center/queues");
    return Array.isArray(response.data)
      ? response.data.map(parseQueue).filter((item): item is MedicalCenterQueue => item !== null)
      : [];
  } catch (error) {
    throw toError(error, "Failed to load queues.");
  }
}

export async function getMedicalCenterAppointments() {
  try {
    const response = await api.get("/api/center/appointments");
    return Array.isArray(response.data)
      ? response.data.map(parseAppointment).filter((item): item is MedicalCenterAppointment => item !== null)
      : [];
  } catch (error) {
    throw toError(error, "Failed to load appointments.");
  }
}
