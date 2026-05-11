import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  createAdminUser,
  fetchAdminUsers,
  type AdminCreatedUserResponse,
  type AdminManagedUserRole,
  type AdminUserListItem,
  type VerificationLinkedState,
} from "../../services/admin-users.service";
import TableSkeleton from "../../components/ui/TableSkeleton";

const roleOptions: Array<{ key: "all" | AdminManagedUserRole; label: string }> = [
  { key: "all", label: "All roles" },
  { key: "admin", label: "Admin" },
  { key: "medical_center_admin", label: "Center Admin" },
  { key: "doctor", label: "Doctor" },
  { key: "receptionist", label: "Receptionist" },
  { key: "pharmacist", label: "Pharmacist" },
  { key: "patient", label: "Patient" },
];

const statusOptions = [
  { key: "all", label: "All statuses" },
  { key: "true", label: "Active" },
  { key: "false", label: "Inactive" },
] as const;

const affiliationOptions = [
  { key: "all", label: "All affiliations" },
  { key: "center", label: "Center" },
  { key: "pharmacy", label: "Pharmacy" },
] as const;

const verificationOptions: Array<{ key: "all" | VerificationLinkedState; label: string }> = [
  { key: "all", label: "All verification" },
  { key: "approved", label: "Approved" },
  { key: "pending", label: "Pending" },
  { key: "rejected", label: "Rejected" },
  { key: "not_applicable", label: "N/A" },
];

const roleBadgeClass: Record<AdminManagedUserRole, string> = {
  admin: "border-rose-200 bg-rose-50 text-rose-800",
  medical_center_admin: "border-sky-200 bg-sky-50 text-sky-800",
  doctor: "border-cyan-200 bg-cyan-50 text-cyan-800",
  receptionist: "border-amber-200 bg-amber-50 text-amber-800",
  pharmacist: "border-emerald-200 bg-emerald-50 text-emerald-800",
  patient: "border-slate-200 bg-slate-100 text-slate-700",
};

