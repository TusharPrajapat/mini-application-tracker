import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useAuth } from "../context/AuthContext";
import { Job } from "../types/job";
import { Application } from "../types/application";
import { getJobs } from "../services/jobService";
import {
  getApplications,
  createApplication,
} from "../services/applicationService";
import { CandidateJobList } from "../components/jobs/CandidateJobList";
import { JobDetailsModal } from "../components/jobs/JobDetailsModal";
import { ApplyConfirmModal } from "../components/applications/ApplyConfirmModal";
import { ApplicationList } from "../components/applications/ApplicationList";

export const CandidateDashboard: React.FC = () => {
  const { logout } = useAuth();

  const [jobs, setJobs] = useState<Job[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loadingJobs, setLoadingJobs] = useState<boolean>(true);
  const [loadingApps, setLoadingApps] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modals
  const [selectedJobForView, setSelectedJobForView] = useState<Job | null>(null);
  const [selectedJobForApply, setSelectedJobForApply] = useState<Job | null>(null);

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  const fetchOpenJobs = useCallback(async () => {
    try {
      setLoadingJobs(true);
      setError(null);
      const res = await getJobs();
      if (res.success && Array.isArray(res.data)) {
        setJobs(res.data);
      }
    } catch (err) {
      const errorMsg =
        err instanceof Error ? err.message : "Failed to load open jobs";
      setError(errorMsg);
    } finally {
      setLoadingJobs(false);
    }
  }, []);

  const fetchMyApplications = useCallback(async () => {
    try {
      setLoadingApps(true);
      const res = await getApplications();
      if (res.success && Array.isArray(res.data)) {
        setApplications(res.data);
      }
    } catch (err) {
      const errorMsg =
        err instanceof Error ? err.message : "Failed to load applications";
      setError(errorMsg);
    } finally {
      setLoadingApps(false);
    }
  }, []);

  useEffect(() => {
    fetchOpenJobs();
    fetchMyApplications();
  }, [fetchOpenJobs, fetchMyApplications]);

  const appliedJobIds = useMemo(() => {
    return new Set(applications.map((app) => app.job_id));
  }, [applications]);

  const handleApplyConfirm = async (job: Job) => {
    await createApplication({ job_id: job.id });
    showToast(`Application submitted successfully for ${job.title}`);
    await fetchMyApplications();
  };

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div>
          <h1 style={styles.title}>Applicant Tracker</h1>
          <p style={styles.badge}>Candidate Dashboard</p>
        </div>

        <button onClick={logout} style={styles.logoutButton}>
          Log Out
        </button>
      </header>

      <main style={styles.main}>
        {toastMessage && (
          <div style={styles.toast}>
            <span>✅ {toastMessage}</span>
          </div>
        )}

        {error && (
          <div style={styles.errorBanner}>
            <p style={styles.errorBannerText}>{error}</p>
            <button
              onClick={() => {
                fetchOpenJobs();
                fetchMyApplications();
              }}
              style={styles.retryBtn}
            >
              Retry
            </button>
          </div>
        )}

        {/* Section 1: Available Open Jobs */}
        <section style={styles.section}>
          <div style={styles.sectionHeader}>
            <h2 style={styles.sectionTitle}>Available Open Jobs</h2>
            <span style={styles.countBadge}>{jobs.length} open</span>
          </div>

          {loadingJobs ? (
            <div style={styles.loadingBox}>
              <div style={styles.spinner}></div>
              <p style={styles.loadingText}>Loading available jobs...</p>
            </div>
          ) : (
            <CandidateJobList
              jobs={jobs}
              appliedJobIds={appliedJobIds}
              onView={(job) => setSelectedJobForView(job)}
              onApply={(job) => setSelectedJobForApply(job)}
            />
          )}
        </section>

        {/* Section 2: My Applications */}
        <section style={styles.section}>
          <div style={styles.sectionHeader}>
            <h2 style={styles.sectionTitle}>My Applications</h2>
            <span style={styles.countBadge}>{applications.length} submitted</span>
          </div>

          {loadingApps ? (
            <div style={styles.loadingBox}>
              <div style={styles.spinner}></div>
              <p style={styles.loadingText}>Loading your applications...</p>
            </div>
          ) : (
            <ApplicationList applications={applications} />
          )}
        </section>
      </main>

      {/* View Job Details Modal */}
      <JobDetailsModal
        job={selectedJobForView}
        onClose={() => setSelectedJobForView(null)}
      />

      {/* Apply Confirmation Modal */}
      <ApplyConfirmModal
        job={selectedJobForApply}
        onClose={() => setSelectedJobForApply(null)}
        onConfirm={handleApplyConfirm}
      />
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: "100vh",
    backgroundColor: "#0f172a",
    color: "#f8fafc",
    padding: "2rem 1.5rem",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    maxWidth: "1000px",
    margin: "0 auto 2rem auto",
    flexWrap: "wrap",
    gap: "1rem",
  },
  title: {
    fontSize: "1.75rem",
    fontWeight: "700",
    margin: 0,
    background: "linear-gradient(135deg, #38bdf8 0%, #818cf8 100%)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
  },
  badge: {
    color: "#4ade80",
    fontSize: "0.875rem",
    fontWeight: "600",
    margin: "0.25rem 0 0 0",
  },
  logoutButton: {
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    color: "#f87171",
    border: "1px solid rgba(239, 68, 68, 0.3)",
    borderRadius: "0.5rem",
    padding: "0.55rem 1.1rem",
    fontWeight: "600",
    fontSize: "0.95rem",
    cursor: "pointer",
  },
  main: {
    maxWidth: "1000px",
    margin: "0 auto",
    display: "flex",
    flexDirection: "column",
    gap: "2.5rem",
  },
  toast: {
    backgroundColor: "rgba(34, 197, 94, 0.2)",
    border: "1px solid rgba(34, 197, 94, 0.4)",
    color: "#4ade80",
    padding: "0.75rem 1rem",
    borderRadius: "0.5rem",
    fontWeight: "600",
    fontSize: "0.95rem",
  },
  errorBanner: {
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    border: "1px solid rgba(239, 68, 68, 0.4)",
    color: "#f87171",
    padding: "0.75rem 1rem",
    borderRadius: "0.5rem",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  errorBannerText: {
    margin: 0,
    fontSize: "0.9rem",
  },
  retryBtn: {
    backgroundColor: "transparent",
    color: "#f87171",
    border: "1px solid rgba(239, 68, 68, 0.4)",
    padding: "0.25rem 0.65rem",
    borderRadius: "0.375rem",
    fontSize: "0.85rem",
    cursor: "pointer",
  },
  section: {
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
  },
  sectionHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionTitle: {
    fontSize: "1.35rem",
    fontWeight: "600",
    color: "#e2e8f0",
    margin: 0,
  },
  countBadge: {
    color: "#94a3b8",
    fontSize: "0.875rem",
    backgroundColor: "#1e293b",
    padding: "0.25rem 0.65rem",
    borderRadius: "9999px",
    border: "1px solid #334155",
  },
  loadingBox: {
    textAlign: "center",
    padding: "3rem",
    backgroundColor: "rgba(30, 41, 59, 0.6)",
    borderRadius: "1rem",
    border: "1px solid rgba(255, 255, 255, 0.05)",
  },
  spinner: {
    width: "32px",
    height: "32px",
    border: "3px solid rgba(255, 255, 255, 0.1)",
    borderTop: "3px solid #38bdf8",
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
    margin: "0 auto 1rem auto",
  },
  loadingText: {
    color: "#94a3b8",
    margin: 0,
    fontSize: "0.95rem",
  },
};
