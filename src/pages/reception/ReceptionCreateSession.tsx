import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  DoorOpen,
  Loader2,
  NotebookText,
  Stethoscope,
  UserRound,
  Users,
} from "lucide-react";
import PermissionState from "../../components/reception/PermissionState";
import { InlineAlert } from "../../components/reception/ReceptionUI";
import {
  createReceptionManualSession,
  getReceptionPermissions,
  getReceptionSessionDoctors,
  getReceptionSessions,
} from "../../services/reception.service";
import type {
  ReceptionPermissions,
  ReceptionSession,
  ReceptionSessionDoctor,
} from "../../types/reception.types";

type DoctorOption = {
  id: number;
  name: string;
  specialization: string;
  avatarUrl?: string | null;
  doctorUserId: number;
};

type CreateSessionForm = {
  doctorId: string;
  date: string;
  startTime: string;
  endTime: string;
  roomNumber: string;
  maxPatients: string;
  notes: string;
};

type DoctorSession = {
  id: number | string;
  doctorId: number;
  doctorName: string;
  specialization: string;
  date: string;
  startTime: string;
  endTime: string;
  roomNumber: string;
  maxPatients: number;
  status: "not_started";
};

type FormErrors = Partial<Record<keyof CreateSessionForm, string>>;

type Notice = {
  tone: "success" | "danger" | "warning" | "info";
  message: string;
};

const TODAY = new Date().toISOString().slice(0, 10);

