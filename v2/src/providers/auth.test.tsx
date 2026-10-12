/**
 * SolarScope — Auth Persistence & Session Tests (Module 2, Steps 4 & 5)
 *
 * Covers:
 *  1. isSafeRedirect utility
 *  2. AuthProvider state (login, register, logout)
 *  3. localStorage persistence — valid restore on remount
 *  4. localStorage persistence — malformed / invalid data rejection
 *  5. localStorage persistence — missing data (fresh session)
 *  6. localStorage persistence — storage error resilience (no crash)
 *  7. Logout clears localStorage
 *  8. RouteGuard: no premature redirect during loading
 *  9. Storage schema validation (via storage module)
 */

import { render, screen, act, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  isSafeRedirect,
  getSafeRedirect,
  AuthProvider,
  useAuth,
} from "@/providers/AuthContext";
import {
  readPersistedUser,
  writePersistedUser,
  clearPersistedUser,
  isValidAuthUser,
} from "@/providers/storage";
import RouteGuard from "@/components/layout/RouteGuard";

// ---------------------------------------------------------------------------
// Mock next/navigation (needed by RouteGuard & auth pages)
// ---------------------------------------------------------------------------

const mockReplace = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace, push: vi.fn() }),
  usePathname: () => "/dashboard",
  useSearchParams: () => ({ get: () => null }),
}));

// ---------------------------------------------------------------------------
// Mock lucide-react (avoid SVG issues in jsdom)
// ---------------------------------------------------------------------------

vi.mock("lucide-react", () => ({
  Sun: () => <span data-testid="icon-sun" />,
  LogOut: () => <span data-testid="icon-logout" />,
  Menu: () => <span />,
  Bell: () => <span />,
  User: () => <span />,
}));

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function AuthStatus() {
  const { isAuthenticated, isLoading, user } = useAuth();
  return (
    <div>
      <span data-testid="loading">{String(isLoading)}</span>
      <span data-testid="authenticated">{String(isAuthenticated)}</span>
      <span data-testid="email">{user?.email ?? "none"}</span>
      <span data-testid="name">{user?.fullName ?? "none"}</span>
    </div>
  );
}

const VALID_USER = {
  id: "demo-001",
  fullName: "Test User",
  email: "test@example.com",
  role: "BUYER" as const,
};

const LS_KEY = "ss_demo_user";

// ---------------------------------------------------------------------------
// 1. isSafeRedirect & getSafeRedirect (Module 2, Step 6)
// ---------------------------------------------------------------------------

describe("isSafeRedirect", () => {
  it("accepts a valid internal path", () => {
    expect(isSafeRedirect("/dashboard")).toBe(true);
  });

  it("accepts a nested internal path", () => {
    expect(isSafeRedirect("/projects/123")).toBe(true);
  });

  it("accepts an internal path with query parameters", () => {
    expect(isSafeRedirect("/projects?status=draft&tab=active")).toBe(true);
  });

  it("accepts an internal path with hash fragments", () => {
    expect(isSafeRedirect("/projects#settings")).toBe(true);
  });

  it("rejects a protocol-relative URL (//evil.com)", () => {
    expect(isSafeRedirect("//evil.com")).toBe(false);
  });

  it("rejects a protocol-relative URL with backslash (/\\evil.com)", () => {
    expect(isSafeRedirect("/\\evil.com")).toBe(false);
  });

  it("rejects percent-encoded protocol-relative URLs (/%2fevil.com)", () => {
    expect(isSafeRedirect("/%2fevil.com")).toBe(false);
  });

  it("rejects an absolute http URL", () => {
    expect(isSafeRedirect("http://evil.com/steal")).toBe(false);
  });

  it("rejects an absolute https URL", () => {
    expect(isSafeRedirect("https://evil.com/phish")).toBe(false);
  });

  it("rejects javascript: schemes", () => {
    expect(isSafeRedirect("/javascript:alert(1)")).toBe(false);
  });

  it("rejects CRLF characters in path", () => {
    expect(isSafeRedirect("/projects\r\nevil")).toBe(false);
  });

  it("rejects a plain string without leading slash", () => {
    expect(isSafeRedirect("evil.com")).toBe(false);
  });

  it("rejects null", () => {
    expect(isSafeRedirect(null)).toBe(false);
  });

  it("rejects undefined", () => {
    expect(isSafeRedirect(undefined)).toBe(false);
  });
});

