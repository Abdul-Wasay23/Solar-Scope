import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AuthProvider } from "@/providers/AuthContext";
import AdminDashboardPage from "./page";

vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn() }) }));

function renderAdmin() {
  return render(<AuthProvider><AdminDashboardPage /></AuthProvider>);
}

describe("Admin dashboard preview route", () => {
  it("renders the overview without requiring an authenticated session", () => {
    renderAdmin();

    expect(screen.getByRole("heading", { level: 1, name: "Platform overview" })).toBeInTheDocument();
    expect(screen.getByText(/PLATFORM OPERATIONS/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Users" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /log out/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /notifications/i })).not.toBeInTheDocument();
  });

  it("opens user management and its create-user form", () => {
    renderAdmin();

    fireEvent.click(screen.getByRole("button", { name: "Users" }));
    expect(screen.getByRole("heading", { level: 1, name: "Users" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Add user/i }));
    expect(screen.getByRole("button", { name: "Create" })).toBeInTheDocument();
  });
});