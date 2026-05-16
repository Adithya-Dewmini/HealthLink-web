import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  CalendarClock,
  ClipboardList,
  ListOrdered,
  Stethoscope,
  UserCog,
} from "lucide-react";
import Button from "../../components/ui/Button";
import {
  getMedicalCenterAppointments,
  getMedicalCenterDashboard,
  getMedicalCenterDoctors,
  getMedicalCenterQueues,
  getMedicalCenterSchedules,
} from "../../services/medical-center.service";
import type {
  MedicalCenterAppointment,
  MedicalCenterDashboard,
  MedicalCenterDoctor,
  MedicalCenterQueue,
  MedicalCenterSchedule,
} from "../../types/medical-center.types";
import {
  MedicalCenterEmptyState,
  MedicalCenterInlineAlert,
  MedicalCenterPageHeader,
  MedicalCenterSectionCard,
  MedicalCenterStatCard,
  MedicalCenterStatusBadge,
} from "../../components/center/MedicalCenterUI";
import { formatShortDate, formatTimeRange } from "./utils";

type DashboardPayload = {
  dashboard: MedicalCenterDashboard;
  doctors: MedicalCenterDoctor[];
  appointments: MedicalCenterAppointment[];
  queues: MedicalCenterQueue[];
  schedules: MedicalCenterSchedule[];
};