describe("getSafeRedirect", () => {
  it("returns the target if it is a valid internal route", () => {
    expect(getSafeRedirect("/projects")).toBe("/projects");
  });

  it("preserves query strings on valid routes", () => {
    expect(getSafeRedirect("/projects?status=draft")).toBe("/projects?status=draft");
  });

  it("preserves hash fragments on valid routes", () => {
    expect(getSafeRedirect("/projects#settings")).toBe("/projects#settings");
  });

  it("falls back to default /dashboard for external URLs", () => {
    expect(getSafeRedirect("https://attacker.com")).toBe("/dashboard");
    expect(getSafeRedirect("//attacker.com")).toBe("/dashboard");
  });

  it("falls back to default /dashboard for empty or invalid values", () => {
    expect(getSafeRedirect(null)).toBe("/dashboard");
    expect(getSafeRedirect(undefined)).toBe("/dashboard");
    expect(getSafeRedirect("")).toBe("/dashboard");
    expect(getSafeRedirect("not-a-path")).toBe("/dashboard");
  });

  it("allows a custom safe fallback path", () => {
    expect(getSafeRedirect("https://attacker.com", "/projects")).toBe("/projects");
  });

  it("rejects unsafe custom fallback and reverts to /dashboard", () => {
    expect(getSafeRedirect("https://attacker.com", "https://other.com")).toBe("/dashboard");
  });
});

// ---------------------------------------------------------------------------
// 2. AuthProvider — core state
// ---------------------------------------------------------------------------

describe("AuthProvider — core state", () => {
  beforeEach(() => localStorage.clear());

  it("starts in loading state then resolves to unauthenticated (no stored user)", async () => {
    render(
      <AuthProvider>
        <AuthStatus />
      </AuthProvider>,
    );

    await waitFor(() =>
      expect(screen.getByTestId("loading")).toHaveTextContent("false"),
    );
    expect(screen.getByTestId("authenticated")).toHaveTextContent("false");
  });

  it("login() sets isAuthenticated and stores email", async () => {
    function LoginTrigger() {
      const { login, isAuthenticated, user } = useAuth();
      return (
        <div>
          <span data-testid="auth">{String(isAuthenticated)}</span>
          <span data-testid="email">{user?.email ?? "none"}</span>
          <button onClick={() => login("user@solar.com", "pass")}>Login</button>
        </div>
      );
    }

    render(
      <AuthProvider>
        <LoginTrigger />
      </AuthProvider>,
    );

    await waitFor(() =>
      expect(screen.getByTestId("auth")).toHaveTextContent("false"),
    );

    await act(async () => {
      screen.getByRole("button", { name: "Login" }).click();
    });

    await waitFor(() => {
      expect(screen.getByTestId("auth")).toHaveTextContent("true");
      expect(screen.getByTestId("email")).toHaveTextContent("user@solar.com");
    });
  });

  it("register() sets isAuthenticated with correct full name", async () => {
    function RegTrigger() {
      const { register, isAuthenticated, user } = useAuth();
      return (
        <div>
          <span data-testid="auth">{String(isAuthenticated)}</span>
          <span data-testid="name">{user?.fullName ?? "none"}</span>
          <button onClick={() => register("Jane Doe", "jane@example.com", "pw8chars")}>
            Register
          </button>
        </div>
      );
    }

    render(
      <AuthProvider>
        <RegTrigger />
      </AuthProvider>,
    );

    await waitFor(() =>
      expect(screen.getByTestId("auth")).toHaveTextContent("false"),
    );

    await act(async () => {
      screen.getByRole("button", { name: "Register" }).click();
    });

    await waitFor(() => {
      expect(screen.getByTestId("auth")).toHaveTextContent("true");
      expect(screen.getByTestId("name")).toHaveTextContent("Jane Doe");
    });
  });

  it("logout() clears isAuthenticated and user", async () => {
    function LogoutTrigger() {
      const { login, logout, isAuthenticated } = useAuth();
      return (
        <div>
          <span data-testid="auth">{String(isAuthenticated)}</span>
          <button onClick={() => login("u@x.com", "p")}>Login</button>
          <button onClick={logout}>Logout</button>
        </div>
      );
    }

    render(
      <AuthProvider>
        <LogoutTrigger />
      </AuthProvider>,
    );

    await waitFor(() =>
      expect(screen.getByTestId("auth")).toHaveTextContent("false"),
    );

    await act(async () => {
      screen.getByRole("button", { name: "Login" }).click();
    });

    await waitFor(() =>
      expect(screen.getByTestId("auth")).toHaveTextContent("true"),
    );

    act(() => {
      screen.getByRole("button", { name: "Logout" }).click();
    });

    await waitFor(() =>
      expect(screen.getByTestId("auth")).toHaveTextContent("false"),
    );
  });

  it("throws descriptive error when useAuth is used outside <AuthProvider>", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    function ConsumerOutsideProvider() {
      useAuth();
      return null;
    }
    expect(() => render(<ConsumerOutsideProvider />)).toThrow(
      "useAuth must be used within <AuthProvider>",
    );
    consoleError.mockRestore();
  });
});

