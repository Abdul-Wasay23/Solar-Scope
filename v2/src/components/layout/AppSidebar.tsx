"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Sun,
  LayoutDashboard,
  FolderKanban,
  UserRound,
  X,
  type LucideIcon,
} from "lucide-react";
import "./AppSidebar.css";

export type AppSidebarProps = {
  isOpen: boolean;
  onClose: () => void;
};

type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
};

const navItems: NavItem[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Projects",
    href: "/projects",
    icon: FolderKanban,
  },
  {
    label: "Profile Settings",
    href: "/settings/profile",
    icon: UserRound,
  },
];

export default function AppSidebar({ isOpen, onClose }: AppSidebarProps) {
  const pathname = usePathname();

  return (
    <>
      <button
        type="button"
        className={`ss-sidebar-overlay ${isOpen ? "is-visible" : ""}`}
        onClick={onClose}
        aria-label="Close navigation menu"
        tabIndex={isOpen ? 0 : -1}
      />

      <aside
        id="app-sidebar"
        className={`ss-sidebar ${isOpen ? "is-open" : ""}`}
        aria-label="Main navigation"
      >
        <div className="ss-sidebar-brand">
          <Link href="/" className="ss-brand-link" onClick={onClose}>
            <span className="ss-brand-icon">
              <Sun size={22} />
            </span>
            <span className="ss-brand-name">SolarScope</span>
          </Link>

          <button
            type="button"
            className="ss-sidebar-close"
            onClick={onClose}
            aria-label="Close sidebar"
          >
            <X size={20} />
          </button>
        </div>

        <div className="ss-sidebar-section">
          <p className="ss-sidebar-label">WORKSPACE FOUNDATION</p>

          <nav className="ss-sidebar-nav">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                pathname === item.href ||
                (item.href !== "/" && pathname?.startsWith(`${item.href}/`));

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className={`ss-nav-link ${isActive ? "is-active" : ""}`}
                  aria-current={isActive ? "page" : undefined}
                >
                  <Icon size={18} strokeWidth={2} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="ss-sidebar-footer">
          <div className="ss-sidebar-footer-icon">
            <Sun size={18} />
          </div>
          <div>
            <p className="ss-sidebar-footer-title">SolarScope v1</p>
            <p className="ss-sidebar-footer-text">Module 1 Foundation</p>
          </div>
        </div>
      </aside>
    </>
  );
}
