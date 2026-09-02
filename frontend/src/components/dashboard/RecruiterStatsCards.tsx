import React from "react";
import { RecruiterStats } from "../../types/dashboard";

interface RecruiterStatsCardsProps {
  stats: RecruiterStats | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}

export const RecruiterStatsCards: React.FC<RecruiterStatsCardsProps> = ({
  stats,
  loading,
  error,
  onRetry,
}) => {
  if (error) {
    return (
      <div style={styles.errorContainer}>
        <span style={styles.errorText}>⚠️ Failed to load recruiter stats: {error}</span>
        <button onClick={onRetry} style={styles.retryBtn}>
          Retry
        </button>
      </div>
    );
  }

  const statItems = [
    {
      id: "totalJobs",
      label: "Total Jobs",
      value: stats ? stats.totalJobs : 0,
      icon: "💼",
      color: "#38bdf8",
      bgColor: "rgba(56, 189, 248, 0.15)",
      borderColor: "rgba(56, 189, 248, 0.3)",
    },
    {
      id: "openJobs",
      label: "Open Jobs",
      value: stats ? stats.openJobs : 0,
      icon: "🟢",
      color: "#4ade80",
      bgColor: "rgba(34, 197, 94, 0.15)",
      borderColor: "rgba(34, 197, 94, 0.3)",
    },
    {
      id: "totalApps",
      label: "Total Applications",
      value: stats ? stats.totalApplications : 0,
      icon: "📄",
      color: "#c084fc",
      bgColor: "rgba(168, 85, 247, 0.15)",
      borderColor: "rgba(168, 85, 247, 0.3)",
    },
    {
      id: "interviews",
      label: "Interviews",
      value: stats ? stats.interviewApplications : 0,
      icon: "🎯",
      color: "#facc15",
      bgColor: "rgba(250, 204, 21, 0.15)",
      borderColor: "rgba(250, 204, 21, 0.3)",
    },
  ];

  return (
    <div style={styles.grid}>
      {statItems.map((item) => (
        <div
          key={item.id}
          style={{
            ...styles.card,
            backgroundColor: "rgba(30, 41, 59, 0.8)",
            border: `1px solid ${item.borderColor}`,
          }}
        >
          <div style={styles.cardHeader}>
            <span style={styles.cardLabel}>{item.label}</span>
            <div
              style={{
                ...styles.iconWrapper,
                backgroundColor: item.bgColor,
                border: `1px solid ${item.borderColor}`,
              }}
            >
              <span style={styles.icon}>{item.icon}</span>
            </div>
          </div>

          <div style={styles.cardBody}>
            {loading ? (
              <div style={styles.skeletonValue} />
            ) : (
              <span style={{ ...styles.cardValue, color: item.color }}>
                {item.value}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: "1.25rem",
    marginBottom: "1.5rem",
  },
  card: {
    backdropFilter: "blur(12px)",
    borderRadius: "1rem",
    padding: "1.25rem",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.25)",
    transition: "transform 0.2s ease, box-shadow 0.2s ease",
  },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "0.75rem",
  },
  cardLabel: {
    color: "#94a3b8",
    fontSize: "0.875rem",
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  },
  iconWrapper: {
    width: "36px",
    height: "36px",
    borderRadius: "0.5rem",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  icon: {
    fontSize: "1.1rem",
  },
  cardBody: {
    display: "flex",
    alignItems: "baseline",
  },
  cardValue: {
    fontSize: "2.25rem",
    fontWeight: "800",
    lineHeight: "1",
  },
  skeletonValue: {
    width: "48px",
    height: "32px",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: "0.375rem",
    animation: "pulse 1.5s infinite ease-in-out",
  },
  errorContainer: {
    backgroundColor: "rgba(239, 68, 68, 0.12)",
    border: "1px solid rgba(239, 68, 68, 0.3)",
    borderRadius: "0.75rem",
    padding: "0.85rem 1.25rem",
    marginBottom: "1.5rem",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  errorText: {
    color: "#f87171",
    fontSize: "0.9rem",
    fontWeight: "500",
  },
  retryBtn: {
    backgroundColor: "rgba(239, 68, 68, 0.2)",
    color: "#f87171",
    border: "1px solid rgba(239, 68, 68, 0.4)",
    borderRadius: "0.375rem",
    padding: "0.35rem 0.75rem",
    fontSize: "0.85rem",
    fontWeight: "600",
    cursor: "pointer",
  },
};
