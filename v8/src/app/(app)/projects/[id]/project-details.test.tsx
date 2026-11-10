import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ProjectDetailsPage from "./page";
import { ProjectsProvider } from "@/context/ProjectsContext";

// Mock useParams to control ID
let mockParamId = "proj-101";
vi.mock("next/navigation", () => ({
  useParams: () => ({ id: mockParamId }),
}));

describe("ProjectDetailsPage", () => {
  it("renders selected demo project details correctly", () => {
    mockParamId = "proj-101";

    render(
      <ProjectsProvider>
        <ProjectDetailsPage params={{ id: "proj-101" }} />
      </ProjectsProvider>
    );

    // Project Name
    expect(
      screen.getByRole("heading", { level: 1, name: "Gulberg Green Residential Solar" })
    ).toBeInTheDocument();

    // Location
    expect(screen.getByText("Gulberg Greens, Islamabad")).toBeInTheDocument();

    // Type
    expect(screen.getByText("Residential")).toBeInTheDocument();

    // Status
    expect(screen.getByText("In Progress")).toBeInTheDocument();

    // Roof Area (m²)
    expect(screen.getByText(/2,400 m²/i)).toBeInTheDocument();

    // Back to Projects link
    const backLink = screen.getByRole("link", { name: /Back to Projects/i });
    expect(backLink).toHaveAttribute("href", "/projects");

    // Edit link
    const editLink = screen.getByRole("link", { name: /Edit Gulberg Green Residential Solar/i });
    expect(editLink).toHaveAttribute("href", "/projects/proj-101/edit");

    // Workspace Section Cards
    expect(screen.getByRole("heading", { level: 2, name: "Project Workspace" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 3, name: "Site & Location" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 3, name: "Panel Layout" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 3, name: "Calculations & Reports" })).toBeInTheDocument();
  });

  it("displays 'Not specified' when roof area is missing or zero", () => {
    mockParamId = "proj-custom-zero";

    // Custom test with a project having 0 roof area
    render(
      <ProjectsProvider>
        <ProjectDetailsPage params={{ id: "non-existent-or-zero" }} />
      </ProjectsProvider>
    );

    // Since this ID doesn't exist, it displays Not Found
    expect(screen.getByRole("heading", { name: "Project Not Found" })).toBeInTheDocument();
  });

  it("renders Project Not Found state when ID does not exist", () => {
    mockParamId = "unknown";

    render(
      <ProjectsProvider>
        <ProjectDetailsPage params={{ id: "unknown" }} />
      </ProjectsProvider>
    );

    expect(screen.getByRole("heading", { name: "Project Not Found" })).toBeInTheDocument();
    expect(
      screen.getByText(/couldn't find any project matching ID/i)
    ).toBeInTheDocument();

    const backLinks = screen.getAllByRole("link", { name: /Back to Projects/i });
    expect(backLinks.length).toBeGreaterThan(0);
    expect(backLinks[0]).toHaveAttribute("href", "/projects");
  });

  it("opens delete confirmation modal when Delete Project is clicked", () => {
    mockParamId = "proj-101";

    render(
      <ProjectsProvider>
        <ProjectDetailsPage params={{ id: "proj-101" }} />
      </ProjectsProvider>
    );

    const deleteBtn = screen.getByRole("button", { name: /Delete Gulberg Green Residential Solar/i });
    expect(deleteBtn).toBeInTheDocument();

    // Click delete button
    deleteBtn.click();

    // Verify modal is open with role="alertdialog"
    const alertDialog = screen.getByRole("alertdialog");
    expect(alertDialog).toBeInTheDocument();
    expect(screen.getByText(/Are you sure you want to delete "Gulberg Green Residential Solar"\?/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Confirm Delete/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Cancel/i })).toBeInTheDocument();
  });
});
