import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, beforeEach } from "vitest";
import NewProjectPage from "./page";
import { ProjectsProvider } from "@/context/ProjectsContext";

// Mock next/navigation useRouter
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

describe("NewProjectPage — Create Project Form", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders all required form fields, navigation, and submit button", () => {
    render(
      <ProjectsProvider>
        <NewProjectPage />
      </ProjectsProvider>
    );

    // Heading
    expect(
      screen.getByRole("heading", { level: 1, name: "Create New Project" })
    ).toBeInTheDocument();

    // Required fields
    expect(screen.getByRole("textbox", { name: /Project Name/i })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: /Location/i })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: /Project Type/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/Roof Area \(m²\)/i)).toBeInTheDocument();

    // Cancel link and Create button
    expect(screen.getByRole("link", { name: /Back to Projects/i })).toHaveAttribute(
      "href",
      "/projects"
    );
    expect(screen.getByRole("link", { name: "Cancel" })).toHaveAttribute(
      "href",
      "/projects"
    );
    expect(screen.getByRole("button", { name: /Create Project/i })).toBeInTheDocument();

    // Map instruction note
    expect(
      screen.getByText(/Search for an address or click on the map to pin your location/i)
    ).toBeInTheDocument();
  });

  it("rejects empty or whitespace-only project name", async () => {
    const user = userEvent.setup();
    render(
      <ProjectsProvider>
        <NewProjectPage />
      </ProjectsProvider>
    );

    const nameInput = screen.getByRole("textbox", { name: /Project Name/i });
    const locationInput = screen.getByRole("textbox", { name: /Location/i });
    const submitBtn = screen.getByRole("button", { name: /Create Project/i });

    // Enter valid location but empty spaces for name
    await user.type(nameInput, "   ");
    await user.type(locationInput, "Islamabad F-6");
    await user.click(submitBtn);

    expect(screen.getByText("Project name is required.")).toBeInTheDocument();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("rejects empty or whitespace-only location", async () => {
    const user = userEvent.setup();
    render(
      <ProjectsProvider>
        <NewProjectPage />
      </ProjectsProvider>
    );

    const nameInput = screen.getByRole("textbox", { name: /Project Name/i });
    const locationInput = screen.getByRole("textbox", { name: /Location/i });
    const submitBtn = screen.getByRole("button", { name: /Create Project/i });

    await user.type(nameInput, "Valid Project Name");
    await user.type(locationInput, "   ");
    await user.click(submitBtn);

    expect(screen.getByText("Location is required.")).toBeInTheDocument();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("rejects zero or negative roof area", async () => {
    const user = userEvent.setup();
    render(
      <ProjectsProvider>
        <NewProjectPage />
      </ProjectsProvider>
    );

    const nameInput = screen.getByRole("textbox", { name: /Project Name/i });
    const locationInput = screen.getByRole("textbox", { name: /Location/i });
    const roofAreaInput = screen.getByLabelText(/Roof Area \(m²\)/i);
    const submitBtn = screen.getByRole("button", { name: /Create Project/i });

    await user.type(nameInput, "Valid Project Name");
    await user.type(locationInput, "Lahore Cantt");

    // Test zero
    await user.type(roofAreaInput, "0");
    await user.click(submitBtn);
    expect(screen.getByText("Roof area must be greater than 0.")).toBeInTheDocument();
    expect(mockPush).not.toHaveBeenCalled();

    // Test negative
    await user.clear(roofAreaInput);
    await user.type(roofAreaInput, "-50");
    await user.click(submitBtn);
    expect(screen.getByText("Roof area must be greater than 0.")).toBeInTheDocument();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("rejects roof area exceeding maximum limit", async () => {
    const user = userEvent.setup();
    render(
      <ProjectsProvider>
        <NewProjectPage />
      </ProjectsProvider>
    );

    const nameInput = screen.getByRole("textbox", { name: /Project Name/i });
    const locationInput = screen.getByRole("textbox", { name: /Location/i });
    const roofAreaInput = screen.getByLabelText(/Roof Area \(m²\)/i);
    const submitBtn = screen.getByRole("button", { name: /Create Project/i });

    await user.type(nameInput, "Huge Solar Park");
    await user.type(locationInput, "Cholistan Desert");
    await user.type(roofAreaInput, "150000");
    await user.click(submitBtn);

    expect(screen.getByText("Roof area cannot exceed 100,000 m².")).toBeInTheDocument();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("accepts valid form with blank optional roof area and redirects to /projects/[id]", async () => {
    const user = userEvent.setup();
    render(
      <ProjectsProvider>
        <NewProjectPage />
      </ProjectsProvider>
    );

    const nameInput = screen.getByRole("textbox", { name: /Project Name/i });
    const locationInput = screen.getByRole("textbox", { name: /Location/i });
    const submitBtn = screen.getByRole("button", { name: /Create Project/i });

    await user.type(nameInput, "  Modern Villa Solar  ");
    await user.type(locationInput, "  DHA Phase 5, Lahore  ");
    await user.click(submitBtn);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith(expect.stringMatching(/^\/projects\/proj-/));
    });
  });

  it("accepts valid form with positive roof area and selected type", async () => {
    const user = userEvent.setup();
    render(
      <ProjectsProvider>
        <NewProjectPage />
      </ProjectsProvider>
    );

    const nameInput = screen.getByRole("textbox", { name: /Project Name/i });
    const locationInput = screen.getByRole("textbox", { name: /Location/i });
    const typeSelect = screen.getByRole("combobox", { name: /Project Type/i });
    const roofAreaInput = screen.getByLabelText(/Roof Area \(m²\)/i);
    const submitBtn = screen.getByRole("button", { name: /Create Project/i });

    await user.type(nameInput, "Plaza Rooftop Solar");
    await user.type(locationInput, "Blue Area, Islamabad");
    await user.selectOptions(typeSelect, "Commercial");
    await user.type(roofAreaInput, "850");

    await user.click(submitBtn);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith(expect.stringMatching(/^\/projects\/proj-/));
    });
  });
});
