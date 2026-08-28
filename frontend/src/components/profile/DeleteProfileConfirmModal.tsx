import React, { useState } from "react";

interface DeleteProfileConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

export const DeleteProfileConfirmModal: React.FC<
  DeleteProfileConfirmModalProps
> = ({ isOpen, onClose, onConfirm }) => {
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleDelete = async () => {
    try {
      setSubmitting(true);
      setErrorMessage(null);
      await onConfirm();
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Failed to delete profile";
      setErrorMessage(msg);
      setSubmitting(false);
    }
  };

  return (
    <div style={styles.backdrop}>
      <div style={styles.modalCard}>
        <div style={styles.header}>
          <h3 style={styles.title}>🗑️ Delete Candidate Profile</h3>
          <button onClick={onClose} style={styles.closeBtn}>
            ✕
          </button>
        </div>

        {errorMessage && (
          <div style={styles.errorBox}>
            <p style={styles.errorText}>⚠️ {errorMessage}</p>
          </div>
        )}

        <p style={styles.message}>
          Are you sure you want to delete your profile? Your skills, phone, and
          experience details will be removed. This action cannot be undone.
        </p>

        <div style={styles.buttonRow}>
          <button
            onClick={onClose}
            disabled={submitting}
            style={styles.cancelBtn}
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={submitting}
            style={styles.deleteBtn}
          >
            {submitting ? "Deleting..." : "Delete Profile"}
          </button>
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  backdrop: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(15, 23, 42, 0.8)",
    backdropFilter: "blur(6px)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
    padding: "1rem",
  },
  modalCard: {
    backgroundColor: "#1e293b",
    borderRadius: "1rem",
    border: "1px solid rgba(239, 68, 68, 0.3)",
    maxWidth: "460px",
    width: "100%",
    padding: "1.75rem",
    boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.5)",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "1rem",
  },
  title: {
    fontSize: "1.25rem",
    fontWeight: "700",
    color: "#f87171",
    margin: 0,
  },
  closeBtn: {
    backgroundColor: "transparent",
    border: "none",
    color: "#94a3b8",
    fontSize: "1.25rem",
    cursor: "pointer",
  },
  errorBox: {
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    border: "1px solid rgba(239, 68, 68, 0.4)",
    color: "#f87171",
    padding: "0.75rem 1rem",
    borderRadius: "0.5rem",
    marginBottom: "1rem",
  },
  errorText: {
    margin: 0,
    fontSize: "0.9rem",
  },
  message: {
    color: "#cbd5e1",
    fontSize: "0.95rem",
    lineHeight: "1.5",
    marginBottom: "1.5rem",
  },
  buttonRow: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "0.75rem",
  },
  cancelBtn: {
    backgroundColor: "transparent",
    color: "#94a3b8",
    border: "1px solid #334155",
    borderRadius: "0.5rem",
    padding: "0.6rem 1.1rem",
    fontWeight: "600",
    fontSize: "0.9rem",
    cursor: "pointer",
  },
  deleteBtn: {
    backgroundColor: "#ef4444",
    color: "#ffffff",
    border: "none",
    borderRadius: "0.5rem",
    padding: "0.6rem 1.1rem",
    fontWeight: "700",
    fontSize: "0.9rem",
    cursor: "pointer",
  },
};
