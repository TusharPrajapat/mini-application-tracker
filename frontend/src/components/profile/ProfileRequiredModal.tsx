import React from "react";

interface ProfileRequiredModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGoToProfile: () => void;
}

export const ProfileRequiredModal: React.FC<ProfileRequiredModalProps> = ({
  isOpen,
  onClose,
  onGoToProfile,
}) => {
  if (!isOpen) return null;

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.iconContainer}>
          <span style={styles.icon}>⚠️</span>
        </div>

        <h3 style={styles.title}>Complete Your Profile First</h3>

        <p style={styles.message}>
          Before applying for any job, you must set up your candidate profile (Full Name, Contact Details & Skills).
        </p>

        <div style={styles.buttonGroup}>
          <button style={styles.cancelButton} onClick={onClose}>
            Cancel
          </button>
          <button style={styles.actionButton} onClick={onGoToProfile}>
            👤 Go to Profile Section
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
    backgroundColor: "rgba(15, 23, 42, 0.75)",
    backdropFilter: "blur(4px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
    padding: "1rem",
  },
  modal: {
    backgroundColor: "#1e293b",
    borderRadius: "1rem",
    border: "1px solid #334155",
    padding: "2rem",
    maxWidth: "460px",
    width: "100%",
    boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.5)",
    textAlign: "center",
  },
  iconContainer: {
    width: "60px",
    height: "60px",
    borderRadius: "50%",
    backgroundColor: "rgba(245, 158, 11, 0.15)",
    border: "1px solid rgba(245, 158, 11, 0.3)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    margin: "0 auto 1.25rem auto",
  },
  icon: {
    fontSize: "1.75rem",
  },
  title: {
    fontSize: "1.35rem",
    fontWeight: "700",
    color: "#f8fafc",
    margin: "0 0 0.75rem 0",
  },
  message: {
    fontSize: "0.95rem",
    color: "#94a3b8",
    lineHeight: "1.5",
    margin: "0 0 1.75rem 0",
  },
  buttonGroup: {
    display: "flex",
    gap: "0.75rem",
    justifyContent: "center",
  },
  cancelButton: {
    backgroundColor: "rgba(51, 65, 85, 0.5)",
    color: "#cbd5e1",
    border: "1px solid #475569",
    borderRadius: "0.5rem",
    padding: "0.65rem 1.25rem",
    fontWeight: "600",
    fontSize: "0.9rem",
    cursor: "pointer",
    transition: "background-color 0.2s",
  },
  actionButton: {
    backgroundColor: "#38bdf8",
    color: "#0f172a",
    border: "none",
    borderRadius: "0.5rem",
    padding: "0.65rem 1.25rem",
    fontWeight: "700",
    fontSize: "0.9rem",
    cursor: "pointer",
    transition: "background-color 0.2s",
    boxShadow: "0 4px 6px -1px rgba(56, 189, 248, 0.3)",
  },
};
