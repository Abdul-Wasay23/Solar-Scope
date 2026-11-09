import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ProjectSiteLayoutPage from "./page";
import { ProjectsProvider } from "@/context/ProjectsContext";

let mockParamId = "proj-101";
vi.mock("next/navigation", () => ({
  useParams: () => ({ id: mockParamId }),
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

// Mock dynamic SiteLayoutMap to render simple container in jsdom
vi.mock("@/components/projects/SiteLayoutMap", () => ({
  default: () => <div data-testid="mocked-site-layout-map">Mocked Leaflet Workspace</div>,
}));

describe("Module 4: ProjectSiteLayoutPage", () => {
  it("renders the 12-step layout workspace for an existing project", () => {
    mockParamId = "proj-101";

    render(
      <ProjectsProvider>
        <ProjectSiteLayoutPage params={{ id: "proj-101" }} />
      </ProjectsProvider>
    );

    // Header & Breadcrumb
    expect(
      screen.getByRole("heading", { level: 1, name: /Rooftop Engineering & Panel Layout/i })
    ).toBeInTheDocument();
    expect(screen.getByText("Gulberg Green Residential Solar")).toBeInTheDocument();

    // Key Metrics Bar
    expect(screen.getByText("Site Perimeter")).toBeInTheDocument();
    expect(screen.getByText("Restricted Space")).toBeInTheDocument();
    expect(screen.getByText("Usable Roof Area")).toBeInTheDocument();
    expect(screen.getByText("Active Modules")).toBeInTheDocument();
    expect(screen.getByText("Estimated DC Capacity")).toBeInTheDocument();

    // 5 Workflow Tabs
    expect(screen.getByRole("tab", { name: /1\. Boundary/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /2\. Zones/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /3\. Generator/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /4\. Edit/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /5\. Validation/i })).toBeInTheDocument();

    // Global action buttons
    expect(screen.getByRole("button", { name: /Save Layout/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Finalize Layout/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Reset/i })).toBeInTheDocument();

    // Engineering disclaimer
    expect(screen.getByText(/Engineering Disclaimer:/i)).toBeInTheDocument();
  });

  it("switches workflow tabs correctly", () => {
    mockParamId = "proj-101";

    render(
      <ProjectsProvider>
        <ProjectSiteLayoutPage params={{ id: "proj-101" }} />
      </ProjectsProvider>
    );

    // Switch to Zones tab
    const zonesTab = screen.getByRole("tab", { name: /2\. Zones/i });
    fireEvent.click(zonesTab);
    expect(screen.getByText("Restricted Zones & Obstacles")).toBeInTheDocument();
    expect(screen.getByText("Obstacle Category")).toBeInTheDocument();

    // Switch to Generator tab
    const generatorTab = screen.getByRole("tab", { name: /3\. Generator/i });
    fireEvent.click(generatorTab);
    expect(screen.getByText("Solar Array Generator")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Generate Array Layout/i })).toBeInTheDocument();

    // Switch to Validation tab
    const validationTab = screen.getByRole("tab", { name: /5\. Validation/i });
    fireEvent.click(validationTab);
    expect(screen.getByText("Validation & Finalization")).toBeInTheDocument();
    expect(screen.getByText("Panel Overlap Check")).toBeInTheDocument();
  });

  it("renders Project Not Found state when an invalid project ID is provided", () => {
    mockParamId = "non-existent-project";

    render(
      <ProjectsProvider>
        <ProjectSiteLayoutPage params={{ id: "non-existent-project" }} />
      </ProjectsProvider>
    );

    expect(screen.getByRole("heading", { name: "Project Not Found" })).toBeInTheDocument();
    expect(screen.getByText(/We couldn't find any project matching ID/i)).toBeInTheDocument();
  });
});
