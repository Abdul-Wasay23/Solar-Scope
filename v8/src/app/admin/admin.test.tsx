import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { AuthProvider } from "@/providers/AuthContext";
import AdminDashboardPage from "./page";

vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn(), push: vi.fn() }) }));

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem(
    "ss_demo_user",
    JSON.stringify({
      id: "3",
      fullName: "Platform Admin",
      email: "admin@example.test",
      role: "ADMIN",
    })
  );

  global.fetch = vi.fn().mockImplementation((url: string) => {
    if (url.includes("/api/admin/settings")) {
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            id: "3",
            fullName: "Platform Admin",
            email: "admin@example.test",
          }),
      });
    }
    if (url.includes("/api/admin/users")) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ users: [] }),
      });
    }
    if (url.includes("/api/admin/site-content")) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ content: {} }),
      });
    }
    if (url.includes("/api/marketplace")) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true, listings: [] }),
      });
    }
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({}),
    });
  }) as any;
});

function renderAdmin() {
  return render(
    <AuthProvider>
      <AdminDashboardPage />
    </AuthProvider>
  );
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
