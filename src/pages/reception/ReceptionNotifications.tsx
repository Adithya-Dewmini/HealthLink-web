import { useMemo, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import {
  Activity,
  AlertTriangle,
  Bell,
  BellRing,
  CalendarDays,
  CheckCheck,
  CircleDot,
  ClipboardList,
  Info,
  Settings,
  UserCheck,
  Users,
} from "lucide-react";
import { InlineAlert } from "../../components/reception/ReceptionUI";

type NotificationType =
  | "doctor_delayed"
  | "doctor_arrived"
  | "queue_started"
  | "queue_paused"
  | "queue_completed"
  | "patient_cancelled_booking"
  | "patient_checked_in"
  | "walk_in_added"
  | "session_limit_reached"
  | "responsibility_changed"
  | "system";

type NotificationPriority = "low" | "normal" | "high" | "urgent";
type NotificationFilter = "all" | "unread" | "sessions" | "queue" | "patients" | "admin" | "system";
type NoticeTone = "success" | "danger" | "warning" | "info";

type ReceptionNotification = {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  priority: NotificationPriority;
  isRead: boolean;
  createdAt: string;
  relatedSessionId: number | null;
  relatedPatientId: number | null;
  relatedBookingId: number | null;
  relatedQueueId: number | null;
};

type Notice = {
  tone: NoticeTone;
  message: string;
};

const placeholderNotifications: ReceptionNotification[] = [
  {
    id: "notif-101",
    title: "Doctor delayed",
    message: "Dr. Nimal Perera is delayed by 20 minutes for Room 02.",
    type: "doctor_delayed",
    priority: "high",
    isRead: false,
    createdAt: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
    relatedSessionId: 101,
    relatedPatientId: null,
    relatedBookingId: null,
    relatedQueueId: 501,
  },
  {
    id: "notif-102",
    title: "Queue started",
    message: "Queue is now live for Dr. Ishara Fernando.",
    type: "queue_started",
    priority: "normal",
    isRead: false,
    createdAt: new Date(Date.now() - 26 * 60 * 1000).toISOString(),
    relatedSessionId: 102,
    relatedPatientId: null,
    relatedBookingId: null,
    relatedQueueId: 502,
  },
  {
    id: "notif-103",
    title: "Patient cancelled booking",
    message: "Saman Kumara cancelled today's 10:30 AM appointment.",
    type: "patient_cancelled_booking",
    priority: "normal",
    isRead: true,
    createdAt: new Date(Date.now() - 76 * 60 * 1000).toISOString(),
    relatedSessionId: 101,
    relatedPatientId: 301,
    relatedBookingId: 9001,
    relatedQueueId: null,
  },
  {
    id: "notif-104",
    title: "Walk-in added",
    message: "A priority walk-in patient was added to the pediatrics queue.",
    type: "walk_in_added",
    priority: "high",
    isRead: false,
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    relatedSessionId: 103,
    relatedPatientId: 302,
    relatedBookingId: null,
    relatedQueueId: 503,
  },
  {
    id: "notif-105",
    title: "Session limit reached",
    message: "Room 04 has reached the configured patient limit for the afternoon session.",
    type: "session_limit_reached",
    priority: "urgent",
    isRead: false,
    createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    relatedSessionId: 104,
    relatedPatientId: null,
    relatedBookingId: null,
    relatedQueueId: 504,
  },
  {
    id: "notif-106",
    title: "Responsibility changed",
    message: "Your assigned front-desk responsibilities were updated by admin.",
    type: "responsibility_changed",
    priority: "urgent",
    isRead: false,
    createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    relatedSessionId: null,
    relatedPatientId: null,
    relatedBookingId: null,
    relatedQueueId: null,
  },
  {
    id: "notif-107",
    title: "System notice",
    message: "Keep the sessions and queue panels in sync before calling the next patient.",
    type: "system",
    priority: "low",
    isRead: true,
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    relatedSessionId: null,
    relatedPatientId: null,
    relatedBookingId: null,
    relatedQueueId: null,
  },
];

const filterLabels: Record<NotificationFilter, string> = {
  all: "All",
  unread: "Unread",
  sessions: "Sessions",
  queue: "Queue",
  patients: "Patients",
  admin: "Admin",
  system: "System",
};

function dateLabel() {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date());
}

