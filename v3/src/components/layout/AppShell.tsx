"use client";

import { useState, type ReactNode } from "react";
import AppSidebar from "./AppSidebar";
import AppHeader from "./AppHeader";
import "./AppShell.css";

export type AppShellProps = {
  children: ReactNode;
};

export default function AppShell({ children }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  function closeSidebar() {
    setSidebarOpen(false);
  }

  function toggleSidebar() {
    setSidebarOpen((prev) => !prev);
  }

  return (
    <div className="ss-app-shell">
      <AppSidebar isOpen={sidebarOpen} onClose={closeSidebar} />

      <div className="ss-app-main">
        <AppHeader onMenuToggle={toggleSidebar} />

        <main className="ss-page-content">{children}</main>
      </div>
    </div>
  );
}
