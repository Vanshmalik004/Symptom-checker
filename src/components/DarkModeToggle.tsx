"use client";

import { useEffect, useState } from "react";

export default function DarkModeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    // Check local storage or body class
    const isDark = document.body.classList.contains("dark");
    setDark(isDark);
  }, []);

  const toggle = () => {
    const nextDark = !dark;
    setDark(nextDark);
    if (nextDark) {
      document.body.classList.add("dark");
    } else {
      document.body.classList.remove("dark");
    }
  };

  return (
    <button
      onClick={toggle}
      style={{
        background: "none",
        border: "none",
        cursor: "pointer",
        fontSize: "1.2rem",
        padding: "0.25rem",
      }}
      title="Toggle Dark/Light Mode"
    >
      {dark ? "☀️" : "🌙"}
    </button>
  );
}
