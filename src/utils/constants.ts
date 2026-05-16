export const AUTH_STORAGE_KEY = "healthlink_auth";
export const AUTH_TOKEN_STORAGE_KEY = "healthlink_auth_token";
export const AUTH_USER_STORAGE_KEY = "healthlink_auth_user";
export const UNAUTHORIZED_EVENT = "healthlink_unauthorized";

export const DEFAULT_DEV_BACKEND_PORT = "5050";

export type SidebarItem = {
  label: string;
  to: string;
  icon?: string;
  subtitle?: string;
};

export type ReceptionHeaderAction = {
  label: string;
  to: string;
  icon: string;
  primary?: boolean;
};

export type ReceptionHeaderConfig = {
  title: string;
  subtitle: string;
  actions: ReceptionHeaderAction[];
};

export const ADMIN_NAV_ITEMS: SidebarItem[] = [
  { label: "Dashboard", to: "/admin/dashboard" },
  { label: "Verifications", to: "/admin/verifications" },
  { label: "Users", to: "/admin/users" },
  { label: "Medical Centers", to: "/admin/clinics" },
  { label: "Doctors", to: "/admin/doctors" },
  { label: "Pharmacies", to: "/admin/pharmacies" },
  { label: "Monitoring", to: "/admin/monitoring" },
  { label: "Audit Logs", to: "/admin/audit-logs" },
];

export const CENTER_ADMIN_NAV_ITEMS: SidebarItem[] = [
  {
    label: "Dashboard",
    to: "/center/dashboard",
    icon: "LayoutDashboard",
    subtitle: "Today’s clinic overview",
  },
  {
    label: "Doctors",
    to: "/center/doctors",
    icon: "Stethoscope",
    subtitle: "Assignments and invites",
  },
  {
    label: "Receptionists",
    to: "/center/receptionists",
    icon: "UsersRound",
    subtitle: "Desk staff and permissions",
  },
  {
    label: "Sessions",
    to: "/center/sessions",
    icon: "CalendarClock",
    subtitle: "Doctor schedules and capacity",
  },
  {
    label: "Appointments",
    to: "/center/appointments",
    icon: "ClipboardList",
    subtitle: "Daily booking overview",
  },
  {
    label: "Queues",
    to: "/center/queues",
    icon: "ListOrdered",
    subtitle: "Live queue visibility",
  },
  {
    label: "Settings",
    to: "/center/settings",
    icon: "Settings2",
    subtitle: "Profile and workflow info",
  },
];

export const PHARMACY_NAV_ITEMS: SidebarItem[] = [
  { label: "Dashboard", to: "/pharmacy/dashboard" },
  { label: "Inventory", to: "/pharmacy/inventory" },
  { label: "Orders", to: "/pharmacy/orders" },
];

export const RECEPTION_NAV_ITEMS: SidebarItem[] = [
  {
    label: "Dashboard",
    to: "/reception/dashboard",
    icon: "LayoutDashboard",
    subtitle: "Clinic desk overview",
  },
  {
    label: "Queues",
    to: "/reception/queues",
    icon: "ListOrdered",
    subtitle: "Live patient flow",
  },
  {
    label: "Visits",
    to: "/reception/visits",
    icon: "ClipboardList",
    subtitle: "Daily appointments",
  },
  {
    label: "Patients",
    to: "/reception/patients",
    icon: "UsersRound",
    subtitle: "Registration and lookup",
  },
  {
    label: "Session Coverage",
    to: "/reception/sessions",
    icon: "CalendarClock",
    subtitle: "Doctor session readiness",
  },
];

export const RECEPTION_HEADER_CONFIG: Record<string, ReceptionHeaderConfig> = {
  "/reception/dashboard": {
    title: "Dashboard",
    subtitle: "Today’s clinic desk overview",
    actions: [
      { label: "Open Queue", to: "/reception/queues", icon: "ListOrdered", primary: true },
      { label: "Add Walk-in", to: "/reception/queues?walkin=1", icon: "UserPlus" },
      { label: "Register Patient", to: "/reception/patients?register=1", icon: "UserRound" },
    ],
  },
  "/reception/queues": {
    title: "Queues",
    subtitle: "Manage live patient flow",
    actions: [
      { label: "Start Queue", to: "/reception/queues", icon: "Play", primary: true },
      { label: "Add Walk-in", to: "/reception/queues?walkin=1", icon: "UserPlus" },
      { label: "Call Next", to: "/reception/queues", icon: "SkipForward" },
    ],
  },
  "/reception/visits": {
    title: "Visits",
    subtitle: "Check-ins, late arrivals, and daily appointments",
    actions: [
      { label: "Check In", to: "/reception/visits", icon: "UserCheck", primary: true },
      { label: "Add Walk-in", to: "/reception/queues?walkin=1", icon: "UserPlus" },
    ],
  },
  "/reception/patients": {
    title: "Patients",
    subtitle: "Search, register, and attach patients to queue",
    actions: [
      { label: "Register Patient", to: "/reception/patients?register=1", icon: "UserPlus", primary: true },
    ],
  },
  "/reception/sessions": {
    title: "Session Coverage",
    subtitle: "Review doctor sessions and queue readiness",
    actions: [
      { label: "View Sessions", to: "/reception/sessions", icon: "CalendarClock", primary: true },
      { label: "Open Queue", to: "/reception/queues", icon: "ListOrdered" },
    ],
  },
};
