import { useEffect, useMemo, useState } from "react";
import { Eye, EyeOff, Pin, PinOff, RefreshCw, Trash2, UserPlus } from "lucide-react";
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
  getMedicalCenterDoctorJoinRequests,
  getMedicalCenterDoctors,
  inviteDoctorToMedicalCenter,
  removeDoctorRelationship,
  resendDoctorInvite,
  reviewDoctorJoinRequest,
  updateDoctorRelationshipDisplay,
  updateDoctorRelationshipStatus,
} from "../../services/medical-center.service";
import type {
  MedicalCenterDoctor,
  MedicalCenterDoctorJoinRequest,
} from "../../types/medical-center.types";
import { formatDateTime, normalizeSearch } from "./utils";

type Notice = { tone: "success" | "error"; message: string };

export default function CenterDoctorsPage() {
  const [doctors, setDoctors] = useState<MedicalCenterDoctor[]>([]);
  const [requests, setRequests] = useState<MedicalCenterDoctorJoinRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState<Notice | null>(null);
  const [query, setQuery] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [invitePending, setInvitePending] = useState(false);
  const [actionKey, setActionKey] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [doctorList, joinRequests] = await Promise.all([
        getMedicalCenterDoctors(),
        getMedicalCenterDoctorJoinRequests(),
      ]);
      setDoctors(doctorList);
      setRequests(joinRequests);
      setError("");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to load doctors.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const filteredDoctors = useMemo(() => {
    const search = normalizeSearch(query);
    if (!search) return doctors;

    return doctors.filter((doctor) =>
      [doctor.name ?? "", doctor.email, doctor.specialization ?? "", doctor.clinicSpecialty ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(search)
    );
  }, [doctors, query]);

  const visibleDoctors = filteredDoctors.filter((doctor) => doctor.doctorId !== null);
  const pendingInvites = filteredDoctors.filter((doctor) => doctor.doctorId === null);

  const handleInvite = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setInvitePending(true);
    setNotice(null);
    try {
      const result = await inviteDoctorToMedicalCenter({ email: inviteEmail.trim() });
      setNotice({
        tone: result.emailSent ? "success" : "error",
        message: result.emailSent
          ? "Doctor invite sent successfully."
          : result.emailError || "Invite saved, but the email could not be delivered.",
      });
      setInviteEmail("");
      await load();
    } catch (caughtError) {
      setNotice({
        tone: "error",
        message: caughtError instanceof Error ? caughtError.message : "Failed to send invite.",
      });
    } finally {
      setInvitePending(false);
    }
  };

  const runDoctorAction = async (key: string, work: () => Promise<unknown>, successMessage: string) => {
    setActionKey(key);
    setNotice(null);
    try {
      await work();
      setNotice({ tone: "success", message: successMessage });
      await load();
    } catch (caughtError) {
      setNotice({
        tone: "error",
        message: caughtError instanceof Error ? caughtError.message : "Doctor action failed.",
      });
    } finally {
      setActionKey(null);
    }
  };

  return (
    <div className="space-y-6">
      <MedicalCenterPageHeader
        title="Doctors"
        subtitle="Manage assigned doctors, pending invites, and incoming join requests without changing the existing backend flow."
      />

      {notice ? <MedicalCenterInlineAlert tone={notice.tone === "success" ? "success" : "error"} message={notice.message} /> : null}
      {error ? (
        <div className="space-y-3">
          <MedicalCenterInlineAlert tone="error" message={error} />
          <Button variant="secondary" onClick={() => void load()}>
            Retry loading doctors
          </Button>
        </div>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        <MedicalCenterSectionCard title="Assigned doctors" subtitle="Active, inactive, and pending doctor relationships for this center.">
          <div className="mb-4">
            <Input
              id="doctor-search"
              label="Search doctors"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by name, email, specialty, or clinic specialty"
            />
          </div>

          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="hl-skeleton h-28 rounded-[22px]" />
              ))}
            </div>
          ) : visibleDoctors.length === 0 && pendingInvites.length === 0 ? (
            <MedicalCenterEmptyState
              title="No doctor relationships yet"
              description="Invite a doctor to start attaching sessions and bookings to this medical center."
              icon={UserPlus}
            />
          ) : (
            <div className="space-y-4">
              {visibleDoctors.map((doctor) => (
                <div key={doctor.id} className="rounded-[24px] border border-[#E3F1EA] bg-[#FAFEFC] p-5">
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-3">
                        <h3 className="text-lg font-semibold text-[#064E3B]">{doctor.name ?? doctor.email}</h3>
                        <MedicalCenterStatusBadge status={doctor.status} />
                        {doctor.isPinned ? <MedicalCenterStatusBadge status="PINNED" /> : null}
                        {doctor.isHidden ? <MedicalCenterStatusBadge status="HIDDEN" /> : null}
                      </div>
                      <p className="mt-2 text-sm text-[#557062]">{doctor.email}</p>
                      <p className="mt-1 text-sm text-[#557062]">
                        {doctor.specialization || "Specialization not added"}
                        {doctor.clinicSpecialty ? ` • ${doctor.clinicSpecialty}` : ""}
                      </p>
                      <p className="mt-1 text-sm text-[#557062]">Joined {formatDateTime(doctor.joinedAt)}</p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="secondary"
                        isLoading={actionKey === `pin:${doctor.id}`}
                        onClick={() =>
                          void runDoctorAction(
                            `pin:${doctor.id}`,
                            () => updateDoctorRelationshipDisplay(doctor.id, { pinned: !doctor.isPinned }),
                            doctor.isPinned ? "Doctor unpinned." : "Doctor pinned."
                          )
                        }
                      >
                        {doctor.isPinned ? <PinOff size={16} /> : <Pin size={16} />}
                        {doctor.isPinned ? "Unpin" : "Pin"}
                      </Button>
                      <Button
                        variant="secondary"
                        isLoading={actionKey === `hide:${doctor.id}`}
                        onClick={() =>
                          void runDoctorAction(
                            `hide:${doctor.id}`,
                            () => updateDoctorRelationshipDisplay(doctor.id, { hidden: !doctor.isHidden }),
                            doctor.isHidden ? "Doctor made visible." : "Doctor hidden from listing."
                          )
                        }
                      >
                        {doctor.isHidden ? <Eye size={16} /> : <EyeOff size={16} />}
                        {doctor.isHidden ? "Show" : "Hide"}
                      </Button>
                      <Button
                        variant={doctor.status === "ACTIVE" ? "ghost" : "primary"}
                        isLoading={actionKey === `status:${doctor.id}`}
                        onClick={() =>
                          void runDoctorAction(
                            `status:${doctor.id}`,
                            () =>
                              updateDoctorRelationshipStatus(
                                doctor.id,
                                doctor.status === "ACTIVE" ? "INACTIVE" : "ACTIVE"
                              ),
                            doctor.status === "ACTIVE" ? "Doctor marked inactive." : "Doctor marked active."
                          )
                        }
                      >
                        {doctor.status === "ACTIVE" ? "Deactivate" : "Activate"}
                      </Button>
                      <Button
                        variant="danger"
                        isLoading={actionKey === `remove:${doctor.id}`}
                        onClick={() =>
                          void runDoctorAction(
                            `remove:${doctor.id}`,
                            () => removeDoctorRelationship(doctor.id),
                            "Doctor removed from this medical center."
                          )
                        }
                      >
                        <Trash2 size={16} />
                        Remove
                      </Button>
                    </div>
                  </div>
                </div>
              ))}

              {pendingInvites.length > 0 ? (
                <div className="rounded-[24px] border border-[#E3F1EA] bg-white p-5">
                  <h3 className="text-lg font-semibold text-[#064E3B]">Pending email invites</h3>
                  <div className="mt-4 space-y-3">
                    {pendingInvites.map((invite) => (
                      <div key={invite.id} className="flex flex-col gap-3 rounded-[18px] border border-[#E3F1EA] bg-[#FAFEFC] p-4 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                          <div className="flex items-center gap-3">
                            <p className="font-semibold text-[#064E3B]">{invite.email}</p>
                            <MedicalCenterStatusBadge status={invite.status} />
                          </div>
                          <p className="mt-1 text-sm text-[#557062]">Invite created {formatDateTime(invite.joinedAt)}</p>
                        </div>
                        {invite.inviteId ? (
                          <Button
                            variant="secondary"
                            isLoading={actionKey === `invite:${invite.inviteId}`}
                            onClick={() =>
                              void runDoctorAction(
                                `invite:${invite.inviteId}`,
                                () => resendDoctorInvite(invite.inviteId as string),
                                "Doctor invite resent."
                              )
                            }
                          >
                            <RefreshCw size={16} />
                            Resend invite
                          </Button>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </MedicalCenterSectionCard>

        <div className="space-y-6">
          <MedicalCenterSectionCard title="Invite doctor" subtitle="Send a doctor invitation using the existing center invite workflow.">
            <form className="space-y-4" onSubmit={handleInvite}>
              <Input
                id="doctor-email"
                label="Doctor email"
                type="email"
                value={inviteEmail}
                onChange={(event) => setInviteEmail(event.target.value)}
                placeholder="doctor@example.com"
                required
              />
              <Button type="submit" isLoading={invitePending} fullWidth>
                <UserPlus size={16} />
                Send invite
              </Button>
            </form>
          </MedicalCenterSectionCard>

          <MedicalCenterSectionCard title="Join requests" subtitle="Review doctors who requested access to this medical center.">
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 2 }).map((_, index) => (
                  <div key={index} className="hl-skeleton h-24 rounded-[20px]" />
                ))}
              </div>
            ) : requests.length === 0 ? (
              <MedicalCenterEmptyState
                title="No doctor join requests"
                description="Incoming doctor requests will appear here when doctors request to join this center."
              />
            ) : (
              <div className="space-y-3">
                {requests.map((request) => (
                  <div key={request.id} className="rounded-[20px] border border-[#E3F1EA] bg-[#FAFEFC] p-4">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-3">
                          <p className="font-semibold text-[#064E3B]">{request.doctorName}</p>
                          <MedicalCenterStatusBadge status={request.status} />
                        </div>
                        <p className="mt-2 text-sm text-[#557062]">{request.doctorEmail}</p>
                        <p className="mt-1 text-sm text-[#557062]">
                          {request.specialization || "Specialization not added"} • Requested {formatDateTime(request.createdAt)}
                        </p>
                      </div>
                      {request.status === "PENDING" ? (
                        <div className="flex flex-wrap gap-2">
                          <Button
                            variant="primary"
                            isLoading={actionKey === `request:approve:${request.id}`}
                            onClick={() =>
                              void runDoctorAction(
                                `request:approve:${request.id}`,
                                () => reviewDoctorJoinRequest(request.id, "APPROVE"),
                                "Doctor join request approved."
                              )
                            }
                          >
                            Approve
                          </Button>
                          <Button
                            variant="danger"
                            isLoading={actionKey === `request:reject:${request.id}`}
                            onClick={() =>
                              void runDoctorAction(
                                `request:reject:${request.id}`,
                                () => reviewDoctorJoinRequest(request.id, "REJECT"),
                                "Doctor join request rejected."
                              )
                            }
                          >
                            Reject
                          </Button>
                        </div>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </MedicalCenterSectionCard>
        </div>
      </section>
    </div>
  );
}
