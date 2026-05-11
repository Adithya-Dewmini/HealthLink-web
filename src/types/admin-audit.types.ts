export type AdminAuditActorOption = {
  id: number;
  name: string;
  email?: string;
  role?: string;
};

export type AdminAuditActorSummary = {
  id: number | null;
  name: string | null;
  email?: string | null;
};

export type AdminAuditLogItem = {
  id: string | number;
  timestamp?: string;
  actor?: AdminAuditActorSummary;
  actor_id?: number | null;
  actor_name?: string | null;
  actor_email?: string | null;
  action: string;
  action_label?: string;
  entity_type?: string | null;
  entity_id?: string | number | null;
  notes_preview?: string | null;
  description?: string | null;
  context?: Record<string, unknown> | string | null;
  metadata?: Record<string, unknown> | null;
  ip_address?: string | null;
  user_agent?: string | null;
  created_at: string;
};

export type AdminAuditLogsResponse = {
  data?: AdminAuditLogItem[];
  items?: AdminAuditLogItem[];
  total?: number;
  page?: number;
  pageSize?: number;
  totalPages?: number;
  pagination?: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
  filter_options?: {
    actors: AdminAuditActorOption[];
    actions: string[];
    entity_types: string[];
  };
};

export type AdminAuditLogDetails = AdminAuditLogItem & {
  actor?: AdminAuditActorSummary;
  action_label?: string;
  timestamp?: string;
  notes?: Record<string, unknown> | string | null;
  related_entity?: {
    id: string | number;
    type: string;
    name: string | null;
  } | null;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
};
