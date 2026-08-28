import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { SignupPage } from "./pages/SignupPage";
import { LoginPage } from "./pages/LoginPage";
import { RecruiterDashboard } from "./pages/RecruiterDashboard";
import { CandidateDashboard } from "./pages/CandidateDashboard";
import { UserRole } from "./types/auth";

function RootRedirect() {
  const { isAuthenticated, role, loading } = useAuth();

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}></div>
        <p style={styles.loadingText}>Initializing Applicant Tracker...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (role === UserRole.RECRUITER) {
    return <Navigate to="/recruiter" replace />;
  }

  if (role === UserRole.CANDIDATE) {
    return <Navigate to="/candidate" replace />;
  }

  return <Navigate to="/login" replace />;
}

export function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<RootRedirect />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/login" element={<LoginPage />} />

          {/* Protected Recruiter Routes */}
          <Route
            path="/recruiter"
            element={
              <ProtectedRoute requiredRole={UserRole.RECRUITER}>
                <RecruiterDashboard />
              </ProtectedRoute>
            }
          />

          {/* Protected Candidate Routes */}
          <Route
            path="/candidate"
            element={
              <ProtectedRoute requiredRole={UserRole.CANDIDATE}>
                <CandidateDashboard />
              </ProtectedRoute>
            }
          />

          {/* Fallback */}
          <Route path="*" element={<RootRedirect />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

const styles: Record<string, React.CSSProperties> = {
  loadingContainer: {
    minHeight: "100vh",
    backgroundColor: "#0f172a",
    color: "#f8fafc",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  },
  spinner: {
    width: "40px",
    height: "40px",
    border: "3px solid rgba(255, 255, 255, 0.1)",
    borderTop: "3px solid #38bdf8",
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
    marginBottom: "1rem",
  },
  loadingText: {
    color: "#94a3b8",
    fontSize: "0.95rem",
  },
};
