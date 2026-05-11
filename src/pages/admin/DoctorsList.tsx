import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  fetchAdminDoctors,
  type AdminDoctorListItem,
  type DoctorVerificationStatus,
} from "../../services/admin-doctors.service";
import TableSkeleton from "../../components/ui/TableSkeleton";

const verificationOptions: Array<{ key: "all" | DoctorVerificationStatus; label: string }> = [
  { key: "all", label: "All verification" },
  { key: "pending", label: "Pending" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Rejected" },
];

const statusOptions = [
  { key: "all", label: "All accounts" },
  { key: "true", label: "Active" },
  { key: "false", label: "Inactive" },
] as const;

const verificationBadgeClass: Record<DoctorVerificationStatus, string> = {
  pending: "border-yellow-200 bg-yellow-50 text-yellow-800",
  approved: "border-green-200 bg-green-50 text-green-800",
  rejected: "border-red-200 bg-red-50 text-red-800",
};

function Badge({ label, className }: { label: string; className: string }) {
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${className}`}>{label}</span>;
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

export default function DoctorsListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [items, setItems] = useState<AdminDoctorListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const search = searchParams.get("search") || "";
  const specialization = searchParams.get("specialization") || "all";
  const verification = (searchParams.get("verification_status") || "all") as
    | "all"
    | DoctorVerificationStatus;
  const isActive = (searchParams.get("is_active") || "all") as "all" | "true" | "false";

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      try {
        const data = await fetchAdminDoctors({
          search: search.trim() || undefined,
          specialization: specialization === "all" ? undefined : specialization,
          verification_status: verification === "all" ? undefined : verification,
          is_active: isActive === "all" ? undefined : isActive,
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

        setError(caughtError instanceof Error ? caughtError.message : "Unable to load doctors.");
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
  }, [isActive, search, specialization, verification]);

  const specializationOptions = useMemo(() => {
    const values = Array.from(
      new Set(items.map((item) => String(item.specialization || "").trim()).filter(Boolean))
    ).sort((left, right) => left.localeCompare(right));

    return [{ key: "all", label: "All specialties" }, ...values.map((value) => ({ key: value, label: value }))];
  }, [items]);

  const summary = useMemo(
    () => ({
      total: items.length,
      active: items.filter((item) => item.is_active).length,
      visible: items.filter((item) => item.is_visible).length,
      pending: items.filter((item) => item.verification_status === "pending").length,
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
      <section className="rounded-3xl border border-[#DCEAF3] bg-[linear-gradient(135deg,#053F56_0%,#0B5F7D_45%,#1AA2B8_100%)] p-6 text-white shadow-sm">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#BDEEF5]">
              Clinical Governance
            </p>
            <h2 className="mt-3 text-3xl font-semibold">Doctor management</h2>
            <p className="mt-3 text-sm text-[#DBF7FB]">
              Monitor doctor verification, clinic relationships, availability footprint, and
              booking visibility across the full platform.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <div className="rounded-2xl bg-white/12 p-4 backdrop-blur">
              <p className="text-xs uppercase tracking-wide text-[#DBF7FB]">Doctors</p>
              <p className="mt-2 text-2xl font-semibold">{summary.total}</p>
            </div>
            <div className="rounded-2xl bg-white/12 p-4 backdrop-blur">
              <p className="text-xs uppercase tracking-wide text-[#DBF7FB]">Active</p>
              <p className="mt-2 text-2xl font-semibold">{summary.active}</p>
            </div>
            <div className="rounded-2xl bg-white/12 p-4 backdrop-blur">
              <p className="text-xs uppercase tracking-wide text-[#DBF7FB]">Visible</p>
              <p className="mt-2 text-2xl font-semibold">{summary.visible}</p>
            </div>
            <div className="rounded-2xl bg-white/12 p-4 backdrop-blur">
              <p className="text-xs uppercase tracking-wide text-[#DBF7FB]">Pending Review</p>
              <p className="mt-2 text-2xl font-semibold">{summary.pending}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <input
            value={search}
            onChange={(event) => updateParams({ search: event.target.value || null })}
            placeholder="Search by doctor name or email"
            className="w-full max-w-md rounded-2xl border border-gray-200 bg-[#F8FBFD] px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-[#1AA2B8] focus:ring-2 focus:ring-[#8DE0EB]/50"
          />

          <div className="flex flex-col gap-3 sm:flex-row">
            <select
              value={specialization}
              onChange={(event) => updateParams({ specialization: event.target.value })}
              className="rounded-2xl border border-gray-200 bg-[#F8FBFD] px-4 py-3 text-sm text-slate-700 outline-none"
            >
              {specializationOptions.map((option) => (
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
          <div className="mt-6 rounded-2xl border border-dashed border-[#BDEEF5] bg-[#F7FEFF] px-5 py-10 text-sm text-slate-500">
            No doctors matched the current filters.
          </div>
        ) : (
          <div className="mt-6 overflow-x-auto rounded-2xl border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-[#F8FBFD]">
                <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-3">Doctor</th>
                  <th className="px-4 py-3">Specialization</th>
                  <th className="px-4 py-3">Verification</th>
                  <th className="px-4 py-3">Active Clinics</th>
                  <th className="px-4 py-3">Pending Requests</th>
                  <th className="px-4 py-3">Visibility</th>
                  <th className="px-4 py-3">Account</th>
                  <th className="px-4 py-3">Created</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {items.map((item) => (
                  <tr key={item.id}>
                    <td className="px-4 py-4">
                      <p className="font-semibold text-[#053F56]">{item.name}</p>
                      <p className="mt-1 text-sm text-slate-500">{item.email}</p>
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-700">{item.specialization || "Not provided"}</td>
                    <td className="px-4 py-4">
                      <Badge
                        label={item.verification_status}
                        className={verificationBadgeClass[item.verification_status]}
                      />
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-700">{item.active_clinic_count}</td>
                    <td className="px-4 py-4 text-sm text-slate-700">{item.pending_requests_count}</td>
                    <td className="px-4 py-4">
                      <Badge
                        label={item.is_visible ? "Visible" : "Hidden"}
                        className={
                          item.is_visible
                            ? "border-cyan-200 bg-cyan-50 text-cyan-800"
                            : "border-slate-200 bg-slate-100 text-slate-700"
                        }
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
                    <td className="px-4 py-4 text-sm text-slate-700">{formatDate(item.created_at)}</td>
                    <td className="px-4 py-4 text-right">
                      <Link
                        to={`/admin/doctors/${item.id}`}
                        className="inline-flex rounded-full bg-[#053F56] px-4 py-2 text-sm font-semibold !text-white no-underline transition hover:bg-[#0D5E80] hover:!text-white visited:!text-white"
                      >
                        Inspect
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
