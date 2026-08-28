import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { login as loginApi } from "../services/authService";
import { useAuth } from "../context/AuthContext";
import { UserRole } from "../types/auth";

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const { login: authLogin } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password.trim()) {
      setError("Email and password are required");
      return;
    }

    try {
      setSubmitting(true);
      const res = await loginApi({
        email: email.trim(),
        password: password.trim(),
      });

      if (!res.data || !res.data.accessToken) {
        throw new Error("No access token returned from login server");
      }

      // Verify token with GET /api/auth/me and retrieve authenticated role
      const { role } = await authLogin(res.data.accessToken);

      // Redirect strictly based on role returned by GET /api/auth/me
      if (role === UserRole.RECRUITER) {
        navigate("/recruiter", { replace: true });
      } else if (role === UserRole.CANDIDATE) {
        navigate("/candidate", { replace: true });
      } else {
        setError("Unknown profile role");
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Login failed";
      setError(errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.header}>
          <h1 style={styles.title}>Applicant Tracker</h1>
          <p style={styles.subtitle}>Log in to your account</p>
        </div>

        <form onSubmit={handleSubmit} style={styles.form}>
          {error && (
            <div style={styles.errorBanner}>
              <p style={styles.errorText}>{error}</p>
            </div>
          )}

          <div style={styles.field}>
            <label htmlFor="email" style={styles.label}>
              Email Address
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
              style={styles.input}
              disabled={submitting}
            />
          </div>

          <div style={styles.field}>
            <label htmlFor="password" style={styles.label}>
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Your password"
              style={styles.input}
              disabled={submitting}
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            style={{
              ...styles.button,
              ...(submitting ? styles.buttonDisabled : {}),
            }}
          >
            {submitting ? "Authenticating..." : "Log In"}
          </button>
        </form>

        <div style={styles.footer}>
          <p style={styles.footerText}>
            Don't have an account?{" "}
            <Link to="/signup" style={styles.link}>
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: "100vh",
    backgroundColor: "#0f172a",
    color: "#f8fafc",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "1.5rem",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  },
  card: {
    backgroundColor: "rgba(30, 41, 59, 0.8)",
    backdropFilter: "blur(12px)",
    borderRadius: "1rem",
    border: "1px solid rgba(255, 255, 255, 0.1)",
    padding: "2.5rem",
    maxWidth: "420px",
    width: "100%",
    boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
  },
  header: {
    textAlign: "center",
    marginBottom: "2rem",
  },
  title: {
    fontSize: "2rem",
    fontWeight: "700",
    margin: 0,
    background: "linear-gradient(135deg, #38bdf8 0%, #818cf8 100%)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
  },
  subtitle: {
    color: "#94a3b8",
    marginTop: "0.5rem",
    fontSize: "0.95rem",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "1.25rem",
  },
  errorBanner: {
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
  button: {
    backgroundColor: "#38bdf8",
    color: "#0f172a",
    fontWeight: "600",
    fontSize: "1rem",
    padding: "0.75rem",
    borderRadius: "0.5rem",
    border: "none",
    cursor: "pointer",
    marginTop: "0.5rem",
    transition: "background-color 0.2s",
  },
  buttonDisabled: {
    opacity: 0.6,
    cursor: "not-allowed",
  },
  footer: {
    marginTop: "1.75rem",
    textAlign: "center",
    borderTop: "1px solid #334155",
    paddingTop: "1.25rem",
  },
  footerText: {
    color: "#94a3b8",
    fontSize: "0.875rem",
    margin: 0,
  },
  link: {
    color: "#38bdf8",
    textDecoration: "none",
    fontWeight: "600",
  },
};
