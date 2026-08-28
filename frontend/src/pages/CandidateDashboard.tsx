import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useAuth } from "../context/AuthContext";
import { Job } from "../types/job";
import { Application } from "../types/application";
import {
  CandidateProfile,
  CreateCandidateProfilePayload,
  UpdateCandidateProfilePayload,
} from "../types/candidateProfile";
import { getJobs } from "../services/jobService";
import {
  getApplications,
  createApplication,
} from "../services/applicationService";
import {
  getProfile,
  createProfile,
  updateProfile,
  deleteProfile,
} from "../services/candidateProfileService";
import {
  uploadResume,
  getResume,
  deleteResume,
} from "../services/resumeService";

import { CandidateJobList } from "../components/jobs/CandidateJobList";
import { JobDetailsModal } from "../components/jobs/JobDetailsModal";
import { ApplyConfirmModal } from "../components/applications/ApplyConfirmModal";
import { ApplicationList } from "../components/applications/ApplicationList";
import { CandidateProfileCard } from "../components/profile/CandidateProfileCard";
import { CandidateProfileForm } from "../components/profile/CandidateProfileForm";
import { DeleteProfileConfirmModal } from "../components/profile/DeleteProfileConfirmModal";
import { ResumeUploadModal } from "../components/profile/ResumeUploadModal";
import { DeleteResumeConfirmModal } from "../components/profile/DeleteResumeConfirmModal";

