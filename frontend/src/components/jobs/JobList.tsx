import React from "react";
import { Job, JobStatus } from "../../types/job";

interface JobListProps {
  jobs: Job[];
  onView: (job: Job) => void;
  onEdit: (job: Job) => void;
  onDelete: (job: Job) => void;
  onCreateClick: () => void;
}

export const JobList: React.FC<JobListProps> = ({
  jobs,
  onView,
  onEdit,
  onDelete,
  onCreateClick,
}) => {
  if (jobs.length === 0) {
    return (
      <div style={styles.emptyContainer}>
        <div style={styles.emptyIcon}>📋</div>
        <h3 style={styles.emptyTitle}>No jobs created yet</h3>
        <p style={styles.emptyText}>
          Create your first job posting to start receiving applications from candidates.
        </p>
        <button onClick={onCreateClick} style={styles.createButton}>
          + Create your first job
        </button>
      </div>
    );
  }

  const renderStatusBadge = (status: JobStatus) => {
    switch (status) {
      case JobStatus.OPEN:
        return <span style={{ ...styles.badge, ...styles.badgeOpen }}>Open</span>;
      case JobStatus.DRAFT:
        return <span style={{ ...styles.badge, ...styles.badgeDraft }}>Draft</span>;
      case JobStatus.CLOSED:
        return <span style={{ ...styles.badge, ...styles.badgeClosed }}>Closed</span>;
      default:
        return <span style={{ ...styles.badge, ...styles.badgeDraft }}>Unknown</span>;
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return dateString;
    }
  };

  return (
    <div style={styles.tableWrapper}>
      <table style={styles.table}>
        <thead>
          <tr style={styles.tableHeaderRow}>
            <th style={styles.th}>Title</th>
            <th style={styles.th}>Description</th>
            <th style={styles.th}>Status</th>
            <th style={styles.th}>Created</th>
            <th style={{ ...styles.th, textAlign: "right" }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {jobs.map((job) => (
            <tr key={job.id} style={styles.tr}>
              <td style={styles.tdTitle}>{job.title}</td>
              <td style={styles.tdDesc}>
                {job.description.length > 60
                  ? `${job.description.substring(0, 60)}...`
                  : job.description}
              </td>
              <td style={styles.td}>{renderStatusBadge(job.status)}</td>
              <td style={styles.tdDate}>{formatDate(job.created_at)}</td>
              <td style={styles.tdActions}>
                <div style={styles.actionGroup}>
                  <button
                    onClick={() => onView(job)}
                    style={{ ...styles.actionBtn, ...styles.viewBtn }}
                    title="View Job"
                  >
                    View
                  </button>
                  <button
                    onClick={() => onEdit(job)}
                    style={{ ...styles.actionBtn, ...styles.editBtn }}
                    title="Edit Job"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => onDelete(job)}
                    style={{ ...styles.actionBtn, ...styles.deleteBtn }}
                    title="Delete Job"
                  >
                    Delete
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  emptyContainer: {
    textAlign: "center",
    padding: "3.5rem 1.5rem",
    backgroundColor: "rgba(30, 41, 59, 0.6)",
    borderRadius: "1rem",
    border: "1px dashed rgba(255, 255, 255, 0.15)",
  },
  emptyIcon: {
    fontSize: "3rem",
    marginBottom: "1rem",
  },
  emptyTitle: {
    fontSize: "1.25rem",
    fontWeight: "600",
    color: "#f8fafc",
    margin: "0 0 0.5rem 0",
  },
  emptyText: {
    color: "#94a3b8",
    fontSize: "0.95rem",
    maxWidth: "400px",
    margin: "0 auto 1.5rem auto",
  },
  createButton: {
    backgroundColor: "#38bdf8",
    color: "#0f172a",
    fontWeight: "600",
    padding: "0.65rem 1.25rem",
    borderRadius: "0.5rem",
    border: "none",
    cursor: "pointer",
    fontSize: "0.95rem",
  },
  tableWrapper: {
    overflowX: "auto",
    backgroundColor: "rgba(30, 41, 59, 0.8)",
    backdropFilter: "blur(12px)",
    borderRadius: "1rem",
    border: "1px solid rgba(255, 255, 255, 0.1)",
    boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.3)",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    textAlign: "left",
    fontSize: "0.95rem",
  },
  tableHeaderRow: {
    borderBottom: "1px solid #334155",
    backgroundColor: "#0f172a",
  },
  th: {
    padding: "1rem 1.25rem",
    color: "#94a3b8",
    fontWeight: "600",
    fontSize: "0.85rem",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  },
  tr: {
    borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
  },
  td: {
    padding: "1rem 1.25rem",
    verticalAlign: "middle",
    color: "#e2e8f0",
  },
  tdTitle: {
    padding: "1rem 1.25rem",
    verticalAlign: "middle",
    color: "#f8fafc",
    fontWeight: "600",
  },
  tdDesc: {
    padding: "1rem 1.25rem",
    verticalAlign: "middle",
    color: "#cbd5e1",
    fontSize: "0.9rem",
    maxWidth: "280px",
  },
  tdDate: {
    padding: "1rem 1.25rem",
    verticalAlign: "middle",
    color: "#94a3b8",
    fontSize: "0.875rem",
    whiteSpace: "nowrap",
  },
  tdActions: {
    padding: "1rem 1.25rem",
    verticalAlign: "middle",
    textAlign: "right",
    whiteSpace: "nowrap",
  },
  actionGroup: {
    display: "inline-flex",
    gap: "0.5rem",
  },
  actionBtn: {
    padding: "0.35rem 0.75rem",
    borderRadius: "0.375rem",
    fontSize: "0.85rem",
    fontWeight: "600",
    border: "none",
    cursor: "pointer",
  },
  viewBtn: {
    backgroundColor: "rgba(56, 189, 248, 0.15)",
    color: "#38bdf8",
    border: "1px solid rgba(56, 189, 248, 0.3)",
  },
  editBtn: {
    backgroundColor: "rgba(250, 204, 21, 0.15)",
    color: "#facc15",
    border: "1px solid rgba(250, 204, 21, 0.3)",
  },
  deleteBtn: {
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    color: "#f87171",
    border: "1px solid rgba(239, 68, 68, 0.3)",
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
