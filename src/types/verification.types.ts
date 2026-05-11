export type VerificationStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "suspended";

export type VerificationEntityType =
  | "clinic"
  | "doctor"
  | "pharmacy";

export type VerificationReviewerSummary = {
  id?: number | string | null;
  name?: string | null;
  email?: string | null;
};

export type VerificationLinkedAccount = {
  id?: number | string | null;
  name?: string | null;
  email?: string | null;
  role?: string | null;
};

export type VerificationOwnerSummary = VerificationLinkedAccount;

export type VerificationProfileSummary = {
  entityType: VerificationEntityType;
  entityId: number | string;
  entityName: string;
  status: VerificationStatus;
  submittedAt?: string | null;
  verifiedAt?: string | null;
  verificationNotes?: string | null;
};

export type VerificationMetadataField = {
  label: string;
  value: string | number | boolean | null;
};

export type VerificationDocument = {
  id: number | string;
  name?: string | null;
  fileUrl?: string | null;
  file_url?: string | null;
  documentType?: string | null;
  uploadedAt?: string | null;
  uploaded_at?: string | null;
};

export type VerificationReview = {
  id: number | string;
  status: VerificationStatus;
  note?: string | null;
  reviewedBy?: VerificationReviewerSummary | null;
  reviewedAt?: string | null;
  reviewer?: VerificationReviewerSummary | null;
  reviewed_at?: string | null;
};

export type VerificationListItem = {
  entityType: VerificationEntityType;
  entityId: number | string;
  entityName: string;
  status: VerificationStatus;
  submittedAt?: string | null;
  documentCount?: number;
  owner?: VerificationOwnerSummary | null;
  assignedReviewer?: VerificationReviewerSummary | null;
  lastAction?: VerificationReview | null;
};

export type VerificationDetail = {
  profile: VerificationProfileSummary;
  documents: VerificationDocument[];
  metadata: VerificationMetadataField[];
  linkedAccount?: VerificationLinkedAccount | null;
  currentReviewer?: VerificationReviewerSummary | null;
  statusHistory: VerificationReview[];
  reviewHistory: VerificationReview[];
};

export type VerificationListResponse = {
  items: VerificationListItem[];
  pagination: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
};
