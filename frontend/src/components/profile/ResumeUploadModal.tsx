import React, { useState } from "react";

interface ResumeUploadModalProps {
  isOpen: boolean;
  isReplaceMode?: boolean;
  onClose: () => void;
  onUpload: (file: File) => Promise<void>;
}

export const ResumeUploadModal: React.FC<ResumeUploadModalProps> = ({
  isOpen,
  isReplaceMode = false,
  onClose,
  onUpload,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMessage(null);
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];

      // Frontend PDF Validation
      const isPdfMime = file.type === "application/pdf";
      const isPdfExt = file.name.toLowerCase().endsWith(".pdf");

      if (!isPdfMime && !isPdfExt) {
        setErrorMessage("Invalid file format. Only PDF files (.pdf) are allowed.");
        setSelectedFile(null);
        return;
      }

      // Frontend 5 MB Size Limit Validation
      const MAX_SIZE = 5 * 1024 * 1024;
      if (file.size > MAX_SIZE) {
        setErrorMessage("File size exceeds maximum allowed limit of 5 MB.");
        setSelectedFile(null);
        return;
      }

      setSelectedFile(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!selectedFile) {
      setErrorMessage("Please select a PDF resume file to upload.");
      return;
    }

    try {
      setSubmitting(true);
      await onUpload(selectedFile);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to upload resume";
      setErrorMessage(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={styles.backdrop}>
      <div style={styles.modalCard}>
        <div style={styles.header}>
          <h3 style={styles.title}>
            {isReplaceMode ? "🔄 Replace Resume" : "📤 Upload Resume (PDF)"}
          </h3>
          <button onClick={onClose} disabled={submitting} style={styles.closeBtn}>
            ✕
          </button>
        </div>

        {errorMessage && (
          <div style={styles.errorBox}>
            <p style={styles.errorText}>⚠️ {errorMessage}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.uploadArea}>
            <input
              type="file"
              accept=".pdf,application/pdf"
              onChange={handleFileChange}
              id="resume-file-input"
              style={styles.fileInput}
            />
            <label htmlFor="resume-file-input" style={styles.uploadLabel}>
              <div style={styles.uploadIcon}>📄</div>
              {selectedFile ? (
                <div style={styles.selectedFileInfo}>
                  <span style={styles.fileName}>{selectedFile.name}</span>
                  <span style={styles.fileSize}>
                    ({(selectedFile.size / (1024 * 1024)).toFixed(2)} MB)
                  </span>
                </div>
              ) : (
                <div style={styles.uploadPrompt}>
                  <span style={styles.promptText}>
                    Click to select PDF resume file
                  </span>
                  <span style={styles.hintText}>
                    Format: PDF only (.pdf) | Max size: 5 MB
                  </span>
                </div>
              )}
            </label>
          </div>

          <div style={styles.buttonRow}>
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              style={styles.cancelBtn}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!selectedFile || submitting}
              style={
                !selectedFile || submitting
                  ? { ...styles.uploadBtn, opacity: 0.5, cursor: "not-allowed" }
                  : styles.uploadBtn
              }
            >
              {submitting
                ? "Uploading..."
                : isReplaceMode
                ? "Replace Resume"
                : "Upload Resume"}
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
    maxWidth: "480px",
    width: "100%",
    padding: "2rem",
    boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.5)",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "1.25rem",
  },
  title: {
    fontSize: "1.3rem",
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
  uploadArea: {
    position: "relative",
  },
  fileInput: {
    display: "none",
  },
  uploadLabel: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    border: "2px dashed #38bdf8",
    borderRadius: "0.75rem",
    padding: "2rem 1.5rem",
    backgroundColor: "rgba(56, 189, 248, 0.05)",
    cursor: "pointer",
    textAlign: "center",
    transition: "all 0.2s ease",
  },
  uploadIcon: {
    fontSize: "2.5rem",
    marginBottom: "0.5rem",
  },
  uploadPrompt: {
    display: "flex",
    flexDirection: "column",
    gap: "0.25rem",
  },
  promptText: {
    color: "#38bdf8",
    fontWeight: "600",
    fontSize: "0.95rem",
  },
  hintText: {
    color: "#94a3b8",
    fontSize: "0.8rem",
  },
  selectedFileInfo: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "0.25rem",
  },
  fileName: {
    color: "#f8fafc",
    fontWeight: "600",
    fontSize: "0.95rem",
    wordBreak: "break-all",
  },
  fileSize: {
    color: "#4ade80",
    fontSize: "0.85rem",
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
  uploadBtn: {
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
