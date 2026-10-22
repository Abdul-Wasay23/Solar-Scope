"use client";

import { usePathname, useRouter } from "next/navigation";
import { Menu, Bell, User, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import "./AppHeader.css";

export type AppHeaderProps = {
  onMenuToggle: () => void;
};

const routeTitleMap: Record<string, string> = {
  "/": "Foundation Workspace",
  "/dashboard": "Dashboard",
  "/projects": "Projects",
  "/settings/profile": "Profile Settings",
};

export default function AppHeader({ onMenuToggle }: AppHeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();

  const title = routeTitleMap[pathname ?? "/"] ?? "SolarScope";

  function handleLogout() {
    logout();
    router.replace("/login");
  }

  return (
    <header className="ss-header">
      <div className="ss-header-left">
        <button
          type="button"
          className="ss-menu-button"
          onClick={onMenuToggle}
          aria-label="Open navigation menu"
          aria-controls="app-sidebar"
        >
          <Menu size={22} />
        </button>

        <div className="ss-header-title-wrap">
          <h1 className="ss-header-title">{title}</h1>
          <p className="ss-header-subtitle">
            Solar Planning &amp; Marketplace Ecosystem
          </p>
        </div>
      </div>

      <div className="ss-header-actions">
        <button
          type="button"
          className="ss-notification-button"
          aria-label="View notifications"
          title="Notifications"
        >
          <Bell size={18} />
          <span className="ss-notification-dot" />
        </button>

        <div className="ss-header-divider" />

        <div className="ss-user-profile">
          <span className="ss-user-avatar">
            <User size={18} />
          </span>
          <div className="ss-user-info">
            <span className="ss-user-name">
              {user?.fullName ?? "SolarScope User"}
            </span>
            <span className="ss-user-role">
              {user?.email ?? "Workspace Preview"}
            </span>
          </div>
        </div>

        <button
          type="button"
          className="ss-logout-button"
          onClick={handleLogout}
          aria-label="Sign out"
          title="Sign out"
        >
          <LogOut size={18} />
        </button>
      </div>
    </header>
  );
}
