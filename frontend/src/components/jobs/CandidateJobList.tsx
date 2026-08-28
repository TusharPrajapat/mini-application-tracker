import React from "react";
import { Job, JobStatus } from "../../types/job";

interface CandidateJobListProps {
  jobs: Job[];
  appliedJobIds: Set<number>;
  onView: (job: Job) => void;
  onApply: (job: Job) => void;
}

export const CandidateJobList: React.FC<CandidateJobListProps> = ({
  jobs,
  appliedJobIds,
  onView,
  onApply,
}) => {
  if (jobs.length === 0) {
    return (
      <div style={styles.emptyContainer}>
        <div style={styles.emptyIcon}>🔍</div>
        <h3 style={styles.emptyTitle}>No open jobs currently available</h3>
        <p style={styles.emptyText}>
          Please check back later as recruiters frequently post new job opportunities.
        </p>
      </div>
    );
  }

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
    <div style={styles.grid}>
      {jobs.map((job) => {
        const isApplied = appliedJobIds.has(job.id);
        return (
          <div key={job.id} style={styles.card}>
            <div style={styles.cardHeader}>
              <h3 style={styles.jobTitle}>{job.title}</h3>
              <span style={styles.badgeOpen}>
                {job.status === JobStatus.OPEN ? "Open" : "Available"}
              </span>
            </div>

            <p style={styles.description}>
              {job.description.length > 140
                ? `${job.description.substring(0, 140)}...`
                : job.description}
            </p>

            <div style={styles.cardFooter}>
              <span style={styles.date}>Posted {formatDate(job.created_at)}</span>

              <div style={styles.actions}>
                <button
                  onClick={() => onView(job)}
                  style={styles.viewBtn}
                >
                  View
                </button>

                {isApplied ? (
                  <span style={styles.appliedBadge}>✓ Applied</span>
                ) : (
                  <button
                    onClick={() => onApply(job)}
                    style={styles.applyBtn}
                  >
                    Apply
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })}
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
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
    gap: "1.25rem",
  },
  card: {
    backgroundColor: "rgba(30, 41, 59, 0.8)",
    backdropFilter: "blur(12px)",
    borderRadius: "1rem",
    border: "1px solid rgba(255, 255, 255, 0.1)",
    padding: "1.5rem",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.3)",
  },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "0.75rem",
    marginBottom: "0.75rem",
  },
  jobTitle: {
    fontSize: "1.15rem",
    fontWeight: "700",
    color: "#f8fafc",
    margin: 0,
    lineHeight: "1.3",
  },
  badgeOpen: {
    padding: "0.25rem 0.65rem",
    borderRadius: "9999px",
    fontSize: "0.75rem",
    fontWeight: "700",
    textTransform: "uppercase",
    backgroundColor: "rgba(34, 197, 94, 0.15)",
    color: "#4ade80",
    border: "1px solid rgba(34, 197, 94, 0.3)",
    whiteSpace: "nowrap",
  },
  description: {
    color: "#cbd5e1",
    fontSize: "0.9rem",
    lineHeight: "1.5",
    marginBottom: "1.25rem",
    flexGrow: 1,
  },
  cardFooter: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    borderTop: "1px solid rgba(255, 255, 255, 0.08)",
    paddingTop: "0.85rem",
  },
  date: {
    color: "#94a3b8",
    fontSize: "0.85rem",
  },
  actions: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
  },
  viewBtn: {
    backgroundColor: "rgba(56, 189, 248, 0.15)",
    color: "#38bdf8",
    border: "1px solid rgba(56, 189, 248, 0.3)",
    borderRadius: "0.375rem",
    padding: "0.4rem 0.85rem",
    fontSize: "0.85rem",
    fontWeight: "600",
    cursor: "pointer",
  },
  applyBtn: {
    backgroundColor: "#38bdf8",
    color: "#0f172a",
    border: "none",
    borderRadius: "0.375rem",
    padding: "0.4rem 0.85rem",
    fontSize: "0.85rem",
    fontWeight: "600",
    cursor: "pointer",
  },
  appliedBadge: {
    backgroundColor: "rgba(34, 197, 94, 0.15)",
    color: "#4ade80",
    border: "1px solid rgba(34, 197, 94, 0.3)",
    borderRadius: "0.375rem",
    padding: "0.4rem 0.85rem",
    fontSize: "0.85rem",
    fontWeight: "600",
  },
};
