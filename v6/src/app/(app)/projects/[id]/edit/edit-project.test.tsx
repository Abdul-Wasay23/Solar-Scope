import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import EditProjectPage from "./page";
import { ProjectsProvider } from "@/context/ProjectsContext";

let mockParamId = "proj-101";
const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useParams: () => ({ id: mockParamId }),
  useRouter: () => ({ push: mockPush }),
}));

describe("EditProjectPage", () => {
  it("renders and populates existing project fields correctly", () => {
    mockParamId = "proj-101";

    render(
      <ProjectsProvider>
        <EditProjectPage params={{ id: "proj-101" }} />
      </ProjectsProvider>
    );

    // Header & Title
    expect(screen.getByRole("heading", { level: 1, name: "Edit Project" })).toBeInTheDocument();

    // Check pre-populated fields
    const nameInput = screen.getByLabelText(/Project Name/i) as HTMLInputElement;
    expect(nameInput.value).toBe("Gulberg Green Residential Solar");

    const locationInput = screen.getByLabelText(/Location \/ Address/i) as HTMLInputElement;
    expect(locationInput.value).toBe("Gulberg Greens, Islamabad");

    const roofAreaInput = screen.getByLabelText(/Usable Roof Area/i) as HTMLInputElement;
    expect(roofAreaInput.value).toBe("2400");

    // Cancel link
    const cancelLink = screen.getByRole("link", { name: /Cancel/i });
    expect(cancelLink).toHaveAttribute("href", "/projects/proj-101");

    // Save Changes button
    expect(screen.getByRole("button", { name: /Save Changes/i })).toBeInTheDocument();
  });

  it("validates required fields on empty submission", () => {
    mockParamId = "proj-101";

    render(
      <ProjectsProvider>
        <EditProjectPage params={{ id: "proj-101" }} />
      </ProjectsProvider>
    );

    const nameInput = screen.getByLabelText(/Project Name/i);
    const locationInput = screen.getByLabelText(/Location \/ Address/i);
    const submitBtn = screen.getByRole("button", { name: /Save Changes/i });

    // Clear required fields
    fireEvent.change(nameInput, { target: { value: "   " } });
    fireEvent.change(locationInput, { target: { value: "   " } });
    fireEvent.click(submitBtn);

    expect(screen.getByText("Project name is required")).toBeInTheDocument();
    expect(screen.getByText("Location is required")).toBeInTheDocument();
  });

  it("rejects invalid negative or zero roof area", () => {
    mockParamId = "proj-101";

    render(
      <ProjectsProvider>
        <EditProjectPage params={{ id: "proj-101" }} />
      </ProjectsProvider>
    );

    const roofInput = screen.getByLabelText(/Usable Roof Area/i);
    const submitBtn = screen.getByRole("button", { name: /Save Changes/i });

    fireEvent.change(roofInput, { target: { value: "-50" } });
    fireEvent.click(submitBtn);

    expect(screen.getByText("Roof area must be a positive number")).toBeInTheDocument();
  });

  it("renders Project Not Found state when project ID is unknown", () => {
    mockParamId = "unknown-id";

    render(
      <ProjectsProvider>
        <EditProjectPage params={{ id: "unknown-id" }} />
      </ProjectsProvider>
    );

    expect(screen.getByRole("heading", { name: "Project Not Found" })).toBeInTheDocument();
    expect(screen.getByText(/couldn't find any project matching ID/i)).toBeInTheDocument();
  });

  it("renders the interactive map instruction and reset button when coordinates exist", () => {
    mockParamId = "proj-101";

    render(
      <ProjectsProvider>
        <EditProjectPage params={{ id: "proj-101" }} />
      </ProjectsProvider>
    );

    expect(
      screen.getByText(/Click on the map or drag the pin to update geographic coordinates/i)
    ).toBeInTheDocument();
  });
});
