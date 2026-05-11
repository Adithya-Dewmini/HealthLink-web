import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  CalendarDays,
  Clock3,
  Eye,
  QrCode,
  RotateCcw,
  Search,
  SendToBack,
  UserCheck,
  UserRoundX,
  Users,
} from "lucide-react";
import PermissionState from "../../components/reception/PermissionState";
import { InlineAlert } from "../../components/reception/ReceptionUI";
import {
  cancelVisit,
  checkInVisit,
  getReceptionPermissions,
  getReceptionVisits,
  markVisitMissed,
} from "../../services/reception.service";
import type {
  ReceptionPermissions,
  ReceptionVisit,
  ReceptionVisitsResult,
  VisitStatus,
} from "../../types/reception.types";

type BookingStatus = "booked" | "checked_in" | "late" | "missed" | "cancelled" | "completed";
type SessionFilter = "all" | "morning" | "afternoon" | "evening" | "late" | "not_checked_in";
type NoticeTone = "success" | "danger" | "warning" | "info";

type CheckInBooking = {
  id: number;
  bookingId: number;
  patientId: number;
  patientName: string;
  patientImageUrl: string | null;
  age: number | null;
  phone: string | null;
  nic: string | null;
  bookingReference: string;
  appointmentTime: string;
  doctorName: string;
  specialization: string;
  roomNumber: string;
  sessionId: number | null;
  queueNumber: number | null;
  status: BookingStatus;
  bookingType: "Appointment";
  source: ReceptionVisit;
};

type Notice = {
  tone: NoticeTone;
  message: string;
};

const filters: Array<{ key: SessionFilter; label: string }> = [
  { key: "all", label: "All Sessions" },
  { key: "morning", label: "Morning" },
  { key: "afternoon", label: "Afternoon" },
  { key: "evening", label: "Evening" },
  { key: "late", label: "Late Only" },
  { key: "not_checked_in", label: "Not Checked-in" },
];

function formatDateLabel() {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date());
}

function formatClock(value: string | null | undefined) {
  if (!value) return "Not set";
  const [hourPart = "0", minutePart = "00"] = String(value).split(":");
  const hour = Number(hourPart);
  if (!Number.isFinite(hour)) return value;
  const minute = minutePart.padStart(2, "0").slice(0, 2);
  const period = hour >= 12 ? "PM" : "AM";
  return `${hour % 12 || 12}:${minute} ${period}`;
}

function getInitials(name: string) {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() || "")
      .join("") || "PT"
  );
}

function buildRoomFallback(visit: ReceptionVisit) {
  // TODO: Replace room fallback when receptionist check-in API returns room assignment.
  return visit.sessionId ? `Room ${String((visit.sessionId % 6) + 1).padStart(2, "0")}` : "Room not set";
}

function mapStatus(status: VisitStatus): BookingStatus {
  if (status === "scheduled") return "booked";
  if (status === "checked_in" || status === "waiting" || status === "in_consultation") return "checked_in";
  if (status === "late") return "late";
  if (status === "missed") return "missed";
  if (status === "cancelled") return "cancelled";
  return "completed";
}

function statusLabel(status: BookingStatus) {
  const labels: Record<BookingStatus, string> = {
    booked: "Booked",
    checked_in: "Checked-in",
    late: "Late",
    missed: "Missed",
    cancelled: "Cancelled",
    completed: "Completed",
  };
  return labels[status];
}

function statusClasses(status: BookingStatus) {
  if (status === "booked") return "border-slate-200 bg-slate-100 text-slate-700";
  if (status === "checked_in") return "border-sky-200 bg-sky-50 text-sky-700";
  if (status === "late") return "border-amber-200 bg-amber-50 text-amber-800";
  if (status === "completed") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  return "border-red-200 bg-red-50 text-red-700";
}

