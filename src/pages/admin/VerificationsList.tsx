import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  fetchVerificationEntities,
  type VerificationEntityType,
  type VerificationListItem,
  type VerificationStatus,
} from "../../services/admin-verifications.service";
import TableSkeleton from "../../components/ui/TableSkeleton";

const typeTabs: Array<{ key: "all" | VerificationEntityType; label: string }> = [
  { key: "all", label: "All" },
  { key: "clinic", label: "Medical Centers" },
  { key: "doctor", label: "Doctors" },
  { key: "pharmacy", label: "Pharmacies" },
];

const statusOptions: Array<{ key: "all" | VerificationStatus; label: string }> = [
  { key: "all", label: "All statuses" },
  { key: "pending", label: "Pending" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Rejected" },
  { key: "suspended", label: "Suspended" },
];

const statusBadgeClass: Record<VerificationStatus, string> = {
  pending: "border-yellow-200 bg-yellow-50 text-yellow-800",
  approved: "border-green-200 bg-green-50 text-green-800",
  rejected: "border-red-200 bg-red-50 text-red-800",
  suspended: "bg-slate-100 text-slate-700",
};

function StatusBadge({ status }: { status: VerificationStatus }) {
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold capitalize ${statusBadgeClass[status]}`}
    >
      {status}
    </span>
  );
}

function formatDate(value: string | null | undefined) {
  if (!value) {
    return "Unknown";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function EntityTypePill({ type }: { type: VerificationEntityType }) {
  return (
    <span className="inline-flex rounded-full bg-[#E6F5FD] px-2.5 py-1 text-xs font-semibold capitalize text-[#0D5E80]">
      {type === "clinic" ? "medical center" : type}
    </span>
  );
}

export default function VerificationsListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [items, setItems] = useState<VerificationListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const type = (searchParams.get("type") || "all") as "all" | VerificationEntityType;
  const status = (searchParams.get("status") || "all") as "all" | VerificationStatus;
  const search = searchParams.get("search") || "";
  const page = Number(searchParams.get("page") || "1");
  const safePage = Number.isInteger(page) && page > 0 ? page : 1;

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      try {
        const response = await fetchVerificationEntities({
          type: type === "all" ? undefined : type,
          status: status === "all" ? undefined : status,
          search: search.trim() || undefined,
          page: safePage,
          pageSize: 12,
        });

        if (!active) {
          return;
        }

        setItems(response.items);
        setTotal(response.pagination.total);
        setTotalPages(response.pagination.totalPages);
        setError("");
      } catch (caughtError) {
        if (!active) {
          return;
        }

        setError(
          caughtError instanceof Error ? caughtError.message : "Unable to load verification requests."
        );
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
  }, [safePage, search, status, type]);

  const summary = useMemo(
    () => ({
      pending: items.filter((item) => item.status === "pending").length,
      approved: items.filter((item) => item.status === "approved").length,
      rejected: items.filter((item) => item.status === "rejected").length,
      suspended: items.filter((item) => item.status === "suspended").length,
    }),
    [items]
  );

  const updateSearchParams = (nextValues: Record<string, string | null>) => {
    const next = new URLSearchParams(searchParams);

    for (const [key, value] of Object.entries(nextValues)) {
      if (!value || value === "all") {
        next.delete(key);
      } else {
        next.set(key, value);
      }
    }

    if (!("page" in nextValues)) {
      next.set("page", "1");
    }

    setSearchParams(next);
  };

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-3xl border border-[#DCEAF3] bg-[linear-gradient(135deg,#053F56_0%,#0C6488_52%,#21A5EC_100%)] p-6 text-white shadow-sm">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#B7E6FA]">
              Governance Module
            </p>
            <h2 className="mt-3 text-3xl font-semibold">Verification pipeline</h2>
            <p className="mt-3 text-sm text-[#D7F0FC]">
              Review clinics, doctors, and pharmacies before they can operate across scheduling,
              consultations, and dispensing workflows.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <div className="rounded-2xl bg-white/12 p-4 backdrop-blur">
              <p className="text-xs uppercase tracking-wide text-[#D7F0FC]">Pending</p>
              <p className="mt-2 text-2xl font-semibold">{summary.pending}</p>
            </div>
            <div className="rounded-2xl bg-white/12 p-4 backdrop-blur">
              <p className="text-xs uppercase tracking-wide text-[#D7F0FC]">Approved</p>
              <p className="mt-2 text-2xl font-semibold">{summary.approved}</p>
            </div>
            <div className="rounded-2xl bg-white/12 p-4 backdrop-blur">
              <p className="text-xs uppercase tracking-wide text-[#D7F0FC]">Rejected</p>
              <p className="mt-2 text-2xl font-semibold">{summary.rejected}</p>
            </div>
            <div className="rounded-2xl bg-white/12 p-4 backdrop-blur">
              <p className="text-xs uppercase tracking-wide text-[#D7F0FC]">Suspended</p>
              <p className="mt-2 text-2xl font-semibold">{summary.suspended}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex flex-wrap gap-2">
              {typeTabs.map((tab) => {
                const active = type === tab.key;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => updateSearchParams({ type: tab.key, page: "1" })}
                    className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                      active
                        ? "bg-[#053F56] text-white"
                        : "bg-[#F3F7FA] text-slate-600 hover:bg-[#DCEAF3]"
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                value={search}
                onChange={(event) => updateSearchParams({ search: event.target.value || null })}
                placeholder="Search by entity, owner, or email"
                className="min-w-72 rounded-2xl border border-gray-200 bg-[#F8FBFD] px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-[#21A5EC] focus:ring-2 focus:ring-[#90D2F5]/50"
              />
              <select
                value={status}
                onChange={(event) => updateSearchParams({ status: event.target.value, page: "1" })}
                className="rounded-2xl border border-gray-200 bg-[#F8FBFD] px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-[#21A5EC] focus:ring-2 focus:ring-[#90D2F5]/50"
              >
                {statusOptions.map((option) => (
                  <option key={option.key} value={option.key}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between text-sm text-slate-500">
            <p>{total} verification records</p>
            <p>
              Page {safePage} of {totalPages}
            </p>
          </div>
        </div>

        {loading ? (
          <div className="mt-6">
            <TableSkeleton rows={8} columns={7} />
          </div>
        ) : error ? (
          <div className="mt-6 rounded-2xl border border-red-100 bg-red-50 px-5 py-4 text-sm text-red-700">
            {error}
          </div>
        ) : items.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-[#B7E6FA] bg-[#F8FCFE] px-5 py-10 text-sm text-slate-500">
            No verification records matched the current filters.
          </div>
        ) : (
          <>
            <div className="mt-6 overflow-x-auto rounded-2xl border border-gray-200">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-[#F8FBFD]">
                  <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <th className="px-4 py-3">Entity</th>
                    <th className="px-4 py-3">Owner / Account</th>
                    <th className="px-4 py-3">Submitted</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Documents</th>
                    <th className="px-4 py-3">Assigned Reviewer</th>
                    <th className="px-4 py-3">Last Action</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {items.map((item) => (
                    <tr key={`${item.entityType}-${item.entityId}`} className="align-top">
                      <td className="px-4 py-4">
                        <div className="flex flex-col gap-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-semibold text-[#053F56]">{item.entityName}</p>
                            <EntityTypePill type={item.entityType} />
                          </div>
                          <p className="text-xs text-slate-500">{item.entityId}</p>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm text-slate-600">
                        <p className="font-medium text-slate-800">{item.owner?.name || "Unassigned"}</p>
                        <p>{item.owner?.email || "No email linked"}</p>
                      </td>
                      <td className="px-4 py-4 text-sm text-slate-600">{formatDate(item.submittedAt)}</td>
                      <td className="px-4 py-4">
                        <StatusBadge status={item.status} />
                      </td>
                      <td className="px-4 py-4 text-sm text-slate-600">{item.documentCount ?? 0}</td>
                      <td className="px-4 py-4 text-sm text-slate-600">
                        {item.assignedReviewer?.name || "Not assigned"}
                      </td>
                      <td className="px-4 py-4 text-sm text-slate-600">
                        {item.lastAction ? (
                          <div className="max-w-56">
                            <p className="font-medium text-slate-800">
                              {item.lastAction.reviewedBy?.name || "System"}
                            </p>
                            <p className="truncate">
                              {item.lastAction.note || `Status set to ${item.lastAction.status}`}
                            </p>
                          </div>
                        ) : (
                          "No actions yet"
                        )}
                      </td>
                      <td className="px-4 py-4 text-right">
                        <Link
                          to={`/admin/verifications/${item.entityType}/${item.entityId}`}
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

            <div className="mt-5 flex items-center justify-between">
              <button
                type="button"
                disabled={safePage <= 1}
                onClick={() => updateSearchParams({ page: String(safePage - 1) })}
                className="rounded-full border border-gray-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={safePage >= totalPages}
                onClick={() => updateSearchParams({ page: String(safePage + 1) })}
                className="rounded-full border border-gray-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
