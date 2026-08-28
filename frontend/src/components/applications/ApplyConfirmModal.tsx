import React, { useState } from "react";
import { Job } from "../../types/job";

interface ApplyConfirmModalProps {
  job: Job | null;
  onClose: () => void;
  onConfirm: (job: Job) => Promise<void>;
}

export const ApplyConfirmModal: React.FC<ApplyConfirmModalProps> = ({
  job,
  onClose,
  onConfirm,
}) => {
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!job) return null;

  const handleConfirm = async () => {
    setError(null);
    try {
      setSubmitting(true);
      await onConfirm(job);
      onClose();
    } catch (err) {
      const errorMsg =
        err instanceof Error ? err.message : "Failed to submit application";
      if (
        errorMsg.includes("Conflict") ||
        errorMsg.includes("already applied") ||
        errorMsg.includes("uq_applications")
      ) {
        setError("You have already applied for this job.");
      } else {
        setError(errorMsg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.modalCard}>
        <div style={styles.header}>
          <div style={styles.icon}>📄</div>
          <h3 style={styles.title}>Apply for Job</h3>
        </div>

        <p style={styles.text}>
          Are you sure you want to apply for{" "}
          <strong style={styles.highlight}>"{job.title}"</strong>?
        </p>
        <p style={styles.subtext}>
          Your candidate profile will be submitted directly to the recruiter.
        </p>

        {error && (
          <div style={styles.errorBox}>
            <p style={styles.errorText}>{error}</p>
          </div>
        )}

        <div style={styles.actions}>
          <button
            onClick={onClose}
            style={styles.cancelBtn}
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            style={{
              ...styles.submitBtn,
              ...(submitting ? styles.submitBtnDisabled : {}),
            }}
            disabled={submitting}
          >
            {submitting ? "Applying..." : "Apply Now"}
          </button>
        </div>
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
    border: "1px solid rgba(56, 189, 248, 0.3)",
    padding: "2rem",
    maxWidth: "440px",
    width: "100%",
    boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
  },
  header: {
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
    marginBottom: "1rem",
  },
  icon: {
    fontSize: "1.5rem",
  },
  title: {
    fontSize: "1.25rem",
    fontWeight: "700",
    color: "#38bdf8",
    margin: 0,
  },
  text: {
    color: "#e2e8f0",
    fontSize: "0.95rem",
    margin: "0 0 0.5rem 0",
    lineHeight: "1.5",
  },
  highlight: {
    color: "#f8fafc",
  },
  subtext: {
    color: "#94a3b8",
    fontSize: "0.85rem",
    margin: "0 0 1.25rem 0",
  },
  errorBox: {
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    border: "1px solid rgba(239, 68, 68, 0.4)",
    borderRadius: "0.5rem",
    padding: "0.75rem 1rem",
    marginBottom: "1.25rem",
  },
  errorText: {
    color: "#f87171",
    margin: 0,
    fontSize: "0.875rem",
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
    padding: "0.6rem 1.25rem",
    borderRadius: "0.5rem",
    border: "none",
    cursor: "pointer",
  },
  submitBtn: {
    backgroundColor: "#38bdf8",
    color: "#0f172a",
    fontWeight: "600",
    padding: "0.6rem 1.25rem",
    borderRadius: "0.5rem",
    border: "none",
    cursor: "pointer",
  },
  submitBtnDisabled: {
    opacity: 0.6,
    cursor: "not-allowed",
  },
};