export const CandidateDashboard: React.FC = () => {
  const { logout } = useAuth();

  const [activeTab, setActiveTab] = useState<
    "jobs" | "applications" | "profile"
  >("jobs");

  // Open Jobs State
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loadingJobs, setLoadingJobs] = useState<boolean>(true);
  const [jobError, setJobError] = useState<string | null>(null);

  // Candidate Applications State
  const [applications, setApplications] = useState<Application[]>([]);
  const [loadingApps, setLoadingApps] = useState<boolean>(true);
  const [appError, setAppError] = useState<string | null>(null);

  // Candidate Profile State
  const [profile, setProfile] = useState<CandidateProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState<boolean>(true);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Modals & Notifications
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [selectedJobForView, setSelectedJobForView] = useState<Job | null>(null);
  const [selectedJobForApply, setSelectedJobForApply] = useState<Job | null>(null);

  // Profile Modals
  const [isProfileFormOpen, setIsProfileFormOpen] = useState<boolean>(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);

  // Resume Modals
  const [isResumeUploadOpen, setIsResumeUploadOpen] = useState<boolean>(false);
  const [isReplaceResumeMode, setIsReplaceResumeMode] = useState<boolean>(false);
  const [isResumeDeleteOpen, setIsResumeDeleteOpen] = useState<boolean>(false);

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  const fetchOpenJobs = useCallback(async () => {
    try {
      setLoadingJobs(true);
      setJobError(null);
      const res = await getJobs();
      if (res.success && Array.isArray(res.data)) {
        setJobs(res.data);
      }
    } catch (err) {
      const errorMsg =
        err instanceof Error ? err.message : "Failed to load open jobs";
      setJobError(errorMsg);
    } finally {
      setLoadingJobs(false);
    }
  }, []);

  const fetchMyApplications = useCallback(async () => {
    try {
      setLoadingApps(true);
      setAppError(null);
      const res = await getApplications();
      if (res.success && Array.isArray(res.data)) {
        setApplications(res.data);
      }
    } catch (err) {
      const errorMsg =
        err instanceof Error ? err.message : "Failed to load applications";
      setAppError(errorMsg);
    } finally {
      setLoadingApps(false);
    }
  }, []);

  const fetchCandidateProfile = useCallback(async () => {
    try {
      setLoadingProfile(true);
      setProfileError(null);
      const res = await getProfile();
      if (res.success && res.data?.profile) {
        setProfile(res.data.profile);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (msg.includes("404") || msg.toLowerCase().includes("not found")) {
        setProfile(null);
      } else {
        setProfileError(msg || "Failed to load candidate profile");
      }
    } finally {
      setLoadingProfile(false);
    }
  }, []);

  useEffect(() => {
    fetchOpenJobs();
    fetchMyApplications();
    fetchCandidateProfile();
  }, [fetchOpenJobs, fetchMyApplications, fetchCandidateProfile]);

  const appliedJobIds = useMemo(() => {
    return new Set(applications.map((app) => app.job_id));
  }, [applications]);

  const handleApplyConfirm = async (job: Job) => {
    await createApplication({ job_id: job.id });
    showToast(`Application submitted successfully for ${job.title}`);
    await fetchMyApplications();
  };

  const handleSaveProfile = async (
    payload: CreateCandidateProfilePayload | UpdateCandidateProfilePayload
  ) => {
    if (profile) {
      const res = await updateProfile(payload as UpdateCandidateProfilePayload);
      if (res.success && res.data?.profile) {
        setProfile(res.data.profile);
        showToast("Candidate profile updated successfully");
      }
    } else {
      const res = await createProfile(payload as CreateCandidateProfilePayload);
      if (res.success && res.data?.profile) {
        setProfile(res.data.profile);
        showToast("Candidate profile created successfully");
      }
    }
    setIsProfileFormOpen(false);
  };

  const handleDeleteProfileConfirm = async () => {
    await deleteProfile();
    setProfile(null);
    setIsDeleteModalOpen(false);
    showToast("Candidate profile deleted successfully");
  };

  // Resume Handlers
  const handleUploadResumeFile = async (file: File) => {
    const res = await uploadResume(file);
    if (res.success && res.data?.resumePath) {
      await fetchCandidateProfile();
      setIsResumeUploadOpen(false);
      showToast(
        isReplaceResumeMode
          ? "Resume replaced successfully"
          : "Resume uploaded successfully"
      );
    }
  };

  const handleViewResume = async () => {
    try {
      const res = await getResume();
      if (res.success && res.data?.signedUrl) {
        window.open(res.data.signedUrl, "_blank");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to open resume";
      showToast(`⚠️ ${msg}`);
    }
  };

  const handleDeleteResumeConfirm = async () => {
    await deleteResume();
    await fetchCandidateProfile();
    setIsResumeDeleteOpen(false);
    showToast("Resume deleted successfully");
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

      {/* Navigation Tabs */}
      <div style={styles.tabBarContainer}>
        <div style={styles.tabBar}>
          <button
            onClick={() => setActiveTab("jobs")}
            style={
              activeTab === "jobs"
                ? { ...styles.tabButton, ...styles.activeTabButton }
                : styles.tabButton
            }
          >
            💼 Available Jobs ({jobs.length})
          </button>
          <button
            onClick={() => setActiveTab("applications")}
            style={
              activeTab === "applications"
                ? { ...styles.tabButton, ...styles.activeTabButton }
                : styles.tabButton
            }
          >
            📄 My Applications ({applications.length})
          </button>
          <button
            onClick={() => setActiveTab("profile")}
            style={
              activeTab === "profile"
                ? { ...styles.tabButton, ...styles.activeTabButton }
                : styles.tabButton
            }
          >
            👤 My Profile {profile ? "✓" : ""}
          </button>
        </div>
      </div>

      <main style={styles.main}>
        {toastMessage && (
          <div style={styles.toast}>
            <span>{toastMessage.startsWith("⚠️") ? toastMessage : `✅ ${toastMessage}`}</span>
          </div>
        )}

        {/* Tab 1: Available Jobs */}
        {activeTab === "jobs" && (
          <section style={styles.section}>
            {jobError && (
              <div style={styles.errorBanner}>
                <p style={styles.errorBannerText}>{jobError}</p>
                <button onClick={fetchOpenJobs} style={styles.retryBtn}>
                  Retry
                </button>
              </div>
            )}

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
        )}

        {/* Tab 2: My Applications */}
        {activeTab === "applications" && (
          <section style={styles.section}>
            {appError && (
              <div style={styles.errorBanner}>
                <p style={styles.errorBannerText}>{appError}</p>
                <button onClick={fetchMyApplications} style={styles.retryBtn}>
                  Retry
                </button>
              </div>
            )}

            <div style={styles.sectionHeader}>
              <h2 style={styles.sectionTitle}>My Submitted Applications</h2>
              <span style={styles.countBadge}>
                {applications.length} submitted
              </span>
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
        )}

        {/* Tab 3: My Candidate Profile */}
        {activeTab === "profile" && (
          <section style={styles.section}>
            {profileError && (
              <div style={styles.errorBanner}>
                <p style={styles.errorBannerText}>{profileError}</p>
                <button onClick={fetchCandidateProfile} style={styles.retryBtn}>
                  Retry
                </button>
              </div>
            )}

            <div style={styles.sectionHeader}>
              <h2 style={styles.sectionTitle}>My Candidate Profile</h2>
              {profile ? (
                <span style={styles.profileBadge}>Active Profile</span>
              ) : (
                <span style={styles.noProfileBadge}>Not Created</span>
              )}
            </div>

            {loadingProfile ? (
              <div style={styles.loadingBox}>
                <div style={styles.spinner}></div>
                <p style={styles.loadingText}>Loading candidate profile...</p>
              </div>
            ) : profile ? (
              <CandidateProfileCard
                profile={profile}
                onEdit={() => setIsProfileFormOpen(true)}
                onDelete={() => setIsDeleteModalOpen(true)}
                onUploadResume={() => {
                  setIsReplaceResumeMode(Boolean(profile.resume_path));
                  setIsResumeUploadOpen(true);
                }}
                onViewResume={handleViewResume}
                onDeleteResume={() => setIsResumeDeleteOpen(true)}
              />
            ) : (
              <div style={styles.emptyProfileCard}>
                <div style={styles.emptyIcon}>👤</div>
                <h3 style={styles.emptyTitle}>
                  You haven't created your profile yet
                </h3>
                <p style={styles.emptySubtitle}>
                  Create your candidate profile first to highlight your technical skills, phone number, and resume.
                </p>
                <button
                  onClick={() => setIsProfileFormOpen(true)}
                  style={styles.createProfileBtn}
                >
                  ➕ Create Candidate Profile
                </button>
              </div>
            )}
          </section>
        )}
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

      {/* Candidate Profile Form Modal (Create / Edit) */}
      {isProfileFormOpen && (
        <CandidateProfileForm
          initialProfile={profile}
          onSave={handleSaveProfile}
          onCancel={() => setIsProfileFormOpen(false)}
        />
      )}

      {/* Delete Profile Confirmation Modal */}
      <DeleteProfileConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteProfileConfirm}
      />

      {/* Resume Upload / Replace Modal */}
      <ResumeUploadModal
        isOpen={isResumeUploadOpen}
        isReplaceMode={isReplaceResumeMode}
        onClose={() => setIsResumeUploadOpen(false)}
        onUpload={handleUploadResumeFile}
      />

      {/* Delete Resume Confirmation Modal */}
      <DeleteResumeConfirmModal
        isOpen={isResumeDeleteOpen}
        onClose={() => setIsResumeDeleteOpen(false)}
        onConfirm={handleDeleteResumeConfirm}
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
  tabBarContainer: {
    maxWidth: "1000px",
    margin: "0 auto 2rem auto",
    borderBottom: "1px solid #334155",
  },
  tabBar: {
    display: "flex",
    gap: "0.5rem",
    overflowX: "auto",
  },
  tabButton: {
    backgroundColor: "transparent",
    color: "#94a3b8",
    border: "none",
    borderBottom: "2px solid transparent",
    padding: "0.75rem 1.25rem",
    fontWeight: "600",
    fontSize: "0.95rem",
    cursor: "pointer",
    transition: "all 0.2s ease",
  },
  activeTabButton: {
    color: "#38bdf8",
    borderBottom: "2px solid #38bdf8",
    backgroundColor: "rgba(56, 189, 248, 0.05)",
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
  profileBadge: {
    color: "#4ade80",
    backgroundColor: "rgba(34, 197, 94, 0.15)",
    fontSize: "0.85rem",
    fontWeight: "600",
    padding: "0.25rem 0.65rem",
    borderRadius: "9999px",
    border: "1px solid rgba(34, 197, 94, 0.3)",
  },
  noProfileBadge: {
    color: "#fbbf24",
    backgroundColor: "rgba(251, 191, 36, 0.15)",
    fontSize: "0.85rem",
    fontWeight: "600",
    padding: "0.25rem 0.65rem",
    borderRadius: "9999px",
    border: "1px solid rgba(251, 191, 36, 0.3)",
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
  emptyProfileCard: {
    backgroundColor: "rgba(30, 41, 59, 0.6)",
    borderRadius: "1rem",
    border: "1px dashed rgba(255, 255, 255, 0.15)",
    padding: "3rem 2rem",
    textAlign: "center",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "1rem",
  },
  emptyIcon: {
    fontSize: "3rem",
    margin: 0,
  },
  emptyTitle: {
    fontSize: "1.25rem",
    fontWeight: "600",
    color: "#f8fafc",
    margin: 0,
  },
  emptySubtitle: {
    color: "#94a3b8",
    fontSize: "0.95rem",
    maxWidth: "500px",
    margin: 0,
    lineHeight: "1.5",
  },
  createProfileBtn: {
    backgroundColor: "#38bdf8",
    color: "#0f172a",
    border: "none",
    borderRadius: "0.5rem",
    padding: "0.75rem 1.5rem",
    fontWeight: "700",
    fontSize: "0.95rem",
    cursor: "pointer",
    marginTop: "0.5rem",
  },
};
