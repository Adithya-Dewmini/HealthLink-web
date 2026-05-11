import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Bell,
  Building2,
  CalendarDays,
  CheckCircle2,
  KeyRound,
  LogOut,
  RefreshCw,
  Settings,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { InlineAlert } from "../../components/reception/ReceptionUI";
import {
  getReceptionDashboard,
  getReceptionPermissions,
} from "../../services/reception.service";
import type {
  ReceptionCapabilityKey,
  ReceptionDashboardSummary,
  ReceptionPermissions,
} from "../../types/reception.types";

type ReceptionistProfile = {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  avatarUrl: string | null;
  role: "Receptionist";
  accountStatus: string;
  lastLoginAt: string | null;
};

type MedicalCenterAssignment = {
  id: string | null;
  name: string | null;
  branch: string | null;
  address: string | null;
  phone: string | null;
  assignedDesk: string | null;
};

type ReceptionistResponsibility = {
  id: string;
  label: string;
  description: string;
  enabled: boolean;
};

type NotificationPreference = {
  id: string;
  label: string;
  description: string;
  enabled: boolean;
};

type Notice = {
  tone: "success" | "danger" | "warning" | "info";
  message: string;
};

const defaultPreferences: NotificationPreference[] = [
  {
    id: "queue_alerts",
    label: "Queue alerts",
    description: "Queue started, paused, completed, or pressure alerts.",
    enabled: true,
  },
  {
    id: "session_changes",
    label: "Session changes",
    description: "Doctor arrival, delays, cancellations, and coverage updates.",
    enabled: true,
  },
  {
    id: "patient_booking_updates",
    label: "Patient booking updates",
    description: "Booking cancellations, check-ins, and walk-in additions.",
    enabled: true,
  },
  {
    id: "admin_responsibility_updates",
    label: "Admin responsibility updates",
    description: "Changes to your assigned access and front-desk duties.",
    enabled: true,
  },
  {
    id: "system_alerts",
    label: "System alerts",
    description: "Important HealthLink operational notices.",
    enabled: false,
  },
];

const responsibilityCopy: Record<ReceptionCapabilityKey, Omit<ReceptionistResponsibility, "enabled">> = {
  queue_access: {
    id: "queue_access",
    label: "Session queue control",
    description: "Start queues, call patients, add walk-ins, and manage live patient flow.",
  },
  appointments: {
    id: "appointments",
    label: "Booking management",
    description: "Review appointments, bookings, late arrivals, and visit outcomes.",
  },
  check_in: {
    id: "check_in",
    label: "Queue check-in",
    description: "Check in booked patients and confirm arrivals at the front desk.",
  },
  schedule_management: {
    id: "schedule_management",
    label: "Today session coverage",
    description: "Review doctor sessions and prepare queues for clinic coverage.",
  },
};

function dateLabel() {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date());
}

function getInitials(name: string) {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() || "")
      .join("") || "R"
  );
}

