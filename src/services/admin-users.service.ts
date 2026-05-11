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
