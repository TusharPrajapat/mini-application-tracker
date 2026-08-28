import React from "react";
import { Application, ApplicationStage } from "../../types/application";

interface RecruiterApplicationListProps {
  applications: Application[];
  onSelectApplication: (app: Application) => void;
}

export const RecruiterApplicationList: React.FC<
  RecruiterApplicationListProps
> = ({ applications, onSelectApplication }) => {
  if (applications.length === 0) {
    return (
      <div style={styles.emptyContainer}>
        <div style={styles.emptyIcon}>📬</div>
        <h3 style={styles.emptyTitle}>No applications received yet</h3>
        <p style={styles.emptyText}>
          Applications submitted by candidates for your job postings will appear here.
        </p>
      </div>
    );
  }

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
            <th style={styles.th}>Job Title</th>
            <th style={styles.th}>Candidate</th>
            <th style={styles.th}>Stage</th>
            <th style={styles.th}>Applied Date</th>
            <th style={{ ...styles.th, textAlign: "right" }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {applications.map((app) => (
            <tr key={app.id} style={styles.tr}>
              <td style={styles.tdTitle}>
                {app.job ? app.job.title : `Job #${app.job_id}`}
              </td>
              <td style={styles.tdCandidate}>
                {app.candidate ? app.candidate.email : `Candidate #${app.candidate_id}`}
              </td>
              <td style={styles.td}>{renderStageBadge(app.stage)}</td>
              <td style={styles.tdDate}>{formatDate(app.created_at)}</td>
              <td style={styles.tdActions}>
                <button
                  onClick={() => onSelectApplication(app)}
                  style={styles.manageBtn}
                >
                  View / Manage
                </button>
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
    margin: "0 auto",
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
  tdCandidate: {
    padding: "1rem 1.25rem",
    verticalAlign: "middle",
    color: "#38bdf8",
    fontWeight: "500",
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
  manageBtn: {
    backgroundColor: "rgba(56, 189, 248, 0.15)",
    color: "#38bdf8",
    border: "1px solid rgba(56, 189, 248, 0.3)",
    borderRadius: "0.375rem",
    padding: "0.4rem 0.85rem",
    fontSize: "0.85rem",
    fontWeight: "600",
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