function timeAgo(value: string) {
  const diffMinutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60000));
  if (diffMinutes < 1) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes} min ago`;
  const hours = Math.floor(diffMinutes / 60);
  if (hours < 24) return `${hours} hr${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

function typeLabel(type: NotificationType) {
  const labels: Record<NotificationType, string> = {
    doctor_delayed: "Doctor delayed",
    doctor_arrived: "Doctor arrived",
    queue_started: "Queue started",
    queue_paused: "Queue paused",
    queue_completed: "Queue completed",
    patient_cancelled_booking: "Booking cancelled",
    patient_checked_in: "Patient checked-in",
    walk_in_added: "Walk-in added",
    session_limit_reached: "Session limit",
    responsibility_changed: "Responsibility changed",
    system: "System",
  };
  return labels[type];
}

function filterForType(type: NotificationType): NotificationFilter {
  if (type === "doctor_delayed" || type === "doctor_arrived" || type === "session_limit_reached") return "sessions";
  if (type === "queue_started" || type === "queue_paused" || type === "queue_completed") return "queue";
  if (type === "patient_cancelled_booking" || type === "patient_checked_in" || type === "walk_in_added") return "patients";
  if (type === "responsibility_changed") return "admin";
  return "system";
}

function priorityClasses(priority: NotificationPriority) {
  if (priority === "urgent") return "border-red-200 bg-red-50 text-red-700";
  if (priority === "high") return "border-amber-200 bg-amber-50 text-amber-800";
  if (priority === "normal") return "border-sky-200 bg-sky-50 text-sky-700";
  return "border-slate-200 bg-slate-100 text-slate-700";
}

function notificationIcon(type: NotificationType) {
  if (type === "doctor_delayed" || type === "session_limit_reached") return AlertTriangle;
  if (type === "doctor_arrived" || type === "patient_checked_in") return UserCheck;
  if (type === "queue_started" || type === "queue_paused" || type === "queue_completed") return Activity;
  if (type === "patient_cancelled_booking" || type === "walk_in_added") return Users;
  if (type === "responsibility_changed") return Settings;
  return Info;
}

function relatedPath(notification: ReceptionNotification) {
  if (notification.type === "responsibility_changed") return "/receptionist/settings";
  if (filterForType(notification.type) === "sessions" && notification.relatedSessionId) {
    return `/receptionist/sessions/${notification.relatedSessionId}`;
  }
  if (filterForType(notification.type) === "queue") {
    return notification.relatedSessionId
      ? `/receptionist/queue/${notification.relatedSessionId}`
      : "/receptionist/live-queue";
  }
  if (notification.type === "patient_cancelled_booking") return "/receptionist/bookings";
  if (filterForType(notification.type) === "patients" && notification.relatedPatientId) {
    return `/receptionist/patients/${notification.relatedPatientId}`;
  }
  return "/receptionist/dashboard";
}

function relatedActionLabel(notification: ReceptionNotification) {
  if (notification.type === "responsibility_changed") return "Open Settings";
  if (filterForType(notification.type) === "sessions") return "Open Session";
  if (filterForType(notification.type) === "queue") return "Open Queue";
  if (notification.type === "patient_cancelled_booking") return "Open Bookings";
  if (filterForType(notification.type) === "patients") return "Open Patient";
  return "Open Dashboard";
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
  tone?: "primary" | "secondary";
}) {
  const classes =
    tone === "primary"
      ? "border-[#0EA5E9] bg-[#0EA5E9] text-white hover:bg-[#0284C7]"
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

function SummaryCard({ icon: Icon, label, value }: { icon: typeof Bell; label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-[#D8E7F3] bg-white p-4 shadow-[0_14px_34px_rgba(6,26,46,0.06)]">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-[#64748B]">{label}</p>
          <p className="mt-2 text-2xl font-bold text-[#0F172A]">{value}</p>
        </div>
        <div className="rounded-2xl bg-[#EFF8FF] p-3 text-[#0EA5E9]">
          <Icon size={18} />
        </div>
      </div>
    </div>
  );
}

function EmptyState({ filtered }: { filtered: boolean }) {
  return (
    <div className="rounded-3xl border border-dashed border-[#B7DDF5] bg-[#F8FAFC] p-10 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#EFF8FF] text-[#0EA5E9]">
        <Bell size={24} />
      </div>
      <h3 className="mt-4 text-xl font-bold text-[#0F172A]">
        {filtered ? "No notifications in this category." : "No notifications yet."}
      </h3>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-[#64748B]">
        {filtered
          ? "Try selecting a different filter."
          : "Clinic updates, queue alerts, and patient changes will appear here."}
      </p>
    </div>
  );
}

export default function ReceptionNotificationsPage() {
  const navigate = useNavigate();
  // TODO: Replace with real receptionist notifications API.
  const [notifications, setNotifications] = useState<ReceptionNotification[]>(placeholderNotifications);
  const [activeFilter, setActiveFilter] = useState<NotificationFilter>("all");
  const [notice, setNotice] = useState<Notice | null>(null);

  // TODO: Subscribe to realtime receptionist notifications when socket client is available.

  const counts = useMemo(() => {
    return {
      unread: notifications.filter((item) => !item.isRead).length,
      sessions: notifications.filter((item) => filterForType(item.type) === "sessions").length,
      queue: notifications.filter((item) => filterForType(item.type) === "queue").length,
      patients: notifications.filter((item) => filterForType(item.type) === "patients").length,
      admin: notifications.filter((item) => filterForType(item.type) === "admin").length,
      system: notifications.filter((item) => filterForType(item.type) === "system").length,
    };
  }, [notifications]);

  const filteredNotifications = useMemo(() => {
    if (activeFilter === "all") return notifications;
    if (activeFilter === "unread") return notifications.filter((item) => !item.isRead);
    return notifications.filter((item) => filterForType(item.type) === activeFilter);
  }, [activeFilter, notifications]);

  const markAsRead = (id: string) => {
    // TODO: Connect mark-as-read actions to backend API.
    setNotifications((current) => current.map((item) => (item.id === id ? { ...item, isRead: true } : item)));
    setNotice({ tone: "success", message: "Notification marked as read." });
  };

  const markAllAsRead = () => {
    // TODO: Connect mark-all-as-read to notifications API.
    setNotifications((current) => current.map((item) => ({ ...item, isRead: true })));
    setNotice({ tone: "success", message: "All notifications marked as read." });
  };

  return (
    <div className="min-h-[calc(100vh-140px)] space-y-6 rounded-[32px] bg-[linear-gradient(180deg,#F8FAFC_0%,#EFF8FF_100%)] p-5 md:p-6">
      {notice ? <InlineAlert tone={notice.tone} message={notice.message} /> : null}

      <section className="rounded-[28px] border border-white/15 bg-[linear-gradient(135deg,#061A2E,#0B3558)] p-6 text-white shadow-[0_24px_70px_rgba(6,26,46,0.24)]">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold text-[#BAE6FD]">
              <BellRing size={14} />
              Reception Desk
            </div>
            <h1 className="mt-4 text-3xl font-bold tracking-tight">Notifications</h1>
            <p className="mt-2 text-sm text-sky-100">Track clinic updates and front-desk alerts</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm font-semibold">
              <CalendarDays size={16} />
              {dateLabel()}
            </div>
            <button
              type="button"
              disabled={counts.unread === 0}
              onClick={markAllAsRead}
              className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white px-4 py-3 text-sm font-bold text-[#0B3558] transition hover:bg-[#EFF8FF] disabled:cursor-not-allowed disabled:opacity-45"
            >
              <CheckCheck size={16} />
              Mark all as read
            </button>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <SummaryCard icon={BellRing} label="Unread" value={counts.unread} />
        <SummaryCard icon={CalendarDays} label="Session Alerts" value={counts.sessions} />
        <SummaryCard icon={Activity} label="Queue Alerts" value={counts.queue} />
        <SummaryCard icon={Users} label="Patient Updates" value={counts.patients} />
        <SummaryCard icon={Settings} label="Admin Updates" value={counts.admin} />
      </section>

      <section className="rounded-[28px] border border-[#D8E7F3] bg-white p-4 shadow-[0_18px_48px_rgba(6,26,46,0.06)]">
        <div className="flex flex-wrap gap-2">
          {(Object.keys(filterLabels) as NotificationFilter[]).map((filter) => {
            const count =
              filter === "all"
                ? notifications.length
                : filter === "unread"
                  ? counts.unread
                  : counts[filter];
            const isActive = activeFilter === filter;
            return (
              <button
                key={filter}
                type="button"
                onClick={() => setActiveFilter(filter)}
                className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition ${
                  isActive
                    ? "border-[#0EA5E9] bg-[#EFF8FF] text-[#0B3558] shadow-[0_10px_22px_rgba(14,165,233,0.14)]"
                    : "border-[#D8E7F3] bg-white text-[#64748B] hover:bg-[#F8FAFC]"
                }`}
              >
                {filterLabels[filter]}
                <span className={isActive ? "text-[#0EA5E9]" : "text-[#64748B]"}>{count}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="rounded-[28px] border border-[#D8E7F3] bg-white p-5 shadow-[0_18px_48px_rgba(6,26,46,0.06)]">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-[#0EA5E9]">Alert center</p>
            <h2 className="mt-1 text-2xl font-bold text-[#0F172A]">Clinic notifications</h2>
          </div>
          <p className="text-sm font-semibold text-[#64748B]">{filteredNotifications.length} visible</p>
        </div>

        <div className="mt-5 space-y-3">
          {filteredNotifications.length === 0 ? (
            <EmptyState filtered={activeFilter !== "all"} />
          ) : (
            filteredNotifications.map((notification) => {
              const Icon = notificationIcon(notification.type);
              const category = filterForType(notification.type);
              return (
                <article
                  key={notification.id}
                  className={`rounded-3xl border p-5 shadow-[0_14px_34px_rgba(6,26,46,0.05)] ${
                    notification.isRead ? "border-[#D8E7F3] bg-white" : "border-[#0EA5E9] bg-[#EFF8FF]"
                  }`}
                >
                  <div className="grid gap-4 xl:grid-cols-[auto_minmax(0,1fr)_auto] xl:items-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[#D8E7F3] bg-white text-[#0EA5E9]">
                      <Icon size={20} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        {!notification.isRead ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-[#0EA5E9] px-2.5 py-1 text-xs font-bold text-white">
                            <CircleDot size={12} />
                            Unread
                          </span>
                        ) : null}
                        <span className="rounded-full border border-[#D8E7F3] bg-white px-3 py-1 text-xs font-semibold text-[#0B3558]">
                          {typeLabel(notification.type)}
                        </span>
                        <span className={`rounded-full border px-3 py-1 text-xs font-semibold capitalize ${priorityClasses(notification.priority)}`}>
                          {notification.priority}
                        </span>
                        <span className="text-xs font-semibold text-[#64748B]">{timeAgo(notification.createdAt)}</span>
                      </div>
                      <h3 className={`mt-3 text-lg text-[#0F172A] ${notification.isRead ? "font-semibold" : "font-bold"}`}>
                        {notification.title}
                      </h3>
                      <p className="mt-1 text-sm leading-6 text-[#64748B]">{notification.message}</p>
                      <p className="mt-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#64748B]">{filterLabels[category]}</p>
                      {notification.type === "responsibility_changed" ? (
                        <div className="mt-4 rounded-2xl border border-[#B7DDF5] bg-white px-4 py-3 text-sm font-semibold leading-6 text-[#0B3558]">
                          Your responsibilities have changed. Finish any active task, then refresh or sign in again to load the latest access.
                        </div>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap gap-2 xl:justify-end">
                      <ActionButton
                        disabled={notification.isRead}
                        onClick={() => markAsRead(notification.id)}
                      >
                        <CheckCheck size={14} />
                        Mark as Read
                      </ActionButton>
                      <ActionButton
                        tone="primary"
                        onClick={() => navigate(relatedPath(notification))}
                      >
                        <ClipboardList size={14} />
                        {relatedActionLabel(notification)}
                      </ActionButton>
                    </div>
                  </div>
                </article>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}
