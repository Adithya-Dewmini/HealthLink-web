import { api, getApiErrorMessage } from "./api";
import type {
  VerificationDetail,
  VerificationEntityType,
  VerificationListResponse,
  VerificationStatus,
} from "../types/verification.types";

export type {
  VerificationDetail,
  VerificationDocument,
  VerificationEntityType,
  VerificationListItem,
  VerificationListResponse,
  VerificationMetadataField,
  VerificationOwnerSummary,
  VerificationProfileSummary,
  VerificationReview,
  VerificationReviewerSummary,
  VerificationStatus,
} from "../types/verification.types";

const verificationEntityTypeAliases: Record<string, VerificationEntityType> = {
  clinic: "clinic",
  medical_center: "clinic",
  "medical-center": "clinic",
  center: "clinic",
  centre: "clinic",
  doctor: "doctor",
  pharmacy: "pharmacy",
};

export function normalizeVerificationEntityType(
  value: string | null | undefined
): VerificationEntityType {
  const normalized = verificationEntityTypeAliases[String(value || "").trim().toLowerCase()];
  return normalized || "clinic";
}

function normalizeReview(review: Record<string, unknown> | null | undefined) {
  if (!review) {
    return null;
  }

  const reviewedBy =
    review.reviewedBy && typeof review.reviewedBy === "object"
      ? (review.reviewedBy as { id?: number | string | null; name?: string | null; email?: string | null })
      : review.reviewer && typeof review.reviewer === "object"
        ? (review.reviewer as { id?: number | string | null; name?: string | null; email?: string | null })
        : null;

  return {
    id: (review.id as number | string | undefined) ?? `review-${Date.now()}`,
    status: (review.status as VerificationStatus | undefined) ?? "pending",
    note: (review.note as string | null | undefined) ?? null,
    reviewedBy: reviewedBy
      ? {
          id: reviewedBy.id ?? null,
          name: reviewedBy.name ?? null,
          email: reviewedBy.email ?? null,
        }
      : null,
    reviewedAt:
      (review.reviewedAt as string | null | undefined) ??
      (review.reviewed_at as string | null | undefined) ??
      null,
  };
}

function normalizeVerificationListItem(item: Record<string, unknown>) {
  return {
    entityType: normalizeVerificationEntityType(
      (item.entityType as string | undefined) ?? (item.entity_type as string | undefined)
    ),
    entityId:
      (item.entityId as string | number | undefined) ??
      (item.entity_id as string | number | undefined) ??
      "",
    entityName:
      (item.entityName as string | undefined) ??
      (item.entity_name as string | undefined) ??
      "Unnamed entity",
    status: (item.status as VerificationStatus | undefined) ?? "pending",
    documentCount:
      typeof item.documentCount === "number"
        ? item.documentCount
        : typeof item.document_count === "number"
          ? item.document_count
          : 0,
    submittedAt:
      (item.submittedAt as string | null | undefined) ??
      (item.submitted_at as string | null | undefined) ??
      null,
    owner:
      (item.owner as { id?: string | number | null; name?: string | null; email?: string | null } | undefined) ??
      (item.linkedAccount as { id?: string | number | null; name?: string | null; email?: string | null } | undefined) ??
      null,
    assignedReviewer:
      (item.assignedReviewer as { id?: string | number | null; name?: string | null; email?: string | null } | undefined) ??
      (item.assigned_reviewer as { id?: string | number | null; name?: string | null; email?: string | null } | undefined) ??
      null,
    lastAction: normalizeReview(
      (item.lastAction as Record<string, unknown> | undefined) ??
        (item.last_action as Record<string, unknown> | undefined)
    ),
  };
}

