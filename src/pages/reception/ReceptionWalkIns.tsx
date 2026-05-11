import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import {
  AlertTriangle,
  Baby,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Eye,
  HeartPulse,
  Loader2,
  Search,
  SendToBack,
  Stethoscope,
  UserPlus,
  UserRoundX,
  Users,
} from "lucide-react";
import PermissionState from "../../components/reception/PermissionState";
import { InlineAlert } from "../../components/reception/ReceptionUI";
import {
  addWalkIn,
  getReceptionPermissions,
  getReceptionSessions,
  searchPatients,
} from "../../services/reception.service";
import type {
  QueueStatus,
  ReceptionPatient,
  ReceptionPermissions,
  ReceptionSession,
} from "../../types/reception.types";

type Priority = "normal" | "elderly" | "emergency" | "follow_up" | "pregnant" | "child";
type Gender = "male" | "female" | "other" | "prefer_not_to_say";
type WalkInStatus = "waiting" | "completed" | "missed" | "cancelled";
type NoticeTone = "success" | "danger" | "warning" | "info";

type TodaySessionOption = {
  id: number;
  queueId: number | null;
  doctorName: string;
  specialization: string;
  roomNumber: string;
  startTime: string;
  endTime: string;
  status: "not_started" | "live" | "paused" | "completed" | "cancelled";
  queueStatus: QueueStatus;
};

type WalkInPatient = {
  id: number;
  patientId: number | null;
  patientName: string;
  patientImageUrl: string | null;
  phone: string;
  nic: string;
  age: string;
  gender: Gender | "";
  reason: string;
  selectedSessionId: number;
  doctorName: string;
  specialization: string;
  roomNumber: string;
  priority: Priority;
  notes: string;
  queueNumber: number;
  status: WalkInStatus;
  addedAt: string;
};

type WalkInForm = {
  patientName: string;
  phone: string;
  nic: string;
  age: string;
  gender: Gender | "";
  reason: string;
  selectedSessionId: string;
  priority: Priority | "";
  notes: string;
};

type Notice = {
  tone: NoticeTone;
  message: string;
};

const blankForm: WalkInForm = {
  patientName: "",
  phone: "",
  nic: "",
  age: "",
  gender: "",
  reason: "",
  selectedSessionId: "",
  priority: "normal",
  notes: "",
};

