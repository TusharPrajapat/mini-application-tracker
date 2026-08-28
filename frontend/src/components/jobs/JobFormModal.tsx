import React, { useState, useEffect } from "react";
import { Job, JobStatus, CreateJobPayload, UpdateJobPayload } from "../../types/job";

interface JobFormModalProps {
  isOpen: boolean;
  initialJob?: Job | null;
  onClose: () => void;
  onSubmit: (payload: CreateJobPayload | UpdateJobPayload) => Promise<void>;
}

export const JobFormModal: React.FC<JobFormModalProps> = ({
  isOpen,
  initialJob,
  onClose,
  onSubmit,
}) => {
  const isEditing = Boolean(initialJob);

  const [title, setTitle] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [status, setStatus] = useState<JobStatus>(JobStatus.DRAFT);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialJob) {
      setTitle(initialJob.title);
      setDescription(initialJob.description);
      setStatus(initialJob.status);
    } else {
      setTitle("");
      setDescription("");
      setStatus(JobStatus.DRAFT);
    }
    setError(null);
  }, [initialJob, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError("Job title is required");
      return;
    }

    if (!description.trim()) {
      setError("Job description is required");
      return;
    }

    try {
      setSubmitting(true);
      await onSubmit({
        title: title.trim(),
        description: description.trim(),
        status,
      });
      onClose();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Failed to save job";
      setError(errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.modalCard}>
        <div style={styles.modalHeader}>
          <h2 style={styles.modalTitle}>
            {isEditing ? "Edit Job Posting" : "Create New Job Posting"}
          </h2>
          <button onClick={onClose} style={styles.closeBtn} disabled={submitting}>
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} style={styles.form}>
          {error && (
            <div style={styles.errorBox}>
              <p style={styles.errorText}>{error}</p>
            </div>
          )}

          <div style={styles.field}>
            <label htmlFor="job-title" style={styles.label}>
              Job Title *
            </label>
            <input
              id="job-title"
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Senior Backend Engineer"
              style={styles.input}
              disabled={submitting}
            />
          </div>

          <div style={styles.field}>
            <label htmlFor="job-description" style={styles.label}>
              Job Description *
            </label>
            <textarea
              id="job-description"
              required
              rows={5}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the job responsibilities, skills, and qualifications..."
              style={styles.textarea}
              disabled={submitting}
            />
          </div>

          <div style={styles.field}>
            <label htmlFor="job-status" style={styles.label}>
              Job Status
            </label>
            <select
              id="job-status"
              value={status}
              onChange={(e) => setStatus(Number(e.target.value) as JobStatus)}
              style={styles.select}
              disabled={submitting}
            >
              <option value={JobStatus.DRAFT}>Draft (1)</option>
              <option value={JobStatus.OPEN}>Open (2)</option>
              <option value={JobStatus.CLOSED}>Closed (0)</option>
            </select>
          </div>

          <div style={styles.actions}>
            <button
              type="button"
              onClick={onClose}
              style={styles.cancelBtn}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              style={{
                ...styles.submitBtn,
                ...(submitting ? styles.submitBtnDisabled : {}),
              }}
            >
              {submitting
                ? isEditing
                  ? "Updating job..."
                  : "Creating job..."
                : isEditing
                ? "Update Job"
                : "Create Job"}
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
    backdropFilter: "blur(4px)",
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
    maxWidth: "520px",
    width: "100%",
    boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
  },
  modalHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "1.5rem",
  },
  modalTitle: {
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
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "1.25rem",
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
  label: {
    fontSize: "0.875rem",
    fontWeight: "600",
    color: "#cbd5e1",
  },
  input: {
    backgroundColor: "#0f172a",
    border: "1px solid #334155",
    borderRadius: "0.5rem",
    padding: "0.75rem 1rem",
    color: "#f8fafc",
    fontSize: "0.95rem",
    outline: "none",
  },
  textarea: {
    backgroundColor: "#0f172a",
    border: "1px solid #334155",
    borderRadius: "0.5rem",
    padding: "0.75rem 1rem",
    color: "#f8fafc",
    fontSize: "0.95rem",
    outline: "none",
    resize: "vertical",
    fontFamily: "inherit",
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
    marginTop: "0.5rem",
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
    opacity: 0.6,
    cursor: "not-allowed",
  },
};
