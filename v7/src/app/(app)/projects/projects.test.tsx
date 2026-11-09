import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import ProjectsPage from "./page";
import { ProjectsProvider } from "@/context/ProjectsContext";
import { demoProjects } from "@/data/demo-projects";

describe("ProjectsPage — Listing, Search, Filters & Counts", () => {
  it("renders page header, create project button, stats bar, and all demo projects", () => {
    render(
      <ProjectsProvider>
        <ProjectsPage />
      </ProjectsProvider>
    );

    // Title and Create button
    expect(screen.getByRole("heading", { level: 1, name: "Projects" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Create Project/i })).toHaveAttribute(
      "href",
      "/projects/new"
    );

    // Stats bar counts
    expect(screen.getByText("Total Projects")).toBeInTheDocument();
    expect(screen.getByText(String(demoProjects.length))).toBeInTheDocument();

    // Verify cards are rendered
    const cards = screen.getAllByRole("link", { name: /^View details for/i });
    expect(cards.length).toBe(demoProjects.length);
  });

  it("filters projects by search query (name match, case-insensitive, trimmed)", () => {
    render(
      <ProjectsProvider>
        <ProjectsPage />
      </ProjectsProvider>
    );

    const searchInput = screen.getByPlaceholderText(/Search by project name or location/i);

    // Search for "gulberg" with spaces
    fireEvent.change(searchInput, { target: { value: "   gulberg   " } });

    const cards = screen.getAllByRole("link", { name: /^View details for/i });
    expect(cards.length).toBe(1);
    expect(screen.getByText("Gulberg Green Residential Solar")).toBeInTheDocument();
  });

  it("filters projects by location in search query", () => {
    render(
      <ProjectsProvider>
        <ProjectsPage />
      </ProjectsProvider>
    );

    const searchInput = screen.getByPlaceholderText(/Search by project name or location/i);

    // Search for Karachi projects
    fireEvent.change(searchInput, { target: { value: "Karachi" } });

    const cards = screen.getAllByRole("link", { name: /^View details for/i });
    expect(cards.length).toBe(2); // Clifton Commercial Rooftop + Korangi Textile Factory
  });

  it("filters projects by status tabs", () => {
    render(
      <ProjectsProvider>
        <ProjectsPage />
      </ProjectsProvider>
    );

    // Click "In Progress" tab
    const inProgressTab = screen.getByRole("tab", { name: /In Progress/i });
    fireEvent.click(inProgressTab);

    const inProgressCount = demoProjects.filter((p) => p.status === "IN_PROGRESS").length;
    const cards = screen.getAllByRole("link", { name: /^View details for/i });
    expect(cards.length).toBe(inProgressCount);

    // Click "All" tab restores all
    const allTab = screen.getByRole("tab", { name: /^All/i });
    fireEvent.click(allTab);

    const allCards = screen.getAllByRole("link", { name: /^View details for/i });
    expect(allCards.length).toBe(demoProjects.length);
  });

  it("combines search query and status filter correctly", () => {
    render(
      <ProjectsProvider>
        <ProjectsPage />
      </ProjectsProvider>
    );

    const searchInput = screen.getByPlaceholderText(/Search by project name or location/i);
    const completedTab = screen.getByRole("tab", { name: /Completed/i });

    // Select Completed
    fireEvent.click(completedTab);

    // Search for "Lahore"
    fireEvent.change(searchInput, { target: { value: "Lahore" } });

    // Only DHA Phase 6 Villa Array matches both Completed AND Lahore
    const cards = screen.getAllByRole("link", { name: /^View details for/i });
    expect(cards.length).toBe(1);
    expect(screen.getByText("DHA Phase 6 Villa Array")).toBeInTheDocument();
  });

  it("displays empty state when search returns no matches and allows clearing filters", () => {
    render(
      <ProjectsProvider>
        <ProjectsPage />
      </ProjectsProvider>
    );

    const searchInput = screen.getByPlaceholderText(/Search by project name or location/i);
    fireEvent.change(searchInput, { target: { value: "NonExistentKeywordXYZ" } });

    expect(screen.getByRole("heading", { name: "No matching projects found" })).toBeInTheDocument();

    // Click Clear Filters button
    const clearBtn = screen.getByRole("button", { name: /Clear Filters/i });
    fireEvent.click(clearBtn);

    // All demo projects should be restored
    const cards = screen.getAllByRole("link", { name: /^View details for/i });
    expect(cards.length).toBe(demoProjects.length);
  });

  it("allows clearing search using search clear button (X)", () => {
    render(
      <ProjectsProvider>
        <ProjectsPage />
      </ProjectsProvider>
    );

    const searchInput = screen.getByPlaceholderText(/Search by project name or location/i);
    fireEvent.change(searchInput, { target: { value: "Gulberg" } });

    const clearInputBtn = screen.getByRole("button", { name: /Clear search input/i });
    fireEvent.click(clearInputBtn);

    expect(searchInput).toHaveValue("");
    const cards = screen.getAllByRole("link", { name: /^View details for/i });
    expect(cards.length).toBe(demoProjects.length);
  });
});