function normalizeVerificationDetail(detail: Record<string, unknown>): VerificationDetail {
  const profile = (detail.profile as Record<string, unknown> | undefined) ?? {};
  const documents = Array.isArray(detail.documents) ? detail.documents : [];
  const metadata = Array.isArray(detail.metadata) ? detail.metadata : [];
  const statusHistory = Array.isArray(detail.statusHistory)
    ? detail.statusHistory
    : Array.isArray(detail.status_history)
      ? detail.status_history
      : [];
  const reviewHistory = Array.isArray(detail.reviewHistory)
    ? detail.reviewHistory
    : Array.isArray(detail.review_history)
      ? detail.review_history
      : [];

  return {
    profile: {
      entityType: normalizeVerificationEntityType(
        (profile.entityType as string | undefined) ?? (profile.entity_type as string | undefined)
      ),
      entityId:
        (profile.entityId as string | number | undefined) ??
        (profile.entity_id as string | number | undefined) ??
        "",
      entityName:
        (profile.entityName as string | undefined) ??
        (profile.entity_name as string | undefined) ??
        "Unnamed entity",
      status: (profile.status as VerificationStatus | undefined) ?? "pending",
      submittedAt:
        (profile.submittedAt as string | null | undefined) ??
        (profile.submitted_at as string | null | undefined) ??
        null,
      verifiedAt:
        (profile.verifiedAt as string | null | undefined) ??
        (profile.verified_at as string | null | undefined) ??
        null,
      verificationNotes:
        (profile.verificationNotes as string | null | undefined) ??
        (profile.verification_notes as string | null | undefined) ??
        null,
    },
    documents: documents.map((document, index) => {
      const item = document as Record<string, unknown>;
      return {
        id: (item.id as string | number | undefined) ?? `doc-${index}`,
        name: (item.name as string | null | undefined) ?? null,
        fileUrl:
          (item.fileUrl as string | null | undefined) ??
          (item.file_url as string | null | undefined) ??
          null,
        file_url:
          (item.file_url as string | null | undefined) ??
          (item.fileUrl as string | null | undefined) ??
          null,
        documentType:
          (item.documentType as string | null | undefined) ??
          (item.document_type as string | null | undefined) ??
          null,
        uploadedAt:
          (item.uploadedAt as string | null | undefined) ??
          (item.uploaded_at as string | null | undefined) ??
          null,
      };
    }),
    metadata: metadata.map((field) => field as VerificationDetail["metadata"][number]),
    linkedAccount:
      (detail.linkedAccount as VerificationDetail["linkedAccount"]) ??
      (detail.linked_account as VerificationDetail["linkedAccount"]) ??
      null,
    currentReviewer:
      (detail.currentReviewer as VerificationDetail["currentReviewer"]) ??
      (detail.current_reviewer as VerificationDetail["currentReviewer"]) ??
      null,
    statusHistory: statusHistory
      .map((item) => normalizeReview(item as Record<string, unknown>))
      .filter(Boolean) as VerificationDetail["statusHistory"],
    reviewHistory: reviewHistory
      .map((item) => normalizeReview(item as Record<string, unknown>))
      .filter(Boolean) as VerificationDetail["reviewHistory"],
  };
}

export async function fetchVerificationEntities(filters?: {
  type?: VerificationEntityType;
  status?: VerificationStatus;
  search?: string;
  page?: number;
  pageSize?: number;
}) {
  try {
    const response = await api.get<VerificationListResponse>("/api/admin/verifications", {
      params: filters,
    });
    const rawItems = Array.isArray(response.data.items) ? response.data.items : [];

    return {
      items: rawItems.map((item) => normalizeVerificationListItem(item as Record<string, unknown>)),
      pagination: response.data.pagination,
    } satisfies VerificationListResponse;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Unable to load verification requests."));
  }
}

export async function fetchVerificationEntityDetail(type: VerificationEntityType, id: string) {
  try {
    const response = await api.get<VerificationDetail>(
      `/api/admin/verifications/${normalizeVerificationEntityType(type)}/${id}`
    );
    return normalizeVerificationDetail(response.data as unknown as Record<string, unknown>);
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Unable to load verification details."));
  }
}

export async function approveVerificationEntity(input: {
  type: VerificationEntityType;
  id: string | number;
  note?: string;
}) {
  try {
    const response = await api.post<VerificationDetail>(
      `/api/admin/verifications/${normalizeVerificationEntityType(input.type)}/${input.id}/approve`,
      { note: input.note ?? "" }
    );
    return normalizeVerificationDetail(response.data as unknown as Record<string, unknown>);
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Unable to approve this verification request."));
  }
}

export async function rejectVerificationEntity(input: {
  type: VerificationEntityType;
  id: string | number;
  note: string;
}) {
  try {
    const response = await api.post<VerificationDetail>(
      `/api/admin/verifications/${normalizeVerificationEntityType(input.type)}/${input.id}/reject`,
      { note: input.note }
    );
    return normalizeVerificationDetail(response.data as unknown as Record<string, unknown>);
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Unable to reject this verification request."));
  }
}

export async function suspendVerificationEntity(input: {
  type: VerificationEntityType;
  id: string | number;
  note: string;
}) {
  try {
    const response = await api.post<VerificationDetail>(
      `/api/admin/verifications/${normalizeVerificationEntityType(input.type)}/${input.id}/suspend`,
      { note: input.note }
    );
    return normalizeVerificationDetail(response.data as unknown as Record<string, unknown>);
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Unable to suspend this verification target."));
  }
}

export async function addVerificationNote(input: {
  type: VerificationEntityType;
  id: string | number;
  note: string;
}) {
  try {
    const response = await api.post<VerificationDetail>(
      `/api/admin/verifications/${normalizeVerificationEntityType(input.type)}/${input.id}/note`,
      { note: input.note }
    );
    return normalizeVerificationDetail(response.data as unknown as Record<string, unknown>);
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Unable to add a verification note."));
  }
}
