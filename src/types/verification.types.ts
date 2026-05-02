export type VerificationStatus = "pending" | "approved" | "rejected";
export type VerificationEntityType = "clinic" | "doctor" | "pharmacy";

export type VerificationOwnerSummary = {
  id: number | null;
  name: string;
  email: string | null;
  role: string | null;
};

export type VerificationReviewerSummary = {
  id: number;
  name: string;
  email: string | null;
};

export type VerificationDocument = {
  id: string;
  documentType: string;
  fileUrl: string;
  uploadedAt: string;
};

export type VerificationReview = {
  id: string;
  status: VerificationStatus;
  note: string | null;
  reviewedAt: string;
  reviewedBy: VerificationReviewerSummary | null;
};

export type VerificationListItem = {
  entityId: string;
  entityName: string;
  entityType: VerificationEntityType;
  submittedAt: string | null;
  status: VerificationStatus;
  owner: VerificationOwnerSummary | null;
  assignedReviewer: VerificationReviewerSummary | null;
  lastAction: VerificationReview | null;
};

export type VerificationListResponse = {
  items: VerificationListItem[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

export type VerificationMetadataField = {
  label: string;
  value: string;
};

export type VerificationProfileSummary = {
  entityId: string;
  entityType: VerificationEntityType;
  entityName: string;
  status: VerificationStatus;
  submittedAt: string | null;
  verifiedAt: string | null;
  verificationNotes: string | null;
};

export type VerificationDetail = {
  profile: VerificationProfileSummary;
  linkedAccount: VerificationOwnerSummary | null;
  metadata: VerificationMetadataField[];
  documents: VerificationDocument[];
  reviewHistory: VerificationReview[];
  statusHistory: VerificationReview[];
  currentReviewer: VerificationReviewerSummary | null;
};
