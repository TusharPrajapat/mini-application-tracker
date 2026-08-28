import React, { useState, useEffect } from "react";
import { Application, ApplicationStage } from "../../types/application";

interface RecruiterApplicationDetailsModalProps {
  application: Application | null;
  onClose: () => void;
  onUpdateStage: (
    applicationId: number,
    newStage: ApplicationStage,
    version: number
  ) => Promise<void>;
  onRefresh?: () => Promise<void>;
}

export const RecruiterApplicationDetailsModal: React.FC<
  RecruiterApplicationDetailsModalProps
> = ({ application, onClose, onUpdateStage, onRefresh }) => {
  const [selectedStage, setSelectedStage] = useState<ApplicationStage>(
    ApplicationStage.APPLIED
  );
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (application) {
      setSelectedStage(application.stage);
      setError(null);
    }
  }, [application]);

  if (!application) return null;

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      setSubmitting(true);
      await onUpdateStage(application.id, selectedStage, application.version);
      onClose();
    } catch (err) {
      const errorMsg =
        err instanceof Error ? err.message : "Failed to update application stage";

      if (
        errorMsg.includes("Conflict") ||
        errorMsg.includes("409") ||
        errorMsg.includes("version") ||
        errorMsg.includes("updated by another")
      ) {
        setError(
          "This application was updated by someone else. Please refresh before changing its stage."
        );
        if (onRefresh) {
          onRefresh();
        }
      } else {
        setError(errorMsg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const renderStageBadge = (stage: ApplicationStage) => {
    switch (stage) {
      case ApplicationStage.APPLIED:
        return <span style={{ ...styles.badge, ...styles.badgeApplied }}>Applied</span>;
      case ApplicationStage.SCREENING:
        return <span style={{ ...styles.badge, ...styles.badgeScreening }}>Screening</span>;
      case ApplicationStage.INTERVIEW:
        return <span style={{ ...styles.badge, ...styles.badgeInterview }}>Interview</span>;
      case ApplicationStage.OFFER:
        return <span style={{ ...styles.badge, ...styles.badgeOffer }}>Offer</span>;
      case ApplicationStage.REJECTED:
        return <span style={{ ...styles.badge, ...styles.badgeRejected }}>Rejected</span>;
      default:
        return <span style={{ ...styles.badge, ...styles.badgeApplied }}>Applied</span>;
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleString();
    } catch {
      return dateString;
    }
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.modalCard}>
        <div style={styles.modalHeader}>
          <div>
            <h2 style={styles.modalTitle}>
              {application.job ? application.job.title : `Job #${application.job_id}`}
            </h2>
            <p style={styles.candidateSubText}>
              Candidate: {application.candidate ? application.candidate.email : `#${application.candidate_id}`}
            </p>
          </div>
          <button onClick={onClose} style={styles.closeBtn} disabled={submitting}>
            ✕
          </button>
        </div>

        <div style={styles.detailsBox}>
          <div style={styles.row}>
            <span style={styles.label}>Application ID:</span>
            <span style={styles.val}>#{application.id}</span>
          </div>

          <div style={styles.row}>
            <span style={styles.label}>Current Stage:</span>
            <span>{renderStageBadge(application.stage)}</span>
          </div>

          <div style={styles.row}>
            <span style={styles.label}>Version (Concurrency):</span>
            <span style={styles.val}>v{application.version}</span>
          </div>

          <div style={styles.row}>
            <span style={styles.label}>Applied Date:</span>
            <span style={styles.val}>{formatDate(application.created_at)}</span>
          </div>

          <div style={styles.row}>
            <span style={styles.label}>Last Updated:</span>
            <span style={styles.val}>{formatDate(application.updated_at)}</span>
          </div>

          {application.resume_path && (
            <div style={styles.row}>
              <span style={styles.label}>Resume Path:</span>
              <span style={styles.valCode}>{application.resume_path}</span>
            </div>
          )}
        </div>

        <form onSubmit={handleUpdate} style={styles.form}>
          {error && (
            <div style={styles.errorBox}>
              <p style={styles.errorText}>{error}</p>
            </div>
          )}

          <div style={styles.field}>
            <label htmlFor="change-stage" style={styles.labelHeader}>
              Change Application Stage
            </label>
            <select
              id="change-stage"
              value={selectedStage}
              onChange={(e) =>
                setSelectedStage(Number(e.target.value) as ApplicationStage)
              }
              style={styles.select}
              disabled={submitting}
            >
              <option value={ApplicationStage.APPLIED}>Applied (1)</option>
              <option value={ApplicationStage.SCREENING}>Screening (2)</option>
              <option value={ApplicationStage.INTERVIEW}>Interview (3)</option>
              <option value={ApplicationStage.OFFER}>Offer (4)</option>
              <option value={ApplicationStage.REJECTED}>Rejected (5)</option>
            </select>
          </div>

          <div style={styles.actions}>
            <button
              type="button"
              onClick={onClose}
              style={styles.cancelBtn}
              disabled={submitting}
            >
              Close
            </button>
            <button
              type="submit"
              disabled={submitting || selectedStage === application.stage}
              style={{
                ...styles.submitBtn,
                ...(submitting || selectedStage === application.stage
                  ? styles.submitBtnDisabled
                  : {}),
              }}
            >
              {submitting ? "Updating stage..." : "Save Stage"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(15, 23, 42, 0.8)",
    backdropFilter: "blur(4px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
    padding: "1rem",
  },
  modalCard: {
    backgroundColor: "#1e293b",
    borderRadius: "1rem",
    border: "1px solid rgba(255, 255, 255, 0.1)",
    padding: "2rem",
    maxWidth: "520px",
    width: "100%",
    boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
  },
  modalHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "1.25rem",
    borderBottom: "1px solid #334155",
    paddingBottom: "1rem",
  },
  modalTitle: {
    fontSize: "1.35rem",
    fontWeight: "700",
    color: "#f8fafc",
    margin: "0 0 0.25rem 0",
  },
  candidateSubText: {
    color: "#38bdf8",
    fontSize: "0.9rem",
    margin: 0,
    fontWeight: "500",
  },
  closeBtn: {
    backgroundColor: "transparent",
    border: "none",
    color: "#94a3b8",
    fontSize: "1.25rem",
    cursor: "pointer",
  },
  detailsBox: {
    backgroundColor: "#0f172a",
    borderRadius: "0.75rem",
    padding: "1rem",
    border: "1px solid #334155",
    display: "flex",
    flexDirection: "column",
    gap: "0.75rem",
    marginBottom: "1.25rem",
  },
  row: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  label: {
    color: "#94a3b8",
    fontSize: "0.875rem",
  },
  val: {
    color: "#e2e8f0",
    fontWeight: "600",
    fontSize: "0.9rem",
  },
  valCode: {
    color: "#7dd3fc",
    fontFamily: "monospace",
    fontSize: "0.85rem",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "1.25rem",
  },
  errorBox: {
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    border: "1px solid rgba(239, 68, 68, 0.4)",
    borderRadius: "0.5rem",
    padding: "0.75rem 1rem",
  },
  errorText: {
    color: "#f87171",
    margin: 0,
    fontSize: "0.875rem",
  },
  field: {
    display: "flex",
    flexDirection: "column",
    gap: "0.5rem",
  },
  labelHeader: {
    fontSize: "0.9rem",
    fontWeight: "600",
    color: "#f8fafc",
  },
  select: {
    backgroundColor: "#0f172a",
    border: "1px solid #334155",
    borderRadius: "0.5rem",
    padding: "0.75rem 1rem",
    color: "#f8fafc",
    fontSize: "0.95rem",
    outline: "none",
  },
  actions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "0.75rem",
  },
  cancelBtn: {
    backgroundColor: "#334155",
    color: "#cbd5e1",
    fontWeight: "600",
    padding: "0.65rem 1.25rem",
    borderRadius: "0.5rem",
    border: "none",
    cursor: "pointer",
  },
  submitBtn: {
    backgroundColor: "#38bdf8",
    color: "#0f172a",
    fontWeight: "600",
    padding: "0.65rem 1.25rem",
    borderRadius: "0.5rem",
    border: "none",
    cursor: "pointer",
  },
  submitBtnDisabled: {
    opacity: 0.5,
    cursor: "not-allowed",
  },
  badge: {
    padding: "0.25rem 0.65rem",
    borderRadius: "9999px",
    fontSize: "0.75rem",
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    display: "inline-block",
  },
  badgeApplied: {
    backgroundColor: "rgba(56, 189, 248, 0.15)",
    color: "#38bdf8",
    border: "1px solid rgba(56, 189, 248, 0.3)",
  },
  badgeScreening: {
    backgroundColor: "rgba(168, 85, 247, 0.15)",
    color: "#c084fc",
    border: "1px solid rgba(168, 85, 247, 0.3)",
  },
  badgeInterview: {
    backgroundColor: "rgba(250, 204, 21, 0.15)",
    color: "#facc15",
    border: "1px solid rgba(250, 204, 21, 0.3)",
  },
  badgeOffer: {
    backgroundColor: "rgba(34, 197, 94, 0.15)",
    color: "#4ade80",
    border: "1px solid rgba(34, 197, 94, 0.3)",
  },
  badgeRejected: {
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    color: "#f87171",
    border: "1px solid rgba(239, 68, 68, 0.3)",
  },
};
