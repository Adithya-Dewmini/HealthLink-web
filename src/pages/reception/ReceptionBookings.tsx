import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  Eye,
  Loader2,
  RotateCcw,
  Search,
  UserCheck,
  UserPlus,
  UserRoundX,
  Users,
} from "lucide-react";
import PermissionState from "../../components/reception/PermissionState";
import { InlineAlert } from "../../components/reception/ReceptionUI";
import {
  cancelVisit,
  checkInVisit,
  getReceptionPermissions,
  getReceptionSessions,
  getReceptionVisits,
  searchPatients,
} from "../../services/reception.service";
import type {
  ReceptionPatient,
  ReceptionPermissions,
  ReceptionSession,
  ReceptionVisit,
  ReceptionVisitsResult,
  VisitStatus,
} from "../../types/reception.types";

type BookingStatus = "booked" | "checked_in" | "rescheduled" | "cancelled" | "completed" | "missed";
type DateFilter = "today" | "tomorrow" | "week" | "custom";
type StatusFilter = "all" | BookingStatus;
type NoticeTone = "success" | "danger" | "warning" | "info";

type Booking = {
  id: number;
  patientId: number;
  patientName: string;
  patientPhone: string | null;
  bookingReference: string;
  doctorId: number;
  doctorName: string;
  specialization: string;
  roomNumber: string;
  appointmentDate: string;
  appointmentTime: string;
  sessionId: number | null;
  slotId: string;
  status: BookingStatus;
  checkInStatus: string;
  reason: string;
  notes: string;
  source?: ReceptionVisit;
};

type DoctorSessionOption = {
  id: number;
  doctorId: number;
  doctorName: string;
  specialization: string;
  roomNumber: string;
  startTime: string;
  endTime: string;
  status: "not_started" | "live" | "paused" | "completed";
  capacity: number;
  bookedCount: number;
};

type SlotOption = {
  id: string;
  time: string;
  isAvailable: boolean;
};

type BookingForm = {
  patientSearch: string;
  quickName: string;
  quickPhone: string;
  quickNic: string;
  quickAge: string;
  selectedPatientId: string;
  selectedSessionId: string;
  selectedSlotId: string;
  reason: string;
  notes: string;
};

type Notice = {
  tone: NoticeTone;
  message: string;
};

const TODAY = new Date().toISOString().slice(0, 10);

const blankForm: BookingForm = {
  patientSearch: "",
  quickName: "",
  quickPhone: "",
  quickNic: "",
  quickAge: "",
  selectedPatientId: "",
  selectedSessionId: "",
  selectedSlotId: "",
  reason: "",
  notes: "",
};

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

