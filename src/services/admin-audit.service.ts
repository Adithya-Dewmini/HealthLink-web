import { api, getApiErrorMessage } from "./api";
import type {
  AdminAuditActorOption,
  AdminAuditLogDetails,
  AdminAuditLogItem,
  AdminAuditLogsResponse,
} from "../types/admin-audit.types";

export type {
  AdminAuditActorOption,
  AdminAuditLogDetails,
  AdminAuditLogItem,
  AdminAuditLogsResponse,
} from "../types/admin-audit.types";

function normalizeAuditLogItem(item: AdminAuditLogItem): AdminAuditLogItem {
  return {
    ...item,
    timestamp: item.timestamp ?? item.created_at,
    actor:
      item.actor ??
      ({
        id: item.actor_id ?? null,
        name: item.actor_name ?? null,
        email: item.actor_email ?? null,
      }),
    action_label:
      item.action_label ??
      item.action
        .toLowerCase()
        .replace(/_/g, " ")
        .replace(/\b\w/g, (char) => char.toUpperCase()),
    notes_preview:
      item.notes_preview ??
      item.description ??
      (typeof item.metadata === "string" ? item.metadata : null),
    context: item.context ?? item.metadata ?? null,
  };
}

export async function fetchAdminAuditLogs(filters?: {
  actor_id?: number;
  action?: string;
  entity_type?: string;
  start_date?: string;
  end_date?: string;
  page?: number;
  pageSize?: number;
}) {
  try {
    const response = await api.get<AdminAuditLogsResponse>("/api/admin/audit-logs", {
      params: filters,
    });
    const items = (response.data.items ?? response.data.data ?? []).map(normalizeAuditLogItem);
    const actorsMap = new Map<number, AdminAuditActorOption>();

    for (const item of items) {
      if (item.actor?.id) {
        actorsMap.set(item.actor.id, {
          id: item.actor.id,
          name: item.actor.name || "System",
          email: item.actor.email || undefined,
        });
      }
    }

    return {
      items,
      pagination:
        response.data.pagination ?? {
          page: response.data.page ?? filters?.page ?? 1,
          pageSize: response.data.pageSize ?? filters?.pageSize ?? (items.length || 1),
          total: response.data.total ?? items.length,
          totalPages:
            response.data.totalPages ??
            Math.max(
              1,
              Math.ceil(
                (response.data.total ?? items.length) /
                  (response.data.pageSize ?? filters?.pageSize ?? (items.length || 1))
              )
            ),
        },
      filter_options:
        response.data.filter_options ?? {
          actors: Array.from(actorsMap.values()),
          actions: Array.from(new Set(items.map((item) => item.action))),
          entity_types: Array.from(
            new Set(items.map((item) => item.entity_type).filter(Boolean) as string[])
          ),
        },
    } satisfies AdminAuditLogsResponse;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Unable to load audit logs."));
  }
}

export async function fetchAdminAuditLogDetails(id: string) {
  try {
    const response = await api.get<AdminAuditLogDetails>(`/api/admin/audit-logs/${id}`);
    const item = normalizeAuditLogItem(response.data);
    return {
      ...response.data,
      ...item,
      notes: response.data.notes ?? response.data.context ?? response.data.metadata ?? null,
      related_entity:
        response.data.related_entity ??
        (response.data.entity_id
          ? {
              id: response.data.entity_id,
              type: response.data.entity_type || "unknown",
              name: response.data.description || null,
            }
          : null),
    } satisfies AdminAuditLogDetails;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Unable to load audit log details."));
  }
}