function formatRole(role: string) {
  return role
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatDateTime(value: string | null) {
  if (!value) return "Not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function buildResponsibilities(permissions: ReceptionPermissions | null): ReceptionistResponsibility[] {
  const keys: ReceptionCapabilityKey[] = ["queue_access", "appointments", "check_in", "schedule_management"];
  return keys.map((key) => ({
    ...responsibilityCopy[key],
    enabled: permissions ? Boolean(permissions[key]) : true,
  }));
}

function ActionButton({
  children,
  disabled,
  onClick,
  tone = "secondary",
}: {
  children: ReactNode;
  disabled?: boolean;
  onClick?: () => void;
  tone?: "primary" | "secondary" | "danger";
}) {
  const classes =
    tone === "primary"
      ? "border-[#0EA5E9] bg-[#0EA5E9] text-white hover:bg-[#0284C7]"
      : tone === "danger"
        ? "border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
        : "border-[#D8E7F3] bg-white text-[#0B3558] hover:bg-[#EFF8FF]";

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition ${classes} disabled:cursor-not-allowed disabled:opacity-45`}
    >
      {children}
    </button>
  );
}

function SettingsCard({
  children,
  eyebrow,
  icon: Icon,
  title,
}: {
  children: ReactNode;
  eyebrow: string;
  icon: typeof Settings;
  title: string;
}) {
  return (
    <section className="rounded-[28px] border border-[#D8E7F3] bg-white p-5 shadow-[0_18px_48px_rgba(6,26,46,0.06)]">
      <div className="flex items-start gap-3">
        <div className="rounded-2xl bg-[#EFF8FF] p-3 text-[#0EA5E9]">
          <Icon size={20} />
        </div>
        <div>
          <p className="text-sm font-semibold text-[#0EA5E9]">{eyebrow}</p>
          <h2 className="mt-1 text-2xl font-bold text-[#0F172A]">{title}</h2>
        </div>
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function ToggleRow({
  preference,
  onToggle,
}: {
  preference: NotificationPreference;
  onToggle: (id: string) => void;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-[#D8E7F3] bg-[#F8FAFC] p-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="font-semibold text-[#0F172A]">{preference.label}</p>
        <p className="mt-1 text-sm leading-6 text-[#64748B]">{preference.description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={preference.enabled}
        aria-label={`${preference.label} notifications`}
        onClick={() => onToggle(preference.id)}
        className={`relative h-8 w-14 rounded-full transition ${
          preference.enabled ? "bg-[#0EA5E9]" : "bg-[#CBD5E1]"
        }`}
      >
        <span
          className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition ${
            preference.enabled ? "left-7" : "left-1"
          }`}
        />
      </button>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="min-h-[calc(100vh-140px)] rounded-[32px] bg-[linear-gradient(180deg,#F8FAFC_0%,#EFF8FF_100%)] p-6">
      <div className="grid gap-4 xl:grid-cols-2">
        {[1, 2, 3, 4].map((item) => (
          <div key={item} className="h-48 animate-pulse rounded-3xl border border-[#D8E7F3] bg-white/80" />
        ))}
      </div>
    </div>
  );
}

