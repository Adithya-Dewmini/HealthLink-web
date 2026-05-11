import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  fetchAdminAuditLogDetails,
  fetchAdminAuditLogs,
  type AdminAuditActorOption,
  type AdminAuditLogDetails,
  type AdminAuditLogItem,
} from "../../services/admin-audit.service";
import PageLoader from "../../components/ui/PageLoader";
import TableSkeleton from "../../components/ui/TableSkeleton";

const actionToneClass = (action: string) => {
  const normalized = action.toUpperCase();
  if (normalized.includes("APPROVED") || normalized.includes("ACTIVATED")) {
    return "border-emerald-200 bg-emerald-50 text-emerald-800";
  }
  if (normalized.includes("REJECTED") || normalized.includes("DEACTIVATED")) {
    return "border-red-200 bg-red-50 text-red-700";
  }
  return "border-sky-200 bg-sky-50 text-sky-800";
};

function Badge({ label, className }: { label: string; className: string }) {
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${className}`}>{label}</span>;
}

function formatDate(value: string | null | undefined) {
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

function formatContext(value: Record<string, unknown> | string | null) {
  if (!value) return "No context";
  if (typeof value === "string") return value;
  return JSON.stringify(value, null, 2);
}

export default function AuditLogsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [items, setItems] = useState<AdminAuditLogItem[]>([]);
  const [actors, setActors] = useState<AdminAuditActorOption[]>([]);
  const [actions, setActions] = useState<string[]>([]);
  const [entityTypes, setEntityTypes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [detail, setDetail] = useState<AdminAuditLogDetails | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 1,
  });

  const actorId = searchParams.get("actor_id") || "all";
  const action = searchParams.get("action") || "all";
  const entityType = searchParams.get("entity_type") || "all";
  const startDate = searchParams.get("start_date") || "";
  const endDate = searchParams.get("end_date") || "";
  const page = Number(searchParams.get("page") || "1");
  const safePage = Number.isInteger(page) && page > 0 ? page : 1;

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      try {
        const response = await fetchAdminAuditLogs({
          actor_id: actorId === "all" ? undefined : Number(actorId),
          action: action === "all" ? undefined : action,
          entity_type: entityType === "all" ? undefined : entityType,
          start_date: startDate || undefined,
          end_date: endDate || undefined,
          page: safePage,
          pageSize: 20,
        });

        if (!active) return;
        setItems(response.items);
        setActors(response.filter_options.actors);
        setActions(response.filter_options.actions);
        setEntityTypes(response.filter_options.entity_types);
        setPagination(response.pagination);
        setError("");
      } catch (caughtError) {
        if (!active) return;
        setError(caughtError instanceof Error ? caughtError.message : "Unable to load audit logs.");
      } finally {
        if (active) setLoading(false);
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, [action, actorId, endDate, entityType, safePage, startDate]);

  const summary = useMemo(
    () => ({
      total: pagination.total,
      approvals: items.filter((item) => item.action.toUpperCase().includes("APPROVED")).length,
      rejections: items.filter((item) => item.action.toUpperCase().includes("REJECTED")).length,
      updates: items.filter((item) => item.action.toUpperCase().includes("UPDATED")).length,
    }),
    [items, pagination.total]
  );

  const updateParams = (nextValues: Record<string, string | null>) => {
    const next = new URLSearchParams(searchParams);
    for (const [key, value] of Object.entries(nextValues)) {
      if (!value || value === "all") next.delete(key);
      else next.set(key, value);
    }
    if (!("page" in nextValues)) next.set("page", "1");
    setSearchParams(next);
  };

  const openDetail = async (id: string | number) => {
    setDetailLoading(true);
    setDetailError("");
    setDetail(null);
    try {
      const data = await fetchAdminAuditLogDetails(String(id));
      setDetail(data);
    } catch (caughtError) {
      setDetailError(caughtError instanceof Error ? caughtError.message : "Unable to load log details.");
    } finally {
      setDetailLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-3xl border border-[#DCEAF3] bg-[linear-gradient(135deg,#053F56_0%,#0B5878_45%,#21A5EC_100%)] p-6 text-white shadow-sm">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#D9F3FD]">
              Accountability Layer
            </p>
            <h2 className="mt-3 text-3xl font-semibold">Audit logs</h2>
            <p className="mt-3 text-sm text-[#E5F7FE]">
              Trace verification decisions, governance updates, and critical system actions across clinics,
              doctors, pharmacies, and users.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <div className="rounded-2xl bg-white/12 p-4 backdrop-blur">
              <p className="text-xs uppercase tracking-wide text-[#D9F3FD]">Logs</p>
              <p className="mt-2 text-2xl font-semibold">{summary.total}</p>
            </div>
            <div className="rounded-2xl bg-white/12 p-4 backdrop-blur">
              <p className="text-xs uppercase tracking-wide text-[#D9F3FD]">Approvals</p>
              <p className="mt-2 text-2xl font-semibold">{summary.approvals}</p>
            </div>
            <div className="rounded-2xl bg-white/12 p-4 backdrop-blur">
              <p className="text-xs uppercase tracking-wide text-[#D9F3FD]">Rejections</p>
              <p className="mt-2 text-2xl font-semibold">{summary.rejections}</p>
            </div>
            <div className="rounded-2xl bg-white/12 p-4 backdrop-blur">
              <p className="text-xs uppercase tracking-wide text-[#D9F3FD]">Updates</p>
              <p className="mt-2 text-2xl font-semibold">{summary.updates}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <select value={actorId} onChange={(event) => updateParams({ actor_id: event.target.value })} className="rounded-2xl border border-gray-200 bg-[#F8FBFD] px-4 py-3 text-sm text-slate-700 outline-none">
              <option value="all">All actors</option>
              {actors.map((actor) => (
                <option key={actor.id} value={String(actor.id)}>
                  {actor.name}
                </option>
              ))}
            </select>
            <select value={action} onChange={(event) => updateParams({ action: event.target.value })} className="rounded-2xl border border-gray-200 bg-[#F8FBFD] px-4 py-3 text-sm text-slate-700 outline-none">
              <option value="all">All actions</option>
              {actions.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
            <select value={entityType} onChange={(event) => updateParams({ entity_type: event.target.value })} className="rounded-2xl border border-gray-200 bg-[#F8FBFD] px-4 py-3 text-sm text-slate-700 outline-none">
              <option value="all">All entities</option>
              {entityTypes.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
            <input type="date" value={startDate} onChange={(event) => updateParams({ start_date: event.target.value || null })} className="rounded-2xl border border-gray-200 bg-[#F8FBFD] px-4 py-3 text-sm text-slate-700 outline-none" />
            <input type="date" value={endDate} onChange={(event) => updateParams({ end_date: event.target.value || null })} className="rounded-2xl border border-gray-200 bg-[#F8FBFD] px-4 py-3 text-sm text-slate-700 outline-none" />
          </div>
        </div>

        {loading ? (
          <div className="mt-6">
            <TableSkeleton rows={10} columns={5} />
          </div>
        ) : error ? (
          <div className="mt-6 rounded-2xl border border-red-100 bg-red-50 px-5 py-4 text-sm text-red-700">
            {error}
          </div>
        ) : items.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-[#DCEAF3] bg-[#F8FBFD] px-5 py-10 text-sm text-slate-500">
            No audit logs matched the current filters.
          </div>
        ) : (
          <>
            <div className="mt-6 overflow-x-auto rounded-2xl border border-gray-200">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-[#F8FBFD]">
                  <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <th className="px-4 py-3">Timestamp</th>
                    <th className="px-4 py-3">Actor</th>
                    <th className="px-4 py-3">Action</th>
                    <th className="px-4 py-3">Entity</th>
                    <th className="px-4 py-3">Context</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {items.map((item) => (
                    <tr
                      key={item.id}
                      onClick={() => void openDetail(item.id)}
                      className="cursor-pointer transition hover:bg-[#F8FBFD]"
                    >
                      <td className="px-4 py-4 text-sm text-slate-700">{formatDate(item.timestamp)}</td>
                      <td className="px-4 py-4 text-sm text-slate-700">
                        {item.actor?.name || "System"}
                        {item.actor?.id ? ` (#${item.actor.id})` : ""}
                      </td>
                      <td className="px-4 py-4">
                        <Badge label={item.action_label || item.action} className={actionToneClass(item.action)} />
                      </td>
                      <td className="px-4 py-4 text-sm text-slate-700">
                        {item.entity_type || "N/A"}
                        {item.entity_id ? ` • ${item.entity_id}` : ""}
                      </td>
                      <td className="px-4 py-4 text-sm text-slate-500">{item.notes_preview || "No context"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex items-center justify-between gap-4 text-sm text-slate-500">
              <p>
                Page {pagination.page} of {pagination.totalPages}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={pagination.page <= 1}
                  onClick={() => updateParams({ page: String(pagination.page - 1) })}
                  className="rounded-full border border-gray-200 px-4 py-2 disabled:opacity-40"
                >
                  Previous
                </button>
                <button
                  type="button"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => updateParams({ page: String(pagination.page + 1) })}
                  className="rounded-full border border-gray-200 px-4 py-2 disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </section>

      {(detailLoading || detail || detailError) ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#F28B45]">Audit detail</p>
                <h3 className="mt-2 text-2xl font-semibold text-[#053F56]">
                  {detail?.action_label || "Audit event"}
                </h3>
              </div>
              <button type="button" onClick={() => { setDetail(null); setDetailError(""); }} className="rounded-full border border-gray-200 px-3 py-1 text-sm text-slate-500">
                Close
              </button>
            </div>

            {detailLoading ? (
              <div className="mt-6">
                <PageLoader className="min-h-[220px] border-0 p-0 shadow-none" />
              </div>
            ) : detailError ? (
              <div className="mt-6 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
                {detailError}
              </div>
            ) : detail ? (
              <div className="mt-6 space-y-5">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-2xl bg-[#F8FBFD] p-4">
                    <p className="text-xs uppercase tracking-wide text-slate-400">Timestamp</p>
                    <p className="mt-2 text-sm font-semibold text-[#053F56]">{formatDate(detail.timestamp)}</p>
                  </div>
                  <div className="rounded-2xl bg-[#F8FBFD] p-4">
                    <p className="text-xs uppercase tracking-wide text-slate-400">Actor</p>
                    <p className="mt-2 text-sm font-semibold text-[#053F56]">
                      {detail.actor?.name || "System"}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {detail.actor?.email || "No email"}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-[#F8FBFD] p-4">
                    <p className="text-xs uppercase tracking-wide text-slate-400">Entity</p>
                    <p className="mt-2 text-sm font-semibold text-[#053F56]">
                      {detail.entity_type || "N/A"} {detail.entity_id ? `• ${detail.entity_id}` : ""}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-[#F8FBFD] p-4">
                    <p className="text-xs uppercase tracking-wide text-slate-400">Related Entity</p>
                    <p className="mt-2 text-sm font-semibold text-[#053F56]">
                      {detail.related_entity?.name || detail.related_entity?.id || "Not resolved"}
                    </p>
                  </div>
                </div>

                <div className="rounded-2xl border border-gray-200 bg-white p-4">
                  <p className="text-sm font-semibold text-[#053F56]">Raw action</p>
                  <p className="mt-2 text-sm text-slate-600">{detail.action}</p>
                </div>

                <div className="rounded-2xl border border-gray-200 bg-white p-4">
                  <p className="text-sm font-semibold text-[#053F56]">Notes / context</p>
                  <pre className="mt-3 overflow-x-auto whitespace-pre-wrap rounded-2xl bg-[#F8FBFD] p-4 text-xs text-slate-600">
                    {formatContext(detail.notes ?? null)}
                  </pre>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