function mapVisitToBooking(visit: ReceptionVisit): CheckInBooking {
  return {
    id: visit.appointmentId,
    bookingId: visit.bookingId,
    patientId: visit.patientId,
    patientName: visit.patientName,
    patientImageUrl: null,
    age: null,
    phone: visit.patientPhone,
    nic: visit.patientNic || null,
    bookingReference: visit.bookingNumber,
    appointmentTime: visit.appointmentTime,
    doctorName: visit.doctorName,
    specialization: visit.specialty || "General Medicine",
    roomNumber: buildRoomFallback(visit),
    sessionId: visit.sessionId,
    queueNumber: visit.tokenNumber,
    status: mapStatus(visit.visitStatus),
    bookingType: "Appointment",
    source: visit,
  };
}

function isPastLateThreshold(booking: CheckInBooking) {
  if (booking.status !== "booked") return false;
  const [hourPart = "0", minutePart = "0"] = booking.appointmentTime.split(":");
  const hour = Number(hourPart);
  const minute = Number(minutePart);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return false;
  const appointment = new Date();
  appointment.setHours(hour, minute, 0, 0);
  return Date.now() - appointment.getTime() > 15 * 60 * 1000;
}

function matchesSessionFilter(booking: CheckInBooking, filter: SessionFilter) {
  if (filter === "all") return true;
  if (filter === "late") return booking.status === "late" || isPastLateThreshold(booking);
  if (filter === "not_checked_in") return booking.status === "booked" || booking.status === "late";

  const hour = Number(booking.appointmentTime.split(":")[0] || 0);
  if (filter === "morning") return hour < 12;
  if (filter === "afternoon") return hour >= 12 && hour < 17;
  return hour >= 17;
}

