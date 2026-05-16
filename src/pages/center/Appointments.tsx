import { useEffect, useMemo, useState } from "react";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import {
  MedicalCenterEmptyState,
  MedicalCenterInlineAlert,
  MedicalCenterPageHeader,
  MedicalCenterSectionCard,
  MedicalCenterStatCard,
  MedicalCenterStatusBadge,
} from "../../components/center/MedicalCenterUI";
import { getMedicalCenterAppointments } from "../../services/medical-center.service";
import type { MedicalCenterAppointment } from "../../types/medical-center.types";
import { ClipboardList, Clock3, ListChecks, UserRound } from "lucide-react";
import { formatShortDate, normalizeSearch } from "./utils";

export default function CenterAppointmentsPage() {
  const [appointments, setAppointments] = useState<MedicalCenterAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const load = async () => {
    setLoading(true);
    try {
      const items = await getMedicalCenterAppointments();
      setAppointments(items);
      setError("");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to load appointments.");
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

  const filtered = useMemo(() => {
    const search = normalizeSearch(query);
    return appointments.filter((appointment) => {
      const matchesSearch =
        !search ||
        [appointment.patientName, appointment.doctorName, appointment.status ?? "", appointment.time ?? ""]
          .join(" ")
          .toLowerCase()
          .includes(search);
      const matchesStatus =
        statusFilter === "all" || String(appointment.status || "UNKNOWN").toUpperCase() === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [appointments, query, statusFilter]);

  const today = new Date().toISOString().slice(0, 10);
  const todaysAppointments = appointments.filter((appointment) => appointment.date === today);

  return (
    <div className="space-y-6">
      <MedicalCenterPageHeader
        title="Appointments"
        subtitle="Review appointment volume and status using the exact booking data currently available from the center backend."
      />

      {error ? (
        <div className="space-y-3">
          <MedicalCenterInlineAlert tone="error" message={error} />
          <Button variant="secondary" onClick={() => void load()}>
            Retry loading appointments
          </Button>
        </div>
      ) : null}

      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <MedicalCenterStatCard icon={ClipboardList} label="All bookings" value={appointments.length} detail="Appointments loaded for this center" />
        <MedicalCenterStatCard icon={Clock3} label="Today" value={todaysAppointments.length} detail="Appointments scheduled for today" tone="soft" />
        <MedicalCenterStatCard
          icon={ListChecks}
          label="Completed"
          value={appointments.filter((appointment) => String(appointment.status || "").toUpperCase() === "COMPLETED").length}
          detail="Bookings already marked completed"
          tone="accent"
        />
        <MedicalCenterStatCard
          icon={UserRound}
          label="Pending"
          value={appointments.filter((appointment) => !["COMPLETED", "CANCELLED", "MISSED"].includes(String(appointment.status || "").toUpperCase())).length}
          detail="Bookings still active or waiting"
          tone="warning"
        />
      </section>

      <MedicalCenterSectionCard title="Appointment overview" subtitle="Search and filter the appointments already linked to this medical center.">
        <div className="mb-5 grid gap-4 lg:grid-cols-[1fr_220px]">
          <Input
            id="appointment-search"
            label="Search appointments"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by patient, doctor, status, or time"
          />
          <label className="field-group">
            <span className="field-label">Status filter</span>
            <select className="field-input" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="all">All statuses</option>
              <option value="BOOKED">Booked</option>
              <option value="CHECKED_IN">Checked in</option>
              <option value="WAITING">Waiting</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
              <option value="MISSED">Missed</option>
            </select>
          </label>
        </div>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="hl-skeleton h-24 rounded-[20px]" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <MedicalCenterEmptyState
            title="No appointments match this view"
            description="Try a different search or status filter. The page only shows bookings returned by the current center endpoint."
          />
        ) : (
          <div className="space-y-3">
            {filtered.map((appointment) => (
              <div key={appointment.id} className="flex flex-col gap-3 rounded-[20px] border border-[#E3F1EA] bg-[#FAFEFC] p-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <p className="font-semibold text-[#064E3B]">{appointment.patientName}</p>
                    <MedicalCenterStatusBadge status={appointment.status} />
                  </div>
                  <p className="mt-2 text-sm text-[#587164]">
                    With {appointment.doctorName} • {formatShortDate(appointment.date)} {appointment.time ? `at ${appointment.time.slice(0, 5)}` : ""}
                  </p>
                </div>
                <div className="rounded-2xl border border-[#DDEFE8] bg-white px-4 py-3 text-sm text-[#587164]">
                  <div>Booking #{appointment.id}</div>
                  <div className="mt-1">Session: {appointment.sessionId ?? "Not linked"}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </MedicalCenterSectionCard>
    </div>
  );
}
