import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  fetchAdminPharmacies,
  type AdminPharmacyListItem,
  type PharmacyVerificationStatus,
} from "../../services/admin-pharmacies.service";
import TableSkeleton from "../../components/ui/TableSkeleton";

const verificationOptions: Array<{ key: "all" | PharmacyVerificationStatus; label: string }> = [
  { key: "all", label: "All verification" },
  { key: "pending", label: "Pending" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Rejected" },
  { key: "suspended", label: "Suspended" },
];

const activityOptions = [
  { key: "all", label: "All activity" },
  { key: "high", label: "High" },
  { key: "medium", label: "Medium" },
  { key: "low", label: "Low" },
] as const;

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
  if (!value) return "No activity";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function PharmaciesListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [items, setItems] = useState<AdminPharmacyListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const search = searchParams.get("search") || "";
  const verification = (searchParams.get("verification_status") || "all") as
    | "all"
    | PharmacyVerificationStatus;
  const activityLevel = (searchParams.get("activity_level") || "all") as
    | "all"
    | "high"
    | "medium"
    | "low";

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      try {
        const data = await fetchAdminPharmacies({
          search: search.trim() || undefined,
          verification_status: verification === "all" ? undefined : verification,
          activity_level: activityLevel === "all" ? undefined : activityLevel,
        });

        if (!active) return;

        setItems(data);
        setError("");
      } catch (caughtError) {
        if (!active) return;
        setError(caughtError instanceof Error ? caughtError.message : "Unable to load pharmacies.");
      } finally {
        if (active) setLoading(false);
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, [activityLevel, search, verification]);

  const summary = useMemo(
    () => ({
      total: items.length,
      active: items.filter((item) => item.is_active).length,
      inventory: items.reduce((sum, item) => sum + item.inventory_size, 0),
      dispensing: items.reduce((sum, item) => sum + item.dispensing_count, 0),
    }),
    [items]
  );

  const updateParams = (nextValues: Record<string, string | null>) => {
    const next = new URLSearchParams(searchParams);
    for (const [key, value] of Object.entries(nextValues)) {
      if (!value || value === "all") next.delete(key);
      else next.set(key, value);
    }
    setSearchParams(next);
  };

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-3xl border border-[#DCEAF3] bg-[linear-gradient(135deg,#053F56_0%,#0C6B6D_50%,#1DB57C_100%)] p-6 text-white shadow-sm">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#CBF7E8]">
              Pharmacy Governance
            </p>
            <h2 className="mt-3 text-3xl font-semibold">Pharmacy management</h2>
            <p className="mt-3 text-sm text-[#E1FBF2]">
              Monitor trust, inventory health, dispensing throughput, and pharmacy demand patterns
              across HealthLink.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <div className="rounded-2xl bg-white/12 p-4 backdrop-blur">
              <p className="text-xs uppercase tracking-wide text-[#E1FBF2]">Pharmacies</p>
              <p className="mt-2 text-2xl font-semibold">{summary.total}</p>
            </div>
            <div className="rounded-2xl bg-white/12 p-4 backdrop-blur">
              <p className="text-xs uppercase tracking-wide text-[#E1FBF2]">Active</p>
              <p className="mt-2 text-2xl font-semibold">{summary.active}</p>
            </div>
            <div className="rounded-2xl bg-white/12 p-4 backdrop-blur">
              <p className="text-xs uppercase tracking-wide text-[#E1FBF2]">Inventory Items</p>
              <p className="mt-2 text-2xl font-semibold">{summary.inventory}</p>
            </div>
            <div className="rounded-2xl bg-white/12 p-4 backdrop-blur">
              <p className="text-xs uppercase tracking-wide text-[#E1FBF2]">Recent Dispensing</p>
              <p className="mt-2 text-2xl font-semibold">{summary.dispensing}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <input
            value={search}
            onChange={(event) => updateParams({ search: event.target.value || null })}
            placeholder="Search by pharmacy name or location"
            className="w-full max-w-md rounded-2xl border border-gray-200 bg-[#F8FBFD] px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-[#1DB57C] focus:ring-2 focus:ring-[#AAF0D0]/50"
          />

          <div className="flex flex-col gap-3 sm:flex-row">
            <select
              value={verification}
              onChange={(event) => updateParams({ verification_status: event.target.value })}
              className="rounded-2xl border border-gray-200 bg-[#F8FBFD] px-4 py-3 text-sm text-slate-700 outline-none"
            >
              {verificationOptions.map((option) => (
                <option key={option.key} value={option.key}>
                  {option.label}
                </option>
              ))}
            </select>
            <select
              value={activityLevel}
              onChange={(event) => updateParams({ activity_level: event.target.value })}
              className="rounded-2xl border border-gray-200 bg-[#F8FBFD] px-4 py-3 text-sm text-slate-700 outline-none"
            >
              {activityOptions.map((option) => (
                <option key={option.key} value={option.key}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="mt-6">
            <TableSkeleton rows={8} columns={8} />
          </div>
        ) : error ? (
          <div className="mt-6 rounded-2xl border border-red-100 bg-red-50 px-5 py-4 text-sm text-red-700">
            {error}
          </div>
        ) : items.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-[#CBF7E8] bg-[#F7FFFB] px-5 py-10 text-sm text-slate-500">
            No pharmacies matched the current filters.
          </div>
        ) : (
          <div className="mt-6 overflow-x-auto rounded-2xl border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-[#F8FBFD]">
                <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-3">Pharmacy</th>
                  <th className="px-4 py-3">Verification</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Inventory</th>
                  <th className="px-4 py-3">Dispensing</th>
                  <th className="px-4 py-3">Demand Logs</th>
                  <th className="px-4 py-3">Last Active</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {items.map((item) => (
                  <tr key={item.id}>
                    <td className="px-4 py-4">
                      <p className="font-semibold text-[#053F56]">{item.name}</p>
                      <p className="mt-1 text-sm text-slate-500">{item.location}</p>
                    </td>
                    <td className="px-4 py-4">
                      <Badge
                        label={item.verification_status}
                        className={verificationBadgeClass[item.verification_status]}
                      />
                    </td>
                    <td className="px-4 py-4">
                      <Badge
                        label={item.is_active ? "Active" : "Inactive"}
                        className={
                          item.is_active
                            ? "border-green-200 bg-green-50 text-green-800"
                            : "border-red-200 bg-red-50 text-red-700"
                        }
                      />
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-700">{item.inventory_size}</td>
                    <td className="px-4 py-4 text-sm text-slate-700">{item.dispensing_count}</td>
                    <td className="px-4 py-4 text-sm text-slate-700">{item.demand_log_count}</td>
                    <td className="px-4 py-4 text-sm text-slate-700">{formatDate(item.last_active_at)}</td>
                    <td className="px-4 py-4 text-right">
                      <Link
                        to={`/admin/verifications/pharmacy/${item.id}`}
                        className="inline-flex rounded-full bg-[#053F56] px-4 py-2 text-sm font-semibold !text-white no-underline transition hover:bg-[#0D5E80] hover:!text-white visited:!text-white"
                      >
                        Review
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
