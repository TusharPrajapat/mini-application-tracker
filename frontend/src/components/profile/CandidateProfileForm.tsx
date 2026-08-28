import React, { useState } from "react";
import {
  CandidateProfile,
  CreateCandidateProfilePayload,
  UpdateCandidateProfilePayload,
} from "../../types/candidateProfile";

interface CandidateProfileFormProps {
  initialProfile?: CandidateProfile | null;
  onSave: (
    payload: CreateCandidateProfilePayload | UpdateCandidateProfilePayload
  ) => Promise<void>;
  onCancel: () => void;
}

export const CandidateProfileForm: React.FC<CandidateProfileFormProps> = ({
  initialProfile,
  onSave,
  onCancel,
}) => {
  const isEditMode = Boolean(initialProfile);

  const [fullName, setFullName] = useState<string>(
    initialProfile?.full_name || ""
  );
  const [phone, setPhone] = useState<string>(initialProfile?.phone || "");
  const [skills, setSkills] = useState<string>(initialProfile?.skills || "");
  const [experience, setExperience] = useState<string>(
    initialProfile?.experience || ""
  );

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Client-side validation
    const trimmedName = fullName.trim();
    const trimmedPhone = phone.trim();
    const trimmedSkills = skills.trim();
    const trimmedExperience = experience.trim();

    if (!trimmedName) {
      setErrorMessage("Full Name is required.");
      return;
    }

    if (trimmedName.length > 150) {
      setErrorMessage("Full Name cannot exceed 150 characters.");
      return;
    }

    if (trimmedPhone.length > 20) {
      setErrorMessage("Phone number cannot exceed 20 characters.");
      return;
    }

    try {
      setSubmitting(true);
      // Strictly construct payload without any system/prohibited fields
      const payload: CreateCandidateProfilePayload | UpdateCandidateProfilePayload = {
        full_name: trimmedName,
        phone: trimmedPhone ? trimmedPhone : undefined,
        skills: trimmedSkills ? trimmedSkills : undefined,
        experience: trimmedExperience ? trimmedExperience : undefined,
      };

      await onSave(payload);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to save profile";
      setErrorMessage(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={styles.backdrop}>
      <div style={styles.modalCard}>
        <div style={styles.header}>
          <h2 style={styles.title}>
            {isEditMode ? "✏️ Edit Candidate Profile" : "👤 Create Candidate Profile"}
          </h2>
          <button onClick={onCancel} style={styles.closeBtn}>
            ✕
          </button>
        </div>

        {errorMessage && (
          <div style={styles.errorBox}>
            <p style={styles.errorText}>⚠️ {errorMessage}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.fieldGroup}>
            <label style={styles.label}>
              Full Name <span style={styles.required}>*</span>
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Tushar Sharma"
              maxLength={150}
              required
              style={styles.input}
            />
          </div>

          <div style={styles.fieldGroup}>
            <label style={styles.label}>Phone Number</label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. +91 9876543210"
              maxLength={20}
              style={styles.input}
            />
          </div>

          <div style={styles.fieldGroup}>
            <label style={styles.label}>Technical Skills</label>
            <textarea
              value={skills}
              onChange={(e) => setSkills(e.target.value)}
              placeholder="e.g. React, Node.js, Express, TypeScript, PostgreSQL"
              rows={3}
              style={styles.textarea}
            />
          </div>

          <div style={styles.fieldGroup}>
            <label style={styles.label}>Experience Summary</label>
            <textarea
              value={experience}
              onChange={(e) => setExperience(e.target.value)}
              placeholder="e.g. 3 years of full-stack web application development..."
              rows={4}
              style={styles.textarea}
            />
          </div>

          <div style={styles.buttonRow}>
            <button
              type="button"
              onClick={onCancel}
              disabled={submitting}
              style={styles.cancelBtn}
            >
              Cancel
            </button>
            <button type="submit" disabled={submitting} style={styles.saveBtn}>
              {submitting
                ? "Saving..."
                : isEditMode
                ? "Save Changes"
                : "Create Profile"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  backdrop: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(15, 23, 42, 0.8)",
    backdropFilter: "blur(6px)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
    padding: "1rem",
  },
  modalCard: {
    backgroundColor: "#1e293b",
    borderRadius: "1rem",
    border: "1px solid rgba(255, 255, 255, 0.1)",
    maxWidth: "540px",
    width: "100%",
    padding: "2rem",
    boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.5)",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "1.5rem",
  },
  title: {
    fontSize: "1.35rem",
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
  errorBox: {
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    border: "1px solid rgba(239, 68, 68, 0.4)",
    color: "#f87171",
    padding: "0.75rem 1rem",
    borderRadius: "0.5rem",
    marginBottom: "1.25rem",
  },
  errorText: {
    margin: 0,
    fontSize: "0.9rem",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "1.25rem",
  },
  fieldGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "0.4rem",
  },
  label: {
    fontSize: "0.875rem",
    fontWeight: "600",
    color: "#e2e8f0",
  },
  required: {
    color: "#f87171",
  },
  input: {
    backgroundColor: "#0f172a",
    border: "1px solid #334155",
    borderRadius: "0.5rem",
    color: "#f8fafc",
    padding: "0.75rem 1rem",
    fontSize: "0.95rem",
    outline: "none",
  },
  textarea: {
    backgroundColor: "#0f172a",
    border: "1px solid #334155",
    borderRadius: "0.5rem",
    color: "#f8fafc",
    padding: "0.75rem 1rem",
    fontSize: "0.95rem",
    outline: "none",
    fontFamily: "inherit",
    resize: "vertical",
  },
  buttonRow: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "0.75rem",
    marginTop: "0.5rem",
  },
  cancelBtn: {
    backgroundColor: "transparent",
    color: "#94a3b8",
    border: "1px solid #334155",
    borderRadius: "0.5rem",
    padding: "0.65rem 1.25rem",
    fontWeight: "600",
    fontSize: "0.9rem",
    cursor: "pointer",
  },
  saveBtn: {
    backgroundColor: "#38bdf8",
    color: "#0f172a",
    border: "none",
    borderRadius: "0.5rem",
    padding: "0.65rem 1.25rem",
    fontWeight: "700",
    fontSize: "0.9rem",
    cursor: "pointer",
  },
};