function addDays(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function statusFromVisit(status: VisitStatus): BookingStatus {
  if (status === "scheduled" || status === "late") return "booked";
  if (status === "checked_in" || status === "waiting" || status === "in_consultation") return "checked_in";
  if (status === "cancelled") return "cancelled";
  if (status === "completed") return "completed";
  if (status === "missed") return "missed";
  return "booked";
}

function statusLabel(status: BookingStatus) {
  const labels: Record<BookingStatus, string> = {
    booked: "Booked",
    checked_in: "Checked-in",
    rescheduled: "Rescheduled",
    cancelled: "Cancelled",
    completed: "Completed",
    missed: "Missed",
  };
  return labels[status];
}

function statusClasses(status: BookingStatus) {
  if (status === "booked") return "border-sky-200 bg-sky-50 text-sky-700";
  if (status === "checked_in") return "border-cyan-200 bg-cyan-50 text-cyan-700";
  if (status === "rescheduled") return "border-amber-200 bg-amber-50 text-amber-800";
  if (status === "completed") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  return "border-red-200 bg-red-50 text-red-700";
}

function buildRoomFallback(sessionId: number | null, doctorId: number) {
  const seed = sessionId || doctorId || 1;
  // TODO: Replace room fallback when bookings/session API returns room assignment.
  return `Room ${String((seed % 6) + 1).padStart(2, "0")}`;
}

function mapVisitToBooking(visit: ReceptionVisit): Booking {
  return {
    id: visit.bookingId,
    patientId: visit.patientId,
    patientName: visit.patientName,
    patientPhone: visit.patientPhone,
    bookingReference: visit.bookingNumber,
    doctorId: visit.doctorId,
    doctorName: visit.doctorName,
    specialization: visit.specialty || "General Medicine",
    roomNumber: buildRoomFallback(visit.sessionId, visit.doctorId),
    appointmentDate: visit.sessionDate,
    appointmentTime: visit.appointmentTime,
    sessionId: visit.sessionId,
    slotId: `${visit.sessionId || "visit"}-${visit.appointmentTime}`,
    status: statusFromVisit(visit.visitStatus),
    checkInStatus: visit.visitStatus,
    reason: visit.bookingSource || "Appointment",
    notes: "",
    source: visit,
  };
}

function mapSession(session: ReceptionSession): DoctorSessionOption {
  return {
    id: session.id,
    doctorId: session.doctorId,
    doctorName: session.doctorName,
    specialization: session.specialty || "General Medicine",
    roomNumber: buildRoomFallback(session.id, session.doctorId),
    startTime: session.startTime,
    endTime: session.endTime,
    status: session.queueStatus === "completed" ? "completed" : session.queueStatus,
    capacity: Math.max(session.appointmentCount + 6, 12),
    bookedCount: session.appointmentCount,
  };
}

function makePlaceholderSlots(session: DoctorSessionOption | null, bookings: Booking[]): SlotOption[] {
  if (!session) return [];
  // TODO: Replace placeholder slots with real availability API.
  const [startHour = 9, startMinute = 0] = session.startTime.split(":").map((part) => Number(part));
  const [endHour = startHour + 2, endMinute = 0] = session.endTime.split(":").map((part) => Number(part));
  const start = new Date();
  start.setHours(startHour, startMinute, 0, 0);
  const end = new Date();
  end.setHours(endHour, endMinute, 0, 0);

  const slots: SlotOption[] = [];
  const bookedTimes = new Set(
    bookings.filter((booking) => booking.sessionId === session.id).map((booking) => booking.appointmentTime.slice(0, 5))
  );
  let cursor = new Date(start);
  while (cursor < end && slots.length < 16) {
    const hh = String(cursor.getHours()).padStart(2, "0");
    const mm = String(cursor.getMinutes()).padStart(2, "0");
    const time = `${hh}:${mm}`;
    slots.push({ id: `${session.id}-${time}`, time, isAvailable: !bookedTimes.has(time) });
    cursor = new Date(cursor.getTime() + 30 * 60 * 1000);
  }
  return slots;
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

function ActionButton({
  children,
  disabled,
  onClick,
  tone = "secondary",
  type = "button",
}: {
  children: ReactNode;
  disabled?: boolean;
  onClick?: () => void;
  tone?: "primary" | "secondary" | "danger";
  type?: "button" | "submit";
}) {
  const classes =
    tone === "primary"
      ? "border-[#0EA5E9] bg-[#0EA5E9] text-white hover:bg-[#0284C7]"
      : tone === "danger"
        ? "border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
        : "border-[#D8E7F3] bg-white text-[#0B3558] hover:bg-[#EFF8FF]";

  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition ${classes} disabled:cursor-not-allowed disabled:opacity-45`}
    >
      {children}
    </button>
  );
}

function Field({ children, label, required }: { children: ReactNode; label: string; required?: boolean }) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-[#0B3558]">
        {label} {required ? <span className="text-[#EF4444]">*</span> : null}
      </span>
      <div className="mt-2">{children}</div>
    </label>
  );
}

function inputClass() {
  return "h-12 w-full rounded-2xl border border-[#D8E7F3] bg-white px-4 text-sm font-medium text-[#0F172A] outline-none transition placeholder:text-[#64748B] focus:border-[#0EA5E9]";
}

function StatusPill({ status }: { status: BookingStatus }) {
  return (
    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${statusClasses(status)}`}>
      {statusLabel(status)}
    </span>
  );
}

