import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { resolveApiAssetUrl } from "../../services/api";
import {
  addVerificationNote,
  approveVerificationEntity,
  fetchVerificationEntityDetail,
  normalizeVerificationEntityType,
  rejectVerificationEntity,
  suspendVerificationEntity,
  type VerificationDetail,
  type VerificationReview,
  type VerificationStatus,
} from "../../services/admin-verifications.service";
import PageLoader from "../../components/ui/PageLoader";

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
    hour: "2-digit",
    minute: "2-digit",
  });
}

function DocumentCard({
  fileUrl,
  documentType,
  uploadedAt,
}: {
  fileUrl: string | null | undefined;
  documentType: string | null | undefined;
  uploadedAt: string | null | undefined;
}) {
  const resolvedFileUrl = resolveApiAssetUrl(fileUrl || "");

  return (
    <a
      href={resolvedFileUrl}
      target="_blank"
      rel="noreferrer"
      className="group rounded-2xl border border-gray-200 bg-[#FBFDFF] p-4 transition hover:border-[#21A5EC] hover:shadow-sm"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-[#053F56]">{documentType || "Document"}</p>
          <p className="mt-2 text-xs uppercase tracking-wide text-slate-400">
            Uploaded {formatDate(uploadedAt)}
          </p>
        </div>
        <span className="rounded-full bg-[#E6F5FD] px-3 py-1 text-xs font-semibold text-[#0D5E80]">
          Open
        </span>
      </div>
    </a>
  );
}

function ReviewCard({ item }: { item: VerificationReview }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-semibold text-[#053F56]">{item.reviewedBy?.name || "System"}</p>
          <p className="text-xs uppercase tracking-wide text-slate-400">{formatDate(item.reviewedAt)}</p>
        </div>
        <StatusBadge status={item.status} />
      </div>
      <p className="mt-3 text-sm text-slate-600">{item.note || "No note recorded for this action."}</p>
    </div>
  );
}

export default function VerificationDetailsPage() {
  const params = useParams<{ type: string; id: string }>();
  const [detail, setDetail] = useState<VerificationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [actionLoading, setActionLoading] = useState<"" | "approve" | "reject" | "suspend" | "note">("");
  const [noteDraft, setNoteDraft] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [suspendReason, setSuspendReason] = useState("");
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const normalizedType = useMemo(
    () => normalizeVerificationEntityType(params.type),
    [params.type]
  );
  const browseLink =
    normalizedType === "doctor"
      ? "/admin/doctors"
      : normalizedType === "pharmacy"
        ? "/admin/pharmacies"
        : "/admin/clinics";
  const isMissingTarget =
    error === "Verification target not found." || error === "Verification request not found.";

  useEffect(() => {
    let active = true;

    const load = async () => {
      if (!params.type || !params.id) {
        setError("Verification request not found.");
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const response = await fetchVerificationEntityDetail(normalizedType, params.id);
        if (!active) {
          return;
        }

        setDetail(response);
        setNoteDraft(response.profile.verificationNotes || "");
        setError("");
        setActionError("");
      } catch (caughtError) {
        if (!active) {
          return;
        }

        setError(
          caughtError instanceof Error ? caughtError.message : "Unable to load verification details."
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
  }, [normalizedType, params.id, params.type]);

  const refreshDetail = async (
    promise: Promise<VerificationDetail>,
    mode: "" | "approve" | "reject" | "suspend" | "note"
  ) => {
    setActionLoading(mode);
    setActionError("");
    try {
      const response = await promise;
      setDetail(response);
      setNoteDraft("");
      setRejectReason("");
      setSuspendReason("");
      setShowRejectModal(false);
      setShowSuspendModal(false);
    } catch (caughtError) {
      setActionError(
        caughtError instanceof Error ? caughtError.message : "Unable to process verification action."
      );
    } finally {
      setActionLoading("");
    }
  };

  if (loading) {
    return <PageLoader />;
  }

  if (error || !detail) {
    if (isMissingTarget) {
      return (
        <div className="rounded-3xl border border-[#DCEAF3] bg-white p-8 shadow-sm">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#F28B45]">
              Verification unavailable
            </p>
            <h2 className="mt-3 text-3xl font-semibold text-[#053F56]">
              This verification target no longer exists
            </h2>
            <p className="mt-3 text-sm text-slate-500">
              The link points to a clinic, doctor, or pharmacy record that is no longer available
              in the current database. This usually happens with stale bookmarks, deleted seed
              data, or a local database reset.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                to="/admin/verifications"
                className="inline-flex rounded-full bg-[#053F56] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0D5E80]"
              >
                Back to verification queue
              </Link>
              <Link
                to={browseLink}
                className="inline-flex rounded-full border border-gray-200 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-gray-50"
              >
                Browse {normalizedType === "clinic" ? "medical centers" : `${normalizedType}s`}
              </Link>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="rounded-3xl border border-red-100 bg-red-50 px-6 py-4 text-sm text-red-700 shadow-sm">
        {error || "Verification request not found."}
      </div>
    );
  }

  const canApprove = detail.profile.status !== "approved";
  const canReject = detail.profile.status !== "rejected";
  const canSuspend = detail.profile.status !== "suspended";

  return (
    <>
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link to="/admin/verifications" className="text-sm font-semibold text-[#21A5EC] hover:text-[#0D86C5]">
            Back to verification queue
          </Link>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              disabled={!canApprove || actionLoading !== ""}
              onClick={() =>
                void refreshDetail(
                  approveVerificationEntity({
                    type: detail.profile.entityType,
                    id: String(detail.profile.entityId),
                    note: noteDraft.trim() || undefined,
                  }),
                  "approve"
                )
              }
              className="rounded-full bg-[#0F8F58] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0A7748] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {actionLoading === "approve" ? "Approving..." : "Approve"}
            </button>
            <button
              type="button"
              disabled={!canReject || actionLoading !== ""}
              onClick={() => setShowRejectModal(true)}
              className="rounded-full border border-red-200 bg-red-50 px-5 py-2.5 text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Reject
            </button>
            <button
              type="button"
              disabled={!canSuspend || actionLoading !== ""}
              onClick={() => setShowSuspendModal(true)}
              className="rounded-full border border-amber-200 bg-amber-50 px-5 py-2.5 text-sm font-semibold text-amber-700 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Suspend
            </button>
          </div>
        </div>

        <section className="rounded-3xl border border-[#DCEAF3] bg-[linear-gradient(135deg,#FBFDFF_0%,#F3FAFE_100%)] p-6 shadow-sm">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <div className="flex flex-wrap items-center gap-3">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#21A5EC]">
                  {detail.profile.entityType === "clinic" ? "medical center" : detail.profile.entityType} verification
                </p>
                <StatusBadge status={detail.profile.status} />
              </div>
              <h2 className="mt-3 text-3xl font-semibold text-[#053F56]">{detail.profile.entityName}</h2>
              <p className="mt-3 text-sm text-slate-500">
                Submitted {formatDate(detail.profile.submittedAt)}
                {detail.profile.verifiedAt ? ` • Verified ${formatDate(detail.profile.verifiedAt)}` : ""}
              </p>
            </div>

            <div className="rounded-2xl border border-[#DCEAF3] bg-white/90 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-400">Assigned reviewer</p>
              <p className="mt-2 text-sm font-semibold text-[#053F56]">
                {detail.currentReviewer?.name || "Not assigned"}
              </p>
              <p className="mt-1 text-xs text-slate-500">{detail.currentReviewer?.email || "No reviewer email"}</p>
            </div>
          </div>
        </section>

        {actionError ? (
          <div className="rounded-2xl border border-red-100 bg-red-50 px-5 py-4 text-sm text-red-700">
            {actionError}
          </div>
        ) : null}

        <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-6">
            <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-[#053F56]">Profile summary</h3>
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl bg-[#F7FAFC] p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-400">Entity ID</p>
                  <p className="mt-2 text-sm font-medium text-slate-700">{detail.profile.entityId}</p>
                </div>
                <div className="rounded-2xl bg-[#F7FAFC] p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-400">Current status</p>
                  <div className="mt-2">
                    <StatusBadge status={detail.profile.status} />
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-[#053F56]">Submitted documents</h3>
              {detail.documents.length === 0 ? (
                <p className="mt-4 text-sm text-slate-500">No verification documents were submitted.</p>
              ) : (
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  {detail.documents.map((document) => (
                    <DocumentCard
                      key={document.id}
                      fileUrl={document.fileUrl}
                      documentType={document.documentType}
                      uploadedAt={document.uploadedAt}
                    />
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-[#053F56]">Entity metadata</h3>
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                {detail.metadata.map((field) => (
                  <div key={field.label} className="rounded-2xl bg-[#F7FAFC] p-4">
                    <p className="text-xs uppercase tracking-wide text-slate-400">{field.label}</p>
                    <p className="mt-2 text-sm font-medium text-slate-700">{field.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-[#053F56]">Linked user / account</h3>
              <div className="mt-5 rounded-2xl bg-[#F7FAFC] p-4">
                <p className="text-sm font-semibold text-[#053F56]">
                  {detail.linkedAccount?.name || "No linked account"}
                </p>
                <p className="mt-1 text-sm text-slate-500">{detail.linkedAccount?.email || "No email available"}</p>
                <p className="mt-2 text-xs uppercase tracking-wide text-slate-400">
                  {detail.linkedAccount?.role || "Unassigned"}
                </p>
              </div>
            </div>

            <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-lg font-semibold text-[#053F56]">Review notes</h3>
                <button
                  type="button"
                  disabled={actionLoading !== ""}
                  onClick={() => {
                    if (!noteDraft.trim()) {
                      setActionError("Enter a note before saving.");
                      return;
                    }

                    void refreshDetail(
                      addVerificationNote({
                        type: detail.profile.entityType,
                        id: String(detail.profile.entityId),
                        note: noteDraft.trim(),
                      }),
                      "note"
                    );
                  }}
                  className="rounded-full bg-[#053F56] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0D5E80] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {actionLoading === "note" ? "Saving..." : "Add note"}
                </button>
              </div>
              <textarea
                value={noteDraft}
                onChange={(event) => setNoteDraft(event.target.value)}
                placeholder="Add an internal note, compliance finding, or follow-up request..."
                className="mt-4 min-h-40 w-full rounded-2xl border border-gray-200 bg-[#F8FBFD] px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-[#21A5EC] focus:ring-2 focus:ring-[#90D2F5]/50"
              />
              {detail.profile.verificationNotes ? (
                <p className="mt-3 text-xs text-slate-500">
                  Stored rejection note: {detail.profile.verificationNotes}
                </p>
              ) : null}
            </div>

            <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-[#053F56]">Status history</h3>
              <div className="mt-5 max-h-[320px] space-y-3 overflow-y-auto pr-1">
                {detail.statusHistory.length === 0 ? (
                  <p className="text-sm text-slate-500">No status changes have been recorded yet.</p>
                ) : (
                  detail.statusHistory.map((item) => <ReviewCard key={item.id} item={item} />)
                )}
              </div>
            </div>

            <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-[#053F56]">Full review history</h3>
              <div className="mt-5 max-h-[360px] space-y-3 overflow-y-auto pr-1">
                {detail.reviewHistory.length === 0 ? (
                  <p className="text-sm text-slate-500">No review notes or actions recorded yet.</p>
                ) : (
                  detail.reviewHistory.map((item) => <ReviewCard key={`${item.id}-full`} item={item} />)
                )}
              </div>
            </div>
          </div>
        </section>
      </div>

      {showRejectModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4">
          <div className="w-full max-w-xl rounded-3xl bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-red-500">
                  Rejection required
                </p>
                <h3 className="mt-2 text-xl font-semibold text-[#053F56]">
                  Provide a rejection reason
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowRejectModal(false)}
                className="rounded-full bg-[#F2F4F7] px-3 py-1 text-sm font-semibold text-slate-600"
              >
                Close
              </button>
            </div>

            <textarea
              value={rejectReason}
              onChange={(event) => setRejectReason(event.target.value)}
              placeholder="Explain why this verification is being rejected."
              className="mt-5 min-h-40 w-full rounded-2xl border border-gray-200 bg-[#F8FBFD] px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-[#21A5EC] focus:ring-2 focus:ring-[#90D2F5]/50"
            />

            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowRejectModal(false)}
                className="rounded-full border border-gray-200 px-4 py-2 text-sm font-semibold text-slate-600"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actionLoading !== ""}
                onClick={() => {
                  if (!rejectReason.trim()) {
                    setActionError("A rejection reason is required.");
                    return;
                  }

                  void refreshDetail(
                    rejectVerificationEntity({
                      type: detail.profile.entityType,
                      id: String(detail.profile.entityId),
                      note: rejectReason.trim(),
                    }),
                    "reject"
                  );
                }}
                className="rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {actionLoading === "reject" ? "Rejecting..." : "Reject request"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showSuspendModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4">
          <div className="w-full max-w-xl rounded-3xl bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-600">
                  Suspension required
                </p>
                <h3 className="mt-2 text-xl font-semibold text-[#053F56]">
                  Provide a suspension reason
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowSuspendModal(false)}
                className="rounded-full bg-[#F2F4F7] px-3 py-1 text-sm font-semibold text-slate-600"
              >
                Close
              </button>
            </div>

            <textarea
              value={suspendReason}
              onChange={(event) => setSuspendReason(event.target.value)}
              placeholder="Explain why this verification target is being suspended."
              className="mt-5 min-h-40 w-full rounded-2xl border border-gray-200 bg-[#F8FBFD] px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-[#21A5EC] focus:ring-2 focus:ring-[#90D2F5]/50"
            />

            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowSuspendModal(false)}
                className="rounded-full border border-gray-200 px-4 py-2 text-sm font-semibold text-slate-600"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actionLoading !== ""}
                onClick={() => {
                  if (!suspendReason.trim()) {
                    setActionError("A suspension reason is required.");
                    return;
                  }

                  void refreshDetail(
                    suspendVerificationEntity({
                      type: detail.profile.entityType,
                      id: String(detail.profile.entityId),
                      note: suspendReason.trim(),
                    }),
                    "suspend"
                  );
                }}
                className="rounded-full bg-amber-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {actionLoading === "suspend" ? "Suspending..." : "Suspend access"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
