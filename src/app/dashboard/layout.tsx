"use client";

import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/Navbar";
import { usePathname } from "next/navigation";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  let pageTitle = "Dashboard";
  if (pathname === "/dashboard/history") {
    pageTitle = "Assessment History";
  } else if (pathname.includes("/dashboard/assessments/")) {
    pageTitle = "AI Symptom Analysis";
  }

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const closeSidebar = () => {
    setSidebarOpen(false);
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh", backgroundColor: "var(--bg-color)" }}>
      {/* Sidebar navigation */}
      <Sidebar isOpen={sidebarOpen} onClose={closeSidebar} />

      {/* Main workspace */}
      <div style={{ flex: 1, marginLeft: "260px", display: "flex", flexDirection: "column" }}>
        {/* Top header navigation */}
        <Navbar title={pageTitle} onToggleSidebar={toggleSidebar} />

        {/* Dynamic page content */}
        <main style={{ padding: "2rem", flex: 1 }}>{children}</main>
      </div>
    </div>
  );
}
