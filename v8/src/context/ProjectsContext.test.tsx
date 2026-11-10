import { renderHook, act } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ProjectsProvider, useProjects } from "./ProjectsContext";
import { demoProjects } from "@/data/demo-projects";
import type { ReactNode } from "react";

const wrapper = ({ children }: { children: ReactNode }) => (
  <ProjectsProvider>{children}</ProjectsProvider>
);

describe("ProjectsContext — Shared Project State", () => {
  it("initializes with demo seed projects", () => {
    const { result } = renderHook(() => useProjects(), { wrapper });

    expect(result.current.projects.length).toBe(demoProjects.length);
    expect(result.current.getProject("proj-101")?.name).toBe(
      "Gulberg Green Residential Solar"
    );
  });

  it("throws error when useProjects is consumed outside ProjectsProvider", () => {
    expect(() => {
      renderHook(() => useProjects());
    }).toThrow("useProjects must be used within a ProjectsProvider");
  });

  it("adds a new project with distinct ID, default DRAFT status, and timestamps", () => {
    const { result } = renderHook(() => useProjects(), { wrapper });

    let created: any;
    act(() => {
      created = result.current.addProject({
        name: "Test Solar Villa",
        location: "F-8/3, Islamabad",
        type: "Residential",
        roofArea: 1200,
      });
    });

    expect(created.id).toMatch(/^proj-\d+$/);
    expect(created.name).toBe("Test Solar Villa");
    expect(created.location).toBe("F-8/3, Islamabad");
    expect(created.status).toBe("DRAFT");
    expect(created.roofArea).toBe(1200);
    expect(created.createdAt).toBeDefined();
    expect(created.updatedAt).toBeDefined();

    // Verify it is available in projects listing immediately
    expect(result.current.projects.some((p) => p.id === created.id)).toBe(true);

    // Verify getProject returns the new project
    const retrieved = result.current.getProject(created.id);
    expect(retrieved?.name).toBe("Test Solar Villa");
  });

  it("updates an existing project, refreshes updatedAt, and preserves id and createdAt", () => {
    const { result } = renderHook(() => useProjects(), { wrapper });

    const original = result.current.getProject("proj-101");
    expect(original).toBeDefined();
    const originalCreatedAt = original!.createdAt;

    act(() => {
      result.current.updateProject("proj-101", {
        name: "Updated Gulberg Solar",
        status: "COMPLETED",
        roofArea: 3000,
        // Attempt to pass malicious id and createdAt overwrite
        id: "hacked-id",
        createdAt: "1999-01-01T00:00:00Z",
      } as any);
    });

    const updated = result.current.getProject("proj-101");
    expect(updated).toBeDefined();
    expect(updated?.id).toBe("proj-101"); // ID must be preserved
    expect(updated?.createdAt).toBe(originalCreatedAt); // createdAt must be preserved
    expect(updated?.name).toBe("Updated Gulberg Solar");
    expect(updated?.status).toBe("COMPLETED");
    expect(updated?.roofArea).toBe(3000);
    expect(new Date(updated!.updatedAt).getTime()).toBeGreaterThanOrEqual(
      new Date(original!.updatedAt).getTime()
    );
  });

  it("deletes a project without affecting other projects", () => {
    const { result } = renderHook(() => useProjects(), { wrapper });

    const initialCount = result.current.projects.length;
    const targetId = "proj-102";

    expect(result.current.getProject(targetId)).toBeDefined();

    act(() => {
      result.current.deleteProject(targetId);
    });

    expect(result.current.projects.length).toBe(initialCount - 1);
    expect(result.current.getProject(targetId)).toBeUndefined();

    // Other projects must remain intact
    expect(result.current.getProject("proj-101")).toBeDefined();
    expect(result.current.getProject("proj-103")).toBeDefined();
  });

  it("resets projects to demo dataset when resetToDemo is called", () => {
    const { result } = renderHook(() => useProjects(), { wrapper });

    // Delete a project
    act(() => {
      result.current.deleteProject("proj-101");
    });
    expect(result.current.getProject("proj-101")).toBeUndefined();

    // Reset
    act(() => {
      result.current.resetToDemo();
    });

    expect(result.current.getProject("proj-101")).toBeDefined();
    expect(result.current.projects.length).toBe(demoProjects.length);
  });
});
