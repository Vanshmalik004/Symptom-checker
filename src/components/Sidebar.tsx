"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import DarkModeToggle from "./DarkModeToggle";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const menuItems = [
    { name: "Dashboard", path: "/dashboard", icon: "📊" },
    { name: "Assessment History", path: "/dashboard/history", icon: "📁" },
  ];

  const handleLogout = async () => {
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (response.ok) {
        window.location.href = "/login";
      }
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  return (
    <aside 
      style={{
        width: "260px",
        backgroundColor: "var(--bg-card)",
        borderRight: "1px solid var(--border-color)",
        display: "flex",
        flexDirection: "column",
        position: "fixed",
        top: 0,
        bottom: 0,
        left: 0,
        zIndex: 100,
        transition: "transform 0.3s ease",
        transform: isOpen ? "translateX(0)" : "translateX(0)",
      }}
      className={isOpen ? "sidebar-open" : ""}
    >
      <div style={{
        height: "70px",
        display: "flex",
        alignItems: "center",
        padding: "0 1.5rem",
        borderBottom: "1px solid var(--border-color)",
        gap: "0.5rem",
      }}>
        <span style={{ color: "var(--primary-color)", fontSize: "1.5rem", fontWeight: "bold" }}>✚</span>
        <span style={{ fontSize: "1.25rem", fontWeight: 800, color: "var(--primary-color)", letterSpacing: "-0.5px" }}>
          dooper <span style={{ fontWeight: 300, color: "var(--text-color)" }}>health</span>
        </span>
      </div>

      <nav style={{
        flex: 1,
        padding: "1.5rem 1rem",
        display: "flex",
        flexDirection: "column",
        gap: "0.5rem",
      }}>
        {menuItems.map((item) => {
          const isActive = pathname === item.path || (item.path !== "/dashboard" && pathname.startsWith(item.path));
          return (
            <Link
              key={item.path}
              href={item.path}
              onClick={onClose}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
                padding: "0.75rem 1rem",
                borderRadius: "var(--radius-sm)",
                color: isActive ? "var(--primary-color)" : "var(--text-muted)",
                backgroundColor: isActive ? "var(--primary-light)" : "transparent",
                fontWeight: 600,
                fontSize: "0.9rem",
                textDecoration: "none",
                transition: "var(--transition)",
              }}
            >
              <span>{item.icon}</span>
              <span>{item.name}</span>
            </Link>
          );
        })}

        <button
          onClick={handleLogout}
          style={{
            marginTop: "auto",
            textAlign: "left",
            width: "100%",
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            padding: "0.75rem 1rem",
            borderRadius: "var(--radius-sm)",
            color: "var(--text-muted)",
            background: "none",
            border: "none",
            cursor: "pointer",
            fontWeight: 600,
            fontSize: "0.9rem",
            transition: "var(--transition)",
          }}
        >
          <span>🚪</span>
          <span>Logout</span>
        </button>
      </nav>

      <div style={{
        padding: "1.5rem",
        borderTop: "1px solid var(--border-color)",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}>
        <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 500 }}>
          v2.0.0
        </span>
        <DarkModeToggle />
      </div>
    </aside>
  );
}
