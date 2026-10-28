import type { ReactNode } from "react";
import AppShell from "@/components/layout/AppShell";
import RouteGuard from "@/components/layout/RouteGuard";
import { ProjectsProvider } from "@/context/ProjectsContext";
import { MarketplaceProvider } from "@/context/MarketplaceContext";

type WorkspaceLayoutProps = {
  children: ReactNode;
};

export default function WorkspaceLayout({ children }: WorkspaceLayoutProps) {
  return (
    <RouteGuard>
      <ProjectsProvider>
        <MarketplaceProvider>
          <AppShell>{children}</AppShell>
        </MarketplaceProvider>
      </ProjectsProvider>
    </RouteGuard>
  );
}
