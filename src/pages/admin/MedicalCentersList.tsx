import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  fetchAdminMedicalCenters,
  type AdminMedicalCenterListItem,
  type MedicalCenterVerificationStatus,
} from "../../services/admin-medical-centers.service";
import TableSkeleton from "../../components/ui/TableSkeleton";

const verificationOptions: Array<{ key: "all" | MedicalCenterVerificationStatus; label: string }> = [
  { key: "all", label: "All verification" },
  { key: "pending", label: "Pending" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Rejected" },
];

const statusOptions = [
  { key: "all", label: "All centers" },
  { key: "true", label: "Active" },
  { key: "false", label: "Inactive" },
] as const;

const verificationBadgeClass: Record<MedicalCenterVerificationStatus, string> = {
  pending: "border-yellow-200 bg-yellow-50 text-yellow-800",
  approved: "border-green-200 bg-green-50 text-green-800",
  rejected: "border-red-200 bg-red-50 text-red-800",
  suspended: "bg-slate-100 text-slate-700",
};

function StatusBadge({
  label,
  className,
}: {
  label: string;
  className: string;
}) {
  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${className}`}>
      {label}
    </span>
  );
}

function formatDate(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function MedicalCentersListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [items, setItems] = useState<AdminMedicalCenterListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const search = searchParams.get("search") || "";
  const isActive = (searchParams.get("is_active") || "all") as "all" | "true" | "false";
  const verification = (searchParams.get("verification_status") || "all") as
    | "all"
    | MedicalCenterVerificationStatus;

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      try {
        const data = await fetchAdminMedicalCenters({
          search: search.trim() || undefined,
          is_active: isActive === "all" ? undefined : isActive,
          verification_status: verification === "all" ? undefined : verification,
        });

        if (!active) {
          return;
        }

        setItems(data);
        setError("");
      } catch (caughtError) {
        if (!active) {
          return;
        }

        setError(caughtError instanceof Error ? caughtError.message : "Unable to load medical centers.");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, [isActive, search, verification]);

  const summary = useMemo(
    () => ({
      total: items.length,
      active: items.filter((item) => item.is_active).length,
      pending: items.filter((item) => item.verification_status === "pending").length,
      bookings: items.reduce((sum, item) => sum + item.today_bookings_count, 0),
    }),
    [items]
  );

  const updateParams = (nextValues: Record<string, string | null>) => {
    const next = new URLSearchParams(searchParams);
    for (const [key, value] of Object.entries(nextValues)) {
      if (!value || value === "all") {
        next.delete(key);
      } else {
        next.set(key, value);
      }
    }
    setSearchParams(next);
  };

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-3xl border border-[#DCEAF3] bg-[linear-gradient(135deg,#053F56_0%,#0C6488_55%,#21A5EC_100%)] p-6 text-white shadow-sm">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#B7E6FA]">
              Operations Governance
            </p>
            <h2 className="mt-3 text-3xl font-semibold">Medical center management</h2>
            <p className="mt-3 text-sm text-[#D7F0FC]">
              Monitor activity, staffing, schedules, queues, and activation status across every
              medical center on HealthLink.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <div className="rounded-2xl bg-white/12 p-4 backdrop-blur">
              <p className="text-xs uppercase tracking-wide text-[#D7F0FC]">Centers</p>
              <p className="mt-2 text-2xl font-semibold">{summary.total}</p>
            </div>
            <div className="rounded-2xl bg-white/12 p-4 backdrop-blur">
              <p className="text-xs uppercase tracking-wide text-[#D7F0FC]">Active</p>
              <p className="mt-2 text-2xl font-semibold">{summary.active}</p>
            </div>
            <div className="rounded-2xl bg-white/12 p-4 backdrop-blur">
              <p className="text-xs uppercase tracking-wide text-[#D7F0FC]">Pending Review</p>
              <p className="mt-2 text-2xl font-semibold">{summary.pending}</p>
            </div>
            <div className="rounded-2xl bg-white/12 p-4 backdrop-blur">
              <p className="text-xs uppercase tracking-wide text-[#D7F0FC]">Today Bookings</p>
              <p className="mt-2 text-2xl font-semibold">{summary.bookings}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <input
            value={search}
            onChange={(event) => updateParams({ search: event.target.value || null })}
            placeholder="Search by center name or location"
            className="w-full max-w-md rounded-2xl border border-gray-200 bg-[#F8FBFD] px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-[#21A5EC] focus:ring-2 focus:ring-[#90D2F5]/50"
          />

          <div className="flex flex-col gap-3 sm:flex-row">
            <select
              value={isActive}
              onChange={(event) => updateParams({ is_active: event.target.value })}
              className="rounded-2xl border border-gray-200 bg-[#F8FBFD] px-4 py-3 text-sm text-slate-700 outline-none"
            >
              {statusOptions.map((option) => (
                <option key={option.key} value={option.key}>
                  {option.label}
                </option>
              ))}
            </select>
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
          </div>
        </div>

        {loading ? (
          <div className="mt-6">
            <TableSkeleton rows={8} columns={9} />
          </div>
        ) : error ? (
          <div className="mt-6 rounded-2xl border border-red-100 bg-red-50 px-5 py-4 text-sm text-red-700">
            {error}
          </div>
        ) : items.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-[#B7E6FA] bg-[#F8FCFE] px-5 py-10 text-sm text-slate-500">
            No medical centers matched the current filters.
          </div>
        ) : (
          <div className="mt-6 overflow-x-auto rounded-2xl border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-[#F8FBFD]">
                <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-3">Center</th>
                  <th className="px-4 py-3">Verification</th>
                  <th className="px-4 py-3">Operational</th>
                  <th className="px-4 py-3">Doctors</th>
                  <th className="px-4 py-3">Receptionists</th>
                  <th className="px-4 py-3">Live Queues</th>
                  <th className="px-4 py-3">Today Bookings</th>
                  <th className="px-4 py-3">Created</th>
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
                      <StatusBadge
                        label={item.verification_status}
                        className={verificationBadgeClass[item.verification_status]}
                      />
                    </td>
                    <td className="px-4 py-4">
                      <StatusBadge
                        label={item.is_active ? "Active" : "Inactive"}
                        className={
                          item.is_active
                            ? "border-green-200 bg-green-50 text-green-800"
                            : "border-slate-200 bg-slate-100 text-slate-700"
                        }
                      />
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-700">{item.active_doctors_count}</td>
                    <td className="px-4 py-4 text-sm text-slate-700">{item.receptionists_count}</td>
                    <td className="px-4 py-4 text-sm text-slate-700">{item.live_queues_count}</td>
                    <td className="px-4 py-4 text-sm text-slate-700">{item.today_bookings_count}</td>
                    <td className="px-4 py-4 text-sm text-slate-700">{formatDate(item.created_at)}</td>
                    <td className="px-4 py-4 text-right">
                      <Link
                        to={`/admin/verifications/clinic/${item.id}`}
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