const priorityOptions: Array<{ value: Priority; label: string; icon: typeof UserPlus }> = [
  { value: "normal", label: "Normal", icon: UserPlus },
  { value: "elderly", label: "Elderly", icon: HeartPulse },
  { value: "emergency", label: "Emergency", icon: AlertTriangle },
  { value: "follow_up", label: "Follow-up", icon: Stethoscope },
  { value: "pregnant", label: "Pregnant patient", icon: HeartPulse },
  { value: "child", label: "Child patient", icon: Baby },
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

function buildRoomFallback(session: ReceptionSession) {
  // TODO: Replace room fallback when receptionist sessions API returns room assignment.
  return `Room ${String((session.doctorId % 6) + 1).padStart(2, "0")}`;
}

function mapSessionStatus(session: ReceptionSession): TodaySessionOption["status"] {
  if (session.queueStatus === "completed") return "completed";
  if (session.queueStatus === "live") return "live";
  if (session.queueStatus === "paused") return "paused";
  return "not_started";
}

function mapSession(session: ReceptionSession): TodaySessionOption {
  return {
    id: session.id,
    queueId: session.queueId,
    doctorName: session.doctorName,
    specialization: session.specialty || "General Medicine",
    roomNumber: buildRoomFallback(session),
    startTime: session.startTime,
    endTime: session.endTime,
    status: mapSessionStatus(session),
    queueStatus: session.queueStatus,
  };
}

function priorityLabel(priority: Priority) {
  return priorityOptions.find((item) => item.value === priority)?.label || "Normal";
}

function priorityClasses(priority: Priority) {
  if (priority === "emergency") return "border-red-200 bg-red-50 text-red-700";
  if (priority === "elderly" || priority === "pregnant" || priority === "child") {
    return "border-amber-200 bg-amber-50 text-amber-800";
  }
  if (priority === "follow_up") return "border-sky-200 bg-sky-50 text-sky-700";
  return "border-emerald-200 bg-emerald-50 text-emerald-700";
}

function statusClasses(status: WalkInStatus) {
  if (status === "waiting") return "border-amber-200 bg-amber-50 text-amber-800";
  if (status === "completed") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  return "border-red-200 bg-red-50 text-red-700";
}

function queuePriority(priority: Priority): "normal" | "urgent" | "emergency" {
  if (priority === "emergency") return "emergency";
  if (priority === "normal" || priority === "follow_up") return "normal";
  // TODO: Expand walk-in API priority model to preserve elderly, pregnant, and child labels.
  return "urgent";
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

function Field({
  children,
  label,
  required,
}: {
  children: ReactNode;
  label: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-[#0B3558]">
        {label} {required ? <span className="text-[#EF4444]">*</span> : null}
      </span>
      <div className="mt-2">{children}</div>
    </label>
  );
}

function textInputClass() {
  return "h-12 w-full rounded-2xl border border-[#D8E7F3] bg-white px-4 text-sm font-medium text-[#0F172A] outline-none transition placeholder:text-[#64748B] focus:border-[#0EA5E9]";
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

function Avatar({ name }: { name: string }) {
  return (
    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[#D8E7F3] bg-[#EFF8FF] text-sm font-bold text-[#0B3558]">
      {getInitials(name)}
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

export default function ReceptionWalkInsPage() {
  const [permissions, setPermissions] = useState<ReceptionPermissions | null>(null);
  const [sessions, setSessions] = useState<TodaySessionOption[]>([]);
  const [patients, setPatients] = useState<ReceptionPatient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<ReceptionPatient | null>(null);
  const [walkIns, setWalkIns] = useState<WalkInPatient[]>([]);
  const [patientSearch, setPatientSearch] = useState("");
  const [form, setForm] = useState<WalkInForm>(blankForm);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState<Notice | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const permissionData = await getReceptionPermissions();
      setPermissions(permissionData);

      if (!permissionData.queue_access) {
        setSessions([]);
        setError("");
        return;
      }

      const sessionData = await getReceptionSessions();
      setSessions(sessionData.map(mapSession));
      setError("");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to load walk-in workspace.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(async () => {
      const query = patientSearch.trim();
      if (!query) {
        setPatients([]);
        return;
      }

      setSearching(true);
      try {
        const results = await searchPatients(query);
        setPatients(results);
      } catch (caughtError) {
        setNotice({
          tone: "danger",
          message: caughtError instanceof Error ? caughtError.message : "Unable to search patients.",
        });
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => window.clearTimeout(timeout);
  }, [patientSearch]);

  const availableSessions = useMemo(
    () => sessions.filter((session) => session.status !== "completed" && session.status !== "cancelled"),
    [sessions]
  );

  const selectedSession = useMemo(
    () => sessions.find((session) => String(session.id) === form.selectedSessionId) || null,
    [form.selectedSessionId, sessions]
  );

  const summary = useMemo(
    () => ({
      total: walkIns.length,
      waiting: walkIns.filter((item) => item.status === "waiting").length,
      completed: walkIns.filter((item) => item.status === "completed").length,
      missed: walkIns.filter((item) => item.status === "missed").length,
      priority: walkIns.filter((item) => item.priority !== "normal").length,
    }),
    [walkIns]
  );

  const selectPatient = (patient: ReceptionPatient) => {
    setSelectedPatient(patient);
    setForm((current) => ({
      ...current,
      patientName: patient.fullName || patient.name,
      phone: patient.phone || "",
      nic: patient.nic || "",
      gender:
        patient.gender === "male" || patient.gender === "female"
          ? patient.gender
          : patient.gender
            ? "other"
            : current.gender,
    }));
  };

  const clearSelectedPatient = () => {
    setSelectedPatient(null);
  };

  const validateForm = () => {
    if (!form.patientName.trim()) return "Patient name is required.";
    if (!form.phone.trim() && !form.nic.trim()) return "Phone number or NIC is required.";
    if (!form.selectedSessionId) return "Select a doctor session.";
    if (!form.reason.trim()) return "Reason for visit is required.";
    if (!form.priority) return "Priority level is required.";
    if (!selectedSession || selectedSession.status === "completed" || selectedSession.status === "cancelled") {
      return "Selected session is not available for walk-ins.";
    }
    return "";
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const validationError = validateForm();
    if (validationError) {
      setNotice({ tone: "warning", message: validationError });
      return;
    }

    if (!selectedSession || !form.priority) return;

    setSubmitting(true);
    try {
      const response = await addWalkIn({
        name: form.patientName.trim(),
        phone: form.phone.trim() || undefined,
        priority: queuePriority(form.priority),
        queueId: selectedSession.queueId,
        sessionId: selectedSession.id,
      });

      const nextWalkIn: WalkInPatient = {
        id: Date.now(),
        patientId: selectedPatient?.id || null,
        patientName: form.patientName.trim(),
        patientImageUrl: null,
        phone: form.phone.trim(),
        nic: form.nic.trim(),
        age: form.age.trim(),
        gender: form.gender,
        reason: form.reason.trim(),
        selectedSessionId: selectedSession.id,
        doctorName: selectedSession.doctorName,
        specialization: selectedSession.specialization,
        roomNumber: selectedSession.roomNumber,
        priority: form.priority,
        notes: form.notes.trim(),
        queueNumber: walkIns.length + 1,
        status: "waiting",
        addedAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setWalkIns((current) => [nextWalkIn, ...current]);
      setNotice({ tone: "success", message: response.message || "Walk-in patient added to the queue." });
      setForm(blankForm);
      setSelectedPatient(null);
      setPatientSearch("");
      setPatients([]);
    } catch (caughtError) {
      setNotice({
        tone: "danger",
        message: caughtError instanceof Error ? caughtError.message : "Could not add walk-in patient. Please try again.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const updateWalkInStatus = (id: number, status: WalkInStatus) => {
    setWalkIns((current) => current.map((item) => (item.id === id ? { ...item, status } : item)));
  };

  const moveToEnd = (id: number) => {
    // TODO: Connect walk-in move-to-end to backend queue ordering API.
    setWalkIns((current) => {
      const target = current.find((item) => item.id === id);
      if (!target) return current;
      return [...current.filter((item) => item.id !== id), target];
    });
    setNotice({ tone: "info", message: "Walk-in moved to the end locally." });
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

  if (!permissions?.queue_access) {
    return (
      <PermissionState
        title="Walk-ins are not assigned"
        message="This receptionist account cannot add walk-ins until queue access is enabled."
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
              <UserPlus size={14} />
              Front Desk
            </div>
            <h1 className="mt-4 text-3xl font-bold tracking-tight">Walk-ins</h1>
            <p className="mt-2 text-sm text-sky-100">Add non-booked patients to today&apos;s clinic queue</p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm font-semibold">
            <CalendarDays size={16} />
            {formatDateLabel()}
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <SummaryCard icon={Users} label="Total Walk-ins" value={summary.total} />
        <SummaryCard icon={Clock3} label="Waiting" value={summary.waiting} />
        <SummaryCard icon={CheckCircle2} label="Completed" value={summary.completed} />
        <SummaryCard icon={UserRoundX} label="Missed" value={summary.missed} />
        <SummaryCard icon={AlertTriangle} label="Emergency / Priority" value={summary.priority} />
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(380px,0.85fr)]">
        <div className="space-y-6">
          <section className="rounded-[28px] border border-[#D8E7F3] bg-white p-5 shadow-[0_18px_48px_rgba(6,26,46,0.06)]">
            <p className="text-sm font-semibold text-[#0EA5E9]">Existing patient search</p>
            <h2 className="mt-1 text-2xl font-bold text-[#0F172A]">Avoid duplicate records</h2>
            <label className="mt-5 flex h-14 items-center gap-3 rounded-2xl border border-[#D8E7F3] bg-white px-4">
              <Search size={18} className="text-[#64748B]" />
              <input
                value={patientSearch}
                onChange={(event) => setPatientSearch(event.target.value)}
                placeholder="Search existing patient by name, phone, or NIC"
                className="w-full bg-transparent text-sm font-medium text-[#0F172A] outline-none placeholder:text-[#64748B]"
              />
              {searching ? <Loader2 size={16} className="animate-spin text-[#0EA5E9]" /> : null}
            </label>

            {selectedPatient ? (
              <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-bold text-emerald-800">Using existing patient profile</p>
                  <p className="mt-1 text-sm text-emerald-700">
                    {selectedPatient.fullName || selectedPatient.name} • {selectedPatient.phone || "No phone"}
                  </p>
                </div>
                <ActionButton onClick={clearSelectedPatient}>Use new profile</ActionButton>
              </div>
            ) : patientSearch.trim() && patients.length === 0 && !searching ? (
              <div className="mt-4 rounded-2xl border border-dashed border-[#B7DDF5] bg-[#F8FAFC] p-5">
                <p className="font-bold text-[#0F172A]">No existing patient found.</p>
                <p className="mt-1 text-sm text-[#64748B]">Create a new walk-in record using the form.</p>
              </div>
            ) : patients.length > 0 ? (
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {patients.slice(0, 4).map((patient) => (
                  <button
                    key={patient.id}
                    type="button"
                    onClick={() => selectPatient(patient)}
                    className="rounded-2xl border border-[#D8E7F3] bg-[#F8FAFC] p-4 text-left transition hover:border-[#0EA5E9]"
                  >
                    <p className="font-bold text-[#0F172A]">{patient.fullName || patient.name}</p>
                    <p className="mt-1 text-sm text-[#64748B]">
                      {patient.phone || "No phone"} {patient.nic ? `• NIC ${patient.nic}` : ""}
                    </p>
                  </button>
                ))}
              </div>
            ) : null}
          </section>

          <section className="rounded-[28px] border border-[#D8E7F3] bg-white p-5 shadow-[0_18px_48px_rgba(6,26,46,0.06)]">
            <p className="text-sm font-semibold text-[#0EA5E9]">Walk-in registration</p>
            <h2 className="mt-1 text-2xl font-bold text-[#0F172A]">Add patient to queue</h2>

            <form className="mt-5 space-y-5" onSubmit={handleSubmit}>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Patient name" required>
                  <input
                    value={form.patientName}
                    onChange={(event) => setForm((current) => ({ ...current, patientName: event.target.value }))}
                    className={textInputClass()}
                    placeholder="Patient full name"
                  />
                </Field>
                <Field label="Phone number">
                  <input
                    value={form.phone}
                    onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
                    className={textInputClass()}
                    placeholder="Phone number"
                  />
                </Field>
                <Field label="NIC / ID number">
                  <input
                    value={form.nic}
                    onChange={(event) => setForm((current) => ({ ...current, nic: event.target.value }))}
                    className={textInputClass()}
                    placeholder="NIC or ID"
                  />
                </Field>
                <Field label="Age">
                  <input
                    value={form.age}
                    onChange={(event) => setForm((current) => ({ ...current, age: event.target.value }))}
                    className={textInputClass()}
                    placeholder="Age"
                    inputMode="numeric"
                  />
                </Field>
                <Field label="Gender">
                  <select
                    value={form.gender}
                    onChange={(event) => setForm((current) => ({ ...current, gender: event.target.value as Gender | "" }))}
                    className={textInputClass()}
                  >
                    <option value="">Select gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other / Prefer not to say</option>
                    <option value="prefer_not_to_say">Prefer not to say</option>
                  </select>
                </Field>
                <Field label="Priority level" required>
                  <select
                    value={form.priority}
                    onChange={(event) => setForm((current) => ({ ...current, priority: event.target.value as Priority }))}
                    className={textInputClass()}
                  >
                    {priorityOptions.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </Field>
              </div>

              <Field label="Reason for visit" required>
                <textarea
                  value={form.reason}
                  onChange={(event) => setForm((current) => ({ ...current, reason: event.target.value }))}
                  className="min-h-24 w-full rounded-2xl border border-[#D8E7F3] bg-white px-4 py-3 text-sm font-medium text-[#0F172A] outline-none transition placeholder:text-[#64748B] focus:border-[#0EA5E9]"
                  placeholder="Short reason for the walk-in visit"
                />
              </Field>

              <Field label="Select doctor/session" required>
                <select
                  value={form.selectedSessionId}
                  onChange={(event) => setForm((current) => ({ ...current, selectedSessionId: event.target.value }))}
                  className={textInputClass()}
                  disabled={availableSessions.length === 0}
                >
                  <option value="">Select today&apos;s session</option>
                  {sessions.map((session) => (
                    <option
                      key={session.id}
                      value={session.id}
                      disabled={session.status === "completed" || session.status === "cancelled"}
                    >
                      {session.doctorName} • {session.specialization} • {session.roomNumber} • {formatClock(session.startTime)} - {formatClock(session.endTime)}
                    </option>
                  ))}
                </select>
              </Field>

              {availableSessions.length === 0 ? (
                <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
                  No active or upcoming sessions available for walk-ins.
                </p>
              ) : selectedSession ? (
                <p className="rounded-2xl border border-[#D8E7F3] bg-[#F8FAFC] px-4 py-3 text-sm font-semibold text-[#0B3558]">
                  {selectedSession.status === "live"
                    ? "This walk-in will be added after the last waiting patient."
                    : "This walk-in will be added to today's session list."}
                </p>
              ) : null}

              <Field label="Notes">
                <textarea
                  value={form.notes}
                  onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
                  className="min-h-20 w-full rounded-2xl border border-[#D8E7F3] bg-white px-4 py-3 text-sm font-medium text-[#0F172A] outline-none transition placeholder:text-[#64748B] focus:border-[#0EA5E9]"
                  placeholder="Optional receptionist notes"
                />
              </Field>

              <ActionButton type="submit" tone="primary" disabled={submitting || availableSessions.length === 0}>
                {submitting ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />}
                Add Walk-in to Queue
              </ActionButton>
            </form>
          </section>
        </div>

        <section className="rounded-[28px] border border-[#D8E7F3] bg-white p-5 shadow-[0_18px_48px_rgba(6,26,46,0.06)]">
          <p className="text-sm font-semibold text-[#0EA5E9]">Today&apos;s walk-ins</p>
          <h2 className="mt-1 text-2xl font-bold text-[#0F172A]">Queue intake list</h2>

          <div className="mt-5 space-y-3">
            {walkIns.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-[#B7DDF5] bg-[#F8FAFC] p-8 text-center">
                <h3 className="text-lg font-bold text-[#0F172A]">No walk-ins added today.</h3>
                <p className="mt-2 text-sm text-[#64748B]">
                  Walk-in patients will appear here after they are added to a session queue.
                </p>
              </div>
            ) : (
              walkIns.map((walkIn) => (
                <article key={walkIn.id} className="rounded-3xl border border-[#D8E7F3] bg-[#F8FAFC] p-4">
                  <div className="flex items-start gap-3">
                    <div className="rounded-2xl bg-[#061A2E] px-3 py-2 text-sm font-bold text-white">
                      #{walkIn.queueNumber}
                    </div>
                    <Avatar name={walkIn.patientName} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-bold text-[#0F172A]">{walkIn.patientName}</h3>
                        <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${priorityClasses(walkIn.priority)}`}>
                          {priorityLabel(walkIn.priority)}
                        </span>
                        <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusClasses(walkIn.status)}`}>
                          {walkIn.status}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-[#64748B]">{walkIn.phone || "No phone"}</p>
                      <p className="mt-1 text-sm font-semibold text-[#0B3558]">
                        {walkIn.doctorName} • {walkIn.specialization} • {walkIn.roomNumber}
                      </p>
                      <p className="mt-1 text-sm text-[#64748B]">
                        {walkIn.reason} • Added {walkIn.addedAt}
                      </p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <ActionButton onClick={() => setNotice({ tone: "info", message: "Open the Live Queue page to view this walk-in in queue context." })}>
                          <Eye size={14} />
                          View in Queue
                        </ActionButton>
                        <ActionButton disabled={walkIn.status !== "waiting"} onClick={() => moveToEnd(walkIn.id)}>
                          <SendToBack size={14} />
                          Move to End
                        </ActionButton>
                        <ActionButton
                          disabled={walkIn.status !== "waiting"}
                          onClick={() => {
                            // TODO: Connect walk-in missed action to backend queue API.
                            updateWalkInStatus(walkIn.id, "missed");
                          }}
                          tone="danger"
                        >
                          <UserRoundX size={14} />
                          Mark Missed
                        </ActionButton>
                        <ActionButton
                          disabled={walkIn.status !== "waiting"}
                          onClick={() => {
                            // TODO: Connect walk-in cancellation to backend queue API.
                            updateWalkInStatus(walkIn.id, "cancelled");
                          }}
                          tone="danger"
                        >
                          <AlertTriangle size={14} />
                          Cancel Walk-in
                        </ActionButton>
                      </div>
                    </div>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
