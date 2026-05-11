import { api, getApiErrorMessage } from "./api";

export type AdminDashboardBanner = {
  id: string;
  title: string | null;
  subtitle: string | null;
  imageUrl: string;
  targetType: string | null;
  targetId: string | null;
  targetScreen: string | null;
  isActive: boolean;
  sortOrder: number;
  startDate: string | null;
  endDate: string | null;
  createdAt: string;
  updatedAt: string;
};

export type DashboardBannerFormValues = {
  title: string;
  subtitle: string;
  targetType: string;
  targetId: string;
  targetScreen: string;
  isActive: boolean;
  sortOrder: number;
  startDate: string;
  endDate: string;
  image?: File | null;
};

type BannerListResponse =
  | AdminDashboardBanner[]
  | {
      items?: AdminDashboardBanner[];
      data?: AdminDashboardBanner[];
    };

const appendBannerForm = (values: DashboardBannerFormValues) => {
  const form = new FormData();
  form.append("title", values.title);
  form.append("subtitle", values.subtitle);
  form.append("targetType", values.targetType);
  form.append("targetId", values.targetId);
  form.append("targetScreen", values.targetScreen);
  form.append("isActive", String(values.isActive));
  form.append("sortOrder", String(values.sortOrder));
  form.append("startDate", values.startDate);
  form.append("endDate", values.endDate);
  if (values.image) {
    form.append("image", values.image);
  }
  return form;
};

export async function fetchAdminDashboardBanners() {
  try {
    const response = await api.get<BannerListResponse>("/api/admin/dashboard-banners");
    return Array.isArray(response.data) ? response.data : response.data.items ?? response.data.data ?? [];
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Unable to load dashboard banners."));
  }
}

export async function createAdminDashboardBanner(values: DashboardBannerFormValues) {
  try {
    const response = await api.post<AdminDashboardBanner>(
      "/api/admin/dashboard-banners",
      appendBannerForm(values),
      { headers: { "Content-Type": "multipart/form-data" } }
    );
    return response.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Unable to create dashboard banner."));
  }
}

export async function updateAdminDashboardBanner(id: string, values: DashboardBannerFormValues) {
  try {
    const response = await api.put<AdminDashboardBanner>(
      `/api/admin/dashboard-banners/${id}`,
      appendBannerForm(values),
      { headers: { "Content-Type": "multipart/form-data" } }
    );
    return response.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Unable to update dashboard banner."));
  }
}

export async function deleteAdminDashboardBanner(id: string) {
  try {
    const response = await api.delete<{ id: string }>(`/api/admin/dashboard-banners/${id}`);
    return response.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Unable to delete dashboard banner."));
  }
}
