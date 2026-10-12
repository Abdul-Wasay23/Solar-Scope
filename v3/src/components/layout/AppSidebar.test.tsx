import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { usePathname } from "next/navigation";
import AppSidebar from "./AppSidebar";

vi.mock("next/navigation", () => ({
  usePathname: vi.fn(),
}));

describe("AppSidebar Component", () => {
  it("renders the main navigation links", () => {
    vi.mocked(usePathname).mockReturnValue("/dashboard");

    render(<AppSidebar isOpen={false} onClose={() => { }} />);

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

    render(<AppSidebar isOpen={false} onClose={() => { }} />);

    expect(
      screen.getByRole("link", { name: /dashboard/i })
    ).toHaveAttribute("aria-current", "page");
  });
});
