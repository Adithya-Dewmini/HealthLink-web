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
  createMedicalCenterReceptionist,
  getMedicalCenterReceptionists,
  removeMedicalCenterReceptionist,
  resendMedicalCenterReceptionistInvite,
  updateMedicalCenterReceptionistPermissions,
  updateMedicalCenterReceptionistStatus,
} from "../../services/medical-center.service";
import type {
  MedicalCenterReceptionist,
  ReceptionistPermissions,
} from "../../types/medical-center.types";
import { formatDateTime, normalizeSearch } from "./utils";

type Notice = { tone: "success" | "error"; message: string };

const permissionLabels: Array<{
  key: keyof ReceptionistPermissions;
  label: string;
}> = [
  { key: "queue_access", label: "Queue access" },
  { key: "appointments", label: "Appointments" },
  { key: "check_in", label: "Check-in" },
  { key: "schedule_management", label: "Schedule management" },
];

export default function CenterReceptionistsPage() {
  const [receptionists, setReceptionists] = useState<MedicalCenterReceptionist[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState<Notice | null>(null);
  const [actionKey, setActionKey] = useState<string | null>(null);
  const [draftPermissions, setDraftPermissions] = useState<Record<string, ReceptionistPermissions>>({});
  const [form, setForm] = useState({ name: "", email: "", phone: "" });

  const load = async () => {
    setLoading(true);
    try {
      const items = await getMedicalCenterReceptionists();
      setReceptionists(items);
      setDraftPermissions(
        items.reduce<Record<string, ReceptionistPermissions>>((accumulator, receptionist) => {
          accumulator[receptionist.id] = receptionist.permissions;
          return accumulator;
        }, {})
      );
      setError("");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to load receptionist records.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const filteredReceptionists = useMemo(() => {
    const search = normalizeSearch(query);
    if (!search) return receptionists;
    return receptionists.filter((receptionist) =>
      [receptionist.name, receptionist.email, receptionist.phone].join(" ").toLowerCase().includes(search)
    );
  }, [query, receptionists]);

  const runAction = async (key: string, work: () => Promise<unknown>, successMessage: string) => {
    setActionKey(key);
    setNotice(null);
    try {
      await work();
      setNotice({ tone: "success", message: successMessage });
      await load();
    } catch (caughtError) {
      setNotice({
        tone: "error",
        message: caughtError instanceof Error ? caughtError.message : "Receptionist action failed.",
      });
    } finally {
      setActionKey(null);
    }
  };

  const handleCreate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await runAction(
      "create",
      () => createMedicalCenterReceptionist(form),
      "Receptionist created successfully."
    );
    setForm({ name: "", email: "", phone: "" });
  };

  return (
    <div className="space-y-6">
      <MedicalCenterPageHeader
        title="Receptionists"
        subtitle="Add clinic desk staff, manage active status, and tune permissions using the same backend workflow already used by the mobile panel."
      />

      {notice ? <MedicalCenterInlineAlert tone={notice.tone === "success" ? "success" : "error"} message={notice.message} /> : null}
      {error ? (
        <div className="space-y-3">
          <MedicalCenterInlineAlert tone="error" message={error} />
          <Button variant="secondary" onClick={() => void load()}>
            Retry loading staff
          </Button>
        </div>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <MedicalCenterSectionCard title="Receptionist roster" subtitle="Desk staff assigned to this medical center.">
          <div className="mb-4">
            <Input
              id="receptionist-search"
              label="Search staff"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by name, email, or phone"
            />
          </div>

          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="hl-skeleton h-40 rounded-[24px]" />
              ))}
            </div>
          ) : filteredReceptionists.length === 0 ? (
            <MedicalCenterEmptyState
              title="No receptionists assigned"
              description="Add reception staff to manage appointments, queues, and check-in workflows for this clinic."
            />
          ) : (
            <div className="space-y-4">
              {filteredReceptionists.map((receptionist) => (
                <div key={receptionist.id} className="rounded-[24px] border border-[#E3F1EA] bg-[#FAFEFC] p-5">
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-3">
                        <h3 className="text-lg font-semibold text-[#064E3B]">{receptionist.name}</h3>
                        <MedicalCenterStatusBadge status={receptionist.status} />
                      </div>
                      <p className="mt-2 text-sm text-[#587164]">{receptionist.email}</p>
                      <p className="mt-1 text-sm text-[#587164]">{receptionist.phone}</p>
                      <p className="mt-1 text-sm text-[#587164]">Added {formatDateTime(receptionist.createdAt)}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {receptionist.status === "PENDING" ? (
                        <Button
                          variant="secondary"
                          isLoading={actionKey === `resend:${receptionist.id}`}
                          onClick={() =>
                            void runAction(
                              `resend:${receptionist.id}`,
                              () => resendMedicalCenterReceptionistInvite(receptionist.id),
                              "Receptionist invite resent."
                            )
                          }
                        >
                          Resend invite
                        </Button>
                      ) : (
                        <Button
                          variant={receptionist.status === "ACTIVE" ? "ghost" : "primary"}
                          isLoading={actionKey === `status:${receptionist.id}`}
                          onClick={() =>
                            void runAction(
                              `status:${receptionist.id}`,
                              () =>
                                updateMedicalCenterReceptionistStatus(
                                  receptionist.id,
                                  receptionist.status === "ACTIVE" ? "INACTIVE" : "ACTIVE"
                                ),
                              receptionist.status === "ACTIVE" ? "Receptionist disabled." : "Receptionist enabled."
                            )
                          }
                        >
                          {receptionist.status === "ACTIVE" ? "Disable" : "Enable"}
                        </Button>
                      )}
                      <Button
                        variant="danger"
                        isLoading={actionKey === `remove:${receptionist.id}`}
                        onClick={() =>
                          void runAction(
                            `remove:${receptionist.id}`,
                            () => removeMedicalCenterReceptionist(receptionist.id),
                            "Receptionist removed from the clinic."
                          )
                        }
                      >
                        Remove
                      </Button>
                    </div>
                  </div>

                  <div className="mt-5 rounded-[20px] border border-[#E3F1EA] bg-white p-4">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                      <div>
                        <h4 className="text-sm font-semibold uppercase tracking-[0.18em] text-[#047857]">Permissions</h4>
                        <p className="mt-2 text-sm text-[#587164]">Keep desk access narrow and workflow-specific.</p>
                      </div>
                      <Button
                        variant="primary"
                        isLoading={actionKey === `permissions:${receptionist.id}`}
                        disabled={receptionist.status === "PENDING"}
                        onClick={() =>
                          void runAction(
                            `permissions:${receptionist.id}`,
                            () =>
                              updateMedicalCenterReceptionistPermissions(
                                receptionist.id,
                                draftPermissions[receptionist.id] ?? receptionist.permissions
                              ),
                            "Receptionist permissions updated."
                          )
                        }
                      >
                        Save permissions
                      </Button>
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      {permissionLabels.map((permission) => (
                        <label
                          key={permission.key}
                          className="flex items-center justify-between rounded-2xl border border-[#DDEFE8] bg-[#F8FFFB] px-4 py-3 text-sm text-[#064E3B]"
                        >
                          <span>{permission.label}</span>
                          <input
                            type="checkbox"
                            className="h-4 w-4 accent-[#047857]"
                            checked={draftPermissions[receptionist.id]?.[permission.key] ?? false}
                            disabled={receptionist.status === "PENDING"}
                            onChange={(event) =>
                              setDraftPermissions((current) => ({
                                ...current,
                                [receptionist.id]: {
                                  ...(current[receptionist.id] ?? receptionist.permissions),
                                  [permission.key]: event.target.checked,
                                },
                              }))
                            }
                          />
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </MedicalCenterSectionCard>

        <MedicalCenterSectionCard title="Add receptionist" subtitle="Create a new receptionist account and send the existing setup invitation.">
          <form className="space-y-4" onSubmit={handleCreate}>
            <Input
              id="receptionist-name"
              label="Full name"
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              required
            />
            <Input
              id="receptionist-email"
              label="Email"
              type="email"
              value={form.email}
              onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
              required
            />
            <Input
              id="receptionist-phone"
              label="Phone number"
              value={form.phone}
              onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
            />
            <Button type="submit" isLoading={actionKey === "create"} fullWidth>
              Add receptionist
            </Button>
          </form>
        </MedicalCenterSectionCard>
      </section>
    </div>
  );
}
