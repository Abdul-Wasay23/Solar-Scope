import type { ReactNode } from "react";
import AppShell from "@/components/layout/AppShell";
import RouteGuard from "@/components/layout/RouteGuard";
import { ProjectsProvider } from "@/context/ProjectsContext";

type WorkspaceLayoutProps = {
  children: ReactNode;
};

export default function WorkspaceLayout({ children }: WorkspaceLayoutProps) {
  return (
    <RouteGuard>
      <ProjectsProvider>
        <AppShell>{children}</AppShell>
      </ProjectsProvider>
    </RouteGuard>
  );
}
