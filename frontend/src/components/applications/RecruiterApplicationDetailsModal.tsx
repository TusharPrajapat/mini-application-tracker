import React, { useState, useEffect } from "react";
import { Application, ApplicationStage } from "../../types/application";
import {
  getCandidateProfileForApplication,
  getCandidateResumeForApplication,
} from "../../services/applicationService";

interface RecruiterApplicationDetailsModalProps {
  application: Application | null;
  onClose: () => void;
  onUpdateStage: (
    applicationId: number,
    newStage: ApplicationStage,
    version: number
  ) => Promise<void>;
  onRefresh?: () => Promise<void>;
}

interface CandidateProfileData {
  candidate: {
    id: number;
    email: string;
    role: number;
  };
  profile: {
    full_name: string;
    phone?: string | null;
    skills?: string | null;
    experience?: string | null;
    resume_path?: string | null;
    created_at: string;
    updated_at: string;
  };
}

export const RecruiterApplicationDetailsModal: React.FC<
  RecruiterApplicationDetailsModalProps
> = ({ application, onClose, onUpdateStage, onRefresh }) => {
  const [selectedStage, setSelectedStage] = useState<ApplicationStage>(
    ApplicationStage.APPLIED
  );
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Candidate Profile Review State
  const [candidateData, setCandidateData] = useState<CandidateProfileData | null>(null);
  const [loadingProfile, setLoadingProfile] = useState<boolean>(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [loadingResume, setLoadingResume] = useState<boolean>(false);

  useEffect(() => {
    if (application) {
      setSelectedStage(application.stage);
      setError(null);
      setProfileError(null);
      setCandidateData(null);

      // Fetch Candidate Profile associated with this application
      const fetchProfile = async () => {
        try {
          setLoadingProfile(true);
          const res = await getCandidateProfileForApplication(application.id);
          if (res.success && res.data) {
            setCandidateData(res.data);
          }
        } catch (err) {
          const msg =
            err instanceof Error
              ? err.message
              : "Failed to load candidate profile details";
          setProfileError(msg);
        } finally {
          setLoadingProfile(false);
        }
      };

      fetchProfile();
    }
  }, [application]);

  if (!application) return null;

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      setSubmitting(true);
      await onUpdateStage(application.id, selectedStage, application.version);
      onClose();
    } catch (err) {
      const errorMsg =
        err instanceof Error ? err.message : "Failed to update application stage";

      if (
        errorMsg.includes("Conflict") ||
        errorMsg.includes("409") ||
        errorMsg.includes("version") ||
        errorMsg.includes("updated by another")
      ) {
        setError(
          "This application was updated by someone else. Please refresh before changing its stage."
        );
        if (onRefresh) {
          onRefresh();
        }
      } else {
        setError(errorMsg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleViewResume = async () => {
    try {
      setLoadingResume(true);
      const res = await getCandidateResumeForApplication(application.id);
      if (res.success && res.data?.signedUrl) {
        window.open(res.data.signedUrl, "_blank");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to open candidate resume";
      alert(`⚠️ ${msg}`);
    } finally {
      setLoadingResume(false);
    }
  };

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
      return new Date(dateString).toLocaleString();
    } catch {
      return dateString;
    }
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.modalCard}>
        <div style={styles.modalHeader}>
          <div>
            <h2 style={styles.modalTitle}>
              {application.job ? application.job.title : `Job #${application.job_id}`}
            </h2>
            <p style={styles.candidateSubText}>
              Candidate: {application.candidate ? application.candidate.email : `#${application.candidate_id}`}
            </p>
          </div>
          <button onClick={onClose} style={styles.closeBtn} disabled={submitting}>
            ✕
          </button>
        </div>

        <div style={styles.scrollableContent}>
          {/* Section 1: Application Details */}
          <div style={styles.detailsBox}>
            <h3 style={styles.sectionHeader}>📋 Application Specifications</h3>
            <div style={styles.row}>
              <span style={styles.label}>Application ID:</span>
              <span style={styles.val}>#{application.id}</span>
            </div>

            <div style={styles.row}>
              <span style={styles.label}>Current Stage:</span>
              <span>{renderStageBadge(application.stage)}</span>
            </div>

            <div style={styles.row}>
              <span style={styles.label}>Version (Concurrency):</span>
              <span style={styles.val}>v{application.version}</span>
            </div>

            <div style={styles.row}>
              <span style={styles.label}>Applied Date:</span>
              <span style={styles.val}>{formatDate(application.created_at)}</span>
            </div>
          </div>

          {/* Section 2: Candidate Specifications & Profile Review */}
          <div style={styles.detailsBox}>
            <h3 style={styles.sectionHeader}>👤 Applicant Details</h3>

            {loadingProfile ? (
              <div style={styles.loadingBox}>
                <div style={styles.spinner}></div>
                <p style={styles.loadingText}>Loading candidate profile details...</p>
              </div>
            ) : profileError ? (
              <p style={styles.notCreatedText}>
                ⚠️ {profileError.includes("not found") ? "Applicant has not created a candidate profile yet." : profileError}
              </p>
            ) : candidateData ? (
              <div style={styles.profileDetailsGrid}>
                <div style={styles.row}>
                  <span style={styles.label}>Full Name:</span>
                  <span style={styles.valHighlight}>{candidateData.profile.full_name}</span>
                </div>

                <div style={styles.row}>
                  <span style={styles.label}>Email Address:</span>
                  <span style={styles.val}>{candidateData.candidate.email}</span>
                </div>

                {candidateData.profile.phone && (
                  <div style={styles.row}>
                    <span style={styles.label}>Phone Number:</span>
                    <span style={styles.val}>📞 {candidateData.profile.phone}</span>
                  </div>
                )}

                <div style={styles.fieldBlock}>
                  <span style={styles.fieldLabel}>Technical Skills</span>
                  <p style={styles.fieldVal}>
                    {candidateData.profile.skills ? candidateData.profile.skills : "Not specified"}
                  </p>
                </div>

                <div style={styles.fieldBlock}>
                  <span style={styles.fieldLabel}>Experience Summary</span>
                  <p style={styles.fieldVal}>
                    {candidateData.profile.experience ? candidateData.profile.experience : "Not specified"}
                  </p>
                </div>

                {/* Dedicated Resume Action */}
                <div style={styles.fieldBlock}>
                  <span style={styles.fieldLabel}>Resume Document</span>
                  {candidateData.profile.resume_path ? (
                    <button
                      onClick={handleViewResume}
                      disabled={loadingResume}
                      style={styles.viewResumeBtn}
                    >
                      {loadingResume ? "Generating secure link..." : "👁️ View Candidate Resume (PDF)"}
                    </button>
                  ) : (
                    <span style={styles.noResumeText}>No resume uploaded by candidate</span>
                  )}
                </div>
              </div>
            ) : (
              <p style={styles.notCreatedText}>Applicant has not created a candidate profile yet.</p>
            )}
          </div>
        </div>

        {/* Section 3: Stage Update Form */}
        <form onSubmit={handleUpdate} style={styles.form}>
          {error && (
            <div style={styles.errorBox}>
              <p style={styles.errorText}>{error}</p>
            </div>
          )}

          <div style={styles.field}>
            <label htmlFor="change-stage" style={styles.labelHeader}>
              Update Application Stage
            </label>
            <select
              id="change-stage"
              value={selectedStage}
              onChange={(e) =>
                setSelectedStage(Number(e.target.value) as ApplicationStage)
              }
              style={styles.select}
              disabled={submitting}
            >
              <option value={ApplicationStage.APPLIED}>Applied (1)</option>
              <option value={ApplicationStage.SCREENING}>Screening (2)</option>
              <option value={ApplicationStage.INTERVIEW}>Interview (3)</option>
              <option value={ApplicationStage.OFFER}>Offer (4)</option>
              <option value={ApplicationStage.REJECTED}>Rejected (5)</option>
            </select>
          </div>

          <div style={styles.actions}>
            <button
              type="button"
              onClick={onClose}
              style={styles.cancelBtn}
              disabled={submitting}
            >
              Close
            </button>
            <button
              type="submit"
              disabled={submitting || selectedStage === application.stage}
              style={{
                ...styles.submitBtn,
                ...(submitting || selectedStage === application.stage
                  ? styles.submitBtnDisabled
                  : {}),
              }}
            >
              {submitting ? "Updating stage..." : "Save Stage"}
            </button>
          </div>
        </form>
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
    backdropFilter: "blur(6px)",
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
    maxWidth: "580px",
    width: "100%",
    maxHeight: "90vh",
    display: "flex",
    flexDirection: "column",
    boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
  },
  modalHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "1rem",
    borderBottom: "1px solid #334155",
    paddingBottom: "1rem",
  },
  modalTitle: {
    fontSize: "1.35rem",
    fontWeight: "700",
    color: "#f8fafc",
    margin: "0 0 0.25rem 0",
  },
  candidateSubText: {
    color: "#38bdf8",
    fontSize: "0.9rem",
    margin: 0,
    fontWeight: "500",
  },
  closeBtn: {
    backgroundColor: "transparent",
    border: "none",
    color: "#94a3b8",
    fontSize: "1.25rem",
    cursor: "pointer",
  },
  scrollableContent: {
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
    gap: "1.25rem",
    paddingRight: "0.25rem",
    marginBottom: "1.25rem",
  },
  detailsBox: {
    backgroundColor: "#0f172a",
    borderRadius: "0.75rem",
    padding: "1.25rem",
    border: "1px solid #334155",
    display: "flex",
    flexDirection: "column",
    gap: "0.75rem",
  },
  sectionHeader: {
    fontSize: "1rem",
    fontWeight: "600",
    color: "#e2e8f0",
    margin: "0 0 0.25rem 0",
  },
  row: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  label: {
    color: "#94a3b8",
    fontSize: "0.875rem",
  },
  val: {
    color: "#e2e8f0",
    fontWeight: "600",
    fontSize: "0.9rem",
  },
  valHighlight: {
    color: "#38bdf8",
    fontWeight: "700",
    fontSize: "0.95rem",
  },
  profileDetailsGrid: {
    display: "flex",
    flexDirection: "column",
    gap: "0.85rem",
  },
  fieldBlock: {
    display: "flex",
    flexDirection: "column",
    gap: "0.25rem",
    backgroundColor: "rgba(30, 41, 59, 0.5)",
    padding: "0.75rem",
    borderRadius: "0.5rem",
    border: "1px solid rgba(255, 255, 255, 0.05)",
  },
  fieldLabel: {
    fontSize: "0.75rem",
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    color: "#94a3b8",
  },
  fieldVal: {
    fontSize: "0.9rem",
    color: "#e2e8f0",
    margin: 0,
    whiteSpace: "pre-wrap",
    lineHeight: "1.4",
  },
  viewResumeBtn: {
    backgroundColor: "#38bdf8",
    color: "#0f172a",
    border: "none",
    borderRadius: "0.5rem",
    padding: "0.55rem 1rem",
    fontSize: "0.875rem",
    fontWeight: "700",
    cursor: "pointer",
    alignSelf: "flex-start",
    marginTop: "0.25rem",
  },
  noResumeText: {
    color: "#fbbf24",
    fontSize: "0.85rem",
    fontWeight: "500",
  },
  notCreatedText: {
    color: "#94a3b8",
    fontSize: "0.9rem",
    margin: 0,
    fontStyle: "italic",
  },
  loadingBox: {
    textAlign: "center",
    padding: "1.5rem",
  },
  spinner: {
    width: "24px",
    height: "24px",
    border: "2px solid rgba(255, 255, 255, 0.1)",
    borderTop: "2px solid #38bdf8",
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
    margin: "0 auto 0.5rem auto",
  },
  loadingText: {
    color: "#94a3b8",
    margin: 0,
    fontSize: "0.85rem",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "1.25rem",
    borderTop: "1px solid #334155",
    paddingTop: "1.25rem",
  },
  errorBox: {
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    border: "1px solid rgba(239, 68, 68, 0.4)",
    borderRadius: "0.5rem",
    padding: "0.75rem 1rem",
  },
  errorText: {
    color: "#f87171",
    margin: 0,
    fontSize: "0.875rem",
  },
  field: {
    display: "flex",
    flexDirection: "column",
    gap: "0.5rem",
  },
  labelHeader: {
    fontSize: "0.9rem",
    fontWeight: "600",
    color: "#f8fafc",
  },
  select: {
    backgroundColor: "#0f172a",
    border: "1px solid #334155",
    borderRadius: "0.5rem",
    padding: "0.75rem 1rem",
    color: "#f8fafc",
    fontSize: "0.95rem",
    outline: "none",
  },
  actions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "0.75rem",
  },
  cancelBtn: {
    backgroundColor: "#334155",
    color: "#cbd5e1",
    fontWeight: "600",
    padding: "0.65rem 1.25rem",
    borderRadius: "0.5rem",
    border: "none",
    cursor: "pointer",
  },
  submitBtn: {
    backgroundColor: "#38bdf8",
    color: "#0f172a",
    fontWeight: "600",
    padding: "0.65rem 1.25rem",
    borderRadius: "0.5rem",
    border: "none",
    cursor: "pointer",
  },
  submitBtnDisabled: {
    opacity: 0.5,
    cursor: "not-allowed",
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