export default function CenterDashboardPage() {
  const [data, setData] = useState<DashboardPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const [dashboard, doctors, appointments, queues, schedules] = await Promise.all([
        getMedicalCenterDashboard(),
        getMedicalCenterDoctors(),
        getMedicalCenterAppointments(),
        getMedicalCenterQueues(),
        getMedicalCenterSchedules(),
      ]);

      setData({ dashboard, doctors, appointments, queues, schedules });
      setError("");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to load medical center dashboard.");
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

  const today = new Date().toISOString().slice(0, 10);

  const derived = useMemo(() => {
    if (!data) return null;

    const activeDoctors = data.doctors.filter((doctor) => doctor.status === "ACTIVE" && !doctor.isHidden);
    const upcomingSchedules = data.schedules
      .filter((schedule) => schedule.date >= today)
      .sort((left, right) => `${left.date} ${left.startTime}`.localeCompare(`${right.date} ${right.startTime}`));
    const todaysSchedules = upcomingSchedules.filter((schedule) => schedule.date === today);
    const todaysAppointments = data.appointments.filter((appointment) => appointment.date === today);
    const liveQueues = data.queues.filter((queue) => ["LIVE", "PAUSED"].includes(queue.status.toUpperCase()));
    const recentActivity = [
      ...data.appointments.slice(0, 3).map((appointment) => ({
        id: `booking-${appointment.id}`,
        label: `${appointment.patientName} booked with ${appointment.doctorName}`,
        meta: `${formatShortDate(appointment.date)} at ${appointment.time?.slice(0, 5) ?? "TBD"}`,
        status: appointment.status ?? "BOOKED",
      })),
      ...liveQueues.slice(0, 3).map((queue) => ({
        id: `queue-${queue.id}`,
        label: `Queue #${queue.id} is ${queue.status.toLowerCase()}`,
        meta: queue.currentTokenNumber ? `Current token ${queue.currentTokenNumber}` : "No active token yet",
        status: queue.status,
      })),
    ].slice(0, 5);

    return {
      activeDoctors,
      upcomingSchedules,
      todaysSchedules,
      todaysAppointments,
      liveQueues,
      recentActivity,
    };
  }, [data, today]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="hl-skeleton h-40 rounded-[28px]" />
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="hl-skeleton h-36 rounded-[24px]" />
          ))}
        </div>
        <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="hl-skeleton h-96 rounded-[28px]" />
          <div className="hl-skeleton h-96 rounded-[28px]" />
        </div>
      </div>
    );
  }

  if (error || !data || !derived) {
    return (
        <MedicalCenterSectionCard title="Dashboard unavailable" subtitle="The clinic panel could not load its current operational snapshot.">
          <MedicalCenterInlineAlert tone="error" message={error || "Unable to load dashboard data."} />
          <div className="mt-4">
            <Button onClick={() => void load()}>
              Retry
            </Button>
          </div>
        </MedicalCenterSectionCard>
      );
  }

  return (
    <div className="space-y-6">
      <MedicalCenterPageHeader
        title={data.dashboard.center?.name ?? "Medical center overview"}
        subtitle="Watch today’s clinic load, staff readiness, doctor sessions, and queue pressure from one operational surface."
        action={
          <>
            <Link
              to="/center/sessions"
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[#B7E4D6] bg-[#ECFDF5] px-4 text-sm font-semibold text-[#047857]"
            >
              Manage sessions
            </Link>
            <Link
              to="/center/receptionists"
              className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#047857] px-4 text-sm font-semibold text-white"
            >
              Manage staff
            </Link>
          </>
        }
      />

      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <MedicalCenterStatCard
          icon={Stethoscope}
          label="Active doctors"
          value={derived.activeDoctors.length}
          detail={`${data.dashboard.stats.doctors} active doctor relationships in this center`}
          tone="primary"
        />
        <MedicalCenterStatCard
          icon={UserCog}
          label="Reception desk"
          value={data.dashboard.stats.receptionists}
          detail="Receptionists currently linked to this clinic"
          tone="soft"
        />
        <MedicalCenterStatCard
          icon={ClipboardList}
          label="Today’s appointments"
          value={derived.todaysAppointments.length}
          detail="Bookings scheduled for today"
          tone="accent"
        />
        <MedicalCenterStatCard
          icon={ListOrdered}
          label="Live queues"
          value={derived.liveQueues.length}
          detail="Queues that are live or paused right now"
          tone="warning"
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <MedicalCenterSectionCard
          title="Today’s sessions"
          subtitle="Upcoming and live doctor sessions scheduled for today."
          action={
            <Link className="text-sm font-semibold text-[#047857]" to="/center/sessions">
              Open session management
            </Link>
          }
        >
          {derived.todaysSchedules.length === 0 ? (
            <MedicalCenterEmptyState
              title="No sessions scheduled for today"
              description="Add a doctor session to open booking capacity for the clinic."
              action={
                <Link
                  to="/center/sessions"
                  className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#047857] px-4 text-sm font-semibold text-white"
                >
                  Create session
                </Link>
              }
              icon={CalendarClock}
            />
          ) : (
            <div className="space-y-4">
              {derived.todaysSchedules.slice(0, 4).map((schedule) => (
                <div
                  key={schedule.id}
                  className="rounded-[22px] border border-[#E3F1EA] bg-[#FAFEFC] p-4"
                >
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-3">
                        <h4 className="text-base font-semibold text-[#064E3B]">
                          {schedule.doctorName ?? "Doctor"} {schedule.specialization ? `• ${schedule.specialization}` : ""}
                        </h4>
                        <MedicalCenterStatusBadge status={schedule.isActive ? "ACTIVE" : "INACTIVE"} />
                      </div>
                      <p className="mt-2 text-sm text-[#587164]">
                        {formatTimeRange(schedule.startTime, schedule.endTime)} • {schedule.maxPatients} slots • {schedule.source}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-[#DDEFE8] bg-white px-4 py-3 text-sm text-[#416056]">
                      <div>Date: {formatShortDate(schedule.date)}</div>
                      <div className="mt-1">Room: {schedule.roomNumber || "Not assigned"}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </MedicalCenterSectionCard>

        <MedicalCenterSectionCard
          title="Quick actions"
          subtitle="Jump to the clinic workflows used most often during the day."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              {
                title: "Assign doctors",
                description: "Invite doctors, review join requests, and adjust visibility.",
                to: "/center/doctors",
              },
              {
                title: "Manage desk staff",
                description: "Add receptionists and tune operational permissions.",
                to: "/center/receptionists",
              },
              {
                title: "Review appointments",
                description: "Search bookings and monitor daily appointment status.",
                to: "/center/appointments",
              },
              {
                title: "Watch live queues",
                description: "Track active queue state and patient flow without leaving the panel.",
                to: "/center/queues",
              },
            ].map((action) => (
              <Link
                key={action.to}
                to={action.to}
                className="rounded-[22px] border border-[#DDEFE8] bg-[#F8FFFB] p-4 transition hover:-translate-y-0.5 hover:border-[#86D6B9] hover:shadow-[0_20px_48px_-36px_rgba(6,78,59,0.35)]"
              >
                <h4 className="text-base font-semibold text-[#064E3B]">{action.title}</h4>
                <p className="mt-2 text-sm leading-6 text-[#587164]">{action.description}</p>
              </Link>
            ))}
          </div>
        </MedicalCenterSectionCard>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <MedicalCenterSectionCard
          title="Active doctors"
          subtitle="Doctors currently visible and active in this medical center."
          action={
            <Link className="text-sm font-semibold text-[#047857]" to="/center/doctors">
              Open doctors
            </Link>
          }
        >
          {derived.activeDoctors.length === 0 ? (
            <MedicalCenterEmptyState
              title="No active doctors yet"
              description="Invite doctors to this center so bookings and sessions can be managed here."
              action={
                <Link
                  to="/center/doctors"
                  className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#047857] px-4 text-sm font-semibold text-white"
                >
                  Invite doctor
                </Link>
              }
              icon={Stethoscope}
            />
          ) : (
            <div className="space-y-3">
              {derived.activeDoctors.slice(0, 5).map((doctor) => (
                <div key={doctor.id} className="flex flex-col gap-3 rounded-[20px] border border-[#E3F1EA] bg-[#FAFEFC] p-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <h4 className="text-base font-semibold text-[#064E3B]">{doctor.name ?? doctor.email}</h4>
                      <MedicalCenterStatusBadge status={doctor.status} />
                    </div>
                    <p className="mt-2 text-sm text-[#587164]">
                      {doctor.specialization || "Specialization not added"}
                      {doctor.clinicSpecialty ? ` • ${doctor.clinicSpecialty}` : ""}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {doctor.isPinned ? <MedicalCenterStatusBadge status="PINNED" /> : null}
                    {doctor.isHidden ? <MedicalCenterStatusBadge status="HIDDEN" /> : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </MedicalCenterSectionCard>

        {derived.recentActivity.length > 0 ? (
          <MedicalCenterSectionCard title="Recent activity" subtitle="Latest booking and queue signals coming from the clinic.">
            <div className="space-y-3">
              {derived.recentActivity.map((item) => (
                <div key={item.id} className="flex items-start gap-3 rounded-[20px] border border-[#E3F1EA] bg-[#FAFEFC] p-4">
                  <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#D1FAE5] text-[#047857]">
                    <Activity size={18} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-3">
                      <p className="text-sm font-semibold text-[#064E3B]">{item.label}</p>
                      <MedicalCenterStatusBadge status={item.status} />
                    </div>
                    <p className="mt-1 text-sm text-[#587164]">{item.meta}</p>
                  </div>
                </div>
              ))}
            </div>
          </MedicalCenterSectionCard>
        ) : (
          <MedicalCenterSectionCard title="Recent activity" subtitle="No recent activity was returned by the current center data sources.">
            <MedicalCenterEmptyState
              title="No recent clinic activity yet"
              description="Recent activity will appear here when appointments or queues start moving through the center."
              icon={Activity}
            />
          </MedicalCenterSectionCard>
        )}
      </section>
    </div>
  );
}
