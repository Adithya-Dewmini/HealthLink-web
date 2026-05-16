import { useEffect, useMemo, useState } from "react";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import {
  MedicalCenterEmptyState,
  MedicalCenterInlineAlert,
  MedicalCenterPageHeader,
  MedicalCenterSectionCard,
  MedicalCenterStatusBadge,
} from "../../components/center/MedicalCenterUI";
import {
  createMedicalCenterSchedule,
  disableMedicalCenterSchedule,
  getMedicalCenterDoctors,
  getMedicalCenterSchedules,
  previewMedicalCenterSchedule,
  updateMedicalCenterSchedule,
} from "../../services/medical-center.service";
import type { MedicalCenterDoctor, MedicalCenterSchedule } from "../../types/medical-center.types";
import { formatShortDate, formatTimeRange } from "./utils";

type Notice = { tone: "success" | "error" | "warning"; message: string };

type ScheduleForm = {
  doctorId: string;
  date: string;
  startTime: string;
  endTime: string;
  slotDuration: string;
  maxPatients: string;
};

const initialForm: ScheduleForm = {
  doctorId: "",
  date: new Date().toISOString().slice(0, 10),
  startTime: "09:00",
  endTime: "12:00",
  slotDuration: "20",
  maxPatients: "9",
};

export default function CenterSessionsPage() {
  const [doctors, setDoctors] = useState<MedicalCenterDoctor[]>([]);
  const [schedules, setSchedules] = useState<MedicalCenterSchedule[]>([]);
  const [form, setForm] = useState<ScheduleForm>(initialForm);
  const [preview, setPreview] = useState<{ warning: string | null; slots: Array<{ time: string; available: boolean }> } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState<Notice | null>(null);
  const [actionKey, setActionKey] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [doctorRows, scheduleRows] = await Promise.all([
        getMedicalCenterDoctors(),
        getMedicalCenterSchedules(),
      ]);
      setDoctors(doctorRows.filter((doctor) => doctor.doctorId !== null && doctor.status === "ACTIVE"));
      setSchedules(scheduleRows);
      setError("");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to load doctor sessions.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const upcomingSchedules = useMemo(
    () =>
      schedules
        .slice()
        .sort((left, right) => `${left.date} ${left.startTime}`.localeCompare(`${right.date} ${right.startTime}`)),
    [schedules]
  );

  const submitPayload = {
    doctor_id: Number(form.doctorId),
    date: form.date,
    start_time: form.startTime,
    end_time: form.endTime,
    slot_duration: Number(form.slotDuration),
    max_patients: Number(form.maxPatients),
  };

  const runAction = async (key: string, work: () => Promise<unknown>, successMessage: string, tone: Notice["tone"] = "success") => {
    setActionKey(key);
    setNotice(null);
    try {
      await work();
      setNotice({ tone, message: successMessage });
      await load();
    } catch (caughtError) {
      setNotice({
        tone: "error",
        message: caughtError instanceof Error ? caughtError.message : "Session action failed.",
      });
    } finally {
      setActionKey(null);
    }
  };

  const handlePreview = async () => {
    await runAction(
      "preview",
      async () => {
        const result = await previewMedicalCenterSchedule(submitPayload);
        setPreview({ warning: result.warning, slots: result.slots.map((slot) => ({ time: slot.time, available: slot.available })) });
      },
      "Schedule preview generated.",
      "warning"
    );
  };

  const handleCreate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await runAction(
      "create",
      () => createMedicalCenterSchedule(submitPayload),
      "Doctor session created successfully."
    );
    setPreview(null);
    setForm(initialForm);
  };

  return (
    <div className="space-y-6">
      <MedicalCenterPageHeader
        title="Doctor sessions"
        subtitle="Create and manage doctor sessions using the existing center schedule APIs. Capacity and validity stay aligned with doctor availability."
      />

      {notice ? (
        <MedicalCenterInlineAlert
          tone={notice.tone === "success" ? "success" : notice.tone === "warning" ? "warning" : "error"}
          message={notice.message}
        />
      ) : null}
      {error ? (
        <div className="space-y-3">
          <MedicalCenterInlineAlert tone="error" message={error} />
          <Button variant="secondary" onClick={() => void load()}>
            Retry loading sessions
          </Button>
        </div>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <MedicalCenterSectionCard title="Create doctor session" subtitle="Preview the proposed session before creating it.">
          <form className="space-y-4" onSubmit={handleCreate}>
            <label className="field-group">
              <span className="field-label">Doctor</span>
              <select
                className="field-input"
                value={form.doctorId}
                onChange={(event) => setForm((current) => ({ ...current, doctorId: event.target.value }))}
                required
              >
                <option value="">Select doctor</option>
                {doctors.map((doctor) => (
                  <option key={doctor.id} value={doctor.doctorId ?? ""}>
                    {doctor.name ?? doctor.email}
                  </option>
                ))}
              </select>
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                id="session-date"
                label="Date"
                type="date"
                value={form.date}
                onChange={(event) => setForm((current) => ({ ...current, date: event.target.value }))}
                required
              />
              <Input
                id="slot-duration"
                label="Slot duration (minutes)"
                type="number"
                min="5"
                value={form.slotDuration}
                onChange={(event) => setForm((current) => ({ ...current, slotDuration: event.target.value }))}
                required
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                id="start-time"
                label="Start time"
                type="time"
                value={form.startTime}
                onChange={(event) => setForm((current) => ({ ...current, startTime: event.target.value }))}
                required
              />
              <Input
                id="end-time"
                label="End time"
                type="time"
                value={form.endTime}
                onChange={(event) => setForm((current) => ({ ...current, endTime: event.target.value }))}
                required
              />
            </div>
            <Input
              id="max-patients"
              label="Maximum patients"
              type="number"
              min="1"
              value={form.maxPatients}
              onChange={(event) => setForm((current) => ({ ...current, maxPatients: event.target.value }))}
              required
            />

            <div className="flex flex-wrap gap-3">
              <Button type="button" variant="secondary" isLoading={actionKey === "preview"} onClick={() => void handlePreview()}>
                Preview schedule
              </Button>
              <Button type="submit" isLoading={actionKey === "create"}>
                Create session
              </Button>
            </div>
          </form>

          {preview ? (
            <div className="mt-5 rounded-[22px] border border-[#DDEFE8] bg-[#F8FFFB] p-4">
              <div className="flex items-center justify-between gap-3">
                <h4 className="text-sm font-semibold uppercase tracking-[0.18em] text-[#047857]">Preview slots</h4>
                <span className="text-sm text-[#587164]">{preview.slots.length} generated slots</span>
              </div>
              {preview.warning ? (
                <div className="mt-3">
                  <MedicalCenterInlineAlert tone="warning" message={preview.warning} />
                </div>
              ) : null}
              <div className="mt-4 flex flex-wrap gap-2">
                {preview.slots.map((slot) => (
                  <span
                    key={slot.time}
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      slot.available
                        ? "bg-[#D1FAE5] text-[#047857]"
                        : "bg-[#FEF2F2] text-[#DC2626]"
                    }`}
                  >
                    {slot.time}
                  </span>
                ))}
              </div>
            </div>
          ) : null}
        </MedicalCenterSectionCard>

        <MedicalCenterSectionCard title="Scheduled sessions" subtitle="Upcoming and past sessions already attached to this medical center.">
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="hl-skeleton h-28 rounded-[22px]" />
              ))}
            </div>
          ) : upcomingSchedules.length === 0 ? (
            <MedicalCenterEmptyState
              title="No sessions yet"
              description="Doctor sessions created here will appear in this list with their current activation state."
            />
          ) : (
            <div className="space-y-4">
              {upcomingSchedules.map((schedule) => (
                <div key={schedule.id} className="rounded-[22px] border border-[#E3F1EA] bg-[#FAFEFC] p-4">
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-3">
                        <h3 className="text-base font-semibold text-[#064E3B]">{schedule.doctorName ?? "Doctor"}</h3>
                        <MedicalCenterStatusBadge status={schedule.isActive ? "ACTIVE" : "INACTIVE"} />
                        <MedicalCenterStatusBadge status={schedule.source} />
                      </div>
                      <p className="mt-2 text-sm text-[#587164]">
                        {formatShortDate(schedule.date)} • {formatTimeRange(schedule.startTime, schedule.endTime)}
                      </p>
                      <p className="mt-1 text-sm text-[#587164]">
                        {schedule.maxPatients} max patients • {schedule.slotDuration} minute slots • Room {schedule.roomNumber || "Not assigned"}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {schedule.isActive ? (
                        <Button
                          variant="danger"
                          isLoading={actionKey === `disable:${schedule.id}`}
                          onClick={() =>
                            void runAction(
                              `disable:${schedule.id}`,
                              () => disableMedicalCenterSchedule(schedule.id),
                              "Session disabled."
                            )
                          }
                        >
                          Disable
                        </Button>
                      ) : (
                        <Button
                          variant="primary"
                          isLoading={actionKey === `enable:${schedule.id}`}
                          onClick={() =>
                            void runAction(
                              `enable:${schedule.id}`,
                              () => updateMedicalCenterSchedule(schedule.id, { is_active: true }),
                              "Session reactivated."
                            )
                          }
                        >
                          Reactivate
                        </Button>
                      )}
                    </div>
                  </div>
                  {schedule.invalidReason ? (
                    <div className="mt-4">
                      <MedicalCenterInlineAlert tone="warning" message={schedule.invalidReason} />
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </MedicalCenterSectionCard>
      </section>
    </div>
  );
}
