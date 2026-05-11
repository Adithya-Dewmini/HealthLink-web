import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { resolveApiAssetUrl } from "../../services/api";
import {
  fetchAdminPharmacyActivity,
  fetchAdminPharmacyDetails,
  updateAdminPharmacyStatus,
  type AdminPharmacyActivity,
  type AdminPharmacyDetails,
  type PharmacyVerificationStatus,
} from "../../services/admin-pharmacies.service";
import {
  approveVerificationEntity,
  rejectVerificationEntity,
} from "../../services/admin-verifications.service";
import PageLoader from "../../components/ui/PageLoader";

type DetailTab = "overview" | "inventory" | "activity" | "verification";

const tabs: Array<{ key: DetailTab; label: string }> = [
  { key: "overview", label: "Overview" },
  { key: "inventory", label: "Inventory" },
  { key: "activity", label: "Activity" },
  { key: "verification", label: "Verification" },
];

const verificationBadgeClass: Record<PharmacyVerificationStatus, string> = {
  pending: "border-yellow-200 bg-yellow-50 text-yellow-800",
  approved: "border-green-200 bg-green-50 text-green-800",
  rejected: "border-red-200 bg-red-50 text-red-800",
  suspended: "bg-slate-100 text-slate-700",
};

function Badge({ label, className }: { label: string; className: string }) {
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${className}`}>{label}</span>;
}

function formatDate(value: string | null) {
  if (!value) return "Unknown";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatMoney(value: number) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value || 0);
}

function EmptyState({ text }: { text: string }) {
  return <p className="rounded-2xl border border-dashed border-[#CBF7E8] bg-[#F7FFFB] px-4 py-8 text-sm text-slate-500">{text}</p>;
}

export default function PharmacyDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const [detail, setDetail] = useState<AdminPharmacyDetails | null>(null);
  const [activity, setActivity] = useState<AdminPharmacyActivity | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [busyAction, setBusyAction] = useState<"status" | "approve" | "reject" | null>(null);
  const [activeTab, setActiveTab] = useState<DetailTab>("overview");

  const load = async (pharmacyId: string) => {
    const [detailData, activityData] = await Promise.all([
      fetchAdminPharmacyDetails(pharmacyId),
      fetchAdminPharmacyActivity(pharmacyId),
    ]);
    setDetail(detailData);
    setActivity(activityData);
  };

  useEffect(() => {
    let active = true;

    const init = async () => {
      if (!id) {
        setError("Pharmacy not found.");
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const [detailData, activityData] = await Promise.all([
          fetchAdminPharmacyDetails(id),
          fetchAdminPharmacyActivity(id),
        ]);

        if (!active) return;

        setDetail(detailData);
        setActivity(activityData);
        setError("");
      } catch (caughtError) {
        if (!active) return;
        setError(caughtError instanceof Error ? caughtError.message : "Unable to load pharmacy details.");
      } finally {
        if (active) setLoading(false);
      }
    };

    void init();
    return () => {
      active = false;
    };
  }, [id]);

  const summary = useMemo(() => {
    if (!detail || !activity) return null;
    return {
      pharmacists: detail.associations.pharmacists.length,
      lowStock: detail.inventory_summary.low_stock_items,
      expiring: detail.inventory_summary.expiring_items,
      weeklyDispensing: activity.dispensing_stats.week,
    };
  }, [activity, detail]);

  const runAction = async (
    action: "status" | "approve" | "reject",
    runner: () => Promise<void>
  ) => {
    if (!id) return;

    setBusyAction(action);
    setActionError("");
    try {
      await runner();
      await load(id);
    } catch (caughtError) {
      setActionError(caughtError instanceof Error ? caughtError.message : "Action failed.");
    } finally {
      setBusyAction(null);
    }
  };

  const toggleStatus = async () => {
    if (!detail) return;
    await runAction("status", async () => {
      await updateAdminPharmacyStatus({
        id: detail.profile.id,
        is_active: !detail.profile.is_active,
      });
    });
  };

  const approveVerification = async () => {
    if (!detail) return;
    const note = window.prompt("Approval note (optional)", detail.profile.verification_notes || "");
    if (note === null) return;
    await runAction("approve", async () => {
      await approveVerificationEntity({
        type: "pharmacy",
        id: detail.profile.id,
        note: note.trim() || undefined,
      });
    });
  };

  const rejectVerification = async () => {
    if (!detail) return;
    const note = window.prompt("Rejection reason", detail.profile.verification_notes || "");
    if (note === null) return;
    if (!note.trim()) {
      setActionError("A rejection note is required.");
      return;
    }
    await runAction("reject", async () => {
      await rejectVerificationEntity({
        type: "pharmacy",
        id: detail.profile.id,
        note: note.trim(),
      });
    });
  };

  if (loading) {
    return <PageLoader />;
  }

  if (error || !detail || !activity) {
    return <div className="rounded-3xl border border-red-100 bg-red-50 px-6 py-4 text-sm text-red-700 shadow-sm">{error || "Pharmacy not found."}</div>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link to="/admin/pharmacies" className="text-sm font-semibold text-[#1DB57C] hover:text-[#178B61]">
          Back to pharmacies
        </Link>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busyAction === "approve"}
            onClick={() => void approveVerification()}
            className="rounded-full border border-green-200 bg-green-50 px-4 py-2 text-sm font-semibold text-green-700 transition hover:bg-green-100 disabled:opacity-50"
          >
            {busyAction === "approve" ? "Approving..." : "Approve verification"}
          </button>
          <button
            type="button"
            disabled={busyAction === "reject"}
            onClick={() => void rejectVerification()}
            className="rounded-full border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:opacity-50"
          >
            {busyAction === "reject" ? "Rejecting..." : "Reject verification"}
          </button>
          <button
            type="button"
            disabled={busyAction === "status"}
            onClick={() => void toggleStatus()}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition disabled:opacity-50 ${
              detail.profile.is_active
                ? "border border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
                : "bg-[#0F8F58] text-white hover:bg-[#0A7748]"
            }`}
          >
            {busyAction === "status"
              ? "Updating..."
              : detail.profile.is_active
                ? "Deactivate pharmacy"
                : "Activate pharmacy"}
          </button>
        </div>
      </div>

      <section className="rounded-3xl border border-[#DCEAF3] bg-[linear-gradient(135deg,#FBFEFF_0%,#F0FFF8_100%)] p-6 shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#1DB57C]">Operational pharmacy</p>
            <h2 className="mt-3 text-3xl font-semibold text-[#053F56]">{detail.profile.name}</h2>
            <p className="mt-3 text-sm text-slate-500">{detail.profile.location}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Badge
                label={detail.profile.verification_status}
                className={verificationBadgeClass[detail.profile.verification_status]}
              />
              <Badge
                label={detail.profile.is_active ? "Active" : "Inactive"}
                className={
                  detail.profile.is_active
                    ? "border-green-200 bg-green-50 text-green-800"
                    : "border-red-200 bg-red-50 text-red-700"
                }
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-white p-4">
              <p className="text-xs uppercase tracking-wide text-slate-400">Pharmacists</p>
              <p className="mt-2 text-xl font-semibold text-[#053F56]">{summary?.pharmacists ?? 0}</p>
            </div>
            <div className="rounded-2xl bg-white p-4">
              <p className="text-xs uppercase tracking-wide text-slate-400">Low Stock</p>
              <p className="mt-2 text-xl font-semibold text-[#053F56]">{summary?.lowStock ?? 0}</p>
            </div>
            <div className="rounded-2xl bg-white p-4">
              <p className="text-xs uppercase tracking-wide text-slate-400">Expiring</p>
              <p className="mt-2 text-xl font-semibold text-[#053F56]">{summary?.expiring ?? 0}</p>
            </div>
            <div className="rounded-2xl bg-white p-4">
              <p className="text-xs uppercase tracking-wide text-slate-400">Weekly Dispensing</p>
              <p className="mt-2 text-xl font-semibold text-[#053F56]">{summary?.weeklyDispensing ?? 0}</p>
            </div>
          </div>
        </div>
      </section>

      {actionError ? (
        <div className="rounded-2xl border border-red-100 bg-red-50 px-5 py-4 text-sm text-red-700">{actionError}</div>
      ) : null}

      <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap gap-2">
          {tabs.map((tab) => {
            const active = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  active ? "bg-[#053F56] text-white" : "bg-[#F3F7FA] text-slate-600 hover:bg-[#DCEAF3]"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="mt-6">
          {activeTab === "overview" ? (
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="rounded-2xl bg-[#F7FAFC] p-5">
                <h3 className="text-lg font-semibold text-[#053F56]">Profile summary</h3>
                <div className="mt-4 space-y-3 text-sm text-slate-600">
                  <p><span className="font-semibold text-slate-800">Created:</span> {formatDate(detail.profile.created_at)}</p>
                  <p><span className="font-semibold text-slate-800">Last active:</span> {formatDate(detail.profile.last_active_at)}</p>
                  <p><span className="font-semibold text-slate-800">Verified at:</span> {formatDate(detail.profile.verified_at)}</p>
                  <p><span className="font-semibold text-slate-800">Verification notes:</span> {detail.profile.verification_notes || "None"}</p>
                </div>
              </div>

              <div className="rounded-2xl bg-[#F7FAFC] p-5">
                <h3 className="text-lg font-semibold text-[#053F56]">Pharmacist associations</h3>
                <div className="mt-4 space-y-3">
                  {detail.associations.pharmacists.length === 0 ? (
                    <p className="text-sm text-slate-500">No linked pharmacists.</p>
                  ) : (
                    detail.associations.pharmacists.map((person) => (
                      <div key={`${person.user_id}-${person.linked_at}`} className="rounded-2xl bg-white px-4 py-3">
                        <p className="font-semibold text-[#053F56]">{person.name}</p>
                        <p className="text-sm text-slate-500">{person.email}</p>
                        <p className="mt-1 text-xs uppercase tracking-wide text-slate-400">
                          {person.role || "pharmacist"} • Linked {formatDate(person.linked_at)}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          ) : null}

          {activeTab === "inventory" ? (
            <div className="grid gap-6">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-2xl bg-[#F7FAFC] p-5">
                  <p className="text-xs uppercase tracking-wide text-slate-400">Total Medicines</p>
                  <p className="mt-2 text-2xl font-semibold text-[#053F56]">{detail.inventory_summary.total_medicines}</p>
                </div>
                <div className="rounded-2xl bg-[#FFF8E8] p-5">
                  <p className="text-xs uppercase tracking-wide text-amber-700">Low Stock Alerts</p>
                  <p className="mt-2 text-2xl font-semibold text-amber-900">{detail.inventory_summary.low_stock_items}</p>
                </div>
                <div className="rounded-2xl bg-[#FFF3F0] p-5">
                  <p className="text-xs uppercase tracking-wide text-rose-700">Expiring Medicines</p>
                  <p className="mt-2 text-2xl font-semibold text-rose-900">{detail.inventory_summary.expiring_items}</p>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-[#053F56]">Inventory anomalies</h3>
                <div className="mt-4 max-h-[480px] space-y-3 overflow-y-auto pr-1">
                  {detail.inventory_summary.alerts.length === 0 ? (
                    <EmptyState text="No low stock or expiring inventory alerts." />
                  ) : (
                    detail.inventory_summary.alerts.map((alert, index) => (
                      <div key={`${alert.medicine_id}-${alert.severity}-${index}`} className="rounded-2xl border border-gray-200 p-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="font-semibold text-[#053F56]">{alert.medicine_name}</p>
                            <p className="mt-1 text-sm text-slate-500">
                              Qty {alert.quantity} {alert.unit_price !== null ? `• ${formatMoney(alert.unit_price)}` : ""}
                            </p>
                          </div>
                          <Badge
                            label={alert.severity === "low_stock" ? "Low stock" : "Expiring"}
                            className={
                              alert.severity === "low_stock"
                                ? "border-amber-200 bg-amber-50 text-amber-800"
                                : "border-rose-200 bg-rose-50 text-rose-800"
                            }
                          />
                        </div>
                        {alert.expiry_date ? (
                          <p className="mt-2 text-xs uppercase tracking-wide text-slate-400">
                            Expires {formatDate(alert.expiry_date)}
                          </p>
                        ) : null}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          ) : null}

          {activeTab === "activity" ? (
            <div className="grid gap-6">
              <div className="grid gap-4 md:grid-cols-4">
                <div className="rounded-2xl bg-[#F7FAFC] p-5">
                  <p className="text-xs uppercase tracking-wide text-slate-400">Dispensed Today</p>
                  <p className="mt-2 text-2xl font-semibold text-[#053F56]">{activity.dispensing_stats.today}</p>
                </div>
                <div className="rounded-2xl bg-[#F7FAFC] p-5">
                  <p className="text-xs uppercase tracking-wide text-slate-400">Dispensed This Week</p>
                  <p className="mt-2 text-2xl font-semibold text-[#053F56]">{activity.dispensing_stats.week}</p>
                </div>
                <div className="rounded-2xl bg-[#F7FAFC] p-5">
                  <p className="text-xs uppercase tracking-wide text-slate-400">Sales Today</p>
                  <p className="mt-2 text-2xl font-semibold text-[#053F56]">{formatMoney(activity.sales_summary.today)}</p>
                </div>
                <div className="rounded-2xl bg-[#F7FAFC] p-5">
                  <p className="text-xs uppercase tracking-wide text-slate-400">Sales This Week</p>
                  <p className="mt-2 text-2xl font-semibold text-[#053F56]">{formatMoney(activity.sales_summary.week)}</p>
                </div>
              </div>

              <div className="grid gap-6 xl:grid-cols-2">
                <div>
                  <h3 className="text-lg font-semibold text-[#053F56]">Recent prescriptions dispensed</h3>
                  <div className="mt-4 max-h-[360px] space-y-3 overflow-y-auto pr-1">
                    {activity.prescription_usage.recent_prescriptions.length === 0 ? (
                      <EmptyState text="No recent dispensing records." />
                    ) : (
                      activity.prescription_usage.recent_prescriptions.map((item) => (
                        <div key={item.id} className="rounded-2xl border border-gray-200 p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-semibold text-[#053F56]">Prescription #{item.id}</p>
                              <p className="mt-1 text-sm text-slate-500">
                                {item.patient_name || "Unknown patient"} • {item.doctor_name || "Unknown doctor"}
                              </p>
                            </div>
                            <Badge
                              label={`${item.medicine_count} items`}
                              className="border-cyan-200 bg-cyan-50 text-cyan-800"
                            />
                          </div>
                          <p className="mt-3 text-sm text-slate-600">
                            Dispensed {formatDate(item.dispensed_at)} {item.sale_total !== null ? `• ${formatMoney(item.sale_total)}` : ""}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-[#053F56]">Demand logs</h3>
                  <div className="mt-4 max-h-[360px] space-y-3 overflow-y-auto pr-1">
                    {detail.activity.demand_logs.length === 0 ? (
                      <EmptyState text="No demand logs recorded." />
                    ) : (
                      detail.activity.demand_logs.map((item, index) => (
                        <div key={`${item.medicine_id}-${item.created_at}-${index}`} className="rounded-2xl border border-gray-200 p-4">
                          <div className="flex items-center justify-between gap-3">
                            <p className="font-semibold text-[#053F56]">{item.medicine_name || `Medicine #${item.medicine_id}`}</p>
                            <Badge label={`Qty ${item.quantity}`} className="border-slate-200 bg-slate-100 text-slate-700" />
                          </div>
                          <p className="mt-2 text-sm text-slate-500">{item.source || "demand"} • {formatDate(item.created_at)}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-[#053F56]">Demand trends</h3>
                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  {activity.demand_trends.length === 0 ? (
                    <EmptyState text="No recent demand trend data." />
                  ) : (
                    activity.demand_trends.map((trend) => (
                      <div key={trend.date} className="rounded-2xl border border-gray-200 p-4">
                        <p className="text-sm font-semibold text-[#053F56]">{trend.date}</p>
                        <p className="mt-2 text-sm text-slate-600">{trend.count} logs</p>
                        <p className="mt-1 text-sm text-slate-500">{trend.quantity} units requested</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          ) : null}

          {activeTab === "verification" ? (
            <div className="grid gap-6 xl:grid-cols-2">
              <div>
                <h3 className="text-lg font-semibold text-[#053F56]">Documents</h3>
                <div className="mt-4 max-h-[420px] space-y-3 overflow-y-auto pr-1">
                  {detail.verification.documents.length === 0 ? (
                    <EmptyState text="No verification documents uploaded." />
                  ) : (
                    detail.verification.documents.map((doc) => (
                      <a
                        key={doc.id}
                        href={resolveApiAssetUrl(doc.file_url)}
                        target="_blank"
                        rel="noreferrer"
                        className="block rounded-2xl border border-gray-200 p-4 transition hover:border-[#1DB57C]"
                      >
                        <p className="font-semibold text-[#053F56]">{doc.document_type}</p>
                        <p className="mt-1 text-sm text-slate-500">{formatDate(doc.uploaded_at)}</p>
                      </a>
                    ))
                  )}
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-[#053F56]">Review history</h3>
                <div className="mt-4 max-h-[420px] space-y-3 overflow-y-auto pr-1">
                  {detail.verification.review_history.length === 0 ? (
                    <EmptyState text="No verification reviews recorded." />
                  ) : (
                    detail.verification.review_history.map((review) => (
                      <div key={review.id} className="rounded-2xl border border-gray-200 p-4">
                        <div className="flex items-center justify-between gap-3">
                          <p className="font-semibold text-[#053F56]">{review.reviewer_name || "System reviewer"}</p>
                          <Badge
                            label={review.status}
                            className={
                              review.status === "approved"
                                ? "border-green-200 bg-green-50 text-green-800"
                                : review.status === "rejected"
                                  ? "border-red-200 bg-red-50 text-red-700"
                                  : "border-yellow-200 bg-yellow-50 text-yellow-800"
                            }
                          />
                        </div>
                        <p className="mt-1 text-sm text-slate-500">{review.reviewer_email || "No email"}</p>
                        <p className="mt-3 text-sm text-slate-600">{review.note || "No note provided."}</p>
                        <p className="mt-2 text-xs uppercase tracking-wide text-slate-400">
                          {formatDate(review.reviewed_at)}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
