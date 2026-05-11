import { api, getApiErrorMessage } from "./api";
import type {
  AdminDoctorAssociation,
  AdminDoctorDetails,
  AdminDoctorListItem,
  AdminDoctorSchedule,
  DoctorVerificationStatus,
} from "../types/admin-doctor.types";

export type {
  AdminDoctorAssociation,
  AdminDoctorDetails,
  AdminDoctorInvite,
  AdminDoctorJoinRequest,
  AdminDoctorListItem,
  AdminDoctorSchedule,
  DoctorVerificationStatus,
} from "../types/admin-doctor.types";

type AdminDoctorListResponse =
  | AdminDoctorListItem[]
  | {
      items?: AdminDoctorListItem[];
      data?: AdminDoctorListItem[];
    };

export async function fetchAdminDoctors(filters?: {
  search?: string;
  specialization?: string;
  verification_status?: DoctorVerificationStatus;
  is_active?: "true" | "false";
}) {
  try {
    const response = await api.get<AdminDoctorListResponse>("/api/admin/doctors", {
      params: filters,
    });
    return Array.isArray(response.data) ? response.data : response.data.items ?? response.data.data ?? [];
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Unable to load doctors."));
  }
}

export async function fetchAdminDoctorDetails(id: string) {
  try {
    const response = await api.get<AdminDoctorDetails>(`/api/admin/doctors/${id}`);
    return response.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Unable to load doctor details."));
  }
}

export async function fetchAdminDoctorAssociations(id: string) {
  try {
    const response = await api.get<AdminDoctorAssociation[]>(`/api/admin/doctors/${id}/associations`);
    return response.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Unable to load doctor associations."));
  }
}

export async function fetchAdminDoctorSchedules(id: string) {
  try {
    const response = await api.get<AdminDoctorSchedule[]>(`/api/admin/doctors/${id}/schedules`);
    return response.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Unable to load doctor schedules."));
  }
}

export async function updateAdminDoctorStatus(input: { id: string; is_active: boolean }) {
  try {
    const response = await api.patch<{ id: string; is_active: boolean; updated_at: string }>(
      `/api/admin/doctors/${input.id}/status`,
      { is_active: input.is_active }
    );
    return response.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Unable to update doctor account status."));
  }
}

export async function updateAdminDoctorVisibility(input: { id: string; is_visible: boolean }) {
  try {
    const response = await api.patch<{ id: string; is_visible: boolean; updated_at: string }>(
      `/api/admin/doctors/${input.id}/visibility`,
      { is_visible: input.is_visible }
    );
    return response.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Unable to update doctor visibility."));
  }
}
