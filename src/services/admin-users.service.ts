import { api, getApiErrorMessage } from "./api";
import type {
  AdminCreatedUserResponse,
  AdminCreateUserInput,
  AdminManagedUserRole,
  AdminUserDetails,
  AdminUserListResponse,
  VerificationLinkedState,
} from "../types/admin-user.types";

export type {
  AdminCreatedUserResponse,
  AdminCreateUserInput,
  AdminManagedUserRole,
  AdminUserDetails,
  AdminUserListItem,
  AdminUserListResponse,
  VerificationLinkedState,
} from "../types/admin-user.types";

export async function fetchAdminUsers(filters?: {
  role?: AdminManagedUserRole;
  is_active?: "true" | "false";
  affiliation?: "center" | "pharmacy";
  verification_state?: VerificationLinkedState;
  search?: string;
  page?: number;
  pageSize?: number;
}) {
  try {
    const response = await api.get<AdminUserListResponse>("/api/admin/users", {
      params: filters,
    });
    return response.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Unable to load users."));
  }
}

export async function fetchAdminUserDetails(id: string) {
  try {
    const response = await api.get<AdminUserDetails>(`/api/admin/users/${id}`);
    return response.data;
  } catch (error) {
    const fallbackList = await fetchAdminUsers({ page: 1, pageSize: 200 }).catch(() => null);
    const user = fallbackList?.items.find((item) => String(item.id) === String(id));
    if (user) {
      return {
        data_mode: "fallback",
        identity: {
          id: String(user.id),
          name: user.name,
          email: user.email,
          role: user.role,
          created_at: user.created_at,
          is_active: user.is_active,
          last_login_at: null,
        },
        linked_domain_records: {
          owned_medical_center: user.role === "medical_center_admin" && user.affiliation.center_name
            ? {
                id: "",
                name: user.affiliation.center_name,
                verification_status: null,
                is_active: null,
              }
            : null,
          doctor_profile:
            user.role === "doctor"
              ? {
                  id: 0,
                  specialization: null,
                  verification_status: null,
                  medical_center_id: null,
                }
              : null,
          clinic_associations: [],
          pharmacy_associations:
            user.affiliation.pharmacy_name
              ? [
                  {
                    pharmacy_id: "",
                    pharmacy_name: user.affiliation.pharmacy_name,
                    verification_status: null,
                    is_active: null,
                    linked_at: user.created_at,
                  },
                ]
              : [],
          receptionist_assignment:
            user.role === "receptionist" && user.affiliation.center_name
              ? {
                  id: 0,
                  medical_center_id: null,
                  medical_center_name: user.affiliation.center_name,
                  phone: null,
                }
              : null,
          patient_profile: user.role === "patient" ? { id: 0, phone: null, city: null, blood_group: null, gender: null } : null,
        },
        activity_summary: {
          bookings_count: 0,
          consultations_count: 0,
          prescriptions_count: 0,
          recent_activity: [],
        },
        audit_summary: {
          recent_actions: [],
          activation_logs: [],
        },
      } satisfies AdminUserDetails;
    }
    throw new Error(getApiErrorMessage(error, "Unable to load user details."));
  }
}

export async function updateAdminUserStatus(input: { id: string; is_active: boolean }) {
  try {
    const response = await api.patch<{ id: string; is_active: boolean; updated_at: string }>(
      `/api/admin/users/${input.id}/status`,
      { is_active: input.is_active }
    );
    return response.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Unable to update user status."));
  }
}

export async function createAdminUser(input: AdminCreateUserInput) {
  try {
    const response = await api.post<AdminCreatedUserResponse>("/api/admin/users/admin", input);
    return response.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Unable to create admin account."));
  }
}
