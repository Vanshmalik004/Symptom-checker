"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface AssessmentSummary {
  id: string;
  possibleCondition: string;
  symptoms: string;
  severity: string;
  specialty: string;
  createdAt: string;
}

export default function HistoryPage() {
  const router = useRouter();
  const [assessments, setAssessments] = useState<AssessmentSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search & Filter state
  const [search, setSearch] = useState("");
  const [severityFilter, setSeverityFilter] = useState("all");

  const fetchHistory = async () => {
    try {
      const queryParams = new URLSearchParams();
      if (severityFilter !== "all") {
        queryParams.set("severity", severityFilter);
      }
      if (search.trim()) {
        queryParams.set("search", search.trim());
      }

      const res = await fetch(`/api/assessments?${queryParams.toString()}`);
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          router.push("/login");
          return;
        }
        throw new Error("Failed to load assessments history");
      }
      const data = await res.json();
      setAssessments(data.assessments || []);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [severityFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    fetchHistory();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this assessment record? This action cannot be undone.")) {
      return;
    }

    try {
      const res = await fetch(`/api/assessments/${id}`, {
        method: "DELETE"
      });

      if (!res.ok) {
        throw new Error("Failed to delete assessment");
      }

      // Refresh list
      fetchHistory();
    } catch (err: any) {
      alert(`Delete error: ${err.message}`);
    }
  };

  if (loading && assessments.length === 0) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60vh", flexDirection: "column", gap: "1rem" }}>
        <div className="spinner" style={{ width: "2rem", height: "2rem", borderTopColor: "var(--primary-color)" }}></div>
        <p style={{ color: "var(--text-muted)", fontWeight: 600 }}>Loading history...</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
      
      {/* Search & Filter Header Card */}
      <div className="card" style={{ padding: "1.5rem" }}>
        <form onSubmit={handleSearchSubmit} style={{ display: "flex", gap: "1rem", flexWrap: "wrap", alignItems: "center" }}>
          
          {/* Search bar */}
          <div style={{ flex: 1, minWidth: "260px", position: "relative" }}>
            <input
              type="text"
              className="form-input"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by condition, symptoms, or specialty..."
            />
          </div>

          {/* Severity Select */}
          <div style={{ minWidth: "150px" }}>
            <select
              className="form-input"
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
            >
              <option value="all">All Severities</option>
              <option value="mild">Mild</option>
              <option value="moderate">Moderate</option>
              <option value="severe">Severe</option>
            </select>
          </div>

          <button type="submit" className="btn btn-primary" style={{ padding: "0.75rem 1.5rem" }}>
            🔍 Search
          </button>
        </form>
      </div>

      {error && (
        <div className="error-box">
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {/* History List/Table Card */}
      <div className="card" style={{ padding: "2rem" }}>
        <h3 style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: "1.5rem" }}>
          📅 Historical Clinical Records
        </h3>

        {assessments.length > 0 ? (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
              <thead>
                <tr style={{ borderBottom: "1.5px solid var(--border-color)", paddingBottom: "0.5rem" }}>
                  <th style={{ padding: "0.75rem 0.5rem", fontSize: "0.8rem", color: "var(--text-muted)" }}>Possible Condition</th>
                  <th style={{ padding: "0.75rem 0.5rem", fontSize: "0.8rem", color: "var(--text-muted)" }}>Checked Date</th>
                  <th style={{ padding: "0.75rem 0.5rem", fontSize: "0.8rem", color: "var(--text-muted)" }}>Severity</th>
                  <th style={{ padding: "0.75rem 0.5rem", fontSize: "0.8rem", color: "var(--text-muted)" }}>Recommended Dept.</th>
                  <th style={{ padding: "0.75rem 0.5rem", fontSize: "0.8rem", color: "var(--text-muted)", textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {assessments.map((a) => (
                  <tr key={a.id} style={{ borderBottom: "1px solid var(--border-color)" }}>
                    <td style={{ padding: "1rem 0.5rem" }}>
                      <div style={{ fontWeight: 700, color: "var(--text-color)" }}>{a.possibleCondition}</div>
                      <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap", maxWidth: "350px" }}>
                        {a.symptoms}
                      </div>
                    </td>
                    <td style={{ padding: "1rem 0.5rem", fontSize: "0.85rem" }}>
                      {new Date(a.createdAt).toLocaleDateString(undefined, {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit"
                      })}
                    </td>
                    <td style={{ padding: "1rem 0.5rem" }}>
                      <span className={`badge ${
                        a.severity.toLowerCase() === "mild"
                          ? "badge-success"
                          : a.severity.toLowerCase() === "moderate"
                          ? "badge-warning"
                          : "badge-danger"
                      }`}>
                        {a.severity}
                      </span>
                    </td>
                    <td style={{ padding: "1rem 0.5rem", fontSize: "0.85rem", fontWeight: 600 }}>
                      🩺 {a.specialty}
                    </td>
                    <td style={{ padding: "1rem 0.5rem", textAlign: "right" }}>
                      <div style={{ display: "flex", justifyContent: "flex-end", gap: "1rem" }}>
                        <Link href={`/dashboard/assessments/${a.id}`} style={{ color: "var(--primary-color)", fontWeight: 700, fontSize: "0.85rem", textDecoration: "none" }}>
                          View Report
                        </Link>
                        <button
                          onClick={() => handleDelete(a.id)}
                          style={{
                            background: "none",
                            border: "none",
                            color: "var(--danger-color)",
                            cursor: "pointer",
                            fontSize: "0.85rem",
                            fontWeight: 600,
                            padding: 0
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ textAlign: "center", padding: "3rem", color: "var(--text-muted)" }}>
            <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>📁</div>
            <p>No assessment records matched your search filters.</p>
          </div>
        )}
      </div>

    </div>
  );
}
