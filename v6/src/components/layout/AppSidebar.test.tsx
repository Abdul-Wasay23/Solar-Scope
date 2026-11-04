import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { usePathname } from "next/navigation";
import AppSidebar from "./AppSidebar";
import { AuthProvider } from "@/providers/AuthContext";

vi.mock("next/navigation", () => ({
  usePathname: vi.fn(),
}));

describe("AppSidebar Component", () => {
  function renderSidebar() {
    return render(
      <AuthProvider>
        <AppSidebar isOpen={false} onClose={() => {}} />
      </AuthProvider>,
    );
  }

  it("renders the main navigation links", () => {
    vi.mocked(usePathname).mockReturnValue("/dashboard");

    renderSidebar();

    expect(
      screen.getByRole("link", { name: /dashboard/i })
    ).toBeInTheDocument();

    expect(
      screen.getByRole("link", { name: /projects/i })
    ).toBeInTheDocument();

    expect(
      screen.getByRole("link", { name: /profile settings/i })
    ).toBeInTheDocument();
  });

  it("marks the current page as active", () => {
    vi.mocked(usePathname).mockReturnValue("/dashboard");

    renderSidebar();

    expect(
      screen.getByRole("link", { name: /dashboard/i })
    ).toHaveAttribute("aria-current", "page");
  });
});
