import React, { useEffect, useState, useCallback } from "react";
import { ApplicationTimelineData } from "../../types/applicationTimeline";
import { ApplicationStage } from "../../types/application";
import { getApplicationTimeline } from "../../services/applicationTimelineService";

interface CandidateTimelineModalProps {
  applicationId: number | null;
  onClose: () => void;
}

export const CandidateTimelineModal: React.FC<CandidateTimelineModalProps> = ({
  applicationId,
  onClose,
}) => {
  const [timeline, setTimeline] = useState<ApplicationTimelineData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTimeline = useCallback(async () => {
    if (!applicationId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await getApplicationTimeline(applicationId);
      if (res.success && res.data) {
        setTimeline(res.data);
      }
    } catch (err) {
      const errorMsg =
        err instanceof Error
          ? err.message
          : "Failed to load application timeline";
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  }, [applicationId]);

  useEffect(() => {
    fetchTimeline();
  }, [fetchTimeline]);

  if (!applicationId) return null;

  const renderStageLabel = (label: string, stage: ApplicationStage) => {
    switch (stage) {
      case ApplicationStage.APPLIED:
        return "Applied";
      case ApplicationStage.SCREENING:
        return "Screening";
      case ApplicationStage.INTERVIEW:
        return "Interview";
      case ApplicationStage.OFFER:
        return "Offer";
      case ApplicationStage.REJECTED:
        return "Rejected";
      default:
        return label;
    }
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <div>
            <h2 style={styles.title}>
              {timeline ? timeline.jobTitle : `Application #${applicationId}`}
            </h2>
            <p style={styles.subtitle}>Application Status Timeline</p>
          </div>
          <button onClick={onClose} style={styles.closeBtn}>
            ✕
          </button>
        </div>

        <div style={styles.body}>
          {loading ? (
            <div style={styles.loadingBox}>
              <div style={styles.spinner}></div>
              <p style={styles.loadingText}>Fetching status timeline...</p>
            </div>
          ) : error ? (
            <div style={styles.errorBox}>
              <p style={styles.errorText}>{error}</p>
              <button onClick={fetchTimeline} style={styles.retryBtn}>
                Retry
              </button>
            </div>
          ) : timeline ? (
            <div style={styles.timelineContainer}>
              <div style={styles.timelineHeader}>
                <span style={styles.currentStageLabel}>Current Stage:</span>
                <span
                  style={
                    timeline.currentStage === ApplicationStage.REJECTED
                      ? { ...styles.badge, ...styles.badgeRejected }
                      : { ...styles.badge, ...styles.badgeActive }
                  }
                >
                  {renderStageLabel(
                    timeline.currentStage.toString(),
                    timeline.currentStage
                  )}
                </span>
              </div>

              {/* Vertical Stepper */}
              <div style={styles.stepperWrapper}>
                {timeline.stages.map((item, index) => {
                  const isLast = index === timeline.stages.length - 1;
                  const isRejected = item.stage === ApplicationStage.REJECTED;

                  return (
                    <div key={item.stage} style={styles.stepItem}>
                      {/* Step Line and Node */}
                      <div style={styles.nodeColumn}>
                        <div
                          style={{
                            ...styles.nodeCircle,
                            ...(item.current && isRejected
                              ? styles.nodeCircleRejected
                              : item.current
                              ? styles.nodeCircleCurrent
                              : item.completed
                              ? styles.nodeCircleCompleted
                              : styles.nodeCircleFuture),
                          }}
                        >
                          {item.completed ? (
                            "✓"
                          ) : item.current && isRejected ? (
                            "✖"
                          ) : item.current ? (
                            "●"
                          ) : (
                            "○"
                          )}
                        </div>
                        {!isLast && (
                          <div
                            style={{
                              ...styles.connectingLine,
                              ...(item.completed
                                ? styles.lineCompleted
                                : styles.lineFuture),
                            }}
                          />
                        )}
                      </div>

                      {/* Step Content */}
                      <div style={styles.stepContent}>
                        <div style={styles.stepTitleRow}>
                          <span
                            style={{
                              ...styles.stepTitle,
                              ...(item.current && isRejected
                                ? styles.titleRejected
                                : item.current
                                ? styles.titleCurrent
                                : item.completed
                                ? styles.titleCompleted
                                : styles.titleFuture),
                            }}
                          >
                            {renderStageLabel(item.label, item.stage)}
                          </span>

                          {item.current && (
                            <span
                              style={
                                isRejected
                                  ? styles.currentPillRejected
                                  : styles.currentPill
                              }
                            >
                              Current Stage
                            </span>
                          )}
                        </div>

                        <p style={styles.stepDesc}>
                          {item.completed
                            ? "Completed"
                            : item.current && isRejected
                            ? "Application not selected to move forward"
                            : item.current
                            ? "Currently undergoing evaluation"
                            : "Upcoming stage"}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>

        <div style={styles.footer}>
          <button onClick={onClose} style={styles.closeFooterBtn}>
            Close
          </button>
        </div>
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
    backgroundColor: "rgba(15, 23, 42, 0.75)",
    backdropFilter: "blur(6px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
    padding: "1rem",
  },
  modal: {
    backgroundColor: "#1e293b",
    border: "1px solid rgba(255, 255, 255, 0.12)",
    borderRadius: "1rem",
    width: "100%",
    maxWidth: "520px",
    boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
  },
  header: {
    padding: "1.25rem 1.5rem",
    borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    backgroundColor: "#0f172a",
  },
  title: {
    fontSize: "1.25rem",
    fontWeight: "700",
    color: "#f8fafc",
    margin: 0,
  },
  subtitle: {
    color: "#38bdf8",
    fontSize: "0.85rem",
    fontWeight: "600",
    margin: "0.25rem 0 0 0",
  },
  closeBtn: {
    backgroundColor: "transparent",
    border: "none",
    color: "#94a3b8",
    fontSize: "1.2rem",
    cursor: "pointer",
    padding: "0.2rem",
  },
  body: {
    padding: "1.5rem",
    maxHeight: "65vh",
    overflowY: "auto",
  },
  loadingBox: {
    textAlign: "center",
    padding: "2.5rem 1rem",
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
    fontSize: "0.95rem",
    margin: 0,
  },
  errorBox: {
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    border: "1px solid rgba(239, 68, 68, 0.3)",
    borderRadius: "0.5rem",
    padding: "1rem",
    textAlign: "center",
  },
  errorText: {
    color: "#f87171",
    fontSize: "0.9rem",
    margin: "0 0 0.75rem 0",
  },
  retryBtn: {
    backgroundColor: "rgba(239, 68, 68, 0.2)",
    color: "#f87171",
    border: "1px solid rgba(239, 68, 68, 0.4)",
    borderRadius: "0.375rem",
    padding: "0.35rem 0.85rem",
    fontSize: "0.85rem",
    fontWeight: "600",
    cursor: "pointer",
  },
  timelineContainer: {
    display: "flex",
    flexDirection: "column",
    gap: "1.5rem",
  },
  timelineHeader: {
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
    backgroundColor: "rgba(15, 23, 42, 0.5)",
    padding: "0.75rem 1rem",
    borderRadius: "0.5rem",
    border: "1px solid rgba(255, 255, 255, 0.05)",
  },
  currentStageLabel: {
    color: "#94a3b8",
    fontSize: "0.9rem",
    fontWeight: "600",
  },
  badge: {
    padding: "0.25rem 0.75rem",
    borderRadius: "9999px",
    fontSize: "0.8rem",
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  },
  badgeActive: {
    backgroundColor: "rgba(56, 189, 248, 0.15)",
    color: "#38bdf8",
    border: "1px solid rgba(56, 189, 248, 0.3)",
  },
  badgeRejected: {
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    color: "#f87171",
    border: "1px solid rgba(239, 68, 68, 0.3)",
  },
  stepperWrapper: {
    display: "flex",
    flexDirection: "column",
    paddingLeft: "0.5rem",
  },
  stepItem: {
    display: "flex",
    gap: "1.25rem",
    minHeight: "64px",
  },
  nodeColumn: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
  nodeCircle: {
    width: "28px",
    height: "28px",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "0.85rem",
    fontWeight: "800",
    zIndex: 2,
  },
  nodeCircleCompleted: {
    backgroundColor: "rgba(34, 197, 94, 0.2)",
    color: "#4ade80",
    border: "2px solid #4ade80",
  },
  nodeCircleCurrent: {
    backgroundColor: "#38bdf8",
    color: "#0f172a",
    border: "2px solid #38bdf8",
    boxShadow: "0 0 10px rgba(56, 189, 248, 0.5)",
  },
  nodeCircleRejected: {
    backgroundColor: "#ef4444",
    color: "#ffffff",
    border: "2px solid #ef4444",
    boxShadow: "0 0 10px rgba(239, 68, 68, 0.5)",
  },
  nodeCircleFuture: {
    backgroundColor: "#0f172a",
    color: "#64748b",
    border: "2px solid #334155",
  },
  connectingLine: {
    width: "2px",
    flexGrow: 1,
    margin: "0.25rem 0",
  },
  lineCompleted: {
    backgroundColor: "#4ade80",
  },
  lineFuture: {
    backgroundColor: "#334155",
  },
  stepContent: {
    paddingBottom: "1.25rem",
    flexGrow: 1,
  },
  stepTitleRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "0.5rem",
  },
  stepTitle: {
    fontSize: "1rem",
    fontWeight: "700",
  },
  titleCompleted: {
    color: "#4ade80",
  },
  titleCurrent: {
    color: "#38bdf8",
  },
  titleRejected: {
    color: "#f87171",
  },
  titleFuture: {
    color: "#64748b",
  },
  currentPill: {
    backgroundColor: "rgba(56, 189, 248, 0.15)",
    color: "#38bdf8",
    fontSize: "0.75rem",
    fontWeight: "700",
    padding: "0.2rem 0.5rem",
    borderRadius: "0.375rem",
    border: "1px solid rgba(56, 189, 248, 0.3)",
  },
  currentPillRejected: {
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    color: "#f87171",
    fontSize: "0.75rem",
    fontWeight: "700",
    padding: "0.2rem 0.5rem",
    borderRadius: "0.375rem",
    border: "1px solid rgba(239, 68, 68, 0.3)",
  },
  stepDesc: {
    color: "#94a3b8",
    fontSize: "0.85rem",
    margin: "0.25rem 0 0 0",
  },
  footer: {
    padding: "1rem 1.5rem",
    borderTop: "1px solid rgba(255, 255, 255, 0.08)",
    backgroundColor: "#0f172a",
    display: "flex",
    justifyContent: "flex-end",
  },
  closeFooterBtn: {
    backgroundColor: "#334155",
    color: "#f8fafc",
    border: "none",
    borderRadius: "0.5rem",
    padding: "0.55rem 1.25rem",
    fontSize: "0.9rem",
    fontWeight: "600",
    cursor: "pointer",
  },
};