const initialForm: CreateSessionForm = {
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

function formatClock(value: string) {
  const [hourPart = "0", minutePart = "00"] = String(value || "").split(":");
  const hour = Number(hourPart);
  if (Number.isNaN(hour)) return value || "Not set";
  const minute = minutePart.padStart(2, "0").slice(0, 2);
  const period = hour >= 12 ? "PM" : "AM";
  return `${hour % 12 || 12}:${minute} ${period}`;
}

function formatSessionDate(value: string) {
  if (!value) return "Not set";
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}

function buildRoomFallback(session: ReceptionSession) {
  // TODO: Replace room fallback when receptionist sessions API returns room assignment.
  return `Room ${String((session.doctorId % 6) + 1).padStart(2, "0")}`;
}

function overlaps(startA: string, endA: string, startB: string, endB: string) {
  return startA < endB && endA > startB;
}

function getDurationMinutes(startTime: string, endTime: string) {
  const [startHour = "0", startMinute = "0"] = startTime.split(":");
  const [endHour = "0", endMinute = "0"] = endTime.split(":");
  const start = Number(startHour) * 60 + Number(startMinute);
  const end = Number(endHour) * 60 + Number(endMinute);
  return end - start;
}

function mapDoctorOptions(doctors: ReceptionSessionDoctor[]): DoctorOption[] {
  return doctors.map((doctor) => ({
    id: doctor.doctorId,
    doctorUserId: doctor.doctorUserId,
    name: doctor.doctorName,
    specialization: doctor.specialization || doctor.clinicSpecialty || "General Medicine",
    avatarUrl: doctor.doctorProfileImage || null,
  }));
}

function mapTodaySessions(sessions: ReceptionSession[]): DoctorSession[] {
  return sessions
    .filter((session) => session.date === TODAY)
    .map((session) => ({
      id: session.id,
      doctorId: session.doctorId,
      doctorName: session.doctorName,
      specialization: session.specialty || "General Medicine",
      date: session.date,
      startTime: session.startTime,
      endTime: session.endTime,
      roomNumber: buildRoomFallback(session),
      maxPatients: session.appointmentCount,
      status: "not_started",
    }));
}

function Field({
  children,
  error,
  label,
  required,
}: {
  children: React.ReactNode;
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

export default function ReceptionCreateSessionPage() {
  const [permissions, setPermissions] = useState<ReceptionPermissions | null>(null);
  const [doctors, setDoctors] = useState<DoctorOption[]>([]);
  const [sessions, setSessions] = useState<ReceptionSession[]>([]);
  const [createdSession, setCreatedSession] = useState<DoctorSession | null>(null);
  const [form, setForm] = useState<CreateSessionForm>(initialForm);
  const [errors, setErrors] = useState<FormErrors>({});
  const [notice, setNotice] = useState<Notice | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
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
        message: error instanceof Error ? error.message : "Failed to load session creation data.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const selectedDoctor = useMemo(
    () => doctors.find((doctor) => String(doctor.id) === form.doctorId) || null,
    [doctors, form.doctorId]
  );

  const todaySessions = useMemo(() => mapTodaySessions(sessions), [sessions]);

  const durationMinutes = useMemo(
    () =>
      form.startTime && form.endTime ? getDurationMinutes(form.startTime, form.endTime) : 0,
    [form.endTime, form.startTime]
  );

  const preview = useMemo<DoctorSession | null>(() => {
    if (!selectedDoctor || !form.date || !form.startTime || !form.endTime || !form.roomNumber || !form.maxPatients) {
      return null;
    }

    return {
      id: "preview",
      doctorId: selectedDoctor.id,
      doctorName: selectedDoctor.name,
      specialization: selectedDoctor.specialization,
      date: form.date,
      startTime: form.startTime,
      endTime: form.endTime,
      roomNumber: form.roomNumber.trim(),
      maxPatients: Number(form.maxPatients),
      status: "not_started",
    };
  }, [form.date, form.endTime, form.maxPatients, form.roomNumber, form.startTime, selectedDoctor]);

  const inputClass =
    "h-12 w-full rounded-2xl border border-[#D8E7F3] bg-white px-4 text-sm font-medium text-[#0F172A] outline-none transition placeholder:text-[#94A3B8] focus:border-[#0EA5E9] focus:ring-2 focus:ring-[#BAE6FD]";

  const validateForm = () => {
    const nextErrors: FormErrors = {};
    const trimmedRoom = form.roomNumber.trim();
    const maxPatients = Number(form.maxPatients);

    if (!form.doctorId) nextErrors.doctorId = "Doctor is required.";
    if (!form.date) nextErrors.date = "Date is required.";
    if (!form.startTime) nextErrors.startTime = "Start time is required.";
    if (!form.endTime) nextErrors.endTime = "End time is required.";
    if (form.startTime && form.endTime && form.endTime <= form.startTime) {
      nextErrors.endTime = "End time must be after start time.";
    }
    if (!trimmedRoom) nextErrors.roomNumber = "Room number is required.";
    if (!form.maxPatients) nextErrors.maxPatients = "Max patients is required.";
    if (form.maxPatients && (!Number.isFinite(maxPatients) || maxPatients <= 0)) {
      nextErrors.maxPatients = "Max patients must be greater than 0.";
    }
    if (form.date < TODAY) nextErrors.date = "Do not create sessions in the past.";

    if (selectedDoctor && form.date && form.startTime && form.endTime) {
      const doctorConflict = sessions.some(
        (session) =>
          session.doctorId === selectedDoctor.id &&
          session.date === form.date &&
          overlaps(form.startTime, form.endTime, session.startTime, session.endTime)
      );
      if (doctorConflict) nextErrors.startTime = "This doctor already has a session during this time.";

      const roomConflict = sessions.some(
        (session) =>
          buildRoomFallback(session).toLowerCase() === trimmedRoom.toLowerCase() &&
          session.date === form.date &&
          overlaps(form.startTime, form.endTime, session.startTime, session.endTime)
      );
      if (roomConflict) nextErrors.roomNumber = "This room is already assigned during this time.";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleChange = (field: keyof CreateSessionForm, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setNotice(null);

    if (!validateForm() || !selectedDoctor || !preview) return;

    setSubmitting(true);
    try {
      await createReceptionManualSession(selectedDoctor.doctorUserId, {
        date: form.date,
        start_time: form.startTime,
        end_time: form.endTime,
        slot_duration: 15,
        max_patients: Number(form.maxPatients),
      });

      // TODO: Persist room number and notes when the session creation API supports them.
      // TODO: Replace frontend conflict check with backend validation.

      setCreatedSession({ ...preview, id: `${selectedDoctor.id}-${Date.now()}` });
      setNotice({ tone: "success", message: "Doctor session created successfully." });
      setForm(initialForm);
      setErrors({});
      await load();
    } catch (error) {
      setNotice({
        tone: "danger",
        message: error instanceof Error ? error.message : "Failed to create session.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-140px)] rounded-[32px] bg-[linear-gradient(180deg,#F8FAFC_0%,#EFF8FF_100%)] p-6">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_420px]">
          <div className="h-[520px] animate-pulse rounded-3xl border border-[#D8E7F3] bg-white/80" />
          <div className="space-y-4">
            <div className="h-64 animate-pulse rounded-3xl border border-[#D8E7F3] bg-white/80" />
            <div className="h-56 animate-pulse rounded-3xl border border-[#D8E7F3] bg-white/80" />
          </div>
        </div>
      </div>
    );
  }

  if (!permissions?.schedule_management) {
    return (
      <PermissionState
        title="Session creation is not assigned"
        message="This receptionist account cannot create doctor sessions until schedule management is enabled."
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
              <Stethoscope size={14} />
              Reception Desk
            </div>
            <h1 className="mt-4 text-3xl font-bold tracking-tight">Create Session</h1>
            <p className="mt-2 text-sm text-sky-100">Add a doctor session for the medical center</p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm font-semibold">
            <CalendarDays size={16} />
            {formatDateLabel()}
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_420px]">
        <section className="rounded-[28px] border border-[#D8E7F3] bg-white p-5 shadow-[0_18px_48px_rgba(6,26,46,0.06)]">
          <p className="text-sm font-semibold text-[#0EA5E9]">Session form</p>
          <h2 className="mt-1 text-2xl font-bold text-[#0F172A]">Doctor session details</h2>
          <p className="mt-2 text-sm leading-6 text-[#64748B]">
            Room number and notes are captured in the receptionist UI, but the current manual session API only saves doctor, date, time, slot duration, and max patients.
          </p>

          <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
            <div className="grid gap-5 md:grid-cols-2">
              <Field label="Doctor" required error={errors.doctorId}>
                <select
                  value={form.doctorId}
                  onChange={(event) => handleChange("doctorId", event.target.value)}
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

              <Field label="Date" required error={errors.date}>
                <input
                  type="date"
                  min={TODAY}
                  value={form.date}
                  onChange={(event) => handleChange("date", event.target.value)}
                  className={inputClass}
                />
              </Field>

              <Field label="Start Time" required error={errors.startTime}>
                <input
                  type="time"
                  value={form.startTime}
                  onChange={(event) => handleChange("startTime", event.target.value)}
                  className={inputClass}
                />
              </Field>

              <Field label="End Time" required error={errors.endTime}>
                <input
                  type="time"
                  value={form.endTime}
                  onChange={(event) => handleChange("endTime", event.target.value)}
                  className={inputClass}
                />
              </Field>

              <Field label="Room Number" required error={errors.roomNumber}>
                <input
                  type="text"
                  value={form.roomNumber}
                  onChange={(event) => handleChange("roomNumber", event.target.value)}
                  placeholder="Room 02"
                  className={inputClass}
                />
              </Field>

              <Field label="Max Patients" required error={errors.maxPatients}>
                <input
                  type="number"
                  min={1}
                  value={form.maxPatients}
                  onChange={(event) => handleChange("maxPatients", event.target.value)}
                  placeholder="20"
                  className={inputClass}
                />
              </Field>
            </div>

            <Field label="Notes" error={errors.notes}>
              <textarea
                value={form.notes}
                onChange={(event) => handleChange("notes", event.target.value)}
                placeholder="Optional receptionist note for this session"
                className="min-h-[120px] w-full rounded-2xl border border-[#D8E7F3] bg-white px-4 py-3 text-sm font-medium text-[#0F172A] outline-none transition placeholder:text-[#94A3B8] focus:border-[#0EA5E9] focus:ring-2 focus:ring-[#BAE6FD]"
              />
            </Field>

            <div className="space-y-3">
              {Number(form.maxPatients) > 100 ? (
                <InlineAlert tone="warning" message="Max patients above 100 may be too high for one session." />
              ) : null}
              {durationMinutes > 0 && durationMinutes < 15 ? (
                <InlineAlert tone="warning" message="Session duration is less than 15 minutes." />
              ) : null}
              <InlineAlert
                tone="info"
                message="Conflict checking currently runs in the frontend against loaded session data. Backend validation should still be added."
              />
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#0EA5E9] bg-[#0EA5E9] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#0284C7] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                Create Session
              </button>
              {createdSession?.date === TODAY ? (
                <Link
                  to="/receptionist/sessions"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#D8E7F3] bg-white px-5 py-3 text-sm font-semibold text-[#0B3558] transition hover:bg-[#EFF8FF]"
                >
                  View Today Sessions
                </Link>
              ) : null}
            </div>
          </form>
        </section>

        <div className="space-y-6">
          <section className="rounded-[28px] border border-[#D8E7F3] bg-white p-5 shadow-[0_18px_48px_rgba(6,26,46,0.06)]">
            <p className="text-sm font-semibold text-[#0EA5E9]">Session preview</p>
            <h2 className="mt-1 text-2xl font-bold text-[#0F172A]">Live preview</h2>

            {preview ? (
              <div className="mt-5 rounded-3xl border border-[#D8E7F3] bg-[#F8FAFC] p-5">
                <div className="flex items-start gap-3">
                  <div className="rounded-2xl bg-[#EFF8FF] p-3 text-[#0EA5E9]">
                    <UserRound size={18} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-[#0F172A]">{preview.doctorName}</h3>
                    <p className="mt-1 text-sm text-[#64748B]">{preview.specialization}</p>
                  </div>
                </div>
                <div className="mt-5 space-y-3">
                  <div className="flex items-center gap-3 text-sm text-[#0B3558]">
                    <CalendarDays size={16} />
                    {formatSessionDate(preview.date)}
                  </div>
                  <div className="flex items-center gap-3 text-sm text-[#0B3558]">
                    <Clock3 size={16} />
                    {formatClock(preview.startTime)} - {formatClock(preview.endTime)}
                  </div>
                  <div className="flex items-center gap-3 text-sm text-[#0B3558]">
                    <DoorOpen size={16} />
                    {preview.roomNumber}
                  </div>
                  <div className="flex items-center gap-3 text-sm text-[#0B3558]">
                    <Users size={16} />
                    {preview.maxPatients} max patients
                  </div>
                  <div className="flex items-center gap-3 text-sm text-[#0B3558]">
                    <NotebookText size={16} />
                    {form.notes.trim() || "No receptionist note"}
                  </div>
                </div>
                <div className="mt-5">
                  <span className="rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                    Not Started
                  </span>
                </div>
              </div>
            ) : (
              <div className="mt-5 rounded-3xl border border-dashed border-[#B7DDF5] bg-[#F8FAFC] p-8 text-center">
                <p className="text-base font-semibold text-[#0F172A]">Session preview will appear here.</p>
              </div>
            )}

            {createdSession ? (
              <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                <p className="text-sm font-bold text-emerald-800">Created session</p>
                <p className="mt-1 text-sm text-emerald-700">
                  {createdSession.doctorName} • {formatSessionDate(createdSession.date)} • {formatClock(createdSession.startTime)} - {formatClock(createdSession.endTime)}
                </p>
              </div>
            ) : null}
          </section>

          <section className="rounded-[28px] border border-[#D8E7F3] bg-white p-5 shadow-[0_18px_48px_rgba(6,26,46,0.06)]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-[#0EA5E9]">Today&apos;s sessions</p>
                <h2 className="mt-1 text-2xl font-bold text-[#0F172A]">Existing sessions</h2>
              </div>
              <span className="rounded-full border border-[#D8E7F3] bg-[#F8FAFC] px-3 py-1 text-xs font-semibold text-[#64748B]">
                {todaySessions.length} today
              </span>
            </div>

            <div className="mt-5 space-y-3">
              {todaySessions.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-[#B7DDF5] bg-[#F8FAFC] p-6 text-center">
                  <p className="font-semibold text-[#0F172A]">No sessions scheduled for today.</p>
                </div>
              ) : (
                todaySessions.map((session) => (
                  <div key={session.id} className="rounded-2xl border border-[#D8E7F3] bg-[#F8FAFC] p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-bold text-[#0F172A]">{session.doctorName}</p>
                        <p className="mt-1 text-sm text-[#64748B]">{session.specialization}</p>
                        <p className="mt-2 text-sm font-semibold text-[#0B3558]">
                          {formatClock(session.startTime)} - {formatClock(session.endTime)} • {session.roomNumber}
                        </p>
                      </div>
                      <span className="rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                        Not Started
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
