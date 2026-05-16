import axios from "axios";
import { api, getApiErrorMessage } from "./api";
import { fetchVerificationEntityDetail } from "./admin-verifications.service";
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
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      try {
        const verification = await fetchVerificationEntityDetail("doctor", id);
        return {
          data_mode: "fallback",
          profile: {
            id: String(verification.profile.entityId),
            user_id: Number(verification.linkedAccount?.id ?? 0),
            name: verification.profile.entityName,
            email: verification.linkedAccount?.email || "Not available",
            specialization:
              verification.metadata.find((item) =>
                String(item.label || "").toLowerCase().includes("special")
              )?.value?.toString() || null,
            experience_years: null,
            verification_status: verification.profile.status,
            verified_at: verification.profile.verifiedAt ?? null,
            verification_notes: verification.profile.verificationNotes ?? null,
            is_active: true,
            is_visible: true,
            created_at: verification.profile.submittedAt || new Date().toISOString(),
          },
          activity_summary: {
            total_consultations: 0,
            prescriptions_issued: 0,
            active_schedules: 0,
            availability_summary: [],
            recent_activity: [],
          },
          relationships: {
            clinic_associations: [],
            join_requests: [],
            invite_history: [],
          },
        } satisfies AdminDoctorDetails;
      } catch {
        // Fall through to the original error below.
      }
    }
    throw new Error(getApiErrorMessage(error, "Unable to load doctor details."));
  }
}

export async function fetchAdminDoctorAssociations(id: string) {
  try {
    const response = await api.get<AdminDoctorAssociation[]>(`/api/admin/doctors/${id}/associations`);
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      return [];
    }
    throw new Error(getApiErrorMessage(error, "Unable to load doctor associations."));
  }
}

export async function fetchAdminDoctorSchedules(id: string) {
  try {
    const response = await api.get<AdminDoctorSchedule[]>(`/api/admin/doctors/${id}/schedules`);
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      return [];
    }
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
