import type { ReactNode } from "react";
import AppShell from "@/components/layout/AppShell";
import RouteGuard from "@/components/layout/RouteGuard";

type WorkspaceLayoutProps = {
  children: ReactNode;
};

export default function WorkspaceLayout({ children }: WorkspaceLayoutProps) {
  return (
    <RouteGuard>
      <AppShell>{children}</AppShell>
    </RouteGuard>
  );
}
