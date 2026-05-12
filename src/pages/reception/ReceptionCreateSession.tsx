import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  DoorOpen,
  Loader2,
  PencilLine,
  Plus,
  Sparkles,
  Stethoscope,
  Trash2,
  UserRound,
  Users,
  X,
} from "lucide-react";
import PermissionState from "../../components/reception/PermissionState";
import { ConfirmDialog, InlineAlert } from "../../components/reception/ReceptionUI";
import {
  createReceptionManualSession,
  getReceptionPermissions,
  getReceptionSessionSchedules,
  getReceptionSessionDoctors,
  getReceptionSessionRoutine,
  getReceptionSessions,
  saveReceptionSessionRoutine,
} from "../../services/reception.service";
import type {
  ReceptionPermissions,
  ReceptionRoutineDay,
  ReceptionSession,
  ReceptionSessionDoctor,
  ReceptionSessionSchedule,
} from "../../types/reception.types";

type DoctorOption = {
  id: number;
  name: string;
  specialization: string;
  avatarUrl?: string | null;
  doctorUserId: number;
  medicalCenterId?: string | null;
};

type WeekDay = {
  key: string;
  label: string;
  shortLabel: string;
  index: number;
};

type ScheduleFormState = {
  startTime: string;
  endTime: string;
  roomNumber: string;
  maxPatients: string;
  slotDuration: string;
  notes: string;
};

type WeeklyScheduleItem = {
  id: string;
  doctorId: number;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  roomNumber: string;
  maxPatients: number;
  slotDuration?: number;
  notes?: string;
  isActive: boolean;
};

type AdditionalSession = {
  id: string;
  doctorId: number;
  date: string;
  startTime: string;
  endTime: string;
  roomNumber: string;
  maxPatients: number;
  notes?: string;
  status: "not_started";
};

type ExtraSessionForm = {
  doctorId: string;
  date: string;
  startTime: string;
  endTime: string;
  roomNumber: string;
  maxPatients: string;
  notes: string;
};

type Notice = {
  tone: "success" | "danger" | "warning" | "info";
  message: string;
};

type WeeklyErrors = Partial<Record<keyof ScheduleFormState, string>>;
type ExtraErrors = Partial<Record<keyof ExtraSessionForm, string>>;

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const pad = (value: number) => String(value).padStart(2, "0");

const formatLocalDateKey = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

const TODAY = formatLocalDateKey(new Date());

const weekDays: WeekDay[] = [
  { key: "monday", label: "Monday", shortLabel: "MON", index: 1 },
  { key: "tuesday", label: "Tuesday", shortLabel: "TUE", index: 2 },
  { key: "wednesday", label: "Wednesday", shortLabel: "WED", index: 3 },
  { key: "thursday", label: "Thursday", shortLabel: "THU", index: 4 },
  { key: "friday", label: "Friday", shortLabel: "FRI", index: 5 },
  { key: "saturday", label: "Saturday", shortLabel: "SAT", index: 6 },
  { key: "sunday", label: "Sunday", shortLabel: "SUN", index: 0 },
];

const initialWeeklyForm: ScheduleFormState = {
  startTime: "",
  endTime: "",
  roomNumber: "",
  maxPatients: "",
  slotDuration: "15",
  notes: "",
};

