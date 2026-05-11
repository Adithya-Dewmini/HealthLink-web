import { api, getApiErrorMessage } from "./api";
import type {
  AdminMedicalCenterActivity,
  AdminMedicalCenterDetails,
  AdminMedicalCenterDoctor,
  AdminMedicalCenterListItem,
  AdminMedicalCentersResponse,
  AdminMedicalCenterSchedule,
  MedicalCenterVerificationStatus,
} from "../types/admin-medical-center.types";

export type {
  AdminMedicalCenterActivity,
  AdminMedicalCenterAdmin,
  AdminMedicalCenterAppointments,
  AdminMedicalCenterDetails,
  AdminMedicalCenterDoctor,
  AdminMedicalCenterDoctorAssignment,
  AdminMedicalCenterJoinRequest,
  AdminMedicalCenterListItem,
  AdminMedicalCentersResponse,
  AdminMedicalCenterPrescription,
  AdminMedicalCenterQueue,
  AdminMedicalCenterReceptionist,
  AdminMedicalCenterSchedule,
  AdminMedicalCenterSpecialty,
  MedicalCenterVerificationStatus,
} from "../types/admin-medical-center.types";

export async function fetchAdminMedicalCenters(filters?: {
  search?: string;
  is_active?: "true" | "false";
  verification_status?: MedicalCenterVerificationStatus;
}) {
  try {
    const response = await api.get<AdminMedicalCentersResponse | AdminMedicalCenterListItem[]>(
      "/api/admin/medical-centers",
      {
      params: filters,
      }
    );
    return Array.isArray(response.data) ? response.data : response.data.items ?? response.data.data ?? [];
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Unable to load medical centers."));
  }
}

export async function fetchAdminMedicalCenterDetails(id: string) {
  try {
    const response = await api.get<AdminMedicalCenterDetails>(`/api/admin/medical-centers/${id}`);
    return response.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Unable to load medical center details."));
  }
}

export async function updateAdminMedicalCenterStatus(input: { id: string | number; is_active: boolean }) {
  try {
    const response = await api.patch<{ id: string | number; is_active: boolean; updated_at: string }>(
      `/api/admin/medical-centers/${input.id}/status`,
      { is_active: input.is_active }
    );
    return response.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Unable to update medical center status."));
  }
}

export async function fetchAdminMedicalCenterDoctors(id: string) {
  try {
    const response = await api.get<AdminMedicalCenterDoctor[]>(`/api/admin/medical-centers/${id}/doctors`);
    return response.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Unable to load center doctors."));
  }
}

export async function fetchAdminMedicalCenterSchedules(id: string) {
  try {
    const response = await api.get<AdminMedicalCenterSchedule[]>(
      `/api/admin/medical-centers/${id}/schedules`
    );
    return response.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Unable to load center schedules."));
  }
}

export async function fetchAdminMedicalCenterActivity(id: string) {
  try {
    const response = await api.get<AdminMedicalCenterActivity>(
      `/api/admin/medical-centers/${id}/activity`
    );
    return response.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Unable to load center activity."));
  }
}
