import type { SidebarItem } from "../components/layout/Sidebar";

export const AUTH_STORAGE_KEY = "healthlink.web.session";
export const AUTH_TOKEN_STORAGE_KEY = "healthlink.web.token";
export const AUTH_USER_STORAGE_KEY = "healthlink.web.user";
export const DEFAULT_DEV_BACKEND_PORT = "5050";
export const UNAUTHORIZED_EVENT = "healthlink:unauthorized";
export const MOBILE_LOGIN_LINK = "healthlink://login";

export const ADMIN_NAV_ITEMS: SidebarItem[] = [
  { label: "Dashboard", to: "/admin/dashboard" },
  { label: "Verifications", to: "/admin/verifications" },
  { label: "Users", to: "/admin/users" },
  { label: "Medical Centers", to: "/admin/clinics" },
];

export const PHARMACY_NAV_ITEMS: SidebarItem[] = [
  { label: "Dashboard", to: "/pharmacy/dashboard" },
  { label: "Inventory", to: "/pharmacy/inventory" },
  { label: "Orders", to: "/pharmacy/orders" },
];

export const CENTER_ADMIN_NAV_ITEMS: SidebarItem[] = [
  { label: "Dashboard", to: "/center/dashboard" },
];

export const DOCTOR_NAV_ITEMS: SidebarItem[] = [
  { label: "Dashboard", to: "/doctor/dashboard" },
];

export const RECEPTION_NAV_ITEMS: SidebarItem[] = [
  { label: "Dashboard", to: "/reception/dashboard" },
];
