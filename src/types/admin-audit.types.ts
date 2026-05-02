export type AdminAuditActorOption = {
  id: number;
  name: string;
};

export type AdminAuditLogItem = {
  id: string;
  timestamp: string;
  actor: {
    id: number | null;
    name: string | null;
  };
  action: string;
  action_label: string;
  entity_type: string | null;
  entity_id: string | null;
  notes_preview: string | null;
  context: Record<string, unknown> | string | null;
};

export type AdminAuditLogDetails = {
  id: string;
  timestamp: string;
  actor: {
    id: number | null;
    name: string | null;
    email: string | null;
  };
  action: string;
  action_label: string;
  entity_type: string | null;
  entity_id: string | null;
  notes: Record<string, unknown> | string | null;
  related_entity: {
    id: string;
    type: string;
    name: string | null;
  } | null;
};

export type AdminAuditLogsResponse = {
  items: AdminAuditLogItem[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  filter_options: {
    actors: AdminAuditActorOption[];
    actions: string[];
    entity_types: string[];
  };
};