// ---------------------------------------------------------------------------
// 3. localStorage persistence — valid user restore
// ---------------------------------------------------------------------------

describe("AuthProvider — persistence (localStorage)", () => {
  beforeEach(() => localStorage.clear());

  it("restores a valid user from localStorage on mount", async () => {
    localStorage.setItem(LS_KEY, JSON.stringify(VALID_USER));

    render(
      <AuthProvider>
        <AuthStatus />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("loading")).toHaveTextContent("false");
      expect(screen.getByTestId("authenticated")).toHaveTextContent("true");
      expect(screen.getByTestId("email")).toHaveTextContent("test@example.com");
    });
  });

  it("logout removes user from localStorage", async () => {
    function LogoutPage() {
      const { login, logout, isAuthenticated } = useAuth();
      return (
        <div>
          <span data-testid="auth">{String(isAuthenticated)}</span>
          <button onClick={() => login("a@b.com", "pass")}>Login</button>
          <button onClick={logout}>Logout</button>
        </div>
      );
    }

    render(
      <AuthProvider>
        <LogoutPage />
      </AuthProvider>,
    );

    await waitFor(() =>
      expect(screen.getByTestId("auth")).toHaveTextContent("false"),
    );

    await act(async () => {
      screen.getByRole("button", { name: "Login" }).click();
    });

    await waitFor(() =>
      expect(screen.getByTestId("auth")).toHaveTextContent("true"),
    );

    // Verify written to localStorage
    expect(localStorage.getItem(LS_KEY)).not.toBeNull();

    act(() => {
      screen.getByRole("button", { name: "Logout" }).click();
    });

    await waitFor(() =>
      expect(screen.getByTestId("auth")).toHaveTextContent("false"),
    );

    // Verify localStorage was cleared
    expect(localStorage.getItem(LS_KEY)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 4 & 5. Storage utility — schema validation & malformed data
// ---------------------------------------------------------------------------

describe("storage utility — readPersistedUser", () => {
  beforeEach(() => localStorage.clear());

  it("returns a valid user when data is correct", () => {
    localStorage.setItem(LS_KEY, JSON.stringify(VALID_USER));
    expect(readPersistedUser()).toMatchObject({
      email: "test@example.com",
      fullName: "Test User",
    });
  });

  it("returns null when localStorage is empty", () => {
    expect(readPersistedUser()).toBeNull();
  });

  it("returns null and clears storage for invalid JSON", () => {
    localStorage.setItem(LS_KEY, "not-json{{");
    expect(readPersistedUser()).toBeNull();
    expect(localStorage.getItem(LS_KEY)).toBeNull();
  });

  it("returns null and clears storage when role is invalid", () => {
    const bad = { ...VALID_USER, role: "HACKER" };
    localStorage.setItem(LS_KEY, JSON.stringify(bad));
    expect(readPersistedUser()).toBeNull();
    expect(localStorage.getItem(LS_KEY)).toBeNull();
  });

  it("returns null and clears storage when email is malformed", () => {
    const bad = { ...VALID_USER, email: "not-an-email" };
    localStorage.setItem(LS_KEY, JSON.stringify(bad));
    expect(readPersistedUser()).toBeNull();
    expect(localStorage.getItem(LS_KEY)).toBeNull();
  });

  it("returns null and clears storage when required fields are missing", () => {
    const bad = { id: "demo-001" }; // missing fullName, email, role
    localStorage.setItem(LS_KEY, JSON.stringify(bad));
    expect(readPersistedUser()).toBeNull();
    expect(localStorage.getItem(LS_KEY)).toBeNull();
  });

  it("returns null when stored data is a plain string (wrong type)", () => {
    localStorage.setItem(LS_KEY, JSON.stringify("just a string"));
    expect(readPersistedUser()).toBeNull();
  });
});

describe("storage utility — writePersistedUser", () => {
  beforeEach(() => localStorage.clear());

  it("writes a user to localStorage", () => {
    writePersistedUser(VALID_USER);
    const raw = localStorage.getItem(LS_KEY);
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw!);
    expect(parsed.email).toBe("test@example.com");
  });

  it("does not throw when localStorage.setItem throws (storage full)", () => {
    const spy = vi.spyOn(Storage.prototype, "setItem").mockImplementationOnce(() => {
      throw new DOMException("QuotaExceededError");
    });
    expect(() => writePersistedUser(VALID_USER)).not.toThrow();
    spy.mockRestore();
  });
});

describe("storage utility — clearPersistedUser", () => {
  beforeEach(() => localStorage.clear());

  it("removes the key from localStorage", () => {
    localStorage.setItem(LS_KEY, JSON.stringify(VALID_USER));
    clearPersistedUser();
    expect(localStorage.getItem(LS_KEY)).toBeNull();
  });

  it("does not throw if key does not exist", () => {
    expect(() => clearPersistedUser()).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// 6. AuthProvider — resilience when localStorage throws on read
// ---------------------------------------------------------------------------

describe("AuthProvider — storage error resilience", () => {
  afterEach(() => vi.restoreAllMocks());

  it("does not crash when localStorage.getItem throws", async () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementationOnce(() => {
      throw new DOMException("SecurityError");
    });

    render(
      <AuthProvider>
        <AuthStatus />
      </AuthProvider>,
    );

    await waitFor(() =>
      expect(screen.getByTestId("loading")).toHaveTextContent("false"),
    );
    // Should resolve as unauthenticated, not throw
    expect(screen.getByTestId("authenticated")).toHaveTextContent("false");
  });
});

// ---------------------------------------------------------------------------
// 7. RouteGuard — loading protection & session-based access control
// ---------------------------------------------------------------------------

describe("RouteGuard — access control & premature redirect prevention", () => {
  beforeEach(() => {
    localStorage.clear();
    mockReplace.mockClear();
  });

  it("shows loading workspace indicator and does NOT redirect while session is hydrating", () => {
    render(
      <AuthProvider>
        <RouteGuard>
          <div data-testid="protected-content">Protected Dashboard Content</div>
        </RouteGuard>
      </AuthProvider>,
    );

    // Synchronously before useEffect hydration completes:
    // RouteGuard must render the loading spinner and must NOT have redirected
    expect(screen.queryByText(/loading workspace/i)).toBeInTheDocument();
    expect(screen.queryByTestId("protected-content")).not.toBeInTheDocument();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("redirects unauthenticated user to /login?next=<encodedPath> once loading finishes", async () => {
    render(
      <AuthProvider>
        <RouteGuard>
          <div data-testid="protected-content">Protected Dashboard Content</div>
        </RouteGuard>
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith("/login?next=%2Fdashboard");
    });
    // Protected content should never be revealed to unauthenticated user
    expect(screen.queryByTestId("protected-content")).not.toBeInTheDocument();
  });

  it("renders protected content and does NOT redirect when valid demo session is restored", async () => {
    localStorage.setItem(LS_KEY, JSON.stringify(VALID_USER));

    render(
      <AuthProvider>
        <RouteGuard>
          <div data-testid="protected-content">Protected Dashboard Content</div>
        </RouteGuard>
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("protected-content")).toBeInTheDocument();
    });
    // Valid session user should not be redirected away
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("clears protected view and redirects when user logs out", async () => {
    localStorage.setItem(LS_KEY, JSON.stringify(VALID_USER));

    function ProtectedWorkspace() {
      const { logout } = useAuth();
      return (
        <div>
          <span data-testid="protected-content">Active Workspace</span>
          <button onClick={logout}>Sign Out</button>
        </div>
      );
    }

    render(
      <AuthProvider>
        <RouteGuard>
          <ProtectedWorkspace />
        </RouteGuard>
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("protected-content")).toBeInTheDocument();
    });

    act(() => {
      screen.getByRole("button", { name: "Sign Out" }).click();
    });

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith("/login?next=%2Fdashboard");
    });
    expect(screen.queryByTestId("protected-content")).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// 8. isValidAuthUser — standalone schema guard tests
// ---------------------------------------------------------------------------

describe("isValidAuthUser", () => {
  it("validates a conforming user object", () => {
    expect(isValidAuthUser(VALID_USER)).toBe(true);
  });

  it("rejects non-object values", () => {
    expect(isValidAuthUser(null)).toBe(false);
    expect(isValidAuthUser(undefined)).toBe(false);
    expect(isValidAuthUser(123)).toBe(false);
    expect(isValidAuthUser("string")).toBe(false);
    expect(isValidAuthUser([])).toBe(false);
  });

  it("rejects empty or whitespace-only name/id", () => {
    expect(isValidAuthUser({ ...VALID_USER, fullName: "   " })).toBe(false);
    expect(isValidAuthUser({ ...VALID_USER, id: "" })).toBe(false);
  });

  it("rejects invalid roles", () => {
    expect(isValidAuthUser({ ...VALID_USER, role: "SUPERUSER" })).toBe(false);
    expect(isValidAuthUser({ ...VALID_USER, role: "" })).toBe(false);
  });
});

