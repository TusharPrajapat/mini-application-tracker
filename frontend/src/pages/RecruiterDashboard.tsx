import React, { useEffect, useState, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { Job, CreateJobPayload, UpdateJobPayload, PaginationMeta } from "../types/job";
import { Application, ApplicationStage, ApplicationListQuery } from "../types/application";
import { RecruiterStats } from "../types/dashboard";
import {
  getJobs,
  createJob,
  updateJob,
  deleteJob,
} from "../services/jobService";
import {
  getApplications,
  updateApplicationStage,
  bulkUpdateApplicationStage,
} from "../services/applicationService";
import { getRecruiterStats } from "../services/dashboardService";
import { JobList } from "../components/jobs/JobList";
import { JobFormModal } from "../components/jobs/JobFormModal";
import { JobDetailsModal } from "../components/jobs/JobDetailsModal";
import { DeleteConfirmModal } from "../components/jobs/DeleteConfirmModal";
import { RecruiterApplicationList } from "../components/applications/RecruiterApplicationList";
import { RecruiterApplicationDetailsModal } from "../components/applications/RecruiterApplicationDetailsModal";
import { RecruiterStatsCards } from "../components/dashboard/RecruiterStatsCards";

export const RecruiterDashboard: React.FC = () => {
  const { logout } = useAuth();

  const [activeTab, setActiveTab] = useState<"jobs" | "applications">("jobs");

  // Recruiter Dashboard Statistics State
  const [stats, setStats] = useState<RecruiterStats | null>(null);
  const [loadingStats, setLoadingStats] = useState<boolean>(true);
  const [statsError, setStatsError] = useState<string | null>(null);

  // Job Management State & Pagination
  const [jobs, setJobs] = useState<Job[]>([]);
  const [jobPagination, setJobPagination] = useState<PaginationMeta | undefined>();
  const [jobPage, setJobPage] = useState<number>(1);
  const [loadingJobs, setLoadingJobs] = useState<boolean>(true);
  const [jobError, setJobError] = useState<string | null>(null);

  // Job Modals
  const [isFormOpen, setIsFormOpen] = useState<boolean>(false);
  const [selectedJobForEdit, setSelectedJobForEdit] = useState<Job | null>(null);
  const [selectedJobForView, setSelectedJobForView] = useState<Job | null>(null);
  const [selectedJobForDelete, setSelectedJobForDelete] = useState<Job | null>(null);
  const [deletingJob, setDeletingJob] = useState<boolean>(false);

  // Application Management & Filter State & Pagination
  const [applications, setApplications] = useState<Application[]>([]);
  const [appPagination, setAppPagination] = useState<PaginationMeta | undefined>();
  const [loadingApps, setLoadingApps] = useState<boolean>(true);
  const [appError, setAppError] = useState<string | null>(null);
  const [currentFilterQuery, setCurrentFilterQuery] = useState<ApplicationListQuery>({ page: 1, limit: 10 });
  const [selectedAppForManage, setSelectedAppForManage] =
    useState<Application | null>(null);

  // Notifications
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  const fetchStats = useCallback(async () => {
    try {
      setLoadingStats(true);
      setStatsError(null);
      const res = await getRecruiterStats();
      if (res.success && res.data) {
        setStats(res.data);
      }
    } catch (err) {
      const errorMsg =
        err instanceof Error ? err.message : "Failed to load summary stats";
      setStatsError(errorMsg);
    } finally {
      setLoadingStats(false);
    }
  }, []);

  const fetchJobs = useCallback(async (page: number = 1) => {
    try {
      setLoadingJobs(true);
      setJobError(null);
      const res = await getJobs({ page, limit: 10 });
      if (res.success && res.data) {
        setJobs(res.data.jobs || []);
        setJobPagination(res.data.pagination);
        setJobPage(res.data.pagination?.page || page);
      }
    } catch (err) {
      const errorMsg =
        err instanceof Error ? err.message : "Failed to load jobs";
      setJobError(errorMsg);
    } finally {
      setLoadingJobs(false);
    }
  }, []);

  const fetchApps = useCallback(async (query: ApplicationListQuery = { page: 1, limit: 10 }) => {
    try {
      setLoadingApps(true);
      setAppError(null);
      const res = await getApplications(query);
      if (res.success && res.data) {
        setApplications(res.data.applications || []);
        setAppPagination(res.data.pagination);
      }
    } catch (err) {
      const errorMsg =
        err instanceof Error ? err.message : "Failed to load applications";
      setAppError(errorMsg);
    } finally {
      setLoadingApps(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
    fetchJobs(1);
    fetchApps({ page: 1, limit: 10 });
  }, [fetchStats, fetchJobs, fetchApps]);

  const handleJobPageChange = (newPage: number) => {
    setJobPage(newPage);
    fetchJobs(newPage);
  };

  const handleFilterChange = useCallback(
    (newQuery: ApplicationListQuery) => {
      setCurrentFilterQuery(newQuery);
      fetchApps(newQuery);
    },
    [fetchApps]
  );

  const handleOpenCreateModal = () => {
    setSelectedJobForEdit(null);
    setIsFormOpen(true);
  };

  const handleOpenEditModal = (job: Job) => {
    setSelectedJobForEdit(job);
    setIsFormOpen(true);
  };

  const handleJobFormSubmit = async (
    payload: CreateJobPayload | UpdateJobPayload
  ) => {
    if (selectedJobForEdit) {
      await updateJob(selectedJobForEdit.id, payload as UpdateJobPayload);
      showToast("Job posting updated successfully");
      await fetchJobs(jobPage);
    } else {
      await createJob(payload as CreateJobPayload);
      showToast("New job posting created successfully");
      await fetchJobs(1);
    }
    // Refresh stats after creating/updating job
    fetchStats();
  };

  const handleDeleteJobConfirm = async () => {
    if (!selectedJobForDelete) return;

    try {
      setDeletingJob(true);
      await deleteJob(selectedJobForDelete.id);
      showToast("Job posting deleted successfully");
      setSelectedJobForDelete(null);

      // Auto-retreat to previous page if final item on page was deleted
      const nextPage = jobs.length === 1 && jobPage > 1 ? jobPage - 1 : jobPage;
      setJobPage(nextPage);
      await fetchJobs(nextPage);
      // Refresh stats after deleting job
      fetchStats();
    } catch (err) {
      const errorMsg =
        err instanceof Error ? err.message : "Failed to delete job";
      setJobError(errorMsg);
    } finally {
      setDeletingJob(false);
    }
  };

  const handleUpdateApplicationStage = async (
    applicationId: number,
    newStage: ApplicationStage,
    version: number
  ) => {
    await updateApplicationStage(applicationId, {
      stage: newStage,
      version,
    });
    showToast("Application stage updated successfully");
    setSelectedAppForManage(null);
    await fetchApps(currentFilterQuery);
    // Refresh stats after updating application stage
    fetchStats();
  };

  const handleBulkUpdateStage = async (
    applicationIds: number[],
    newStage: ApplicationStage
  ) => {
    try {
      const res = await bulkUpdateApplicationStage({
        applicationIds,
        stage: newStage,
      });

      const count = res.updatedCount || applicationIds.length;
      showToast(
        `${count} ${count === 1 ? "application" : "applications"} updated successfully`
      );

      // Refresh application list & summary statistics
      await fetchApps(currentFilterQuery);
      await fetchStats();
    } catch (err) {
      const errorMsg =
        err instanceof Error ? err.message : "Failed to update applications";
      showToast(`⚠️ ${errorMsg}`);
    }
  };

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div>
          <h1 style={styles.title}>Applicant Tracker</h1>
          <p style={styles.badge}>Recruiter Dashboard</p>
        </div>

        <div style={styles.headerActions}>
          <button onClick={handleOpenCreateModal} style={styles.createButton}>
            + Create Job
          </button>
          <button onClick={logout} style={styles.logoutButton}>
            Log Out
          </button>
        </div>
      </header>

      <main style={styles.main}>
        {toastMessage && (
          <div style={styles.toast}>
            <span>{toastMessage.startsWith("⚠️") ? toastMessage : `✅ ${toastMessage}`}</span>
          </div>
        )}

        {/* Recruiter Summary Statistics Section at TOP */}
        <RecruiterStatsCards
          stats={stats}
          loading={loadingStats}
          error={statsError}
          onRetry={fetchStats}
        />

        {/* Tab Navigation */}
        <div style={styles.tabContainer}>
          <button
            onClick={() => setActiveTab("jobs")}
            style={{
              ...styles.tabButton,
              ...(activeTab === "jobs" ? styles.tabButtonActive : {}),
            }}
          >
            💼 My Job Postings ({jobPagination?.total || jobs.length})
          </button>
          <button
            onClick={() => setActiveTab("applications")}
            style={{
              ...styles.tabButton,
              ...(activeTab === "applications" ? styles.tabButtonActive : {}),
            }}
          >
            📄 Candidate Applications ({appPagination?.total || applications.length})
          </button>
        </div>

        {/* Tab 1: Jobs Management */}
        {activeTab === "jobs" && (
          <section style={styles.section}>
            {jobError && (
              <div style={styles.errorBanner}>
                <p style={styles.errorBannerText}>{jobError}</p>
                <button onClick={() => fetchJobs(jobPage)} style={styles.retryBtn}>
                  Retry
                </button>
              </div>
            )}

            <div style={styles.sectionHeader}>
              <h2 style={styles.sectionTitle}>My Job Postings</h2>
              <span style={styles.jobCount}>
                {jobPagination?.total || jobs.length} total jobs
              </span>
            </div>

            {loadingJobs ? (
              <div style={styles.loadingBox}>
                <div style={styles.spinner}></div>
                <p style={styles.loadingText}>Loading jobs...</p>
              </div>
            ) : (
              <JobList
                jobs={jobs}
                pagination={jobPagination}
                loading={loadingJobs}
                onView={(job) => setSelectedJobForView(job)}
                onEdit={(job) => handleOpenEditModal(job)}
                onDelete={(job) => setSelectedJobForDelete(job)}
                onCreateClick={handleOpenCreateModal}
                onPageChange={handleJobPageChange}
              />
            )}
          </section>
        )}

        {/* Tab 2: Applications Management */}
        {activeTab === "applications" && (
          <section style={styles.section}>
            {appError && (
              <div style={styles.errorBanner}>
                <p style={styles.errorBannerText}>{appError}</p>
                <button
                  onClick={() => fetchApps(currentFilterQuery)}
                  style={styles.retryBtn}
                >
                  Retry
                </button>
              </div>
            )}

            <div style={styles.sectionHeader}>
              <h2 style={styles.sectionTitle}>Received Applications</h2>
              <span style={styles.jobCount}>
                {appPagination?.total || applications.length} total applications
              </span>
            </div>

            <RecruiterApplicationList
              applications={applications}
              jobs={jobs}
              pagination={appPagination}
              loading={loadingApps}
              onSelectApplication={(app) => setSelectedAppForManage(app)}
              onFilterChange={handleFilterChange}
              onBulkUpdateStage={handleBulkUpdateStage}
              onShowToast={showToast}
            />
          </section>
        )}
      </main>

      {/* Job Form Modal (Create & Edit) */}
      <JobFormModal
        isOpen={isFormOpen}
        initialJob={selectedJobForEdit}
        onClose={() => {
          setIsFormOpen(false);
          setSelectedJobForEdit(null);
        }}
        onSubmit={handleJobFormSubmit}
      />

      {/* Job Details View Modal */}
      <JobDetailsModal
        job={selectedJobForView}
        onClose={() => setSelectedJobForView(null)}
      />

      {/* Job Delete Confirmation Modal */}
      <DeleteConfirmModal
        job={selectedJobForDelete}
        onClose={() => setSelectedJobForDelete(null)}
        onConfirm={handleDeleteJobConfirm}
        deleting={deletingJob}
      />

      {/* Recruiter Application Details & Stage Update Modal */}
      <RecruiterApplicationDetailsModal
        application={selectedAppForManage}
        onClose={() => setSelectedAppForManage(null)}
        onUpdateStage={handleUpdateApplicationStage}
        onRefresh={async () => {
          await fetchApps(currentFilterQuery);
          await fetchStats();
        }}
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
    margin: "0 auto 1.5rem auto",
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
    color: "#38bdf8",
    fontSize: "0.875rem",
    fontWeight: "600",
    margin: "0.25rem 0 0 0",
  },
  headerActions: {
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
  },
  createButton: {
    backgroundColor: "#38bdf8",
    color: "#0f172a",
    fontWeight: "600",
    fontSize: "0.95rem",
    padding: "0.55rem 1.1rem",
    borderRadius: "0.5rem",
    border: "none",
    cursor: "pointer",
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
  },
  toast: {
    backgroundColor: "rgba(34, 197, 94, 0.2)",
    border: "1px solid rgba(34, 197, 94, 0.4)",
    color: "#4ade80",
    padding: "0.75rem 1rem",
    borderRadius: "0.5rem",
    marginBottom: "1.5rem",
    fontWeight: "600",
    fontSize: "0.95rem",
  },
  tabContainer: {
    display: "flex",
    gap: "0.75rem",
    marginBottom: "1.5rem",
    borderBottom: "1px solid #334155",
    paddingBottom: "0.5rem",
  },
  tabButton: {
    backgroundColor: "transparent",
    color: "#94a3b8",
    border: "none",
    padding: "0.6rem 1rem",
    fontSize: "0.95rem",
    fontWeight: "600",
    cursor: "pointer",
    borderRadius: "0.5rem",
    transition: "all 0.2s",
  },
  tabButtonActive: {
    backgroundColor: "rgba(56, 189, 248, 0.15)",
    color: "#38bdf8",
    border: "1px solid rgba(56, 189, 248, 0.3)",
  },
  section: {
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
  },
  errorBanner: {
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    border: "1px solid rgba(239, 68, 68, 0.4)",
    color: "#f87171",
    padding: "0.75rem 1rem",
    borderRadius: "0.5rem",
    marginBottom: "1rem",
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
  sectionHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "0.5rem",
  },
  sectionTitle: {
    fontSize: "1.25rem",
    fontWeight: "600",
    color: "#e2e8f0",
    margin: 0,
  },
  jobCount: {
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