function StatusPill({ status }: { status: BookingStatus }) {
  return (
    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${statusClasses(status)}`}>
      {statusLabel(status)}
    </span>
  );
}

function Avatar({ imageUrl, name }: { imageUrl: string | null; name: string }) {
  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt={name}
        className="h-12 w-12 rounded-2xl border border-[#D8E7F3] object-cover shadow-sm"
      />
    );
  }

  return (
    <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[#D8E7F3] bg-[#EFF8FF] text-sm font-bold text-[#0B3558] shadow-sm">
      {getInitials(name)}
    </div>
  );
}

function ActionButton({
  children,
  disabled,
  onClick,
  tone = "secondary",
}: {
  children: ReactNode;
  disabled?: boolean;
  onClick: () => void;
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
      className={`inline-flex items-center justify-center gap-2 rounded-xl border px-3.5 py-2 text-sm font-semibold transition ${classes} disabled:cursor-not-allowed disabled:opacity-45`}
    >
      {children}
    </button>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Users;
  label: string;
  value: number;
}) {
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

function LoadingState() {
  return (
    <div className="min-h-[calc(100vh-140px)] rounded-[32px] bg-[linear-gradient(180deg,#F8FAFC_0%,#EFF8FF_100%)] p-6">
      <div className="space-y-4">
        {[1, 2, 3].map((item) => (
          <div key={item} className="h-32 animate-pulse rounded-3xl border border-[#D8E7F3] bg-white/80" />
        ))}
      </div>
    </div>
  );
}

function EmptyState({
  filtered,
  onReset,
}: {
  filtered: boolean;
  onReset: () => void;
}) {
  return (
    <div className="rounded-3xl border border-dashed border-[#B7DDF5] bg-[#F8FAFC] p-10 text-center">
      <h3 className="text-xl font-bold text-[#0F172A]">
        {filtered ? "No matching bookings found." : "No booked patients for today."}
      </h3>
      <p className="mt-2 text-sm text-[#64748B]">
        {filtered
          ? "Try searching by name, phone, NIC, or booking reference."
          : "Patients with appointments for today will appear here."}
      </p>
      {filtered ? (
        <button
          type="button"
          onClick={onReset}
          className="mt-5 rounded-xl border border-[#D8E7F3] bg-white px-4 py-2 text-sm font-semibold text-[#0B3558] hover:bg-[#EFF8FF]"
        >
          Reset search
        </button>
      ) : null}
    </div>
  );
}

function BookingCard({
  booking,
  busy,
  onCancel,
  onCheckIn,
  onMarkLate,
  onMarkMissed,
  onMoveToEnd,
  onView,
  permissions,
}: {
  booking: CheckInBooking;
  busy: boolean;
  onCancel: (booking: CheckInBooking) => void;
  onCheckIn: (booking: CheckInBooking) => void;
  onMarkLate: (booking: CheckInBooking) => void;
  onMarkMissed: (booking: CheckInBooking) => void;
  onMoveToEnd: (booking: CheckInBooking) => void;
  onView: (booking: CheckInBooking) => void;
  permissions: ReceptionPermissions;
}) {
  const lateWarning = isPastLateThreshold(booking);
  const canCheckIn = permissions.check_in && (booking.status === "booked" || booking.status === "late");
  const canMarkLate = permissions.check_in && booking.status === "booked" && lateWarning;
  const canMoveToEnd = permissions.queue_access && (booking.status === "late" || booking.status === "checked_in");
  const canMarkMissed = booking.status === "booked" || booking.status === "late";
  const canCancel = booking.status === "booked" || booking.status === "late";

  return (
    <article className="rounded-3xl border border-[#D8E7F3] bg-white p-5 shadow-[0_14px_34px_rgba(6,26,46,0.05)]">
      <div className="grid gap-5 xl:grid-cols-[minmax(280px,1fr)_minmax(320px,1.2fr)_auto] xl:items-center">
        <div className="flex min-w-0 items-start gap-4">
          <Avatar imageUrl={booking.patientImageUrl} name={booking.patientName} />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="truncate text-lg font-bold text-[#0F172A]">{booking.patientName}</h3>
              <StatusPill status={booking.status} />
            </div>
            <p className="mt-1 text-sm text-[#64748B]">
              {booking.age ? `${booking.age} years` : booking.phone || "No phone"}{" "}
              {booking.nic ? `• NIC ${booking.nic}` : ""}
            </p>
            <p className="mt-2 text-xs font-semibold text-[#0B3558]">
              Ref {booking.bookingReference} {booking.queueNumber ? `• Queue #${booking.queueNumber}` : ""}
            </p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-[#D8E7F3] bg-[#F8FAFC] px-4 py-3">
            <p className="text-xs font-semibold text-[#64748B]">Appointment</p>
            <p className="mt-1 font-bold text-[#0F172A]">{formatClock(booking.appointmentTime)}</p>
            <p className="mt-1 text-xs font-semibold text-[#64748B]">{booking.bookingType}</p>
          </div>
          <div className="rounded-2xl border border-[#D8E7F3] bg-[#F8FAFC] px-4 py-3">
            <p className="text-xs font-semibold text-[#64748B]">Doctor / Session</p>
            <p className="mt-1 font-bold text-[#0F172A]">{booking.doctorName}</p>
            <p className="mt-1 text-xs font-semibold text-[#64748B]">
              {booking.specialization} • {booking.roomNumber}
            </p>
          </div>
        </div>

        <div className="space-y-3 xl:text-right">
          {lateWarning ? (
            <p className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
              Patient may be late.
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2 xl:justify-end">
            <ActionButton disabled={busy || !canCheckIn} onClick={() => onCheckIn(booking)} tone="primary">
              <UserCheck size={14} />
              Check-in Patient
            </ActionButton>
            <ActionButton disabled={busy || !canMarkLate} onClick={() => onMarkLate(booking)}>
              <Clock3 size={14} />
              Mark Late
            </ActionButton>
            <ActionButton disabled={busy || !canMoveToEnd} onClick={() => onMoveToEnd(booking)}>
              <SendToBack size={14} />
              Move to End
            </ActionButton>
            <ActionButton disabled={busy || !canMarkMissed} onClick={() => onMarkMissed(booking)} tone="danger">
              <UserRoundX size={14} />
              Mark Missed
            </ActionButton>
            <ActionButton disabled={busy || !canCancel} onClick={() => onCancel(booking)} tone="danger">
              <AlertTriangle size={14} />
              Cancel
            </ActionButton>
            <ActionButton disabled={busy} onClick={() => onView(booking)}>
              <Eye size={14} />
              View Details
            </ActionButton>
          </div>
        </div>
      </div>
    </article>
  );
}

export default function ReceptionCheckInPage() {
  const [permissions, setPermissions] = useState<ReceptionPermissions | null>(null);
  const [visitsResult, setVisitsResult] = useState<ReceptionVisitsResult | null>(null);
  const [localStatusByBookingId, setLocalStatusByBookingId] = useState<Record<number, BookingStatus>>({});
  const [search, setSearch] = useState("");
  const [bookingReference, setBookingReference] = useState("");
  const [activeFilter, setActiveFilter] = useState<SessionFilter>("all");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState<Notice | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<CheckInBooking | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const permissionData = await getReceptionPermissions();
      setPermissions(permissionData);

      if (!permissionData.appointments) {
        setVisitsResult(null);
        setError("");
        return;
      }

      const data = await getReceptionVisits({ filter: "today", limit: 150 });
      setVisitsResult(data);
      setError("");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to load check-in bookings.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const bookings = useMemo(() => {
    return (visitsResult?.visits || []).map((visit) => {
      const mapped = mapVisitToBooking(visit);
      return localStatusByBookingId[mapped.bookingId]
        ? { ...mapped, status: localStatusByBookingId[mapped.bookingId] }
        : mapped;
    });
  }, [localStatusByBookingId, visitsResult?.visits]);

  const filteredBookings = useMemo(() => {
    const query = search.trim().toLowerCase();
    const referenceQuery = bookingReference.trim().toLowerCase();

    return bookings.filter((booking) => {
      if (!matchesSessionFilter(booking, activeFilter)) return false;

      const searchable = [
        booking.patientName,
        booking.phone || "",
        booking.nic || "",
        booking.bookingReference,
        booking.queueNumber ? String(booking.queueNumber) : "",
        booking.doctorName,
        booking.specialization,
      ].map((value) => value.toLowerCase());

      const matchesSearch = !query || searchable.some((value) => value.includes(query));
      const matchesReference = !referenceQuery || booking.bookingReference.toLowerCase().includes(referenceQuery);
      return matchesSearch && matchesReference;
    });
  }, [activeFilter, bookingReference, bookings, search]);

  const summary = useMemo(
    () => ({
      todayBookings: bookings.length,
      checkedIn: bookings.filter((booking) => booking.status === "checked_in").length,
      notArrived: bookings.filter((booking) => booking.status === "booked").length,
      late: bookings.filter((booking) => booking.status === "late" || isPastLateThreshold(booking)).length,
      missed: bookings.filter((booking) => booking.status === "missed").length,
    }),
    [bookings]
  );

  const runAction = async (
    fallback: string,
    action: () => Promise<{ message: string }>,
    successMessage?: string
  ) => {
    setBusy(true);
    try {
      const response = await action();
      setNotice({ tone: "success", message: successMessage || response.message });
      await load();
    } catch (caughtError) {
      setNotice({ tone: "danger", message: caughtError instanceof Error ? caughtError.message : fallback });
    } finally {
      setBusy(false);
    }
  };

  const handleCheckIn = (booking: CheckInBooking) => {
    const confirmed = window.confirm(
      `Check in ${booking.patientName} for ${booking.doctorName} at ${formatClock(booking.appointmentTime)}?`
    );
    if (!confirmed) return;

    void runAction(
      "Could not check in patient. Please try again.",
      () => checkInVisit(booking.bookingId),
      "Patient checked in and added to waiting queue."
    );
  };

  const handleMarkLate = (booking: CheckInBooking) => {
    // TODO: Connect late-arrival status to backend API when a safe endpoint is available.
    setLocalStatusByBookingId((current) => ({ ...current, [booking.bookingId]: "late" }));
    setNotice({ tone: "warning", message: `${booking.patientName} marked late locally.` });
  };

  const handleMoveToEnd = (booking: CheckInBooking) => {
    // TODO: Connect move-to-end queue ordering to backend API when available.
    setNotice({ tone: "info", message: `${booking.patientName} moved to end locally.` });
  };

  const handleMarkMissed = (booking: CheckInBooking) => {
    const confirmed = window.confirm(`Mark ${booking.patientName} as missed?`);
    if (!confirmed) return;
    void runAction("Could not mark patient missed.", () => markVisitMissed(booking.bookingId));
  };

  const handleCancel = (booking: CheckInBooking) => {
    const confirmed = window.confirm(`Cancel booking ${booking.bookingReference} for ${booking.patientName}?`);
    if (!confirmed) return;
    void runAction("Could not cancel booking.", () => cancelVisit(booking.bookingId));
  };

  const resetFilters = () => {
    setSearch("");
    setBookingReference("");
    setActiveFilter("all");
  };

  if (loading) return <LoadingState />;

  if (error) {
    return (
      <div className="space-y-4">
        <InlineAlert tone="danger" message={error} />
        <button
          type="button"
          onClick={() => void load()}
          className="rounded-xl bg-[#0EA5E9] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0284C7]"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!permissions?.appointments) {
    return (
      <PermissionState
        title="Check-in is not assigned"
        message="This receptionist account does not have appointment access for patient check-in."
      />
    );
  }

  return (
    <div className="min-h-[calc(100vh-140px)] space-y-6 rounded-[32px] bg-[linear-gradient(180deg,#F8FAFC_0%,#EFF8FF_100%)] p-5 md:p-6">
      {notice ? <InlineAlert tone={notice.tone} message={notice.message} /> : null}

      <section className="rounded-[28px] border border-white/15 bg-[linear-gradient(135deg,#061A2E,#0B3558)] p-6 text-white shadow-[0_24px_70px_rgba(6,26,46,0.24)]">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold text-[#BAE6FD]">
              <UserCheck size={14} />
              Front Desk
            </div>
            <h1 className="mt-4 text-3xl font-bold tracking-tight">Patient Check-in</h1>
            <p className="mt-2 text-sm text-sky-100">Find booked patients and move arrivals into today&apos;s queue</p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm font-semibold">
            <CalendarDays size={16} />
            {formatDateLabel()}
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <SummaryCard icon={Users} label="Today Bookings" value={summary.todayBookings} />
        <SummaryCard icon={UserCheck} label="Checked-in" value={summary.checkedIn} />
        <SummaryCard icon={Clock3} label="Not Arrived" value={summary.notArrived} />
        <SummaryCard icon={AlertTriangle} label="Late" value={summary.late} />
        <SummaryCard icon={UserRoundX} label="Missed" value={summary.missed} />
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="rounded-[28px] border border-[#D8E7F3] bg-white p-5 shadow-[0_18px_48px_rgba(6,26,46,0.06)]">
          <p className="text-sm font-semibold text-[#0EA5E9]">Arrival search</p>
          <h2 className="mt-1 text-2xl font-bold text-[#0F172A]">Find booked patient</h2>
          <label className="mt-5 flex h-14 items-center gap-3 rounded-2xl border border-[#D8E7F3] bg-white px-4">
            <Search size={18} className="text-[#64748B]" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by patient name, phone, NIC, booking ref, or queue number"
              className="w-full bg-transparent text-sm font-medium text-[#0F172A] outline-none placeholder:text-[#64748B]"
            />
          </label>
          <div className="mt-4 flex flex-wrap gap-2">
            {filters.map((filter) => {
              const selected = activeFilter === filter.key;
              return (
                <button
                  key={filter.key}
                  type="button"
                  onClick={() => setActiveFilter(filter.key)}
                  className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                    selected
                      ? "border-[#0EA5E9] bg-[#EFF8FF] text-[#0B3558]"
                      : "border-[#D8E7F3] bg-white text-[#64748B] hover:bg-[#F8FAFC]"
                  }`}
                >
                  {filter.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="rounded-[28px] border border-[#D8E7F3] bg-white p-5 shadow-[0_18px_48px_rgba(6,26,46,0.06)]">
          <p className="text-sm font-semibold text-[#0EA5E9]">Quick scan</p>
          <h2 className="mt-1 text-2xl font-bold text-[#0F172A]">Booking reference</h2>
          <label className="mt-5 block">
            <span className="sr-only">Booking reference</span>
            <input
              value={bookingReference}
              onChange={(event) => setBookingReference(event.target.value)}
              placeholder="Enter booking ref"
              className="h-12 w-full rounded-2xl border border-[#D8E7F3] px-4 text-sm font-medium text-[#0F172A] outline-none placeholder:text-[#64748B]"
            />
          </label>
          <button
            type="button"
            disabled
            className="mt-3 inline-flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-xl border border-[#D8E7F3] bg-[#F8FAFC] px-4 py-3 text-sm font-semibold text-[#64748B]"
          >
            <QrCode size={16} />
            Scan Booking QR
          </button>
          <p className="mt-3 text-xs leading-5 text-[#64748B]">
            TODO: Connect booking QR scanner.
          </p>
        </div>
      </section>

      <section className="rounded-[28px] border border-[#D8E7F3] bg-white p-5 shadow-[0_18px_48px_rgba(6,26,46,0.06)]">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold text-[#0EA5E9]">Today booked patients</p>
            <h2 className="mt-1 text-2xl font-bold text-[#0F172A]">Arrival check-in list</h2>
          </div>
          <button
            type="button"
            onClick={() => void load()}
            className="inline-flex items-center gap-2 rounded-xl border border-[#D8E7F3] bg-white px-4 py-2 text-sm font-semibold text-[#0B3558] hover:bg-[#EFF8FF]"
          >
            <RotateCcw size={15} />
            Refresh
          </button>
        </div>

        <div className="mt-5 space-y-3">
          {bookings.length === 0 ? (
            <EmptyState filtered={false} onReset={resetFilters} />
          ) : filteredBookings.length === 0 ? (
            <EmptyState filtered onReset={resetFilters} />
          ) : (
            filteredBookings.map((booking) => (
              <BookingCard
                key={booking.bookingId}
                booking={booking}
                busy={busy}
                permissions={permissions}
                onCancel={handleCancel}
                onCheckIn={handleCheckIn}
                onMarkLate={handleMarkLate}
                onMarkMissed={handleMarkMissed}
                onMoveToEnd={handleMoveToEnd}
                onView={setSelectedBooking}
              />
            ))
          )}
        </div>
      </section>

      {selectedBooking ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-[#061A2E]/45 px-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-[28px] border border-[#D8E7F3] bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-[#0EA5E9]">Booking details</p>
                <h2 className="mt-1 text-2xl font-bold text-[#0F172A]">{selectedBooking.patientName}</h2>
                <p className="mt-1 text-sm text-[#64748B]">{selectedBooking.bookingReference}</p>
              </div>
              <StatusPill status={selectedBooking.status} />
            </div>
            <div className="mt-6 grid gap-3 md:grid-cols-2">
              {[
                ["Phone", selectedBooking.phone || "Not recorded"],
                ["NIC", selectedBooking.nic || "Not recorded"],
                ["Doctor", selectedBooking.doctorName],
                ["Specialty", selectedBooking.specialization],
                ["Room", selectedBooking.roomNumber],
                ["Appointment time", formatClock(selectedBooking.appointmentTime)],
                ["Queue number", selectedBooking.queueNumber ? `#${selectedBooking.queueNumber}` : "Not queued"],
                ["Booking type", selectedBooking.bookingType],
              ].map(([label, value]) => (
                <div key={label} className="rounded-2xl border border-[#D8E7F3] bg-[#F8FAFC] p-4">
                  <p className="text-xs font-semibold text-[#64748B]">{label}</p>
                  <p className="mt-1 font-bold text-[#0F172A]">{value}</p>
                </div>
              ))}
            </div>
            <div className="mt-6 flex justify-end">
              <ActionButton onClick={() => setSelectedBooking(null)}>Close</ActionButton>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
