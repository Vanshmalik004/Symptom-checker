"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (searchParams.get("registered") === "true") {
      setSuccess("Account registered successfully! Please log in.");
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!email || !password) {
      setError("Email and password are required");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to log in");
      } else {
        router.push("/dashboard");
      }
    } catch (err: any) {
      setError("An unexpected network error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-container animate-fade-in">
        <div className="text-center" style={{ marginBottom: "1.5rem" }}>
          <Link href="/login" className="auth-logo">
            <span style={{ color: "var(--primary-color)" }}>✚</span> dooper <span style={{ fontWeight: 300, color: "var(--text-muted)" }}>health</span>
          </Link>
          <h2 style={{ fontSize: "1.75rem", marginBottom: "0.5rem" }}>Welcome Back</h2>
          <p className="text-muted" style={{ fontSize: "0.9rem" }}>
            Log in to access your medical dashboard and run symptom assessments
          </p>
        </div>

        <div className="card">
          {success && (
            <div className="badge badge-success" style={{ width: "100%", padding: "0.75rem 1rem", fontSize: "0.875rem", borderRadius: "var(--radius-md)", marginBottom: "1.25rem", display: "flex", gap: "0.5rem" }}>
              <span>✓</span>
              <span>{success}</span>
            </div>
          )}

          {error && (
            <div className="error-box">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label" htmlFor="email">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                className="form-input"
                placeholder="e.g. john@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                type="password"
                className="form-input"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                required
              />
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: "100%", marginTop: "1rem" }} disabled={loading}>
              {loading ? <span className="spinner"></span> : "Log In"}
            </button>
          </form>
        </div>

        <p className="text-center text-muted" style={{ marginTop: "1.5rem", fontSize: "0.9rem" }}>
          Don't have an account?{" "}
          <Link href="/register" style={{ color: "var(--primary-color)", fontWeight: 600, textDecoration: "none" }}>
            Create an Account
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="auth-wrapper">
        <p style={{ color: "var(--text-muted)", fontWeight: 600 }}>Loading Login Form...</p>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
