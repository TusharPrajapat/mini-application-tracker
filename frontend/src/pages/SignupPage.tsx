import React, { useState } from "react";
import { Link } from "react-router-dom";
import { signup } from "../services/authService";
import { UserRole } from "../types/auth";

export const SignupPage: React.FC = () => {
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [role, setRole] = useState<UserRole>(UserRole.CANDIDATE);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!email.trim() || !password.trim()) {
      setError("Email and password are required");
      return;
    }

    try {
      setSubmitting(true);
      await signup({
        email: email.trim(),
        password: password.trim(),
        role,
      });

      setSuccess(true);
      setEmail("");
      setPassword("");
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Signup failed";
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
          <p style={styles.subtitle}>Create a new account</p>
        </div>

        {success ? (
          <div style={styles.successBox}>
            <p style={styles.successTitle}>🎉 Registration Successful!</p>
            <p style={styles.successText}>
              Your account and profile have been created. Please log in to continue.
            </p>
            <Link to="/login" style={styles.primaryButtonLink}>
              Go to Login
            </Link>
          </div>
        ) : (
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
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                style={styles.input}
                disabled={submitting}
              />
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Select Role</label>
              <div style={styles.radioGroup}>
                <label style={styles.radioLabel}>
                  <input
                    type="radio"
                    name="role"
                    value={UserRole.RECRUITER}
                    checked={role === UserRole.RECRUITER}
                    onChange={() => setRole(UserRole.RECRUITER)}
                    disabled={submitting}
                    style={styles.radio}
                  />
                  <span>Recruiter</span>
                </label>

                <label style={styles.radioLabel}>
                  <input
                    type="radio"
                    name="role"
                    value={UserRole.CANDIDATE}
                    checked={role === UserRole.CANDIDATE}
                    onChange={() => setRole(UserRole.CANDIDATE)}
                    disabled={submitting}
                    style={styles.radio}
                  />
                  <span>Candidate</span>
                </label>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              style={{
                ...styles.button,
                ...(submitting ? styles.buttonDisabled : {}),
              }}
            >
              {submitting ? "Registering..." : "Sign Up"}
            </button>
          </form>
        )}

        <div style={styles.footer}>
          <p style={styles.footerText}>
            Already have an account?{" "}
            <Link to="/login" style={styles.link}>
              Log in
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
  successBox: {
    textAlign: "center",
    padding: "1.5rem 1rem",
    backgroundColor: "rgba(34, 197, 94, 0.1)",
    borderRadius: "0.75rem",
    border: "1px solid rgba(34, 197, 94, 0.3)",
    marginBottom: "1.5rem",
  },
  successTitle: {
    fontSize: "1.1rem",
    fontWeight: "600",
    color: "#4ade80",
    margin: "0 0 0.5rem 0",
  },
  successText: {
    color: "#cbd5e1",
    fontSize: "0.9rem",
    margin: "0 0 1.25rem 0",
  },
  primaryButtonLink: {
    display: "inline-block",
    backgroundColor: "#38bdf8",
    color: "#0f172a",
    fontWeight: "600",
    padding: "0.6rem 1.25rem",
    borderRadius: "0.5rem",
    textDecoration: "none",
    fontSize: "0.95rem",
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
  radioGroup: {
    display: "flex",
    gap: "1.5rem",
    marginTop: "0.25rem",
  },
  radioLabel: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    cursor: "pointer",
    fontSize: "0.95rem",
    color: "#e2e8f0",
  },
  radio: {
    accentColor: "#38bdf8",
    cursor: "pointer",
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
