import React from "react";
import { Job, JobStatus } from "../../types/job";

interface JobDetailsModalProps {
  job: Job | null;
  onClose: () => void;
}

export const JobDetailsModal: React.FC<JobDetailsModalProps> = ({
  job,
  onClose,
}) => {
  if (!job) return null;

  const renderStatusBadge = (status: JobStatus) => {
    switch (status) {
      case JobStatus.OPEN:
        return <span style={{ ...styles.badge, ...styles.badgeOpen }}>Open (2)</span>;
      case JobStatus.DRAFT:
        return <span style={{ ...styles.badge, ...styles.badgeDraft }}>Draft (1)</span>;
      case JobStatus.CLOSED:
        return <span style={{ ...styles.badge, ...styles.badgeClosed }}>Closed (0)</span>;
      default:
        return <span style={{ ...styles.badge, ...styles.badgeDraft }}>Unknown</span>;
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
          <h2 style={styles.modalTitle}>{job.title}</h2>
          <button onClick={onClose} style={styles.closeBtn}>
            ✕
          </button>
        </div>

        <div style={styles.content}>
          <div style={styles.row}>
            <span style={styles.label}>Job ID:</span>
            <span style={styles.val}>#{job.id}</span>
          </div>

          <div style={styles.row}>
            <span style={styles.label}>Status:</span>
            <span>{renderStatusBadge(job.status)}</span>
          </div>

          <div style={styles.row}>
            <span style={styles.label}>Created At:</span>
            <span style={styles.val}>{formatDate(job.created_at)}</span>
          </div>

          <div style={styles.row}>
            <span style={styles.label}>Last Updated:</span>
            <span style={styles.val}>{formatDate(job.updated_at)}</span>
          </div>

          <div style={styles.descriptionSection}>
            <h3 style={styles.sectionTitle}>Description</h3>
            <p style={styles.descriptionText}>{job.description}</p>
          </div>
        </div>

        <div style={styles.actions}>
          <button onClick={onClose} style={styles.closeModalBtn}>
            Close
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
    border: "1px solid rgba(255, 255, 255, 0.1)",
    padding: "2rem",
    maxWidth: "550px",
    width: "100%",
    boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
  },
  modalHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "1.5rem",
    borderBottom: "1px solid #334155",
    paddingBottom: "1rem",
  },
  modalTitle: {
    fontSize: "1.5rem",
    fontWeight: "700",
    color: "#f8fafc",
    margin: 0,
  },
  closeBtn: {
    backgroundColor: "transparent",
    border: "none",
    color: "#94a3b8",
    fontSize: "1.25rem",
    cursor: "pointer",
  },
  content: {
    display: "flex",
    flexDirection: "column",
    gap: "0.85rem",
  },
  row: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  label: {
    color: "#94a3b8",
    fontSize: "0.9rem",
  },
  val: {
    color: "#e2e8f0",
    fontWeight: "600",
    fontSize: "0.95rem",
  },
  descriptionSection: {
    marginTop: "1rem",
    borderTop: "1px solid #334155",
    paddingTop: "1rem",
  },
  sectionTitle: {
    fontSize: "1rem",
    fontWeight: "600",
    color: "#cbd5e1",
    margin: "0 0 0.5rem 0",
  },
  descriptionText: {
    color: "#cbd5e1",
    fontSize: "0.95rem",
    lineHeight: "1.6",
    whiteSpace: "pre-wrap",
    margin: 0,
    backgroundColor: "#0f172a",
    padding: "1rem",
    borderRadius: "0.5rem",
    border: "1px solid #334155",
  },
  actions: {
    display: "flex",
    justifyContent: "flex-end",
    marginTop: "1.5rem",
  },
  closeModalBtn: {
    backgroundColor: "#334155",
    color: "#f8fafc",
    fontWeight: "600",
    padding: "0.6rem 1.25rem",
    borderRadius: "0.5rem",
    border: "none",
    cursor: "pointer",
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
  badgeOpen: {
    backgroundColor: "rgba(34, 197, 94, 0.15)",
    color: "#4ade80",
    border: "1px solid rgba(34, 197, 94, 0.3)",
  },
  badgeDraft: {
    backgroundColor: "rgba(250, 204, 21, 0.15)",
    color: "#facc15",
    border: "1px solid rgba(250, 204, 21, 0.3)",
  },
  badgeClosed: {
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    color: "#f87171",
    border: "1px solid rgba(239, 68, 68, 0.3)",
  },
};
