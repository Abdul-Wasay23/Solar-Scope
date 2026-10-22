import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import ProjectStatusBadge from "./ProjectStatusBadge";
import ProjectCard from "./ProjectCard";
import ProjectsPage from "@/app/(app)/projects/page";
import { ProjectsProvider } from "@/context/ProjectsContext";
import type { Project } from "@/lib/projects/types";

const mockProject: Project = {
  id: "test-001",
  name: "Test Solar Villa",
  location: "Islamabad Sector F-7",
  type: "Residential",
  status: "IN_PROGRESS",
  roofArea: 3500,
  systemCapacityKw: 25,
  description: "Test description for rooftop solar",
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-01-02T00:00:00Z",
};

describe("ProjectStatusBadge", () => {
  it("renders In Progress with pulse dot", () => {
    render(<ProjectStatusBadge status="IN_PROGRESS" />);
    expect(screen.getByText("In Progress")).toBeInTheDocument();
  });

  it("renders Draft status badge", () => {
    render(<ProjectStatusBadge status="DRAFT" />);
    expect(screen.getByText("Draft")).toBeInTheDocument();
  });

  it("renders Completed status badge", () => {
    render(<ProjectStatusBadge status="COMPLETED" />);
    expect(screen.getByText("Completed")).toBeInTheDocument();
  });

  it("renders Archived status badge", () => {
    render(<ProjectStatusBadge status="ARCHIVED" />);
    expect(screen.getByText("Archived")).toBeInTheDocument();
  });
});

describe("ProjectCard", () => {
  it("renders all essential project details and correct link", () => {
    render(<ProjectCard project={mockProject} />);

    // Name
    expect(screen.getByText("Test Solar Villa")).toBeInTheDocument();
    // Location
    expect(screen.getByText("Islamabad Sector F-7")).toBeInTheDocument();
    // Type
    expect(screen.getByText("Residential")).toBeInTheDocument();
    // Status
    expect(screen.getByText("In Progress")).toBeInTheDocument();
    // Roof Area
    expect(screen.getByText(/3,500 sq ft/i)).toBeInTheDocument();
    // Capacity
    expect(screen.getByText(/25 kW/i)).toBeInTheDocument();

    // Link points to /projects/test-001
    const link = screen.getByRole("link", { name: /View details for Test Solar Villa/i });
    expect(link).toHaveAttribute("href", "/projects/test-001");
  });
});

describe("ProjectsPage", () => {
  it("renders project listing with stats and demo projects", async () => {
    render(
      <ProjectsProvider>
        <ProjectsPage />
      </ProjectsProvider>
    );

    // Title and Create Project button
    expect(screen.getByRole("heading", { level: 1, name: "Projects" })).toBeInTheDocument();
    const createBtn = screen.getByRole("link", { name: /Create Project/i });
    expect(createBtn).toHaveAttribute("href", "/projects/new");

    // Check stats are rendered
    expect(screen.getByText("Total Projects")).toBeInTheDocument();

    // Check demo projects are displayed
    expect(screen.getByText("Gulberg Green Residential Solar")).toBeInTheDocument();
    expect(screen.getByText("DHA Phase 6 Villa Array")).toBeInTheDocument();
  });

  it("filters projects by search query (name and location)", async () => {
    const user = userEvent.setup();
    render(
      <ProjectsProvider>
        <ProjectsPage />
      </ProjectsProvider>
    );

    const searchInput = screen.getByPlaceholderText(/Search by project name or location/i);

    // Search by location
    await user.type(searchInput, "Karachi");
    expect(screen.getByText("Clifton Commercial Rooftop")).toBeInTheDocument();
    expect(screen.queryByText("Gulberg Green Residential Solar")).not.toBeInTheDocument();

    // Clear search
    await user.clear(searchInput);
    expect(screen.getByText("Gulberg Green Residential Solar")).toBeInTheDocument();
  });

  it("filters projects by status tabs", async () => {
    const user = userEvent.setup();
    render(
      <ProjectsProvider>
        <ProjectsPage />
      </ProjectsProvider>
    );

    // Click Draft filter tab
    const draftTab = screen.getByRole("tab", { name: /^Draft/i });
    await user.click(draftTab);

    // Check draft projects are shown and others hidden
    expect(screen.getByText("Clifton Commercial Rooftop")).toBeInTheDocument();
    expect(screen.queryByText("DHA Phase 6 Villa Array")).not.toBeInTheDocument();
  });

  it("shows empty state when no search matches and clears filters", async () => {
    const user = userEvent.setup();
    render(
      <ProjectsProvider>
        <ProjectsPage />
      </ProjectsProvider>
    );

    const searchInput = screen.getByPlaceholderText(/Search by project name or location/i);
    await user.type(searchInput, "NonExistentLocationXYZ");

    expect(screen.getByText("No matching projects found")).toBeInTheDocument();

    // Click Clear Filters
    const clearBtn = screen.getByRole("button", { name: /Clear Filters/i });
    await user.click(clearBtn);

    // Projects should be restored
    expect(screen.getByText("Gulberg Green Residential Solar")).toBeInTheDocument();
  });
});
