import { useEffect, useState } from "react";
import { useAuth } from "../../hooks/useAuth";
import Button from "../../components/ui/Button";
import {
  MedicalCenterEmptyState,
  MedicalCenterInlineAlert,
  MedicalCenterPageHeader,
  MedicalCenterSectionCard,
  MedicalCenterStatusBadge,
} from "../../components/center/MedicalCenterUI";
import { getMedicalCenterDashboard } from "../../services/medical-center.service";
import type { MedicalCenterDashboard } from "../../types/medical-center.types";

export default function CenterSettingsPage() {
  const { user } = useAuth();
  const [dashboard, setDashboard] = useState<MedicalCenterDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const data = await getMedicalCenterDashboard();
      setDashboard(data);
      setError("");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to load center profile.");
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

  return (
    <div className="space-y-6">
      <MedicalCenterPageHeader
        title="Settings"
        subtitle="This page stays aligned with the current backend scope, so it shows the center profile and workspace state without inventing unsupported profile update APIs."
      />

      {error ? (
        <div className="space-y-3">
          <MedicalCenterInlineAlert tone="error" message={error} />
          <Button variant="secondary" onClick={() => void load()}>
            Retry loading profile
          </Button>
        </div>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-[1fr_0.8fr]">
        <MedicalCenterSectionCard title="Medical center profile" subtitle="Center details currently available from the dashboard endpoint.">
          {loading ? (
            <div className="hl-skeleton h-64 rounded-[24px]" />
          ) : dashboard?.center ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-[20px] border border-[#E3F1EA] bg-[#FAFEFC] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#6E887C]">Center name</p>
                <p className="mt-2 text-lg font-semibold text-[#064E3B]">{dashboard.center.name}</p>
              </div>
              <div className="rounded-[20px] border border-[#E3F1EA] bg-[#FAFEFC] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#6E887C]">Status</p>
                <div className="mt-2">
                  <MedicalCenterStatusBadge status={dashboard.center.status} />
                </div>
              </div>
              <div className="rounded-[20px] border border-[#E3F1EA] bg-[#FAFEFC] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#6E887C]">Email</p>
                <p className="mt-2 text-sm text-[#587164]">{dashboard.center.email || "No email on record"}</p>
              </div>
              <div className="rounded-[20px] border border-[#E3F1EA] bg-[#FAFEFC] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#6E887C]">Phone</p>
                <p className="mt-2 text-sm text-[#587164]">{dashboard.center.phone || "No phone on record"}</p>
              </div>
              <div className="rounded-[20px] border border-[#E3F1EA] bg-[#FAFEFC] p-4 sm:col-span-2">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#6E887C]">Address</p>
                <p className="mt-2 text-sm leading-6 text-[#587164]">{dashboard.center.address || "No address on record"}</p>
              </div>
            </div>
          ) : (
            <MedicalCenterEmptyState
              title="Center profile unavailable"
              description="The current dashboard payload did not include a medical center profile."
            />
          )}
        </MedicalCenterSectionCard>

        <MedicalCenterSectionCard title="Workspace session" subtitle="Current web panel access and implementation notes.">
          <div className="space-y-4">
            <div className="rounded-[20px] border border-[#E3F1EA] bg-[#FAFEFC] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#6E887C]">Signed in as</p>
              <p className="mt-2 text-lg font-semibold text-[#064E3B]">{user?.name ?? "Medical center admin"}</p>
              <p className="mt-1 text-sm text-[#587164]">{user?.email ?? "No email available"}</p>
            </div>
            <div className="rounded-[20px] border border-[#E3F1EA] bg-[#FAFEFC] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#6E887C]">Role</p>
              <div className="mt-2">
                <MedicalCenterStatusBadge status={user?.role ?? "medical_center_admin"} />
              </div>
            </div>
            <div className="rounded-[20px] border border-[#E3F1EA] bg-[#FAFEFC] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#6E887C]">Current scope</p>
              <p className="mt-2 text-sm leading-7 text-[#587164]">
                This web panel supports dashboard visibility, doctor assignments, receptionist management, doctor sessions,
                appointments, queues, and read-only center profile details. Direct profile editing was not added because no
                matching backend update endpoint is currently mounted for the center web surface.
              </p>
            </div>
          </div>
        </MedicalCenterSectionCard>
      </section>
    </div>
  );
}