function Badge({ label, className }: { label: string; className: string }) {
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${className}`}>{label}</span>;
}

function formatDate(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function UsersListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [data, setData] = useState<AdminUserListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCreateAdminModal, setShowCreateAdminModal] = useState(false);
  const [createAdminName, setCreateAdminName] = useState("");
  const [createAdminEmail, setCreateAdminEmail] = useState("");
  const [createAdminError, setCreateAdminError] = useState("");
  const [createAdminLoading, setCreateAdminLoading] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const search = searchParams.get("search") || "";
  const role = (searchParams.get("role") || "all") as "all" | AdminManagedUserRole;
  const isActive = (searchParams.get("is_active") || "all") as "all" | "true" | "false";
  const affiliation = (searchParams.get("affiliation") || "all") as "all" | "center" | "pharmacy";
  const verification = (searchParams.get("verification_state") || "all") as "all" | VerificationLinkedState;

  useEffect(() => {
    const timeout = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const loadUsers = async (activeRef?: { current: boolean }) => {
    setLoading(true);
    try {
      const response = await fetchAdminUsers({
        role: role === "all" ? undefined : role,
        is_active: isActive === "all" ? undefined : isActive,
        affiliation: affiliation === "all" ? undefined : affiliation,
        verification_state: verification === "all" ? undefined : verification,
        search: search.trim() || undefined,
        page: 1,
        pageSize: 50,
      });

      if (activeRef && !activeRef.current) return;
      setData(response.items);
      setError("");
    } catch (caughtError) {
      if (activeRef && !activeRef.current) return;
      setError(caughtError instanceof Error ? caughtError.message : "Unable to load users.");
    } finally {
      if (!activeRef || activeRef.current) setLoading(false);
    }
  };

  useEffect(() => {
    const activeRef = { current: true };
    void loadUsers(activeRef);
    return () => {
      activeRef.current = false;
    };
  }, [affiliation, isActive, role, search, verification]);

  const summary = useMemo(
    () => ({
      total: data.length,
      active: data.filter((item) => item.is_active).length,
      doctors: data.filter((item) => item.role === "doctor").length,
      pharmacyLinked: data.filter((item) => item.affiliation.pharmacy_name).length,
    }),
    [data]
  );

  const updateParams = (nextValues: Record<string, string | null>) => {
    const next = new URLSearchParams(searchParams);
    for (const [key, value] of Object.entries(nextValues)) {
      if (!value || value === "all") next.delete(key);
      else next.set(key, value);
    }
    setSearchParams(next);
  };

  const closeCreateAdminModal = () => {
    if (createAdminLoading) return;
    setShowCreateAdminModal(false);
    setCreateAdminName("");
    setCreateAdminEmail("");
    setCreateAdminError("");
  };

  const handleAdminCreated = async (created: AdminCreatedUserResponse) => {
    if (created.setup_link && navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(created.setup_link);
        setToast({
          type: "success",
          message: "Admin created. Password setup link copied to clipboard.",
        });
        return;
      } catch {
        // Fall through to generic success toast.
      }
    }

    setToast({
      type: "success",
      message: "Admin account created successfully.",
    });
  };

  const submitCreateAdmin = async () => {
    setCreateAdminError("");

    const name = createAdminName.trim();
    const email = createAdminEmail.trim().toLowerCase();

    if (!name || !email) {
      setCreateAdminError("Name and email are required.");
      return;
    }

    setCreateAdminLoading(true);
    try {
      const created = await createAdminUser({ name, email });
      setShowCreateAdminModal(false);
      setCreateAdminName("");
      setCreateAdminEmail("");
      setCreateAdminError("");
      await loadUsers();
      await handleAdminCreated(created);
    } catch (caughtError) {
      setCreateAdminError(
        caughtError instanceof Error ? caughtError.message : "Unable to create admin account."
      );
      setToast({
        type: "error",
        message: caughtError instanceof Error ? caughtError.message : "Unable to create admin account.",
      });
    } finally {
      setCreateAdminLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {toast ? (
        <div className="fixed right-6 top-6 z-50">
          <div
            className={`rounded-2xl px-4 py-3 text-sm font-semibold shadow-lg ${
              toast.type === "success"
                ? "border border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border border-red-200 bg-red-50 text-red-700"
            }`}
          >
            {toast.message}
          </div>
        </div>
      ) : null}

      <section className="rounded-3xl border border-[#DCEAF3] bg-[linear-gradient(135deg,#053F56_0%,#0C6488_45%,#F28B45_100%)] p-6 text-white shadow-sm">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#FBE1D2]">
              Identity Governance
            </p>
            <h2 className="mt-3 text-3xl font-semibold">User management</h2>
            <p className="mt-3 text-sm text-[#FDECDD]">
              Monitor platform identities, inspect ownership and role context, and control account
              activation across every operational role.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <div className="rounded-2xl bg-white/12 p-4 backdrop-blur">
              <p className="text-xs uppercase tracking-wide text-[#FDECDD]">Users</p>
              <p className="mt-2 text-2xl font-semibold">{summary.total}</p>
            </div>
            <div className="rounded-2xl bg-white/12 p-4 backdrop-blur">
              <p className="text-xs uppercase tracking-wide text-[#FDECDD]">Active</p>
              <p className="mt-2 text-2xl font-semibold">{summary.active}</p>
            </div>
            <div className="rounded-2xl bg-white/12 p-4 backdrop-blur">
              <p className="text-xs uppercase tracking-wide text-[#FDECDD]">Doctors</p>
              <p className="mt-2 text-2xl font-semibold">{summary.doctors}</p>
            </div>
            <div className="rounded-2xl bg-white/12 p-4 backdrop-blur">
              <p className="text-xs uppercase tracking-wide text-[#FDECDD]">Pharmacy Linked</p>
              <p className="mt-2 text-2xl font-semibold">{summary.pharmacyLinked}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <input
            value={search}
            onChange={(event) => updateParams({ search: event.target.value || null })}
            placeholder="Search by name, email, role, or affiliation"
            className="w-full max-w-md rounded-2xl border border-gray-200 bg-[#F8FBFD] px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-[#F28B45] focus:ring-2 focus:ring-[#FBD2B8]/50"
          />

          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <button
              type="button"
              onClick={() => setShowCreateAdminModal(true)}
              className="rounded-2xl border border-[#CFE7F3] bg-[linear-gradient(135deg,#FFFFFF_0%,#F3FAFE_55%,#E9F6FB_100%)] px-5 py-3 text-sm font-semibold text-[#053F56] shadow-[0_10px_24px_-18px_rgba(5,63,86,0.45)] ring-1 ring-[#E6F2F8] transition hover:border-[#9CCEE3] hover:shadow-[0_14px_28px_-18px_rgba(12,100,136,0.5)]"
            >
              Add Admin
            </button>
            <select value={role} onChange={(event) => updateParams({ role: event.target.value })} className="rounded-2xl border border-gray-200 bg-[#F8FBFD] px-4 py-3 text-sm text-slate-700 outline-none">
              {roleOptions.map((option) => <option key={option.key} value={option.key}>{option.label}</option>)}
            </select>
            <select value={isActive} onChange={(event) => updateParams({ is_active: event.target.value })} className="rounded-2xl border border-gray-200 bg-[#F8FBFD] px-4 py-3 text-sm text-slate-700 outline-none">
              {statusOptions.map((option) => <option key={option.key} value={option.key}>{option.label}</option>)}
            </select>
            <select value={affiliation} onChange={(event) => updateParams({ affiliation: event.target.value })} className="rounded-2xl border border-gray-200 bg-[#F8FBFD] px-4 py-3 text-sm text-slate-700 outline-none">
              {affiliationOptions.map((option) => <option key={option.key} value={option.key}>{option.label}</option>)}
            </select>
            <select value={verification} onChange={(event) => updateParams({ verification_state: event.target.value })} className="rounded-2xl border border-gray-200 bg-[#F8FBFD] px-4 py-3 text-sm text-slate-700 outline-none">
              {verificationOptions.map((option) => <option key={option.key} value={option.key}>{option.label}</option>)}
            </select>
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
        ) : data.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-[#FBD2B8] bg-[#FFF8F3] px-5 py-10 text-sm text-slate-500">
            No users matched the current filters.
          </div>
        ) : (
          <div className="mt-6 overflow-x-auto rounded-2xl border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-[#F8FBFD]">
                <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Verification Link</th>
                  <th className="px-4 py-3">Affiliation</th>
                  <th className="px-4 py-3">Created</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {data.map((item) => (
                  <tr key={item.id}>
                    <td className="px-4 py-4">
                      <p className="font-semibold text-[#053F56]">{item.name}</p>
                      <p className="mt-1 text-sm text-slate-500">{item.email}</p>
                    </td>
                    <td className="px-4 py-4">
                      <Badge label={item.role.replace(/_/g, " ")} className={roleBadgeClass[item.role]} />
                    </td>
                    <td className="px-4 py-4">
                      <Badge
                        label={item.is_active ? "Active" : "Inactive"}
                        className={item.is_active ? "border-green-200 bg-green-50 text-green-800" : "border-red-200 bg-red-50 text-red-700"}
                      />
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-700">{item.verification_linked_state.replace(/_/g, " ")}</td>
                    <td className="px-4 py-4 text-sm text-slate-700">{item.affiliation.display}</td>
                    <td className="px-4 py-4 text-sm text-slate-700">{formatDate(item.created_at)}</td>
                    <td className="px-4 py-4 text-right">
                      <Link
                        to={`/admin/users/${item.id}`}
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

      {showCreateAdminModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 p-4">
          <div className="w-full max-w-md rounded-[24px] bg-white p-6 shadow-[0_24px_60px_-24px_rgba(15,23,42,0.45)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#21A5EC]">
                  Access Control
                </p>
                <h3 className="mt-2 text-2xl font-semibold text-[#053F56]">Add Admin</h3>
                <p className="mt-2 text-sm text-slate-500">
                  Create a new global admin account. The admin role is assigned automatically.
                </p>
              </div>
              <button
                type="button"
                onClick={closeCreateAdminModal}
                className="rounded-full border border-gray-200 px-3 py-1 text-sm text-slate-500 transition hover:bg-gray-50"
              >
                Close
              </button>
            </div>

            <div className="mt-6 space-y-4">
              <div>
                <label className="text-sm font-semibold text-[#053F56]">Name</label>
                <input
                  value={createAdminName}
                  onChange={(event) => setCreateAdminName(event.target.value)}
                  placeholder="Enter admin name"
                  className="mt-2 w-full rounded-2xl border border-gray-200 bg-[#F8FBFD] px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-[#21A5EC] focus:ring-2 focus:ring-[#90D2F5]/50"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-[#053F56]">Email</label>
                <input
                  value={createAdminEmail}
                  onChange={(event) => setCreateAdminEmail(event.target.value)}
                  placeholder="admin@healthlink.com"
                  type="email"
                  className="mt-2 w-full rounded-2xl border border-gray-200 bg-[#F8FBFD] px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-[#21A5EC] focus:ring-2 focus:ring-[#90D2F5]/50"
                />
              </div>

              {createAdminError ? (
                <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {createAdminError}
                </div>
              ) : null}
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={closeCreateAdminModal}
                disabled={createAdminLoading}
                className="rounded-2xl border border-gray-200 px-4 py-3 text-sm font-semibold text-slate-600 transition hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void submitCreateAdmin()}
                disabled={createAdminLoading}
                className="rounded-2xl bg-[linear-gradient(135deg,#0F5AA3_0%,#21A5EC_100%)] px-5 py-3 text-sm font-semibold text-white shadow-[0_8px_24px_-12px_rgba(33,165,236,0.75)] transition hover:opacity-95 disabled:opacity-60"
              >
                {createAdminLoading ? "Creating..." : "Create Admin"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
