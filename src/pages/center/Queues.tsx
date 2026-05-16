import { useEffect, useMemo, useState } from "react";
import { Activity, ListOrdered, PauseCircle, PlayCircle } from "lucide-react";
import Button from "../../components/ui/Button";
import {
  MedicalCenterEmptyState,
  MedicalCenterInlineAlert,
  MedicalCenterPageHeader,
  MedicalCenterSectionCard,
  MedicalCenterStatCard,
  MedicalCenterStatusBadge,
} from "../../components/center/MedicalCenterUI";
import {
  getMedicalCenterDoctors,
  getMedicalCenterQueues,
  getMedicalCenterSchedules,
} from "../../services/medical-center.service";
import type {
  MedicalCenterDoctor,
  MedicalCenterQueue,
  MedicalCenterSchedule,
} from "../../types/medical-center.types";
import { formatShortDate, formatTimeRange } from "./utils";

export default function CenterQueuesPage() {
  const [queues, setQueues] = useState<MedicalCenterQueue[]>([]);
  const [doctors, setDoctors] = useState<MedicalCenterDoctor[]>([]);
  const [schedules, setSchedules] = useState<MedicalCenterSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const [queueRows, doctorRows, scheduleRows] = await Promise.all([
        getMedicalCenterQueues(),
        getMedicalCenterDoctors(),
        getMedicalCenterSchedules(),
      ]);
      setQueues(queueRows);
      setDoctors(doctorRows);
      setSchedules(scheduleRows);
      setError("");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to load queues.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    void (async () => {
      if (!active) return;
      await load();
    })();
    return () => {
      active = false;
    };
  }, []);

  const queueView = useMemo(
    () =>
      queues.map((queue) => {
        const schedule = schedules.find((item) => item.id === queue.scheduleId) ?? null;
        const doctor =
          doctors.find((item) => item.doctorId === queue.doctorId) ??
          doctors.find((item) => item.id === String(queue.doctorId ?? "")) ??
          null;
        return {
          ...queue,
          schedule,
          doctorName: doctor?.name ?? schedule?.doctorName ?? "Doctor",
        };
      }),
    [doctors, queues, schedules]
  );

  return (
    <div className="space-y-6">
      <MedicalCenterPageHeader
        title="Queue overview"
        subtitle="See which queues are active, paused, or completed without inventing unsupported queue actions in the web panel."
      />

      {error ? (
        <div className="space-y-3">
          <MedicalCenterInlineAlert tone="error" message={error} />
          <Button variant="secondary" onClick={() => void load()}>
            Retry loading queues
          </Button>
        </div>
      ) : null}

      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <MedicalCenterStatCard icon={ListOrdered} label="All queues" value={queues.length} detail="Queues returned by the center endpoint" />
        <MedicalCenterStatCard icon={PlayCircle} label="Live" value={queues.filter((queue) => queue.status.toUpperCase() === "LIVE").length} detail="Queues actively moving patients" tone="accent" />
        <MedicalCenterStatCard icon={PauseCircle} label="Paused" value={queues.filter((queue) => queue.status.toUpperCase() === "PAUSED").length} detail="Queues currently paused" tone="warning" />
        <MedicalCenterStatCard icon={Activity} label="Completed" value={queues.filter((queue) => queue.status.toUpperCase() === "COMPLETED").length} detail="Queues already closed out" tone="soft" />
      </section>

      <MedicalCenterSectionCard title="Queue list" subtitle="Live queue status and linked session context when available.">
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="hl-skeleton h-24 rounded-[20px]" />
            ))}
          </div>
        ) : queueView.length === 0 ? (
          <MedicalCenterEmptyState
            title="No queues available"
            description="Queues will appear here when receptionist and doctor workflows create or update them for this medical center."
          />
        ) : (
          <div className="space-y-3">
            {queueView.map((queue) => (
              <div key={queue.id} className="flex flex-col gap-4 rounded-[22px] border border-[#E3F1EA] bg-[#FAFEFC] p-4 xl:flex-row xl:items-center xl:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <h3 className="text-base font-semibold text-[#064E3B]">Queue #{queue.id}</h3>
                    <MedicalCenterStatusBadge status={queue.status} />
                  </div>
                  <p className="mt-2 text-sm text-[#587164]">{queue.doctorName}</p>
                  {queue.schedule ? (
                    <p className="mt-1 text-sm text-[#587164]">
                      {formatShortDate(queue.schedule.date)} • {formatTimeRange(queue.schedule.startTime, queue.schedule.endTime)}
                    </p>
                  ) : (
                    <p className="mt-1 text-sm text-[#587164]">Session context not available from the queue payload.</p>
                  )}
                </div>
                <div className="rounded-[18px] border border-[#DDEFE8] bg-white px-4 py-3 text-sm text-[#587164]">
                  <div>Current token: {queue.currentTokenNumber ?? "Not started"}</div>
                  <div className="mt-1">Schedule: {queue.scheduleId ?? "Not linked"}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </MedicalCenterSectionCard>
    </div>
  );
}