const initialExtraForm: ExtraSessionForm = {
  doctorId: "",
  date: TODAY,
  startTime: "",
  endTime: "",
  roomNumber: "",
  maxPatients: "",
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

function parseSessionDate(value?: string | null) {
  const raw = String(value || "").trim();
  if (!raw) return null;

  if (DATE_ONLY_PATTERN.test(raw)) {
    const [year, month, day] = raw.split("-").map(Number);
    const parsed = new Date(year, month - 1, day);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) return parsed;

  const datePortion = raw.split("T")[0] || raw;
  if (DATE_ONLY_PATTERN.test(datePortion)) {
    const [year, month, day] = datePortion.split("-").map(Number);
    const normalized = new Date(year, month - 1, day);
    return Number.isNaN(normalized.getTime()) ? null : normalized;
  }

  return null;
}

function formatClock(value: string) {
  const [hourPart = "0", minutePart = "00"] = String(value || "").split(":");
  const hour = Number(hourPart);
  if (Number.isNaN(hour)) return value || "Not set";
  const minute = minutePart.padStart(2, "0").slice(0, 2);
  return `${hour % 12 || 12}:${minute} ${hour >= 12 ? "PM" : "AM"}`;
}

function formatSessionDate(value: string) {
  if (!value) return "Not set";
  const parsed = parseSessionDate(value);
  if (!parsed) return value;

  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(parsed);
}

function getDurationMinutes(startTime: string, endTime: string) {
  const [startHour = "0", startMinute = "0"] = startTime.split(":");
  const [endHour = "0", endMinute = "0"] = endTime.split(":");
  return Number(endHour) * 60 + Number(endMinute) - (Number(startHour) * 60 + Number(startMinute));
}

function getMinutesBetween(startTime: string, endTime: string) {
  return getDurationMinutes(startTime, endTime);
}

function getAvailableSlotCount(startTime: string, endTime: string, slotDuration: number) {
  if (!startTime || !endTime || !Number.isFinite(slotDuration) || slotDuration <= 0) return 0;
  const durationMinutes = getMinutesBetween(startTime, endTime);
  if (durationMinutes <= 0) return 0;
  return Math.floor(durationMinutes / slotDuration);
}

function getFriendlyScheduleError(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  const normalized = message.toLowerCase();

  if (normalized.includes("max_patients cannot exceed generated slot count")) {
    return "Max patients is higher than the available appointment slots for this time range. Increase the session duration or reduce max patients.";
  }
  if (normalized.includes("doctor already has a session") || normalized.includes("overlapping doctor session")) {
    return "This doctor already has a session during the selected time.";
  }
  if (normalized.includes("room already assigned") || normalized.includes("overlapping room session")) {
    return "This room is already booked during the selected time.";
  }
  if (normalized.includes("date cannot be in the past")) {
    return "Session date cannot be in the past.";
  }
  if (normalized.includes("end time must be after start time")) {
    return "End time must be later than start time.";
  }
  if (normalized.includes("failed to fetch") || normalized.includes("network")) {
    return "Could not connect to the server. Check your connection and try again.";
  }
  if (normalized.includes("401") || normalized.includes("unauthorized")) {
    return "Your session has expired. Please sign in again.";
  }
  if (normalized.includes("403") || normalized.includes("forbidden")) {
    return "You do not have permission to perform this action.";
  }

  return "Something went wrong while saving the session. Please try again.";
}

function overlaps(startA: string, endA: string, startB: string, endB: string) {
  return startA < endB && endA > startB;
}

function mapDoctorOptions(doctors: ReceptionSessionDoctor[]): DoctorOption[] {
  return doctors.map((doctor) => ({
    id: doctor.doctorId,
    doctorUserId: doctor.doctorUserId,
    name: doctor.doctorName,
    specialization: doctor.specialization || doctor.clinicSpecialty || "General Medicine",
    avatarUrl: doctor.doctorProfileImage || null,
    medicalCenterId: doctor.medicalCenterId,
  }));
}

function dayLabel(index: number) {
  return weekDays.find((day) => day.index === index)?.label || "Day";
}

function buildRoomFallback(seed: number) {
  // TODO: Replace room fallback when receptionist session/routine APIs return room assignment.
  return `Room ${String((seed % 6) + 1).padStart(2, "0")}`;
}

function mapRoutinesToWeeklyItems(routines: ReceptionRoutineDay[], doctorId: number): WeeklyScheduleItem[] {
  return routines.flatMap((day) =>
    day.routines.map((routine) => ({
      id: `${day.dayKey}-${routine.id}`,
      doctorId,
      dayOfWeek: day.dayKey,
      startTime: routine.startTime,
      endTime: routine.endTime,
      roomNumber: buildRoomFallback(day.dayKey),
      maxPatients: routine.maxPatients,
      slotDuration: routine.slotDuration,
      notes: "",
      isActive: true,
    }))
  );
}

function mapSchedulesToAdditionalSessions(
  schedules: ReceptionSessionSchedule[],
  doctorId: number,
  fallbackRoomSeed: number
): AdditionalSession[] {
  return schedules
    .filter((schedule) => schedule.source === "manual" && schedule.isActive)
    .sort((left, right) => {
      const leftKey = `${left.date}-${left.startTime}`;
      const rightKey = `${right.date}-${right.startTime}`;
      return leftKey.localeCompare(rightKey);
    })
    .map((schedule) => ({
      id: `manual-${schedule.id}`,
      doctorId,
      date: schedule.date,
      startTime: schedule.startTime,
      endTime: schedule.endTime,
      roomNumber: buildRoomFallback(fallbackRoomSeed || schedule.id),
      maxPatients: schedule.maxPatients,
      notes: "",
      status: "not_started",
    }));
}

function selectedDayFromDate(date: string) {
  return parseSessionDate(date)?.getDay() ?? new Date().getDay();
}

function statusFromSession(session: ReceptionSession) {
  if (session.queueStatus === "live") return "Live";
  if (session.queueStatus === "paused") return "Paused";
  if (session.queueStatus === "completed") return "Completed";
  return "Not Started";
}

function SectionCard({
  children,
  eyebrow,
  title,
  actions,
}: {
  children: ReactNode;
  eyebrow: string;
  title: string;
  actions?: ReactNode;
}) {
  return (
    <section className="rounded-[28px] border border-[#D8E7F3] bg-white/95 p-5 shadow-[0_18px_48px_rgba(6,26,46,0.06)] backdrop-blur-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-[#0EA5E9]">{eyebrow}</p>
          <h2 className="mt-1 text-2xl font-bold text-[#0F172A]">{title}</h2>
        </div>
        {actions}
      </div>
      {children}
    </section>
  );
}

function Field({
  children,
  error,
  label,
  required,
}: {
  children: ReactNode;
  error?: string;
  label: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-[#0B3558]">
        {label}
        {required ? <span className="ml-1 text-[#EF4444]">*</span> : null}
      </span>
      <div className="mt-2">{children}</div>
      {error ? <p className="mt-2 text-sm font-medium text-[#DC2626]">{error}</p> : null}
    </label>
  );
}

function ScheduleSummaryChip({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof CalendarDays;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-[#D8E7F3] bg-white px-4 py-3 shadow-[0_10px_24px_rgba(6,26,46,0.05)]">
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-[#EFF8FF] p-2 text-[#0EA5E9]">
          <Icon size={16} />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#64748B]">{label}</p>
          <p className="mt-1 text-sm font-bold text-[#0F172A]">{value}</p>
        </div>
      </div>
    </div>
  );
}

function PreviewSummaryChip({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  const accentClass =
    label === "Weekly Days"
      ? "border-sky-200 bg-[linear-gradient(145deg,#EFF8FF_0%,#FFFFFF_100%)] text-[#0EA5E9]"
      : label === "Extra Sessions"
        ? "border-cyan-200 bg-[linear-gradient(145deg,#ECFEFF_0%,#FFFFFF_100%)] text-[#0891B2]"
        : "border-emerald-200 bg-[linear-gradient(145deg,#ECFDF5_0%,#FFFFFF_100%)] text-[#059669]";

  return (
    <div className={`rounded-2xl border px-4 py-3 shadow-[0_10px_24px_rgba(6,26,46,0.05)] ${accentClass}`}>
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#64748B]">{label}</p>
      <p className="mt-1 text-lg font-bold text-[#0F172A]">{value}</p>
    </div>
  );
}

function SchedulePreviewCard({
  badge,
  helper,
  metaLabel,
  primary,
  room,
  capacity,
  tone,
}: {
  badge: string;
  helper: string;
  metaLabel: string;
  primary: string;
  room: string;
  capacity: string;
  tone: "weekly" | "extra";
}) {
  const toneClass =
    tone === "weekly"
      ? "border-[#D8E7F3] bg-[linear-gradient(145deg,#FFFFFF_0%,#F8FAFC_100%)]"
      : "border-sky-200 bg-[linear-gradient(145deg,#EFF8FF_0%,#FFFFFF_100%)]";

  const pillClass =
    tone === "weekly"
      ? "border-sky-200 bg-sky-50 text-sky-700"
      : "border-cyan-200 bg-cyan-50 text-cyan-700";

  return (
    <div className={`relative overflow-hidden rounded-2xl border ${toneClass} p-4 shadow-[0_10px_24px_rgba(6,26,46,0.05)]`}>
      <div className={`absolute inset-y-3 left-0 w-1 rounded-r-full ${tone === "weekly" ? "bg-[#0EA5E9]" : "bg-[#38BDF8]"}`} />
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <div className="rounded-2xl bg-white px-3 py-2 shadow-[0_6px_14px_rgba(6,26,46,0.06)]">
            <p className="text-[11px] font-bold tracking-[0.2em] text-[#0EA5E9]">{badge}</p>
          </div>
          <div className="min-w-0">
            <p className="font-bold text-[#0B3558]">{metaLabel}</p>
            <p className="mt-1 text-base font-semibold text-[#0F172A]">{primary}</p>
            <p className="mt-1 text-sm text-[#64748B]">{helper}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 md:justify-end">
          <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${pillClass}`}>
            {tone === "weekly" ? "Weekly" : "Extra"}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full border border-[#D8E7F3] bg-white px-3 py-1 text-xs font-semibold text-[#0B3558]">
            <DoorOpen size={12} />
            {room}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full border border-[#D8E7F3] bg-white px-3 py-1 text-xs font-semibold text-[#0B3558]">
            <Users size={12} />
            {capacity}
          </span>
        </div>
      </div>
    </div>
  );
}

function CompactPreviewEmpty({
  title,
  message,
}: {
  title: string;
  message: string;
}) {
  return (
    <div className="rounded-2xl border border-[#D8E7F3] bg-[linear-gradient(145deg,#F8FAFC_0%,#EFF8FF_100%)] px-4 py-4 shadow-[0_10px_24px_rgba(6,26,46,0.04)]">
      <div className="mb-3 inline-flex rounded-full border border-sky-200 bg-white px-3 py-1 text-xs font-semibold text-sky-700">
        Awaiting schedule
      </div>
      <p className="font-semibold text-[#0F172A]">{title}</p>
      <p className="mt-1 text-sm text-[#64748B]">{message}</p>
    </div>
  );
}

function DayScheduleCard({
  day,
  item,
  selected,
  onSelect,
}: {
  day: WeekDay;
  item: WeeklyScheduleItem | undefined;
  selected: boolean;
  onSelect: () => void;
}) {
  const active = Boolean(item);
  const activeItem = item ?? null;
  const baseClass = active
    ? "border-[#0B3558] bg-[linear-gradient(155deg,#061A2E_0%,#0B3558_100%)] text-white shadow-[0_22px_48px_rgba(11,53,88,0.24)]"
    : "border-[#D8E7F3] bg-white text-[#0F172A] shadow-[0_12px_28px_rgba(6,26,46,0.05)] hover:-translate-y-0.5 hover:border-[#38BDF8] hover:shadow-[0_18px_36px_rgba(14,165,233,0.12)]";
  const selectedClass = selected
    ? active
      ? "ring-2 ring-[#38BDF8] ring-offset-2 ring-offset-[#EFF8FF]"
      : "border-[#0EA5E9] bg-[linear-gradient(135deg,#EFF8FF_0%,#FFFFFF_100%)] shadow-[0_16px_34px_rgba(14,165,233,0.14)] ring-1 ring-[#BAE6FD]"
    : "";

  return (
    <button
      type="button"
      aria-label={`Configure ${day.label} weekly session`}
      onClick={onSelect}
      className={`group relative min-h-[198px] rounded-[26px] border p-4 text-left transition duration-200 ${baseClass} ${selectedClass}`}
    >
      <div className={`absolute inset-x-4 top-0 h-1 rounded-b-full ${selected ? "bg-[#38BDF8]" : active ? "bg-[#67E8F9]" : "bg-transparent"}`} />
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className={`text-[11px] font-bold tracking-[0.22em] ${active ? "text-sky-100/90" : "text-[#64748B]"}`}>{day.shortLabel}</p>
          <h3 className={`mt-2 text-lg font-bold ${active ? "text-white" : "text-[#0F172A]"}`}>{day.label}</h3>
        </div>
        <div className={`rounded-2xl border p-2 ${active ? "border-white/15 bg-white/10 text-[#67E8F9]" : "border-[#D8E7F3] bg-[#F8FAFC] text-[#0EA5E9]"}`}>
          {active ? <Sparkles size={16} /> : <PencilLine size={16} />}
        </div>
      </div>

      <div className="mt-4">
        <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${active ? "border-cyan-200/30 bg-cyan-200/10 text-cyan-100" : "border-slate-200 bg-slate-100 text-slate-600"}`}>
          {active ? "Weekly Session" : "No session"}
        </span>
      </div>

      {activeItem ? (
        <div className="mt-5 space-y-4">
          <p className="text-base font-bold text-white">{formatClock(activeItem.startTime)} - {formatClock(activeItem.endTime)}</p>
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold text-sky-100">
              {activeItem.roomNumber}
            </span>
            <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold text-sky-100">
              Max {activeItem.maxPatients}
            </span>
          </div>
        </div>
      ) : (
        <p className="mt-6 text-sm leading-6 text-[#64748B]">Tap to set weekly session</p>
      )}
    </button>
  );
}

function AdditionalSessionModal({
  doctors,
  form,
  errors,
  isOpen,
  isSubmitting,
  notice,
  selectedDoctor,
  slotCount,
  onChange,
  onClose,
  onSubmit,
}: {
  doctors: DoctorOption[];
  form: ExtraSessionForm;
  errors: ExtraErrors;
  isOpen: boolean;
  isSubmitting: boolean;
  notice: Notice | null;
  selectedDoctor: DoctorOption | null;
  slotCount: number;
  onChange: (field: keyof ExtraSessionForm, value: string) => void;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  useEffect(() => {
    if (!isOpen) return undefined;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const inputClass =
    "h-12 w-full rounded-2xl border border-[#D8E7F3] bg-white px-4 text-sm font-medium text-[#0F172A] outline-none transition placeholder:text-[#94A3B8] focus:border-[#0EA5E9] focus:ring-2 focus:ring-[#BAE6FD]";
  const modalDuration = form.startTime && form.endTime ? getDurationMinutes(form.startTime, form.endTime) : 0;
  const maxPatients = Number(form.maxPatients);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 px-4 py-8 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="extra-session-title"
        className="w-full max-w-3xl rounded-[30px] border border-[#D8E7F3] bg-white p-5 shadow-[0_30px_80px_rgba(6,26,46,0.22)] md:p-6"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-[#0EA5E9]">Additional Session</p>
            <h2 id="extra-session-title" className="mt-1 text-2xl font-bold text-[#0F172A]">
              Extra one-time clinic hours
            </h2>
            <p className="mt-2 text-sm text-[#64748B]">
              Add a temporary session without changing the weekly schedule.
            </p>
          </div>
          <button
            type="button"
            aria-label="Close extra session modal"
            onClick={onClose}
            className="rounded-2xl border border-[#D8E7F3] bg-[#F8FAFC] p-2 text-[#64748B] transition hover:bg-white hover:text-[#0B3558]"
          >
            <X size={18} />
          </button>
        </div>

        <form className="mt-6 space-y-5" onSubmit={onSubmit}>
          {notice ? <InlineAlert tone={notice.tone} message={notice.message} /> : null}

          <div className="grid gap-5 md:grid-cols-2">
            <Field label="Doctor" required error={errors.doctorId}>
              <select
                value={form.doctorId}
                onChange={(event) => onChange("doctorId", event.target.value)}
                disabled={Boolean(selectedDoctor)}
                className={`${inputClass} disabled:bg-[#F8FAFC] disabled:text-[#64748B]`}
              >
                <option value="">Select doctor</option>
                {doctors.map((doctor) => (
                  <option key={doctor.id} value={doctor.id}>
                    {doctor.name} • {doctor.specialization}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Date" required error={errors.date}>
              <input type="date" min={TODAY} value={form.date} onChange={(event) => onChange("date", event.target.value)} className={inputClass} />
            </Field>

            <Field label="Start Time" required error={errors.startTime}>
              <input type="time" value={form.startTime} onChange={(event) => onChange("startTime", event.target.value)} className={inputClass} />
            </Field>

            <Field label="End Time" required error={errors.endTime}>
              <input type="time" value={form.endTime} onChange={(event) => onChange("endTime", event.target.value)} className={inputClass} />
            </Field>

            <Field label="Room Number" required error={errors.roomNumber}>
              <input type="text" value={form.roomNumber} onChange={(event) => onChange("roomNumber", event.target.value)} placeholder="Room 03" className={inputClass} />
            </Field>

            <Field label="Max Patients" required error={errors.maxPatients}>
              <div className="space-y-2">
                <input type="number" min={1} value={form.maxPatients} onChange={(event) => onChange("maxPatients", event.target.value)} placeholder="20" className={inputClass} />
                {form.startTime && form.endTime ? (
                  <p className={`text-xs font-medium ${slotCount > 0 && maxPatients > slotCount ? "text-[#D97706]" : "text-[#64748B]"}`}>
                    {slotCount > 0
                      ? `Available appointment slots for this time range: ${slotCount}`
                      : "This session time is too short for available appointment slots."}
                  </p>
                ) : null}
                {slotCount > 0 && maxPatients > slotCount ? (
                  <p className="text-xs font-semibold text-[#D97706]">
                    Max patients cannot exceed {slotCount} for this time range.
                  </p>
                ) : null}
              </div>
            </Field>
          </div>

          <Field label="Notes" error={errors.notes}>
            <textarea
              value={form.notes}
              onChange={(event) => onChange("notes", event.target.value)}
              placeholder="Optional note for this one-time session"
              className="min-h-[100px] w-full rounded-2xl border border-[#D8E7F3] bg-white px-4 py-3 text-sm font-medium text-[#0F172A] outline-none transition placeholder:text-[#94A3B8] focus:border-[#0EA5E9] focus:ring-2 focus:ring-[#BAE6FD]"
            />
          </Field>

          <div className="space-y-3">
            {Number(form.maxPatients) > 100 ? <InlineAlert tone="warning" message="Max patients above 100 may be too high for one session." /> : null}
            {modalDuration > 0 && modalDuration < 15 ? <InlineAlert tone="warning" message="Session duration is less than 15 minutes." /> : null}
          </div>

          <div className="flex flex-wrap justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#D8E7F3] bg-white px-5 py-3 text-sm font-semibold text-[#0B3558] transition hover:bg-[#EFF8FF]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#0EA5E9] bg-[#0EA5E9] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#0284C7] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
              {isSubmitting ? "Adding..." : "Add Extra Session"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ReceptionCreateSessionPage() {
  const [permissions, setPermissions] = useState<ReceptionPermissions | null>(null);
  const [doctors, setDoctors] = useState<DoctorOption[]>([]);
  const [sessions, setSessions] = useState<ReceptionSession[]>([]);
  const [weeklyItems, setWeeklyItems] = useState<WeeklyScheduleItem[]>([]);
  const [additionalSessions, setAdditionalSessions] = useState<AdditionalSession[]>([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState("");
  const [selectedDayKey, setSelectedDayKey] = useState("monday");
  const [weeklyForm, setWeeklyForm] = useState<ScheduleFormState>(initialWeeklyForm);
  const [extraForm, setExtraForm] = useState<ExtraSessionForm>(initialExtraForm);
  const [weeklyErrors, setWeeklyErrors] = useState<WeeklyErrors>({});
  const [extraErrors, setExtraErrors] = useState<ExtraErrors>({});
  const [activeScheduleTab, setActiveScheduleTab] = useState<"weekly" | "today" | "extra">("weekly");
  const [isExtraModalOpen, setIsExtraModalOpen] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [extraNotice, setExtraNotice] = useState<Notice | null>(null);
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [savingWeekly, setSavingWeekly] = useState(false);
  const [clearingWeekly, setClearingWeekly] = useState(false);
  const [savingExtra, setSavingExtra] = useState(false);

  const loadBaseData = async () => {
    setLoading(true);
    try {
      const [permissionData, doctorData, sessionData] = await Promise.all([
        getReceptionPermissions(),
        getReceptionSessionDoctors().catch(() => [] as ReceptionSessionDoctor[]),
        getReceptionSessions().catch(() => [] as ReceptionSession[]),
      ]);
      setPermissions(permissionData);
      setDoctors(mapDoctorOptions(doctorData));
      setSessions(sessionData);
    } catch (error) {
      setNotice({
        tone: "danger",
        message: getFriendlyScheduleError(error),
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadBaseData();
  }, []);

  useEffect(() => {
    if (!notice || notice.tone !== "success") return undefined;
    const timer = window.setTimeout(() => setNotice(null), 3500);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const selectedDoctor = useMemo(
    () => doctors.find((doctor) => String(doctor.id) === selectedDoctorId) || null,
    [doctors, selectedDoctorId]
  );

  const selectedDay = useMemo(
    () => weekDays.find((day) => day.key === selectedDayKey) || weekDays[0],
    [selectedDayKey]
  );

  const selectedWeeklyItem = useMemo(
    () => weeklyItems.find((item) => item.dayOfWeek === selectedDay.index && item.isActive) || null,
    [selectedDay.index, weeklyItems]
  );

  const activeWeeklyItems = useMemo(
    () => weeklyItems.filter((item) => item.isActive).sort((left, right) => left.dayOfWeek - right.dayOfWeek),
    [weeklyItems]
  );

  const todaySessions = useMemo(
    () => sessions.filter((session) => session.date === TODAY && (!selectedDoctor || session.doctorId === selectedDoctor.id)),
    [selectedDoctor, sessions]
  );

  const weeklySummary = useMemo(() => {
    const activeDays = activeWeeklyItems.length;
    const totalCapacity = activeWeeklyItems.reduce((sum, item) => sum + item.maxPatients, 0);
    const earliest = activeWeeklyItems.reduce<string | null>((current, item) => {
      if (!current) return item.startTime;
      return item.startTime < current ? item.startTime : current;
    }, null);
    const latest = activeWeeklyItems.reduce<string | null>((current, item) => {
      if (!current) return item.endTime;
      return item.endTime > current ? item.endTime : current;
    }, null);

    return {
      activeDays: `${activeDays} active days`,
      totalCapacity: `${totalCapacity} weekly slots`,
      earliest: earliest ? formatClock(earliest) : "No start",
      latest: latest ? formatClock(latest) : "No end",
    };
  }, [activeWeeklyItems]);

  const previewSummary = useMemo(
    () => ({
      weeklyDays: activeWeeklyItems.length,
      extraSessions: additionalSessions.length,
      totalCapacity:
        activeWeeklyItems.reduce((sum, item) => sum + item.maxPatients, 0) +
        additionalSessions.reduce((sum, item) => sum + item.maxPatients, 0),
    }),
    [activeWeeklyItems, additionalSessions]
  );

  const weeklyDuration = weeklyForm.startTime && weeklyForm.endTime
    ? getDurationMinutes(weeklyForm.startTime, weeklyForm.endTime)
    : 0;
  const weeklySlotDuration = Number(weeklyForm.slotDuration || 15);
  const weeklyAvailableSlots = weeklyForm.startTime && weeklyForm.endTime
    ? getAvailableSlotCount(weeklyForm.startTime, weeklyForm.endTime, weeklySlotDuration)
    : 0;
  // TODO: Confirm default slot duration with backend session generation rules for manual sessions.
  const extraSlotDuration = 15;
  const extraAvailableSlots = extraForm.startTime && extraForm.endTime
    ? getAvailableSlotCount(extraForm.startTime, extraForm.endTime, extraSlotDuration)
    : 0;

  const inputClass =
    "h-12 w-full rounded-2xl border border-[#D8E7F3] bg-white px-4 text-sm font-medium text-[#0F172A] outline-none transition placeholder:text-[#94A3B8] focus:border-[#0EA5E9] focus:ring-2 focus:ring-[#BAE6FD]";

  const syncWeeklyForm = (day: WeekDay, sourceItems = weeklyItems) => {
    const existing = sourceItems.find((item) => item.dayOfWeek === day.index && item.isActive);
    setWeeklyForm(
      existing
        ? {
            startTime: existing.startTime,
            endTime: existing.endTime,
            roomNumber: existing.roomNumber,
            maxPatients: String(existing.maxPatients),
            slotDuration: String(existing.slotDuration || 15),
            notes: existing.notes || "",
          }
        : initialWeeklyForm
    );
    setWeeklyErrors({});
  };

  const syncDoctorScheduleData = async (doctor: DoctorOption) => {
    try {
      const [routines, schedules] = await Promise.all([
        getReceptionSessionRoutine(doctor.doctorUserId).catch(() => [] as ReceptionRoutineDay[]),
        getReceptionSessionSchedules(doctor.doctorUserId, false).catch(() => [] as ReceptionSessionSchedule[]),
      ]);

      const mappedWeeklyItems = mapRoutinesToWeeklyItems(routines, doctor.id);
      const mappedAdditionalSessions = mapSchedulesToAdditionalSessions(schedules, doctor.id, doctor.id);

      setWeeklyItems(mappedWeeklyItems);
      setAdditionalSessions(mappedAdditionalSessions);
      syncWeeklyForm(selectedDay, mappedWeeklyItems);
    } catch {
      setWeeklyItems([]);
      setAdditionalSessions([]);
    }
  };

  const handleDoctorChange = async (doctorId: string) => {
    setSelectedDoctorId(doctorId);
    setWeeklyItems([]);
    setWeeklyForm(initialWeeklyForm);
    setAdditionalSessions([]);
    setNotice(null);
    setExtraNotice(null);

    const nextExtraDoctorId = doctorId || "";
    setExtraForm((current) => ({ ...current, doctorId: nextExtraDoctorId }));

    const doctor = doctors.find((item) => String(item.id) === doctorId);
    if (!doctor) return;

    await syncDoctorScheduleData(doctor);
  };

  const handleDaySelect = (day: WeekDay) => {
    setSelectedDayKey(day.key);
    syncWeeklyForm(day);
  };

  const updateWeeklyForm = (field: keyof ScheduleFormState, value: string) => {
    setWeeklyForm((current) => ({ ...current, [field]: value }));
    setWeeklyErrors((current) => ({ ...current, [field]: undefined }));
    if (notice?.tone === "danger" || notice?.tone === "warning") setNotice(null);
  };

  const updateExtraForm = (field: keyof ExtraSessionForm, value: string) => {
    setExtraForm((current) => ({ ...current, [field]: value }));
    setExtraErrors((current) => ({ ...current, [field]: undefined }));
    if (extraNotice) setExtraNotice(null);
  };

  const openExtraModal = () => {
    setExtraErrors({});
    setExtraNotice(null);
    setExtraForm((current) => ({
      ...current,
      doctorId: selectedDoctor ? String(selectedDoctor.id) : current.doctorId,
    }));
    setIsExtraModalOpen(true);
  };

  const closeExtraModal = () => {
    setIsExtraModalOpen(false);
    setExtraErrors({});
    setExtraNotice(null);
    setExtraForm({
      ...initialExtraForm,
      doctorId: selectedDoctor ? String(selectedDoctor.id) : "",
    });
  };

  const validateWeeklyForm = () => {
    const errors: WeeklyErrors = {};
    const maxPatients = Number(weeklyForm.maxPatients);
    const slotDuration = Number(weeklyForm.slotDuration || 15);
    const roomNumber = weeklyForm.roomNumber.trim();

    if (!selectedDoctor) setNotice({ tone: "warning", message: "Select a doctor to manage weekly sessions." });
    if (!weeklyForm.startTime) errors.startTime = "Start time is required.";
    if (!weeklyForm.endTime) errors.endTime = "End time is required.";
    if (weeklyForm.startTime && weeklyForm.endTime && weeklyForm.endTime <= weeklyForm.startTime) {
      errors.endTime = "End time must be after start time.";
    }
    if (!roomNumber) errors.roomNumber = "Room number is required.";
    if (!weeklyForm.maxPatients || !Number.isFinite(maxPatients) || maxPatients <= 0) {
      errors.maxPatients = "Max patients must be greater than 0.";
    }
    if (!Number.isFinite(slotDuration) || slotDuration <= 0) {
      errors.slotDuration = "Slot duration must be greater than 0.";
    }
    if (
      weeklyForm.startTime &&
      weeklyForm.endTime &&
      Number.isFinite(slotDuration) &&
      slotDuration > 0 &&
      maxPatients > 0
    ) {
      const availableSlots = getAvailableSlotCount(weeklyForm.startTime, weeklyForm.endTime, slotDuration);
      if (availableSlots <= 0) {
        errors.maxPatients = "This session time is too short for the selected slot duration.";
      } else if (maxPatients > availableSlots) {
        errors.maxPatients = `This time range creates only ${availableSlots} appointment slots. Max patients cannot exceed ${availableSlots}.`;
      }
    }

    const conflict = weeklyItems.some(
      (item) =>
        item.isActive &&
        item.dayOfWeek === selectedDay.index &&
        item.id !== selectedWeeklyItem?.id &&
        (item.doctorId === selectedDoctor?.id || item.roomNumber.trim().toLowerCase() === roomNumber.toLowerCase()) &&
        overlaps(weeklyForm.startTime, weeklyForm.endTime, item.startTime, item.endTime)
    );

    if (conflict) errors.startTime = "This doctor or room already has a weekly session during this time.";

    setWeeklyErrors(errors);
    if (!selectedDoctor) {
      setNotice({ tone: "warning", message: "Select a doctor to manage weekly sessions." });
      return false;
    }
    return Object.keys(errors).length === 0;
  };

  const persistWeeklyRoutine = async (nextItems: WeeklyScheduleItem[]) => {
    if (!selectedDoctor) return;

    const routine = nextItems
      .filter((item) => item.isActive)
      .map((item) => ({
        day: dayLabel(item.dayOfWeek),
        dayOfWeek: item.dayOfWeek,
        shifts: [{ start: item.startTime, end: item.endTime }],
      }));

    await saveReceptionSessionRoutine(selectedDoctor.doctorUserId, {
      weeks: 12,
      routine,
      slotDuration: Number(weeklyForm.slotDuration || 15),
      maxPatients: Number(weeklyForm.maxPatients),
    });
  };

  const handleSaveWeekly = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setNotice(null);
    if (!validateWeeklyForm() || !selectedDoctor) return;

    const nextItem: WeeklyScheduleItem = {
      id: selectedWeeklyItem?.id || `${selectedDoctor.id}-${selectedDay.index}`,
      doctorId: selectedDoctor.id,
      dayOfWeek: selectedDay.index,
      startTime: weeklyForm.startTime,
      endTime: weeklyForm.endTime,
      roomNumber: weeklyForm.roomNumber.trim(),
      maxPatients: Number(weeklyForm.maxPatients),
      slotDuration: Number(weeklyForm.slotDuration || 15),
      notes: weeklyForm.notes.trim(),
      isActive: true,
    };

    const nextItems = [
      ...weeklyItems.filter((item) => item.dayOfWeek !== selectedDay.index),
      nextItem,
    ];

    setSavingWeekly(true);
    try {
      await persistWeeklyRoutine(nextItems);
      // TODO: Backend should store weekly recurring doctor schedule room/notes and generate daily sessions from templates.
      // TODO: Replace frontend conflict checks with backend validation.
      setWeeklyItems(nextItems);
      setNotice({ tone: "success", message: "Weekly session saved successfully." });
    } catch (error) {
      setNotice({
        tone: "danger",
        message: getFriendlyScheduleError(error),
      });
    } finally {
      setSavingWeekly(false);
    }
  };

  const handleClearWeekly = async () => {
    if (!selectedDoctor) {
      setNotice({ tone: "warning", message: "Select a doctor before clearing a weekly session." });
      return;
    }

    const nextItems = weeklyItems.filter((item) => item.dayOfWeek !== selectedDay.index);
    setClearingWeekly(true);
    try {
      await persistWeeklyRoutine(nextItems);
      setWeeklyItems(nextItems);
      setWeeklyForm(initialWeeklyForm);
      setConfirmClearOpen(false);
      setNotice({ tone: "success", message: `Weekly session cleared for ${selectedDay.label}.` });
    } catch (error) {
      setNotice({
        tone: "danger",
        message: getFriendlyScheduleError(error),
      });
    } finally {
      setClearingWeekly(false);
    }
  };

  const validateExtraForm = () => {
    const errors: ExtraErrors = {};
    const maxPatients = Number(extraForm.maxPatients);
    const roomNumber = extraForm.roomNumber.trim();
    const modalDoctor = doctors.find((doctor) => String(doctor.id) === extraForm.doctorId) || null;

    if (!extraForm.doctorId) errors.doctorId = "Doctor is required.";
    if (!extraForm.date) errors.date = "Date is required.";
    if (extraForm.date && extraForm.date < TODAY) errors.date = "Do not create sessions in the past.";
    if (!extraForm.startTime) errors.startTime = "Start time is required.";
    if (!extraForm.endTime) errors.endTime = "End time is required.";
    if (extraForm.startTime && extraForm.endTime && extraForm.endTime <= extraForm.startTime) {
      errors.endTime = "End time must be after start time.";
    }
    if (!roomNumber) errors.roomNumber = "Room number is required.";
    if (!extraForm.maxPatients || !Number.isFinite(maxPatients) || maxPatients <= 0) {
      errors.maxPatients = "Max patients must be greater than 0.";
    }
    if (extraForm.startTime && extraForm.endTime && maxPatients > 0) {
      const availableSlots = getAvailableSlotCount(extraForm.startTime, extraForm.endTime, extraSlotDuration);
      if (availableSlots <= 0) {
        errors.maxPatients = "This session time is too short for the selected slot duration.";
      } else if (maxPatients > availableSlots) {
        errors.maxPatients = `This time range creates only ${availableSlots} appointment slots. Max patients cannot exceed ${availableSlots}.`;
      }
    }

    if (modalDoctor && extraForm.date && extraForm.startTime && extraForm.endTime) {
      const dateDay = selectedDayFromDate(extraForm.date);
      const weeklyConflict = weeklyItems.some(
        (item) =>
          item.isActive &&
          item.dayOfWeek === dateDay &&
          (item.doctorId === modalDoctor.id || item.roomNumber.trim().toLowerCase() === roomNumber.toLowerCase()) &&
          overlaps(extraForm.startTime, extraForm.endTime, item.startTime, item.endTime)
      );
      const sessionConflict = sessions.some(
        (session) =>
          session.date === extraForm.date &&
          (session.doctorId === modalDoctor.id || buildRoomFallback(session.doctorId).toLowerCase() === roomNumber.toLowerCase()) &&
          overlaps(extraForm.startTime, extraForm.endTime, session.startTime, session.endTime)
      );
      if (weeklyConflict || sessionConflict) {
        errors.startTime = "This doctor or room already has a session during this time.";
      }
    }

    setExtraErrors(errors);
    return Boolean(modalDoctor) && Object.keys(errors).length === 0;
  };

  const handleAddExtra = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setNotice(null);
    setExtraNotice(null);
    if (!validateExtraForm()) return;

    const modalDoctor = doctors.find((doctor) => String(doctor.id) === extraForm.doctorId) || null;
    if (!modalDoctor) return;

    setSavingExtra(true);
    try {
      await createReceptionManualSession(modalDoctor.doctorUserId, {
        date: extraForm.date,
        start_time: extraForm.startTime,
        end_time: extraForm.endTime,
        slot_duration: 15,
        max_patients: Number(extraForm.maxPatients),
      });

      // TODO: Persist room number and notes when the manual session API supports them.
      setNotice({ tone: "success", message: "Extra session added successfully." });
      closeExtraModal();
      await loadBaseData();
      await syncDoctorScheduleData(modalDoctor);
    } catch (error) {
      setExtraNotice({
        tone: "danger",
        message: getFriendlyScheduleError(error),
      });
    } finally {
      setSavingExtra(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-140px)] rounded-[32px] bg-[linear-gradient(180deg,#F8FAFC_0%,#EFF8FF_100%)] p-6">
        <div className="grid gap-4 lg:grid-cols-2">
          {[1, 2, 3, 4].map((item) => (
            <div key={item} className="h-48 animate-pulse rounded-3xl border border-[#D8E7F3] bg-white/80" />
          ))}
        </div>
      </div>
    );
  }

  if (!permissions?.schedule_management) {
    return (
      <PermissionState
        title="Doctor schedule is not assigned"
        message="This receptionist account cannot manage doctor schedules until schedule management is enabled."
      />
    );
  }

  return (
    <>
      <div className="min-h-[calc(100vh-140px)] space-y-6 rounded-[32px] bg-[linear-gradient(180deg,#F8FAFC_0%,#EFF8FF_100%)] p-5 md:p-6">
        <section className="rounded-[30px] border border-white/15 bg-[linear-gradient(135deg,#061A2E,#0B3558)] p-6 text-white shadow-[0_24px_70px_rgba(6,26,46,0.24)]">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold text-[#BAE6FD]">
                <Stethoscope size={14} />
                Reception Desk
              </div>
              <h1 className="mt-4 text-3xl font-bold tracking-tight">Doctor Schedule</h1>
              <p className="mt-2 text-sm text-sky-100">
                Set weekly doctor sessions and add extra sessions when needed.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm font-semibold">
                <CalendarDays size={16} />
                {formatDateLabel()}
              </div>
              <button
                type="button"
                onClick={openExtraModal}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white px-5 py-3 text-sm font-semibold text-[#0B3558] transition hover:bg-[#EFF8FF]"
              >
                <Plus size={16} />
                Add Extra Session
              </button>
            </div>
          </div>
        </section>

        {notice ? (
          <div className="rounded-[24px] border border-[#D8E7F3] bg-white/85 p-3 shadow-[0_10px_24px_rgba(6,26,46,0.04)]">
            <InlineAlert tone={notice.tone} message={notice.message} />
          </div>
        ) : null}

        <SectionCard eyebrow="Step 1" title="Select doctor">
          <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,420px)]">
            <Field label="Select Doctor" required>
              <select
                value={selectedDoctorId}
                onChange={(event) => void handleDoctorChange(event.target.value)}
                className={inputClass}
              >
                <option value="">Select doctor</option>
                {doctors.map((doctor) => (
                  <option key={doctor.id} value={doctor.id}>
                    {doctor.name} • {doctor.specialization}
                  </option>
                ))}
              </select>
            </Field>

            <div className="rounded-[24px] border border-[#D8E7F3] bg-[linear-gradient(145deg,#FFFFFF_0%,#F8FAFC_100%)] p-4 shadow-[0_12px_30px_rgba(6,26,46,0.05)]">
              {selectedDoctor ? (
                <div className="flex items-center gap-3">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#EFF8FF,#DBF0FF)] text-[#0EA5E9]">
                    <UserRound size={22} />
                  </div>
                  <div>
                    <p className="font-bold text-[#0F172A]">{selectedDoctor.name}</p>
                    <p className="mt-1 text-sm text-[#64748B]">{selectedDoctor.specialization}</p>
                    <p className="mt-1 text-xs font-semibold text-[#0B3558]">
                      Medical center: {selectedDoctor.medicalCenterId || "Assigned clinic"}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-sm font-semibold text-[#64748B]">
                  Select a doctor to manage weekly sessions.
                </p>
              )}
            </div>
          </div>
        </SectionCard>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <ScheduleSummaryChip icon={CalendarDays} label="Weekly Days" value={weeklySummary.activeDays} />
          <ScheduleSummaryChip icon={Users} label="Weekly Capacity" value={weeklySummary.totalCapacity} />
          <ScheduleSummaryChip icon={Clock3} label="Earliest Start" value={weeklySummary.earliest} />
          <ScheduleSummaryChip icon={Clock3} label="Latest End" value={weeklySummary.latest} />
        </div>

        <SectionCard eyebrow="Weekly Schedule" title="Recurring doctor sessions">
          <p className="mt-2 text-sm leading-6 text-[#64748B]">
            Use weekly sessions for normal doctor availability. Use additional sessions only for temporary or extra clinic hours.
          </p>

          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
            {weekDays.map((day) => {
              const item = weeklyItems.find((weeklyItem) => weeklyItem.dayOfWeek === day.index && weeklyItem.isActive);
              return (
                <DayScheduleCard
                  key={day.key}
                  day={day}
                  item={item}
                  selected={selectedDay.key === day.key}
                  onSelect={() => handleDaySelect(day)}
                />
              );
            })}
          </div>
        </SectionCard>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_420px]">
          <SectionCard
            eyebrow="Step 2"
            title={`${selectedWeeklyItem ? "Edit" : "Set"} ${selectedDay.label} session`}
            actions={
              selectedWeeklyItem ? (
                <span className="inline-flex rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">
                  Weekly Session
                </span>
              ) : null
            }
          >
            <form className="mt-5 space-y-5" onSubmit={handleSaveWeekly}>
              <div className="grid gap-5 md:grid-cols-2">
                <Field label="Start Time" required error={weeklyErrors.startTime}>
                  <input type="time" value={weeklyForm.startTime} onChange={(event) => updateWeeklyForm("startTime", event.target.value)} className={inputClass} />
                </Field>
                <Field label="End Time" required error={weeklyErrors.endTime}>
                  <input type="time" value={weeklyForm.endTime} onChange={(event) => updateWeeklyForm("endTime", event.target.value)} className={inputClass} />
                </Field>
                <Field label="Room Number" required error={weeklyErrors.roomNumber}>
                  <input type="text" value={weeklyForm.roomNumber} onChange={(event) => updateWeeklyForm("roomNumber", event.target.value)} placeholder="Room 02" className={inputClass} />
                </Field>
                <Field label="Max Patients" required error={weeklyErrors.maxPatients}>
                  <div className="space-y-2">
                    <input type="number" min={1} value={weeklyForm.maxPatients} onChange={(event) => updateWeeklyForm("maxPatients", event.target.value)} placeholder="40" className={inputClass} />
                    {weeklyForm.startTime && weeklyForm.endTime ? (
                      <p className={`text-xs font-medium ${weeklyAvailableSlots > 0 && Number(weeklyForm.maxPatients) > weeklyAvailableSlots ? "text-[#D97706]" : "text-[#64748B]"}`}>
                        {weeklyAvailableSlots > 0
                          ? `Available appointment slots for this time range: ${weeklyAvailableSlots}`
                          : "This session time is too short for available appointment slots."}
                      </p>
                    ) : null}
                    {weeklyAvailableSlots > 0 && Number(weeklyForm.maxPatients) > weeklyAvailableSlots ? (
                      <p className="text-xs font-semibold text-[#D97706]">
                        Max patients cannot exceed {weeklyAvailableSlots} for this time range.
                      </p>
                    ) : null}
                  </div>
                </Field>
                <Field label="Slot Duration" error={weeklyErrors.slotDuration}>
                  <input type="number" min={1} value={weeklyForm.slotDuration} onChange={(event) => updateWeeklyForm("slotDuration", event.target.value)} className={inputClass} />
                </Field>
                <Field label="Notes" error={weeklyErrors.notes}>
                  <input type="text" value={weeklyForm.notes} onChange={(event) => updateWeeklyForm("notes", event.target.value)} placeholder="Optional note" className={inputClass} />
                </Field>
              </div>

              <div className="space-y-3">
                {Number(weeklyForm.maxPatients) > 100 ? <InlineAlert tone="warning" message="Max patients above 100 may be too high for one session." /> : null}
                {weeklyDuration > 0 && weeklyDuration < 15 ? <InlineAlert tone="warning" message="Session duration is less than 15 minutes." /> : null}
                <InlineAlert tone="info" message="Weekly templates are saved through the current routine API. Room and notes are held locally until backend support is added." />
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="submit"
                  disabled={savingWeekly || clearingWeekly || !selectedDoctor}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#0EA5E9] bg-[#0EA5E9] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#0284C7] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {savingWeekly ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                  {savingWeekly ? "Saving..." : "Save Weekly Session"}
                </button>
                <button
                  type="button"
                  disabled={savingWeekly || clearingWeekly || !selectedWeeklyItem}
                  onClick={() => setConfirmClearOpen(true)}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-5 py-3 text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {clearingWeekly ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                  {clearingWeekly ? "Clearing..." : "Clear This Day"}
                </button>
              </div>
            </form>
          </SectionCard>

          <SectionCard
            eyebrow="Preview"
            title="Doctor schedule summary"
            actions={
              <button
                type="button"
                onClick={openExtraModal}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#D8E7F3] bg-[#F8FAFC] px-4 py-2 text-sm font-semibold text-[#0B3558] transition hover:bg-white"
              >
                <Plus size={14} />
                Add Extra Session
              </button>
            }
          >
            <p className="mt-2 text-sm text-[#64748B]">
              Review weekly sessions and extra clinic hours before saving.
            </p>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <PreviewSummaryChip label="Weekly Days" value={previewSummary.weeklyDays} />
              <PreviewSummaryChip label="Extra Sessions" value={previewSummary.extraSessions} />
              <PreviewSummaryChip label="Total Capacity" value={previewSummary.totalCapacity} />
            </div>

            <div className="mt-5 space-y-6">
              <div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-base font-bold text-[#0B3558]">Weekly sessions</p>
                  <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">
                    {activeWeeklyItems.length} {activeWeeklyItems.length === 1 ? "active day" : "active days"}
                  </span>
                </div>
                <div className="mt-3 space-y-2">
                  {activeWeeklyItems.length === 0 ? (
                    <CompactPreviewEmpty
                      title="No weekly sessions set yet."
                      message="Select a day card and save a weekly session."
                    />
                  ) : (
                    activeWeeklyItems.map((item) => (
                      <SchedulePreviewCard
                        key={item.id}
                        badge={weekDays.find((day) => day.index === item.dayOfWeek)?.shortLabel || "DAY"}
                        metaLabel={dayLabel(item.dayOfWeek)}
                        primary={`${formatClock(item.startTime)} - ${formatClock(item.endTime)}`}
                        helper="Weekly recurring session"
                        room={item.roomNumber}
                        capacity={`Max ${item.maxPatients}`}
                        tone="weekly"
                      />
                    ))
                  )}
                </div>
              </div>

              <div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-base font-bold text-[#0B3558]">Extra sessions</p>
                  <span className="rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-xs font-semibold text-cyan-700">
                    {additionalSessions.length} added
                  </span>
                </div>
                <div className="mt-3 space-y-2">
                  {additionalSessions.length === 0 ? (
                    <CompactPreviewEmpty
                      title="No extra sessions added."
                      message="Use extra sessions for temporary clinic hours only."
                    />
                  ) : (
                    additionalSessions.map((session) => (
                      <SchedulePreviewCard
                        key={session.id}
                        badge={formatSessionDate(session.date).split(",")[0].toUpperCase()}
                        metaLabel={formatSessionDate(session.date)}
                        primary={`${formatClock(session.startTime)} - ${formatClock(session.endTime)}`}
                        helper="Temporary clinic session"
                        room={session.roomNumber}
                        capacity={`Max ${session.maxPatients}`}
                        tone="extra"
                      />
                    ))
                  )}
                </div>
              </div>
            </div>
          </SectionCard>
        </div>

        <SectionCard eyebrow="Schedule Data" title="Existing sessions and templates">
          <div className="mt-5 flex flex-wrap gap-2">
            {[
              ["weekly", "Weekly Schedule"],
              ["today", "Today's Sessions"],
              ["extra", "Extra Sessions"],
            ].map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setActiveScheduleTab(key as "weekly" | "today" | "extra")}
                className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                  activeScheduleTab === key
                    ? "border-[#0EA5E9] bg-[#EFF8FF] text-[#0B3558]"
                    : "border-[#D8E7F3] bg-white text-[#64748B] hover:bg-[#F8FAFC]"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="mt-5 space-y-3">
            {activeScheduleTab === "weekly" && (
              activeWeeklyItems.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[#B7DDF5] bg-[#F8FAFC] p-5 text-sm font-semibold text-[#64748B]">
                  No weekly schedule saved yet.
                </div>
              ) : (
                activeWeeklyItems.map((item) => (
                  <div key={item.id} className="rounded-2xl border border-[#D8E7F3] bg-[#F8FAFC] p-4">
                    <p className="font-bold text-[#0F172A]">{selectedDoctor?.name || "Doctor"}</p>
                    <p className="mt-1 text-sm font-semibold text-[#0B3558]">
                      {dayLabel(item.dayOfWeek)} • {formatClock(item.startTime)} - {formatClock(item.endTime)} • {item.roomNumber} • Max {item.maxPatients}
                    </p>
                  </div>
                ))
              )
            )}

            {activeScheduleTab === "today" && (
              todaySessions.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[#B7DDF5] bg-[#F8FAFC] p-5 text-sm font-semibold text-[#64748B]">
                  No sessions scheduled for today.
                </div>
              ) : (
                todaySessions.map((session) => (
                  <div key={session.id} className="rounded-2xl border border-[#D8E7F3] bg-[#F8FAFC] p-4">
                    <p className="font-bold text-[#0F172A]">{session.doctorName}</p>
                    <p className="mt-1 text-sm font-semibold text-[#0B3558]">
                      Today • {formatClock(session.startTime)} - {formatClock(session.endTime)} • {buildRoomFallback(session.doctorId)} • {statusFromSession(session)}
                    </p>
                  </div>
                ))
              )
            )}

            {activeScheduleTab === "extra" && (
              additionalSessions.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[#B7DDF5] bg-[#F8FAFC] p-5 text-sm font-semibold text-[#64748B]">
                  No extra sessions added in this view.
                </div>
              ) : (
                additionalSessions.map((session) => (
                  <div key={session.id} className="rounded-2xl border border-[#D8E7F3] bg-[#F8FAFC] p-4">
                    <p className="font-bold text-[#0F172A]">
                      {doctors.find((doctor) => doctor.id === session.doctorId)?.name || "Doctor"}
                    </p>
                    <p className="mt-1 text-sm font-semibold text-[#0B3558]">
                      {formatSessionDate(session.date)} • {formatClock(session.startTime)} - {formatClock(session.endTime)} • {session.roomNumber} • Not Started
                    </p>
                  </div>
                ))
              )
            )}
          </div>
        </SectionCard>
      </div>

      <AdditionalSessionModal
        doctors={doctors}
        form={extraForm}
        errors={extraErrors}
        isOpen={isExtraModalOpen}
        isSubmitting={savingExtra}
        notice={extraNotice}
        selectedDoctor={selectedDoctor}
        slotCount={extraAvailableSlots}
        onChange={updateExtraForm}
        onClose={closeExtraModal}
        onSubmit={handleAddExtra}
      />

      <ConfirmDialog
        isOpen={confirmClearOpen}
        title="Clear weekly session"
        message={`Clear the weekly session for ${selectedDay.label}?`}
        confirmLabel="Clear This Day"
        tone="danger"
        isLoading={clearingWeekly}
        onCancel={() => setConfirmClearOpen(false)}
        onConfirm={() => void handleClearWeekly()}
      />
    </>
  );
}