export default function ReceptionSettingsPage() {
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  const [permissions, setPermissions] = useState<ReceptionPermissions | null>(null);
  const [dashboard, setDashboard] = useState<ReceptionDashboardSummary | null>(null);
  const [preferences, setPreferences] = useState<NotificationPreference[]>(defaultPreferences);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<Notice | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const permissionData = await getReceptionPermissions().catch(() => null);
      const dashboardData = await getReceptionDashboard().catch(() => null);
      setPermissions(permissionData);
      setDashboard(dashboardData);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const profile = useMemo<ReceptionistProfile>(() => {
    // TODO: Replace with real receptionist profile API when phone, avatar, and login metadata are exposed.
    return {
      id: user?.id || "receptionist",
      fullName: user?.name || "Receptionist",
      email: user?.email || "No email available",
      phone: null,
      avatarUrl: null,
      role: "Receptionist",
      accountStatus: user?.status || user?.verificationStatus || "active",
      lastLoginAt: null,
    };
  }, [user]);

  const assignment = useMemo<MedicalCenterAssignment>(() => {
    const clinic = dashboard?.clinic;
    return {
      id: clinic?.id || null,
      name: clinic?.name || null,
      branch: null,
      address: null,
      phone: null,
      assignedDesk: "Reception desk",
    };
  }, [dashboard]);

  const responsibilities = useMemo(() => buildResponsibilities(permissions), [permissions]);
  const enabledResponsibilities = responsibilities.filter((item) => item.enabled);

  const handleTogglePreference = (id: string) => {
    // TODO: Connect notification preferences to backend API.
    setPreferences((current) =>
      current.map((preference) =>
        preference.id === id ? { ...preference, enabled: !preference.enabled } : preference
      )
    );
    setNotice({ tone: "info", message: "Preference updated locally. Backend preference sync is not connected yet." });
  };

  const handleLogout = () => {
    if (!window.confirm("Log out from this device?")) return;
    logout();
    navigate("/login", { replace: true });
  };

  if (loading) return <LoadingState />;

  return (
    <div className="min-h-[calc(100vh-140px)] space-y-6 rounded-[32px] bg-[linear-gradient(180deg,#F8FAFC_0%,#EFF8FF_100%)] p-5 md:p-6">
      {notice ? <InlineAlert tone={notice.tone} message={notice.message} /> : null}

      <section className="rounded-[28px] border border-white/15 bg-[linear-gradient(135deg,#061A2E,#0B3558)] p-6 text-white shadow-[0_24px_70px_rgba(6,26,46,0.24)]">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold text-[#BAE6FD]">
              <Settings size={14} />
              Reception Desk
            </div>
            <h1 className="mt-4 text-3xl font-bold tracking-tight">Settings</h1>
            <p className="mt-2 text-sm text-sky-100">Manage your front-desk profile and preferences</p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm font-semibold">
            <CalendarDays size={16} />
            {dateLabel()}
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <SettingsCard eyebrow="Profile" icon={UserRound} title="Receptionist profile">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            {profile.avatarUrl ? (
              <img
                src={profile.avatarUrl}
                alt={profile.fullName}
                className="h-20 w-20 rounded-3xl object-cover"
              />
            ) : (
              <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-3xl border border-[#D8E7F3] bg-[#EFF8FF] text-2xl font-bold text-[#0B3558]">
                {getInitials(profile.fullName)}
              </div>
            )}
            <div>
              <h3 className="text-2xl font-bold text-[#0F172A]">{profile.fullName}</h3>
              <p className="mt-1 text-sm font-semibold text-[#64748B]">{profile.email}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">
                  {profile.role}
                </span>
                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold capitalize text-emerald-700">
                  {profile.accountStatus}
                </span>
              </div>
            </div>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-[#D8E7F3] bg-[#F8FAFC] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#64748B]">Phone</p>
              <p className="mt-2 font-semibold text-[#0F172A]">{profile.phone || "Not available"}</p>
            </div>
            <div className="rounded-2xl border border-[#D8E7F3] bg-[#F8FAFC] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#64748B]">Last login</p>
              <p className="mt-2 font-semibold text-[#0F172A]">{formatDateTime(profile.lastLoginAt)}</p>
            </div>
          </div>
        </SettingsCard>

        <SettingsCard eyebrow="Workplace" icon={Building2} title="Assigned medical center">
          {assignment.name ? (
            <div className="space-y-3">
              <div className="rounded-2xl border border-[#D8E7F3] bg-[#F8FAFC] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#64748B]">Medical center</p>
                <p className="mt-2 text-xl font-bold text-[#0F172A]">{assignment.name}</p>
                <p className="mt-1 text-sm text-[#64748B]">{assignment.branch || "Branch details not available"}</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-[#D8E7F3] bg-white p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#64748B]">Assigned desk</p>
                  <p className="mt-2 font-semibold text-[#0F172A]">{assignment.assignedDesk || "Not assigned"}</p>
                </div>
                <div className="rounded-2xl border border-[#D8E7F3] bg-white p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#64748B]">Contact</p>
                  <p className="mt-2 font-semibold text-[#0F172A]">{assignment.phone || "Not available"}</p>
                </div>
              </div>
              <p className="text-sm leading-6 text-[#64748B]">{assignment.address || "Address details are not exposed by the current receptionist API."}</p>
            </div>
          ) : (
            <InlineAlert
              tone="warning"
              message="You are not assigned to a medical center yet. Contact admin."
            />
          )}
        </SettingsCard>
      </div>

      <SettingsCard eyebrow="Access" icon={ShieldCheck} title="Responsibilities and permissions">
        <InlineAlert
          tone="info"
          message="Your responsibilities may have changed. Finish active tasks, then refresh access to load the latest permissions."
        />
        {!permissions ? (
          <p className="mt-4 text-sm leading-6 text-[#64748B]">
            TODO: Replace with real receptionist responsibility API data. Permission details could not be loaded, so the role defaults are shown.
          </p>
        ) : null}
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {responsibilities.map((responsibility) => (
            <div
              key={responsibility.id}
              className={`rounded-2xl border p-4 ${
                responsibility.enabled
                  ? "border-emerald-200 bg-emerald-50"
                  : "border-[#D8E7F3] bg-[#F8FAFC]"
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`mt-0.5 rounded-full p-1 ${
                    responsibility.enabled ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-500"
                  }`}
                >
                  <CheckCircle2 size={15} />
                </div>
                <div>
                  <p className="font-bold text-[#0F172A]">{responsibility.label}</p>
                  <p className="mt-1 text-sm leading-6 text-[#64748B]">{responsibility.description}</p>
                  <p className="mt-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#64748B]">
                    {responsibility.enabled ? "Enabled" : "Not assigned"}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </SettingsCard>

      <div className="grid gap-6 xl:grid-cols-2">
        <SettingsCard eyebrow="Security" icon={KeyRound} title="Password and session">
          <div className="space-y-3">
            <div className="rounded-2xl border border-[#D8E7F3] bg-[#F8FAFC] p-4">
              <p className="font-semibold text-[#0F172A]">Change password</p>
              <p className="mt-1 text-sm leading-6 text-[#64748B]">
                Password changes are managed through account recovery in the current auth flow.
              </p>
              <div className="mt-4">
                <Link
                  to="/reset-password"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#D8E7F3] bg-white px-4 py-2.5 text-sm font-semibold text-[#0B3558] transition hover:bg-[#EFF8FF]"
                >
                  <KeyRound size={14} />
                  Open Password Recovery
                </Link>
              </div>
            </div>
            <div className="rounded-2xl border border-[#D8E7F3] bg-[#F8FAFC] p-4">
              <p className="font-semibold text-[#0F172A]">Sign out from this device</p>
              <p className="mt-1 text-sm leading-6 text-[#64748B]">
                Uses the existing HealthLink logout flow and returns you to login.
              </p>
              <div className="mt-4">
                <ActionButton tone="danger" onClick={handleLogout}>
                  <LogOut size={14} />
                  Logout
                </ActionButton>
              </div>
            </div>
          </div>
        </SettingsCard>

        <SettingsCard eyebrow="Preferences" icon={Bell} title="Notification preferences">
          <div className="space-y-3">
            {preferences.map((preference) => (
              <ToggleRow
                key={preference.id}
                preference={preference}
                onToggle={handleTogglePreference}
              />
            ))}
          </div>
        </SettingsCard>
      </div>

      <SettingsCard eyebrow="Session" icon={RefreshCw} title="Access and app info">
        <div className="grid gap-3 md:grid-cols-4">
          <div className="rounded-2xl border border-[#D8E7F3] bg-[#F8FAFC] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#64748B]">Role</p>
            <p className="mt-2 font-bold text-[#0F172A]">{formatRole(user?.role || "receptionist")}</p>
          </div>
          <div className="rounded-2xl border border-[#D8E7F3] bg-[#F8FAFC] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#64748B]">Medical center</p>
            <p className="mt-2 font-bold text-[#0F172A]">{assignment.name || "Not assigned"}</p>
          </div>
          <div className="rounded-2xl border border-[#D8E7F3] bg-[#F8FAFC] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#64748B]">Permissions</p>
            <p className="mt-2 font-bold text-[#0F172A]">{enabledResponsibilities.length} enabled</p>
          </div>
          <div className="rounded-2xl border border-[#D8E7F3] bg-[#F8FAFC] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#64748B]">App version</p>
            <p className="mt-2 font-bold text-[#0F172A]">v2.4.1 Production</p>
          </div>
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <ActionButton onClick={() => void load()}>
            <RefreshCw size={14} />
            Refresh Access
          </ActionButton>
          <p className="text-sm leading-6 text-[#64748B]">
            Sign in again to load updated permissions if admin changes your responsibilities and refresh does not update them.
          </p>
        </div>
      </SettingsCard>
    </div>
  );
}
