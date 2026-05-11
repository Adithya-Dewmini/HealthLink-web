import { api, getApiErrorMessage } from "./api";
import type {
  AdminPharmacyActivity,
  AdminPharmacyDetails,
  AdminPharmacyListItem,
  PharmacyVerificationStatus,
} from "../types/admin-pharmacy.types";

export type {
  AdminPharmacyActivity,
  AdminPharmacyAssociation,
  AdminPharmacyDetails,
  AdminPharmacyDispensedPrescription,
  AdminPharmacyInventoryAlert,
  AdminPharmacyListItem,
  AdminPharmacyVerificationDocument,
  AdminPharmacyVerificationReview,
  PharmacyVerificationStatus,
} from "../types/admin-pharmacy.types";

type AdminPharmacyListResponse =
  | AdminPharmacyListItem[]
  | {
      items?: AdminPharmacyListItem[];
      data?: AdminPharmacyListItem[];
    };

export async function fetchAdminPharmacies(filters?: {
  search?: string;
  verification_status?: PharmacyVerificationStatus;
  activity_level?: "high" | "medium" | "low";
}) {
  try {
    const response = await api.get<AdminPharmacyListResponse>("/api/admin/pharmacies", {
      params: filters,
    });
    return Array.isArray(response.data) ? response.data : response.data.items ?? response.data.data ?? [];
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Unable to load pharmacies."));
  }
}

export async function fetchAdminPharmacyDetails(id: string) {
  try {
    const response = await api.get<AdminPharmacyDetails>(`/api/admin/pharmacies/${id}`);
    return response.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Unable to load pharmacy details."));
  }
}

export async function fetchAdminPharmacyActivity(id: string) {
  try {
    const response = await api.get<AdminPharmacyActivity>(`/api/admin/pharmacies/${id}/activity`);
    return response.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Unable to load pharmacy activity."));
  }
}

export async function updateAdminPharmacyStatus(input: { id: string; is_active: boolean }) {
  try {
    const response = await api.patch<{ id: string; is_active: boolean; updated_at: string }>(
      `/api/admin/pharmacies/${input.id}/status`,
      { is_active: input.is_active }
    );
    return response.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Unable to update pharmacy status."));
  }
}
