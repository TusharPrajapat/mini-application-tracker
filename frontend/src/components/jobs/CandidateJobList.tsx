import React from "react";
import { Job, JobStatus, PaginationMeta } from "../../types/job";

interface CandidateJobListProps {
  jobs: Job[];
  appliedJobIds: Set<number>;
  pagination?: PaginationMeta;
  loading?: boolean;
  onView: (job: Job) => void;
  onApply: (job: Job) => void;
  onPageChange?: (page: number) => void;
}

export const CandidateJobList: React.FC<CandidateJobListProps> = ({
  jobs,
  appliedJobIds,
  pagination,
  loading = false,
  onView,
  onApply,
  onPageChange,
}) => {
  if (jobs.length === 0 && !loading) {
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

  const currentPage = pagination?.page || 1;
  const totalPages = pagination?.totalPages || 0;
  const totalRecords = pagination?.total || 0;

  return (
    <div style={styles.container}>
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
                  <button onClick={() => onView(job)} style={styles.viewBtn}>
                    View
                  </button>

                  {isApplied ? (
                    <span style={styles.appliedBadge}>✓ Applied</span>
                  ) : (
                    <button onClick={() => onApply(job)} style={styles.applyBtn}>
                      Apply
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Pagination Bar */}
      {pagination && totalPages > 0 && onPageChange && (
        <div style={styles.paginationBar}>
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage <= 1 || loading}
            style={
              currentPage <= 1 || loading
                ? { ...styles.pageBtn, ...styles.pageBtnDisabled }
                : styles.pageBtn
            }
          >
            ‹ Previous
          </button>
          <span style={styles.pageInfo}>
            Page {currentPage} of {totalPages} ({totalRecords} total)
          </span>
          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage >= totalPages || loading}
            style={
              currentPage >= totalPages || loading
                ? { ...styles.pageBtn, ...styles.pageBtnDisabled }
                : styles.pageBtn
            }
          >
            Next ›
          </button>
        </div>
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: "flex",
    flexDirection: "column",
    gap: "1.25rem",
  },
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
  paginationBar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "rgba(30, 41, 59, 0.7)",
    borderRadius: "0.75rem",
    padding: "0.75rem 1.25rem",
    border: "1px solid rgba(255, 255, 255, 0.08)",
  },
  pageInfo: {
    color: "#94a3b8",
    fontSize: "0.9rem",
    fontWeight: "500",
  },
  pageBtn: {
    backgroundColor: "rgba(56, 189, 248, 0.15)",
    color: "#38bdf8",
    border: "1px solid rgba(56, 189, 248, 0.3)",
    borderRadius: "0.5rem",
    padding: "0.45rem 1rem",
    fontSize: "0.875rem",
    fontWeight: "600",
    cursor: "pointer",
  },
  pageBtnDisabled: {
    opacity: 0.4,
    cursor: "not-allowed",
    border: "1px solid rgba(255, 255, 255, 0.1)",
    color: "#64748b",
    backgroundColor: "transparent",
  },
};
