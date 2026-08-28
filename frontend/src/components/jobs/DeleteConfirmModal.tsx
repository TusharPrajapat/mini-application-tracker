import React from "react";
import { Job } from "../../types/job";

interface DeleteConfirmModalProps {
  job: Job | null;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  deleting: boolean;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  job,
  onClose,
  onConfirm,
  deleting,
}) => {
  if (!job) return null;

  return (
    <div style={styles.overlay}>
      <div style={styles.modalCard}>
        <div style={styles.header}>
          <div style={styles.warningIcon}>⚠️</div>
          <h3 style={styles.title}>Confirm Deletion</h3>
        </div>

        <p style={styles.text}>
          Are you sure you want to delete job posting{" "}
          <strong style={styles.highlight}>"{job.title}"</strong>?
        </p>
        <p style={styles.subtext}>This action cannot be undone.</p>

        <div style={styles.actions}>
          <button
            onClick={onClose}
            style={styles.cancelBtn}
            disabled={deleting}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            style={{
              ...styles.deleteBtn,
              ...(deleting ? styles.deleteBtnDisabled : {}),
            }}
            disabled={deleting}
          >
            {deleting ? "Deleting job..." : "Delete Job"}
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
    border: "1px solid rgba(239, 68, 68, 0.3)",
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
  warningIcon: {
    fontSize: "1.5rem",
  },
  title: {
    fontSize: "1.25rem",
    fontWeight: "700",
    color: "#f87171",
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
    margin: "0 0 1.5rem 0",
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
  deleteBtn: {
    backgroundColor: "#ef4444",
    color: "#ffffff",
    fontWeight: "600",
    padding: "0.6rem 1.25rem",
    borderRadius: "0.5rem",
    border: "none",
    cursor: "pointer",
  },
  deleteBtnDisabled: {
    opacity: 0.6,
    cursor: "not-allowed",
  },
};
