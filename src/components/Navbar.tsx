"use client";

import Link from "next/link";

interface NavbarProps {
  title: string;
  onToggleSidebar: () => void;
}

export default function Navbar({ title, onToggleSidebar }: NavbarProps) {
  return (
    <header
      style={{
        height: "70px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 2rem",
        borderBottom: "1px solid var(--border-color)",
        backgroundColor: "var(--bg-card)",
        position: "sticky",
        top: 0,
        zIndex: 50,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
        <button
          onClick={onToggleSidebar}
          style={{
            display: "none",
            background: "none",
            border: "none",
            fontSize: "1.5rem",
            cursor: "pointer",
            color: "var(--text-color)",
          }}
          className="mobile-nav-toggle"
        >
          ☰
        </button>
        <h1 style={{ fontSize: "1.4rem", fontWeight: 700 }}>{title}</h1>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
        <Link
          href="/dashboard"
          style={{
            color: "var(--primary-color)",
            fontWeight: 700,
            textDecoration: "none",
            fontSize: "0.85rem",
            border: "1px solid var(--primary-color)",
            padding: "0.4rem 0.8rem",
            borderRadius: "var(--radius-md)",
            transition: "var(--transition)",
          }}
        >
          ✚ New Checkup
        </Link>
      </div>
    </header>
  );
}
