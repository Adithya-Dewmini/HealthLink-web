import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import Input from "../../components/ui/Input";
import PageLoader from "../../components/ui/PageLoader";
import PermissionState from "../../components/reception/PermissionState";
import { ConfirmDialog, EmptyState, InlineAlert, StatusBadge } from "../../components/reception/ReceptionUI";
import {
  cancelVisit,
  checkInVisit,
  getReceptionPermissions,
  getReceptionVisits,
  markVisitLate,
  markVisitMissed,
  moveVisitToQueue,
} from "../../services/reception.service";
import type { ReceptionPermissions, ReceptionVisit, ReceptionVisitFilters, ReceptionVisitsResult, VisitStatus } from "../../types/reception.types";

type VisitAction = "check-in" | "late" | "missed" | "cancel" | "queue";

type PendingAction = {
  title: string;
  message: string;
  tone?: "danger" | "primary";
  run: () => Promise<{ message: string }>;
} | null;

const statusOptions: Array<{ label: string; value: string }> = [
  { label: "Today", value: "today" },
  { label: "All", value: "all" },
  { label: "Scheduled", value: "scheduled" },
  { label: "Checked in", value: "checked_in" },
  { label: "Waiting", value: "waiting" },
  { label: "In consultation", value: "in_consultation" },
  { label: "Completed", value: "completed" },
  { label: "Missed", value: "missed" },
  { label: "Cancelled", value: "cancelled" },
  { label: "Late", value: "late" },
];

function statusTone(status: VisitStatus) {
  if (status === "completed") return "success";
  if (status === "missed" || status === "cancelled") return "danger";
  if (status === "late") return "warning";
  if (status === "waiting" || status === "in_consultation") return "info";
  return "neutral";
}

function canRun(visit: ReceptionVisit, action: VisitAction) {
  if (action === "check-in" || action === "late") return visit.visitStatus === "scheduled";
  if (action === "queue") return visit.visitStatus === "checked_in";
  if (action === "missed") {
    return ["scheduled", "checked_in", "waiting", "in_consultation", "late"].includes(visit.visitStatus);
  }
  if (action === "cancel") return ["scheduled", "checked_in", "late"].includes(visit.visitStatus);
  return false;
}