function Avatar({ name }: { name: string }) {
  return (
    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[#D8E7F3] bg-[#EFF8FF] text-sm font-bold text-[#0B3558]">
      {getInitials(name)}
    </div>
  );
}

function SummaryCard({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: number }) {
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

function EmptyBookings({ filtered }: { filtered: boolean }) {
  return (
    <div className="rounded-3xl border border-dashed border-[#B7DDF5] bg-[#F8FAFC] p-10 text-center">
      <h3 className="text-xl font-bold text-[#0F172A]">{filtered ? "No matching bookings." : "No bookings found."}</h3>
      <p className="mt-2 text-sm text-[#64748B]">
        {filtered ? "Try searching by patient name, phone, doctor, or booking reference." : "Create a new booking or adjust your filters."}
      </p>
    </div>
  );
}

function BookingCard({
  booking,
  busy,
  onCancel,
  onCheckIn,
  onReschedule,
  onView,
}: {
  booking: Booking;
  busy: boolean;
  onCancel: (booking: Booking) => void;
  onCheckIn: (booking: Booking) => void;
  onReschedule: (booking: Booking) => void;
  onView: (booking: Booking) => void;
}) {
  const canCheckIn = booking.appointmentDate === TODAY && booking.status === "booked";
  const canCancel = booking.status === "booked" || booking.status === "rescheduled";
  const canReschedule = booking.status === "booked" || booking.status === "rescheduled";

  return (
    <article className="rounded-3xl border border-[#D8E7F3] bg-white p-5 shadow-[0_14px_34px_rgba(6,26,46,0.05)]">
      <div className="grid gap-5 xl:grid-cols-[minmax(280px,1fr)_minmax(340px,1.2fr)_auto] xl:items-center">
        <div className="flex min-w-0 items-start gap-4">
          <Avatar name={booking.patientName} />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="truncate text-lg font-bold text-[#0F172A]">{booking.patientName}</h3>
              <StatusPill status={booking.status} />
            </div>
            <p className="mt-1 text-sm text-[#64748B]">{booking.patientPhone || "No phone"}</p>
            <p className="mt-2 text-xs font-semibold text-[#0B3558]">Ref {booking.bookingReference}</p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-[#D8E7F3] bg-[#F8FAFC] px-4 py-3">
            <p className="text-xs font-semibold text-[#64748B]">Doctor / Session</p>
            <p className="mt-1 font-bold text-[#0F172A]">{booking.doctorName}</p>
            <p className="mt-1 text-xs font-semibold text-[#64748B]">
              {booking.specialization} • {booking.roomNumber}
            </p>
          </div>
          <div className="rounded-2xl border border-[#D8E7F3] bg-[#F8FAFC] px-4 py-3">
            <p className="text-xs font-semibold text-[#64748B]">Appointment</p>
            <p className="mt-1 font-bold text-[#0F172A]">
              {booking.appointmentDate} • {formatClock(booking.appointmentTime)}
            </p>
            <p className="mt-1 text-xs font-semibold text-[#64748B]">Check-in: {booking.checkInStatus}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 xl:justify-end">
          <ActionButton disabled={busy} onClick={() => onView(booking)}>
            <Eye size={14} />
            View
          </ActionButton>
          <ActionButton disabled={busy || !canCheckIn} onClick={() => onCheckIn(booking)} tone="primary">
            <UserCheck size={14} />
            Check-in
          </ActionButton>
          <ActionButton disabled={busy || !canReschedule} onClick={() => onReschedule(booking)}>
            <RotateCcw size={14} />
            Reschedule
          </ActionButton>
          <ActionButton disabled={busy || !canCancel} onClick={() => onCancel(booking)} tone="danger">
            <UserRoundX size={14} />
            Cancel
          </ActionButton>
        </div>
      </div>
    </article>
  );
}

export default function ReceptionBookingsPage() {
  const [permissions, setPermissions] = useState<ReceptionPermissions | null>(null);
  const [visitsResult, setVisitsResult] = useState<ReceptionVisitsResult | null>(null);
  const [sessions, setSessions] = useState<DoctorSessionOption[]>([]);
  const [patients, setPatients] = useState<ReceptionPatient[]>([]);
  const [localBookings, setLocalBookings] = useState<Booking[]>([]);
  const [localStatusById, setLocalStatusById] = useState<Record<number, BookingStatus>>({});
  const [form, setForm] = useState<BookingForm>(blankForm);
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState<DateFilter>("today");
  const [customDate, setCustomDate] = useState(TODAY);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [doctorFilter, setDoctorFilter] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchingPatients, setSearchingPatients] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState<Notice | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [reschedulingBooking, setReschedulingBooking] = useState<Booking | null>(null);
  const [rescheduleSessionId, setRescheduleSessionId] = useState("");
  const [rescheduleSlotId, setRescheduleSlotId] = useState("");
  const [rescheduleReason, setRescheduleReason] = useState("");

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

      const [visits, sessionData] = await Promise.all([
        getReceptionVisits({ filter: "all", limit: 200 }),
        getReceptionSessions().catch(() => [] as ReceptionSession[]),
      ]);
      setVisitsResult(visits);
      setSessions(sessionData.map(mapSession));
      setError("");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to load bookings.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(async () => {
      const query = form.patientSearch.trim();
      if (!query) {
        setPatients([]);
        return;
      }
      setSearchingPatients(true);
      try {
        setPatients(await searchPatients(query));
      } catch (caughtError) {
        setNotice({
          tone: "danger",
          message: caughtError instanceof Error ? caughtError.message : "Unable to search patients.",
        });
      } finally {
        setSearchingPatients(false);
      }
    }, 300);

    return () => window.clearTimeout(timeout);
  }, [form.patientSearch]);

  const bookings = useMemo(() => {
    const apiBookings = (visitsResult?.visits || []).map(mapVisitToBooking);
    return [...localBookings, ...apiBookings].map((booking) =>
      localStatusById[booking.id] ? { ...booking, status: localStatusById[booking.id] } : booking
    );
  }, [localBookings, localStatusById, visitsResult?.visits]);

  const selectedSession = useMemo(
    () => sessions.find((session) => String(session.id) === form.selectedSessionId) || null,
    [form.selectedSessionId, sessions]
  );
  const slotOptions = useMemo(() => makePlaceholderSlots(selectedSession, bookings), [bookings, selectedSession]);

  const rescheduleSession = useMemo(
    () => sessions.find((session) => String(session.id) === rescheduleSessionId) || null,
    [rescheduleSessionId, sessions]
  );
  const rescheduleSlots = useMemo(() => makePlaceholderSlots(rescheduleSession, bookings), [bookings, rescheduleSession]);

  const doctors = useMemo(() => {
    const map = new Map<number, string>();
    bookings.forEach((booking) => map.set(booking.doctorId, booking.doctorName));
    sessions.forEach((session) => map.set(session.doctorId, session.doctorName));
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [bookings, sessions]);

  const filteredBookings = useMemo(() => {
    const query = search.trim().toLowerCase();
    const tomorrow = addDays(1);
    const weekEnd = addDays(7);
    return bookings.filter((booking) => {
      const dateMatches =
        dateFilter === "today"
          ? booking.appointmentDate === TODAY
          : dateFilter === "tomorrow"
            ? booking.appointmentDate === tomorrow
            : dateFilter === "week"
              ? booking.appointmentDate >= TODAY && booking.appointmentDate <= weekEnd
              : booking.appointmentDate === customDate;

      if (!dateMatches) return false;
      if (statusFilter !== "all" && booking.status !== statusFilter) return false;
      if (doctorFilter && String(booking.doctorId) !== doctorFilter) return false;
      if (!query) return true;
      return [
        booking.patientName,
        booking.patientPhone || "",
        booking.bookingReference,
        booking.doctorName,
        booking.specialization,
        String(booking.sessionId || ""),
      ].some((value) => value.toLowerCase().includes(query));
    });
  }, [bookings, customDate, dateFilter, doctorFilter, search, statusFilter]);

  const summary = useMemo(
    () => ({
      today: bookings.filter((booking) => booking.appointmentDate === TODAY).length,
      upcoming: bookings.filter((booking) => booking.appointmentDate >= TODAY && booking.status === "booked").length,
      checkedIn: bookings.filter((booking) => booking.status === "checked_in").length,
      cancelled: bookings.filter((booking) => booking.status === "cancelled").length,
      rescheduled: bookings.filter((booking) => booking.status === "rescheduled").length,
    }),
    [bookings]
  );

  const selectPatient = (patient: ReceptionPatient) => {
    setForm((current) => ({
      ...current,
      selectedPatientId: String(patient.id),
      patientSearch: patient.fullName || patient.name,
      quickName: patient.fullName || patient.name,
      quickPhone: patient.phone || "",
      quickNic: patient.nic || "",
    }));
    setPatients([]);
  };

  const validateForm = () => {
    if (!form.selectedPatientId && !form.quickName.trim()) return "Select a patient or create a quick patient profile.";
    if (!form.selectedSessionId) return "Select a doctor session.";
    if (!form.selectedSlotId) return "Select an available slot.";
    if (!form.reason.trim()) return "Reason for visit is required.";
    return "";
  };

  const handleCreateBooking = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const validationError = validateForm();
    if (validationError) {
      setNotice({ tone: "warning", message: validationError });
      return;
    }
    if (!selectedSession) return;

    // TODO: Connect create booking to backend API.
    const selectedSlot = slotOptions.find((slot) => slot.id === form.selectedSlotId);
    const nextBooking: Booking = {
      id: Date.now(),
      patientId: Number(form.selectedPatientId || Date.now()),
      patientName: form.quickName.trim() || form.patientSearch.trim(),
      patientPhone: form.quickPhone.trim() || null,
      bookingReference: `LOCAL-${Date.now().toString().slice(-6)}`,
      doctorId: selectedSession.doctorId,
      doctorName: selectedSession.doctorName,
      specialization: selectedSession.specialization,
      roomNumber: selectedSession.roomNumber,
      appointmentDate: TODAY,
      appointmentTime: selectedSlot?.time || selectedSession.startTime,
      sessionId: selectedSession.id,
      slotId: form.selectedSlotId,
      status: "booked",
      checkInStatus: "scheduled",
      reason: form.reason.trim(),
      notes: form.notes.trim(),
    };

    setLocalBookings((current) => [nextBooking, ...current]);
    setNotice({ tone: "success", message: "Booking created successfully." });
    setForm(blankForm);
    setFormOpen(false);
  };

  const handleCheckIn = async (booking: Booking) => {
    if (!booking.source) {
      setLocalStatusById((current) => ({ ...current, [booking.id]: "checked_in" }));
      setNotice({ tone: "success", message: "Booking checked in locally." });
      return;
    }

    setBusy(true);
    try {
      const response = await checkInVisit(booking.source.bookingId);
      setNotice({ tone: "success", message: response.message || "Patient checked in." });
      await load();
    } catch (caughtError) {
      setNotice({ tone: "danger", message: caughtError instanceof Error ? caughtError.message : "Could not check in booking." });
    } finally {
      setBusy(false);
    }
  };

  const handleCancel = async (booking: Booking) => {
    const confirmed = window.confirm(`Cancel booking ${booking.bookingReference} for ${booking.patientName}?`);
    if (!confirmed) return;

    if (!booking.source) {
      setLocalStatusById((current) => ({ ...current, [booking.id]: "cancelled" }));
      setNotice({ tone: "success", message: "Booking cancelled locally." });
      return;
    }

    setBusy(true);
    try {
      const response = await cancelVisit(booking.source.bookingId);
      setNotice({ tone: "success", message: response.message || "Booking cancelled." });
      await load();
    } catch (caughtError) {
      setNotice({ tone: "danger", message: caughtError instanceof Error ? caughtError.message : "Could not cancel booking." });
    } finally {
      setBusy(false);
    }
  };

  const openReschedule = (booking: Booking) => {
    setReschedulingBooking(booking);
    setRescheduleSessionId(booking.sessionId ? String(booking.sessionId) : "");
    setRescheduleSlotId("");
    setRescheduleReason("");
  };

  const submitReschedule = () => {
    if (!reschedulingBooking || !rescheduleSession || !rescheduleSlotId) {
      setNotice({ tone: "warning", message: "Select a new session and slot." });
      return;
    }

    const selectedSlot = rescheduleSlots.find((slot) => slot.id === rescheduleSlotId);
    // TODO: Connect reschedule booking to backend API.
    setLocalStatusById((current) => ({ ...current, [reschedulingBooking.id]: "rescheduled" }));
    setLocalBookings((current) =>
      current.map((booking) =>
        booking.id === reschedulingBooking.id
          ? {
              ...booking,
              doctorId: rescheduleSession.doctorId,
              doctorName: rescheduleSession.doctorName,
              specialization: rescheduleSession.specialization,
              roomNumber: rescheduleSession.roomNumber,
              sessionId: rescheduleSession.id,
              appointmentTime: selectedSlot?.time || rescheduleSession.startTime,
              slotId: rescheduleSlotId,
              status: "rescheduled",
              notes: rescheduleReason || booking.notes,
            }
          : booking
      )
    );
    setNotice({ tone: "success", message: "Booking rescheduled successfully." });
    setReschedulingBooking(null);
  };

  if (loading) return <LoadingState />;

  if (error) {
    return (
      <div className="space-y-4">
        <InlineAlert tone="danger" message={error} />
        <ActionButton onClick={() => void load()} tone="primary">Retry</ActionButton>
      </div>
    );
  }

  if (!permissions?.appointments) {
    return (
      <PermissionState
        title="Bookings are not assigned"
        message="This receptionist account cannot manage appointments until bookings access is enabled."
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
              <CalendarDays size={14} />
              Reception Desk
            </div>
            <h1 className="mt-4 text-3xl font-bold tracking-tight">Bookings</h1>
            <p className="mt-2 text-sm text-sky-100">Create and manage patient appointments</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <div className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm font-semibold">
              <CalendarDays size={16} />
              {formatDateLabel()}
            </div>
            <button
              type="button"
              onClick={() => setFormOpen((current) => !current)}
              className="inline-flex items-center gap-2 rounded-2xl border border-[#0EA5E9] bg-[#0EA5E9] px-4 py-3 text-sm font-semibold text-white hover:bg-[#0284C7]"
            >
              <UserPlus size={16} />
              New Booking
            </button>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <SummaryCard icon={CalendarDays} label="Today Bookings" value={summary.today} />
        <SummaryCard icon={Clock3} label="Upcoming" value={summary.upcoming} />
        <SummaryCard icon={UserCheck} label="Checked-in" value={summary.checkedIn} />
        <SummaryCard icon={UserRoundX} label="Cancelled" value={summary.cancelled} />
        <SummaryCard icon={RotateCcw} label="Rescheduled" value={summary.rescheduled} />
      </section>

      {formOpen ? (
        <section className="rounded-[28px] border border-[#D8E7F3] bg-white p-5 shadow-[0_18px_48px_rgba(6,26,46,0.06)]">
          <p className="text-sm font-semibold text-[#0EA5E9]">Create booking</p>
          <h2 className="mt-1 text-2xl font-bold text-[#0F172A]">New appointment</h2>
          <form className="mt-5 space-y-5" onSubmit={handleCreateBooking}>
            <div className="grid gap-4 lg:grid-cols-2">
              <Field label="Search/select patient" required>
                <div className="relative">
                  <input
                    value={form.patientSearch}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, patientSearch: event.target.value, selectedPatientId: "" }))
                    }
                    placeholder="Search existing patient by name, phone, or NIC"
                    className={inputClass()}
                  />
                  {searchingPatients ? (
                    <Loader2 size={16} className="absolute right-4 top-4 animate-spin text-[#0EA5E9]" />
                  ) : null}
                </div>
                {patients.length > 0 ? (
                  <div className="mt-2 grid gap-2">
                    {patients.slice(0, 4).map((patient) => (
                      <button
                        key={patient.id}
                        type="button"
                        onClick={() => selectPatient(patient)}
                        className="rounded-2xl border border-[#D8E7F3] bg-[#F8FAFC] p-3 text-left text-sm font-semibold text-[#0F172A] hover:border-[#0EA5E9]"
                      >
                        {patient.fullName || patient.name} • {patient.phone || "No phone"}
                      </button>
                    ))}
                  </div>
                ) : form.patientSearch.trim() ? (
                  <p className="mt-2 rounded-2xl border border-dashed border-[#B7DDF5] bg-[#F8FAFC] px-4 py-3 text-sm font-semibold text-[#64748B]">
                    Create quick patient profile
                  </p>
                ) : null}
              </Field>

              <Field label="Quick patient name">
                <input
                  value={form.quickName}
                  onChange={(event) => setForm((current) => ({ ...current, quickName: event.target.value }))}
                  className={inputClass()}
                  placeholder="Name for quick profile"
                />
              </Field>
              <Field label="Quick patient phone">
                <input
                  value={form.quickPhone}
                  onChange={(event) => setForm((current) => ({ ...current, quickPhone: event.target.value }))}
                  className={inputClass()}
                  placeholder="Phone"
                />
              </Field>
              <Field label="NIC optional">
                <input
                  value={form.quickNic}
                  onChange={(event) => setForm((current) => ({ ...current, quickNic: event.target.value }))}
                  className={inputClass()}
                  placeholder="NIC"
                />
              </Field>
              <Field label="Age optional">
                <input
                  value={form.quickAge}
                  onChange={(event) => setForm((current) => ({ ...current, quickAge: event.target.value }))}
                  className={inputClass()}
                  placeholder="Age"
                  inputMode="numeric"
                />
              </Field>
              <Field label="Select doctor/session" required>
                <select
                  value={form.selectedSessionId}
                  onChange={(event) => setForm((current) => ({ ...current, selectedSessionId: event.target.value, selectedSlotId: "" }))}
                  className={inputClass()}
                >
                  <option value="">Select session</option>
                  {sessions.map((session) => (
                    <option key={session.id} value={session.id} disabled={session.status === "completed"}>
                      {session.doctorName} • {session.specialization} • {session.roomNumber} • {formatClock(session.startTime)} - {formatClock(session.endTime)}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Available slot" required>
                <select
                  value={form.selectedSlotId}
                  onChange={(event) => setForm((current) => ({ ...current, selectedSlotId: event.target.value }))}
                  className={inputClass()}
                  disabled={!selectedSession}
                >
                  <option value="">Select slot</option>
                  {slotOptions.map((slot) => (
                    <option key={slot.id} value={slot.id} disabled={!slot.isAvailable}>
                      {formatClock(slot.time)} {slot.isAvailable ? "" : "• booked"}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <Field label="Reason for visit" required>
              <textarea
                value={form.reason}
                onChange={(event) => setForm((current) => ({ ...current, reason: event.target.value }))}
                className="min-h-24 w-full rounded-2xl border border-[#D8E7F3] bg-white px-4 py-3 text-sm font-medium text-[#0F172A] outline-none placeholder:text-[#64748B] focus:border-[#0EA5E9]"
                placeholder="Reason for appointment"
              />
            </Field>
            <Field label="Notes">
              <textarea
                value={form.notes}
                onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
                className="min-h-20 w-full rounded-2xl border border-[#D8E7F3] bg-white px-4 py-3 text-sm font-medium text-[#0F172A] outline-none placeholder:text-[#64748B] focus:border-[#0EA5E9]"
                placeholder="Optional notes"
              />
            </Field>
            <ActionButton type="submit" tone="primary">
              <CheckCircle2 size={16} />
              Confirm Booking
            </ActionButton>
          </form>
        </section>
      ) : null}

      <section className="rounded-[28px] border border-[#D8E7F3] bg-white p-5 shadow-[0_18px_48px_rgba(6,26,46,0.06)]">
        <p className="text-sm font-semibold text-[#0EA5E9]">Booking search</p>
        <h2 className="mt-1 text-2xl font-bold text-[#0F172A]">Find appointments</h2>
        <div className="mt-5 grid gap-3 xl:grid-cols-[minmax(0,1fr)_160px_170px_180px_180px]">
          <label className="flex h-12 items-center gap-3 rounded-2xl border border-[#D8E7F3] bg-white px-4">
            <Search size={17} className="text-[#64748B]" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search patient, phone, booking ref, doctor, or session"
              className="w-full bg-transparent text-sm font-medium text-[#0F172A] outline-none placeholder:text-[#64748B]"
            />
          </label>
          <select value={dateFilter} onChange={(event) => setDateFilter(event.target.value as DateFilter)} className={inputClass()}>
            <option value="today">Today</option>
            <option value="tomorrow">Tomorrow</option>
            <option value="week">This Week</option>
            <option value="custom">Custom</option>
          </select>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as StatusFilter)} className={inputClass()}>
            <option value="all">All statuses</option>
            <option value="booked">Booked</option>
            <option value="checked_in">Checked-in</option>
            <option value="cancelled">Cancelled</option>
            <option value="rescheduled">Rescheduled</option>
            <option value="completed">Completed</option>
            <option value="missed">Missed</option>
          </select>
          <select value={doctorFilter} onChange={(event) => setDoctorFilter(event.target.value)} className={inputClass()}>
            <option value="">All doctors</option>
            {doctors.map((doctor) => (
              <option key={doctor.id} value={doctor.id}>{doctor.name}</option>
            ))}
          </select>
          {dateFilter === "custom" ? (
            <input type="date" value={customDate} onChange={(event) => setCustomDate(event.target.value)} className={inputClass()} />
          ) : (
            <ActionButton onClick={() => void load()}>
              <RotateCcw size={15} />
              Refresh
            </ActionButton>
          )}
        </div>
      </section>

      <section className="rounded-[28px] border border-[#D8E7F3] bg-white p-5 shadow-[0_18px_48px_rgba(6,26,46,0.06)]">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold text-[#0EA5E9]">Bookings list</p>
            <h2 className="mt-1 text-2xl font-bold text-[#0F172A]">Appointments</h2>
          </div>
          <p className="text-sm font-semibold text-[#64748B]">{filteredBookings.length} shown</p>
        </div>
        <div className="mt-5 space-y-3">
          {bookings.length === 0 ? (
            <EmptyBookings filtered={false} />
          ) : filteredBookings.length === 0 ? (
            <EmptyBookings filtered />
          ) : (
            filteredBookings.map((booking) => (
              <BookingCard
                key={booking.id}
                booking={booking}
                busy={busy}
                onCancel={handleCancel}
                onCheckIn={(target) => void handleCheckIn(target)}
                onReschedule={openReschedule}
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
                ["Phone", selectedBooking.patientPhone || "Not recorded"],
                ["Doctor", selectedBooking.doctorName],
                ["Specialty", selectedBooking.specialization],
                ["Room", selectedBooking.roomNumber],
                ["Date/time", `${selectedBooking.appointmentDate} ${formatClock(selectedBooking.appointmentTime)}`],
                ["Check-in", selectedBooking.checkInStatus],
                ["Reason", selectedBooking.reason],
                ["Notes", selectedBooking.notes || "None"],
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

      {reschedulingBooking ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-[#061A2E]/45 px-4 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-[28px] border border-[#D8E7F3] bg-white p-6 shadow-2xl">
            <p className="text-sm font-semibold text-[#0EA5E9]">Reschedule booking</p>
            <h2 className="mt-1 text-2xl font-bold text-[#0F172A]">{reschedulingBooking.patientName}</h2>
            <p className="mt-2 text-sm text-[#64748B]">
              Current: {reschedulingBooking.appointmentDate} {formatClock(reschedulingBooking.appointmentTime)}
            </p>
            <div className="mt-5 space-y-4">
              <Field label="New session" required>
                <select value={rescheduleSessionId} onChange={(event) => setRescheduleSessionId(event.target.value)} className={inputClass()}>
                  <option value="">Select session</option>
                  {sessions.map((session) => (
                    <option key={session.id} value={session.id}>
                      {session.doctorName} • {session.specialization} • {formatClock(session.startTime)} - {formatClock(session.endTime)}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="New slot" required>
                <select value={rescheduleSlotId} onChange={(event) => setRescheduleSlotId(event.target.value)} className={inputClass()}>
                  <option value="">Select slot</option>
                  {rescheduleSlots.map((slot) => (
                    <option key={slot.id} value={slot.id} disabled={!slot.isAvailable}>
                      {formatClock(slot.time)} {slot.isAvailable ? "" : "• booked"}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Reason optional">
                <textarea
                  value={rescheduleReason}
                  onChange={(event) => setRescheduleReason(event.target.value)}
                  className="min-h-20 w-full rounded-2xl border border-[#D8E7F3] bg-white px-4 py-3 text-sm font-medium text-[#0F172A] outline-none placeholder:text-[#64748B] focus:border-[#0EA5E9]"
                  placeholder="Reason for reschedule"
                />
              </Field>
              <div className="flex flex-wrap justify-end gap-2">
                <ActionButton onClick={() => setReschedulingBooking(null)}>Cancel</ActionButton>
                <ActionButton onClick={submitReschedule} tone="primary">Save Reschedule</ActionButton>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
