import React, { useState } from "react";
import { CandidateProfile } from "../../types/candidateProfile";

interface CandidateProfileCardProps {
  profile: CandidateProfile;
  onEdit: () => void;
  onDelete: () => void;
  onUploadResume: () => void;
  onViewResume: () => Promise<void>;
  onDeleteResume: () => void;
}

export const CandidateProfileCard: React.FC<CandidateProfileCardProps> = ({
  profile,
  onEdit,
  onDelete,
  onUploadResume,
  onViewResume,
  onDeleteResume,
}) => {
  const [loadingViewResume, setLoadingViewResume] = useState<boolean>(false);

  const formattedCreated = new Date(profile.created_at).toLocaleDateString(
    undefined,
    { year: "numeric", month: "short", day: "numeric" }
  );

  const formattedUpdated = new Date(profile.updated_at).toLocaleDateString(
    undefined,
    { year: "numeric", month: "short", day: "numeric" }
  );

  const handleViewResumeClick = async () => {
    try {
      setLoadingViewResume(true);
      await onViewResume();
    } finally {
      setLoadingViewResume(false);
    }
  };

  return (
    <div style={styles.card}>
      <div style={styles.cardHeader}>
        <div>
          <h3 style={styles.name}>{profile.full_name}</h3>
          {profile.phone && <p style={styles.phone}>📞 {profile.phone}</p>}
        </div>
        <div style={styles.actionGroup}>
          <button onClick={onEdit} style={styles.editBtn}>
            ✏️ Edit Profile
          </button>
          <button onClick={onDelete} style={styles.deleteBtn}>
            🗑️ Delete Profile
          </button>
        </div>
      </div>

      <div style={styles.bodyGrid}>
        <div style={styles.fieldBlock}>
          <h4 style={styles.fieldLabel}>Technical Skills</h4>
          <p style={styles.fieldValue}>
            {profile.skills ? profile.skills : "Not specified"}
          </p>
        </div>

        <div style={styles.fieldBlock}>
          <h4 style={styles.fieldLabel}>Experience Summary</h4>
          <p style={styles.fieldValue}>
            {profile.experience ? profile.experience : "Not specified"}
          </p>
        </div>

        {/* Dedicated Resume Section */}
        <div style={styles.resumeSection}>
          <div style={styles.resumeSectionHeader}>
            <h4 style={styles.fieldLabel}>Resume Document</h4>
            {profile.resume_path ? (
              <span style={styles.resumeUploadedBadge}>✓ Resume Uploaded (PDF)</span>
            ) : (
              <span style={styles.noResumeBadge}>No resume uploaded</span>
            )}
          </div>

          {profile.resume_path ? (
            <div style={styles.resumeActionsRow}>
              <button
                onClick={handleViewResumeClick}
                disabled={loadingViewResume}
                style={styles.viewResumeBtn}
              >
                {loadingViewResume ? "Generating link..." : "👁️ View Resume"}
              </button>
              <button onClick={onUploadResume} style={styles.replaceResumeBtn}>
                🔄 Replace Resume
              </button>
              <button onClick={onDeleteResume} style={styles.deleteResumeBtn}>
                🗑️ Delete Resume
              </button>
            </div>
          ) : (
            <div>
              <button onClick={onUploadResume} style={styles.uploadResumeBtn}>
                📤 Upload Resume (PDF)
              </button>
            </div>
          )}
        </div>
      </div>

      <div style={styles.footer}>
        <span>Created: {formattedCreated}</span>
        <span>Last Updated: {formattedUpdated}</span>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  card: {
    backgroundColor: "rgba(30, 41, 59, 0.7)",
    borderRadius: "1rem",
    border: "1px solid rgba(255, 255, 255, 0.08)",
    padding: "1.75rem",
    display: "flex",
    flexDirection: "column",
    gap: "1.5rem",
    backdropFilter: "blur(12px)",
  },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    flexWrap: "wrap",
    gap: "1rem",
    borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
    paddingBottom: "1.25rem",
  },
  name: {
    fontSize: "1.5rem",
    fontWeight: "700",
    color: "#f8fafc",
    margin: "0 0 0.35rem 0",
  },
  phone: {
    color: "#38bdf8",
    fontSize: "0.95rem",
    margin: 0,
    fontWeight: "500",
  },
  actionGroup: {
    display: "flex",
    gap: "0.75rem",
  },
  editBtn: {
    backgroundColor: "rgba(56, 189, 248, 0.15)",
    color: "#38bdf8",
    border: "1px solid rgba(56, 189, 248, 0.3)",
    padding: "0.5rem 1rem",
    borderRadius: "0.5rem",
    fontSize: "0.875rem",
    fontWeight: "600",
    cursor: "pointer",
  },
  deleteBtn: {
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    color: "#f87171",
    border: "1px solid rgba(239, 68, 68, 0.3)",
    padding: "0.5rem 1rem",
    borderRadius: "0.5rem",
    fontSize: "0.875rem",
    fontWeight: "600",
    cursor: "pointer",
  },
  bodyGrid: {
    display: "flex",
    flexDirection: "column",
    gap: "1.25rem",
  },
  fieldBlock: {
    display: "flex",
    flexDirection: "column",
    gap: "0.35rem",
  },
  fieldLabel: {
    fontSize: "0.825rem",
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    color: "#94a3b8",
    margin: 0,
  },
  fieldValue: {
    fontSize: "0.975rem",
    color: "#e2e8f0",
    margin: 0,
    lineHeight: "1.5",
    whiteSpace: "pre-wrap",
  },
  resumeSection: {
    backgroundColor: "rgba(15, 23, 42, 0.5)",
    borderRadius: "0.75rem",
    border: "1px solid rgba(255, 255, 255, 0.05)",
    padding: "1.25rem",
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
  },
  resumeSectionHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  resumeUploadedBadge: {
    backgroundColor: "rgba(34, 197, 94, 0.15)",
    color: "#4ade80",
    border: "1px solid rgba(34, 197, 94, 0.3)",
    padding: "0.25rem 0.65rem",
    borderRadius: "9999px",
    fontSize: "0.8rem",
    fontWeight: "600",
  },
  noResumeBadge: {
    backgroundColor: "rgba(251, 191, 36, 0.15)",
    color: "#fbbf24",
    border: "1px solid rgba(251, 191, 36, 0.3)",
    padding: "0.25rem 0.65rem",
    borderRadius: "9999px",
    fontSize: "0.8rem",
    fontWeight: "600",
  },
  resumeActionsRow: {
    display: "flex",
    gap: "0.75rem",
    flexWrap: "wrap",
  },
  viewResumeBtn: {
    backgroundColor: "#38bdf8",
    color: "#0f172a",
    border: "none",
    borderRadius: "0.5rem",
    padding: "0.5rem 1rem",
    fontSize: "0.875rem",
    fontWeight: "700",
    cursor: "pointer",
  },
  replaceResumeBtn: {
    backgroundColor: "rgba(129, 140, 248, 0.15)",
    color: "#818cf8",
    border: "1px solid rgba(129, 140, 248, 0.3)",
    padding: "0.5rem 1rem",
    borderRadius: "0.5rem",
    fontSize: "0.875rem",
    fontWeight: "600",
    cursor: "pointer",
  },
  deleteResumeBtn: {
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    color: "#f87171",
    border: "1px solid rgba(239, 68, 68, 0.3)",
    padding: "0.5rem 1rem",
    borderRadius: "0.5rem",
    fontSize: "0.875rem",
    fontWeight: "600",
    cursor: "pointer",
  },
  uploadResumeBtn: {
    backgroundColor: "rgba(56, 189, 248, 0.15)",
    color: "#38bdf8",
    border: "1px dashed #38bdf8",
    borderRadius: "0.5rem",
    padding: "0.65rem 1.25rem",
    fontSize: "0.9rem",
    fontWeight: "600",
    cursor: "pointer",
    width: "100%",
  },
  footer: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: "0.8rem",
    color: "#64748b",
    borderTop: "1px solid rgba(255, 255, 255, 0.05)",
    paddingTop: "1rem",
  },
};