export default function ReceptionVisitsPage() {
  const [permissions, setPermissions] = useState<ReceptionPermissions | null>(null);
  const [result, setResult] = useState<ReceptionVisitsResult | null>(null);
  const [filters, setFilters] = useState<ReceptionVisitFilters>({ filter: "today", limit: 100 });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState<{ tone: "success" | "danger" | "warning" | "info"; message: string } | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [selectedVisit, setSelectedVisit] = useState<ReceptionVisit | null>(null);

  const filteredVisits = useMemo(() => {
    if (!result) return [];
    if (!filters.filter || filters.filter === "today" || filters.filter === "all") return result.visits;
    return result.visits.filter((visit) => visit.visitStatus === filters.filter);
  }, [filters.filter, result]);

  const load = async () => {
    setLoading(true);
    try {
      const permissionData = await getReceptionPermissions();
      setPermissions(permissionData);

      if (!permissionData.appointments) {
        setResult(null);
        setError("");
        return;
      }

      const data = await getReceptionVisits(filters);
      setResult(data);
      setError("");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to load visits.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const queueAction = (visit: ReceptionVisit, action: VisitAction) => {
    const handlers: Record<VisitAction, () => Promise<{ message: string }>> = {
      "check-in": () => checkInVisit(visit.bookingId),
      late: () => markVisitLate(visit.bookingId),
      missed: () => markVisitMissed(visit.bookingId),
      cancel: () => cancelVisit(visit.bookingId),
      queue: () => moveVisitToQueue(visit.bookingId),
    };

    const labels: Record<VisitAction, string> = {
      "check-in": "Check In",
      late: "Mark Late",
      missed: "Mark Missed",
      cancel: "Cancel Visit",
      queue: "Move to Queue",
    };

    const needsConfirm = action === "missed" || action === "cancel";
    const run = async () => {
      setBusy(true);
      try {
        const response = await handlers[action]();
        setNotice({ tone: "success", message: response.message });
        setPendingAction(null);
        await load();
      } catch (caughtError) {
        setNotice({
          tone: "danger",
          message: caughtError instanceof Error ? caughtError.message : "Visit action failed.",
        });
      } finally {
        setBusy(false);
      }
    };

    if (needsConfirm) {
      setPendingAction({
        title: labels[action],
        message: `${labels[action]} for ${visit.patientName}?`,
        tone: "danger",
        run: handlers[action],
      });
      return;
    }

    void run();
  };

  const runConfirmedAction = async () => {
    if (!pendingAction) return;
    setBusy(true);
    try {
      const response = await pendingAction.run();
      setNotice({ tone: "success", message: response.message });
      setPendingAction(null);
      await load();
    } catch (caughtError) {
      setNotice({
        tone: "danger",
        message: caughtError instanceof Error ? caughtError.message : "Visit action failed.",
      });
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <PageLoader />;
  if (error) return <InlineAlert tone="danger" message={error} />;
  if (!permissions?.appointments) {
    return (
      <PermissionState
        title="Visit management is not assigned"
        message="This receptionist account does not have appointment or visit management access."
      />
    );
  }

  return (
    <div className="space-y-6">
      {notice ? <InlineAlert tone={notice.tone} message={notice.message} /> : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Today's visits", value: result?.summary.todaysVisits ?? 0 },
          { label: "Checked in", value: result?.summary.checkedIn ?? 0 },
          { label: "Waiting", value: result?.summary.waiting ?? 0 },
          { label: "Completed", value: result?.summary.completed ?? 0 },
        ].map((metric) => (
          <Card key={metric.label}>
            <span className="text-sm font-medium text-slate-500">{metric.label}</span>
            <strong className="mt-2 block text-3xl font-semibold text-[#053F56]">{metric.value}</strong>
          </Card>
        ))}
      </section>

      <Card title="Daily visit filters" subtitle="Search by patient name, phone, NIC, or booking number">
        <div className="grid gap-4 lg:grid-cols-[180px_190px_220px_minmax(0,1fr)_120px]">
          <Input
            id="visit-date"
            label="Date"
            type="date"
            value={filters.date || ""}
            onChange={(event) => setFilters((current) => ({ ...current, date: event.target.value || undefined }))}
          />
          <label className="field-group">
            <span className="field-label">Doctor</span>
            <select
              className="field-input"
              value={filters.doctorId || ""}
              onChange={(event) =>
                setFilters((current) => ({ ...current, doctorId: event.target.value ? Number(event.target.value) : null }))
              }
            >
              <option value="">All doctors</option>
              {result?.doctors.map((doctor) => (
                <option key={doctor.doctorId} value={doctor.doctorId}>
                  {doctor.doctorName}
                </option>
              ))}
            </select>
          </label>
          <label className="field-group">
            <span className="field-label">Session</span>
            <select
              className="field-input"
              value={filters.sessionId || ""}
              onChange={(event) =>
                setFilters((current) => ({ ...current, sessionId: event.target.value ? Number(event.target.value) : null }))
              }
            >
              <option value="">All sessions</option>
              {result?.sessions.map((session) => (
                <option key={session.id} value={session.id}>
                  {session.date} • {session.startTime} • {session.doctorName}
                </option>
              ))}
            </select>
          </label>
          <Input
            id="visit-search"
            label="Search"
            value={filters.search || ""}
            placeholder="Name, phone, NIC, booking no."
            onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
          />
          <div className="flex items-end">
            <Button fullWidth onClick={() => void load()}>
              <Search size={16} /> Apply
            </Button>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {statusOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setFilters((current) => ({ ...current, filter: option.value }))}
              className={`rounded-full border px-4 py-2 text-sm font-semibold ${
                filters.filter === option.value
                  ? "border-[#21A5EC] bg-sky-50 text-[#053F56]"
                  : "border-slate-200 bg-white text-slate-600"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </Card>

      <Card title="Visit operations" subtitle="Check-ins, late arrivals, queue movement, and closures">
        {filteredVisits.length === 0 ? (
          <EmptyState title="No visits found" message="No visits matched the selected date, session, search, and status filters." />
        ) : (
          <div className="space-y-3">
            {filteredVisits.map((visit) => (
              <div key={visit.bookingId} className="rounded-lg border border-slate-200 bg-white p-4">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-semibold text-[#053F56]">{visit.patientName}</h3>
                      <StatusBadge label={visit.visitStatus} tone={statusTone(visit.visitStatus)} />
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                        {visit.bookingNumber}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-slate-500">
                      {visit.doctorName} • {visit.specialty} • {visit.sessionDate} {visit.appointmentTime}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      {visit.patientPhone || "No phone"} {visit.patientNic ? `• NIC ${visit.patientNic}` : ""}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="secondary"
                      disabled={busy || !canRun(visit, "check-in") || !permissions.check_in}
                      onClick={() => queueAction(visit, "check-in")}
                    >
                      Check In
                    </Button>
                    <Button
                      variant="secondary"
                      disabled={busy || !canRun(visit, "late") || !permissions.check_in}
                      onClick={() => queueAction(visit, "late")}
                    >
                      Mark Late
                    </Button>
                    <Button
                      variant="secondary"
                      disabled={busy || !canRun(visit, "queue") || !permissions.queue_access}
                      onClick={() => queueAction(visit, "queue")}
                    >
                      Move to Queue
                    </Button>
                    <Button
                      variant="danger"
                      disabled={busy || !canRun(visit, "missed")}
                      onClick={() => queueAction(visit, "missed")}
                    >
                      Mark Missed
                    </Button>
                    <Button
                      variant="danger"
                      disabled={busy || !canRun(visit, "cancel")}
                      onClick={() => queueAction(visit, "cancel")}
                    >
                      Cancel
                    </Button>
                    <Button variant="ghost" disabled={busy} onClick={() => setSelectedVisit(visit)}>
                      View Details
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {selectedVisit ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/35 px-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-lg border border-slate-200 bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold text-[#053F56]">{selectedVisit.patientName}</h2>
                <p className="mt-1 text-sm text-slate-500">{selectedVisit.bookingNumber}</p>
              </div>
              <StatusBadge label={selectedVisit.visitStatus} tone={statusTone(selectedVisit.visitStatus)} />
            </div>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {[
                ["Phone", selectedVisit.patientPhone || "Not recorded"],
                ["NIC", selectedVisit.patientNic || "Not recorded"],
                ["Doctor", selectedVisit.doctorName],
                ["Specialty", selectedVisit.specialty],
                ["Session", `${selectedVisit.sessionDate} ${selectedVisit.startTime || ""}-${selectedVisit.endTime || ""}`],
                ["Appointment time", selectedVisit.appointmentTime],
                ["Queue token", selectedVisit.tokenNumber ? `#${selectedVisit.tokenNumber}` : "Not queued"],
                ["Booking source", selectedVisit.bookingSource],
              ].map(([label, value]) => (
                <div key={label} className="rounded-lg bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</p>
                  <p className="mt-2 font-semibold text-[#053F56]">{value}</p>
                </div>
              ))}
            </div>
            <div className="mt-6 flex justify-end">
              <Button variant="secondary" onClick={() => setSelectedVisit(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      <ConfirmDialog
        isOpen={Boolean(pendingAction)}
        title={pendingAction?.title || "Confirm action"}
        message={pendingAction?.message || ""}
        tone={pendingAction?.tone}
        isLoading={busy}
        onCancel={() => setPendingAction(null)}
        onConfirm={() => void runConfirmedAction()}
      />
    </div>
  );
}
