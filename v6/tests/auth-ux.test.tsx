/**
 * SolarScope — Authentication UX, Forms & Accessibility Tests (Module 2, Step 6)
 *
 * Covers:
 *  1. LoginForm validation (empty fields, malformed email)
 *  2. LoginForm error clearing on user input
 *  3. LoginForm submit/loading state (button disabled, spinner, aria-busy)
 *  4. LoginForm password show/hide toggle (accessible label, aria-pressed, keyboard access)
 *  5. RegisterPage validation (empty fields, short password, mismatch, unchecked terms)
 *  6. RegisterPage error clearing on user input
 *  7. RegisterPage submit/loading state
 *  8. Duplicate submission prevention
 */

import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { AuthProvider } from "@/providers/AuthContext";
import LoginForm from "@/app/login/LoginForm";
import RegisterPage from "@/app/register/page";

// ---------------------------------------------------------------------------
// Mock next/navigation
// ---------------------------------------------------------------------------

const mockPush = vi.fn();
const mockReplace = vi.fn();
const mockSearchParamsGet = vi.fn(() => null);

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
  usePathname: () => "/login",
  useSearchParams: () => ({ get: mockSearchParamsGet }),
}));

// ---------------------------------------------------------------------------
// Mock lucide-react
// ---------------------------------------------------------------------------

vi.mock("lucide-react", () => ({
  Sun: () => <span data-testid="icon-sun" />,
  ArrowRight: () => <span data-testid="icon-arrow" />,
  CheckCircle2: () => <span data-testid="icon-check" />,
  Eye: () => <span data-testid="icon-eye" />,
  EyeOff: () => <span data-testid="icon-eye-off" />,
}));

describe("LoginForm — UX, Validation & Accessibility", () => {
  beforeEach(() => {
    localStorage.clear();
    mockReplace.mockClear();
    mockPush.mockClear();
    mockSearchParamsGet.mockReset();
    mockSearchParamsGet.mockReturnValue(null);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("displays validation errors when submitting empty form", async () => {
    render(
      <AuthProvider>
        <LoginForm />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /sign in/i })).toBeInTheDocument();
    });

    fireEvent.submit(screen.getByRole("button", { name: /sign in/i }));

    expect(screen.getByText(/email address is required/i)).toBeInTheDocument();
    expect(screen.getByText(/password is required/i)).toBeInTheDocument();
  });

  it("validates malformed email syntax", async () => {
    const user = userEvent.setup();
    render(
      <AuthProvider>
        <LoginForm />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    });

    await user.type(screen.getByLabelText(/email address/i), "not-an-email");
    await user.type(screen.getByLabelText(/^password/i), "secret123");

    fireEvent.submit(screen.getByRole("button", { name: /sign in/i }));

    expect(screen.getByText(/please enter a valid email address/i)).toBeInTheDocument();
  });

  it("shows Google sign-in after the existing password form", async () => {
    render(
      <AuthProvider>
        <LoginForm />
      </AuthProvider>,
    );

    const passwordLogin = await screen.findByRole("button", { name: /sign in/i });
    const googleLogin = screen.getByRole("link", { name: /sign in with google/i });
    expect(screen.getByText("OR")).toBeInTheDocument();
    expect(googleLogin).toHaveAttribute("href", "/api/auth/google/start");
    expect(passwordLogin.compareDocumentPosition(googleLogin) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("clears error message when user updates the input field", async () => {
    const user = userEvent.setup();
    render(
      <AuthProvider>
        <LoginForm />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /sign in/i })).toBeInTheDocument();
    });

    // Trigger validation
    fireEvent.submit(screen.getByRole("button", { name: /sign in/i }));
    expect(screen.getByText(/email address is required/i)).toBeInTheDocument();

    // Type into email input
    await user.type(screen.getByLabelText(/email address/i), "user@example.com");

    // Email error should clear immediately
    expect(screen.queryByText(/email address is required/i)).not.toBeInTheDocument();
  });

  it("toggles password visibility and updates accessible attributes", async () => {
    const user = userEvent.setup();
    render(
      <AuthProvider>
        <LoginForm />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByLabelText(/^password/i)).toBeInTheDocument();
    });

    const pwdInput = screen.getByLabelText(/^password/i);
    expect(pwdInput).toHaveAttribute("type", "password");

    const toggleBtn = screen.getByRole("button", { name: /show password/i });
    expect(toggleBtn).toHaveAttribute("aria-pressed", "false");

    await user.click(toggleBtn);

    expect(pwdInput).toHaveAttribute("type", "text");
    expect(toggleBtn).toHaveAttribute("aria-label", "Hide password");
    expect(toggleBtn).toHaveAttribute("aria-pressed", "true");

    await user.click(toggleBtn);
    expect(pwdInput).toHaveAttribute("type", "password");
    expect(toggleBtn).toHaveAttribute("aria-label", "Show password");
    expect(toggleBtn).toHaveAttribute("aria-pressed", "false");
  });

  it("disables button and displays loading state during submission", async () => {
    const user = userEvent.setup();
    render(
      <AuthProvider>
        <LoginForm />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    });

    await user.type(screen.getByLabelText(/email address/i), "valid@example.com");
    await user.type(screen.getByLabelText(/^password/i), "password123");

    const submitBtn = screen.getByRole("button", { name: /sign in/i });
    await user.click(submitBtn);

    // During async login, button shows Signing in… and is disabled
    expect(screen.getByText(/signing in…/i)).toBeInTheDocument();
    expect(submitBtn).toBeDisabled();
    expect(submitBtn).toHaveAttribute("aria-busy", "true");

    // Completes and navigates to default /dashboard
    await waitFor(
      () => {
        expect(screen.getByText(/sign-in successful/i)).toBeInTheDocument();
      },
      { timeout: 2000 }
    );
  });
});

describe("RegisterPage — UX, Validation & Accessibility", () => {
  beforeEach(() => {
    localStorage.clear();
    mockReplace.mockClear();
    mockPush.mockClear();
  });

  it("displays validation errors for all empty required fields", async () => {
    render(
      <AuthProvider>
        <RegisterPage />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /create account/i })).toBeInTheDocument();
    });

    fireEvent.submit(screen.getByRole("button", { name: /create account/i }));

    expect(screen.getByText(/full name is required/i)).toBeInTheDocument();
    expect(screen.getByText(/email address is required/i)).toBeInTheDocument();
    expect(screen.getByText(/password is required/i)).toBeInTheDocument();
    expect(screen.getByText(/please confirm your password/i)).toBeInTheDocument();
    expect(screen.getByText(/you must agree to the terms of service/i)).toBeInTheDocument();
  });

  it("validates password length minimum of 8 characters", async () => {
    const user = userEvent.setup();
    render(
      <AuthProvider>
        <RegisterPage />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
    });

    await user.type(screen.getByLabelText(/full name/i), "Abdul Wasay");
    await user.type(screen.getByLabelText(/email address/i), "abdul@example.com");
    await user.type(screen.getByLabelText(/^password/i), "short");
    await user.type(screen.getByLabelText(/confirm password/i), "short");
    await user.click(screen.getByRole("checkbox"));

    fireEvent.submit(screen.getByRole("button", { name: /create account/i }));

    expect(screen.getByText(/password must be at least 8 characters long/i)).toBeInTheDocument();
  });

  it("validates password confirmation mismatch", async () => {
    const user = userEvent.setup();
    render(
      <AuthProvider>
        <RegisterPage />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
    });

    await user.type(screen.getByLabelText(/full name/i), "Abdul Wasay");
    await user.type(screen.getByLabelText(/email address/i), "abdul@example.com");
    await user.type(screen.getByLabelText(/^password/i), "secret1234");
    await user.type(screen.getByLabelText(/confirm password/i), "secretDifferent");
    await user.click(screen.getByRole("checkbox"));

    fireEvent.submit(screen.getByRole("button", { name: /create account/i }));

    expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
  });

  it("clears terms error when checkbox is checked", async () => {
    const user = userEvent.setup();
    render(
      <AuthProvider>
        <RegisterPage />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /create account/i })).toBeInTheDocument();
    });

    fireEvent.submit(screen.getByRole("button", { name: /create account/i }));
    expect(screen.getByText(/you must agree to the terms of service/i)).toBeInTheDocument();

    const checkbox = screen.getByRole("checkbox");
    await user.click(checkbox);

    expect(screen.queryByText(/you must agree to the terms of service/i)).not.toBeInTheDocument();
  });

  it("requests email verification before creating the account", async () => {
    const user = userEvent.setup();
    let resolveFetch!: (response: Response) => void;
    const fetchResponse = new Promise<Response>((resolve) => {
      resolveFetch = resolve;
    });
    vi.spyOn(globalThis, "fetch").mockReturnValue(fetchResponse);

    render(
      <AuthProvider>
        <RegisterPage />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
    });

    await user.type(screen.getByLabelText(/full name/i), "Abdul Wasay");
    await user.type(screen.getByLabelText(/email address/i), "abdul@example.com");
    await user.type(screen.getByLabelText(/^password/i), "password123");
    await user.type(screen.getByLabelText(/confirm password/i), "password123");
    await user.click(screen.getByRole("checkbox"));

    const submitBtn = screen.getByRole("button", { name: /create account/i });
    await user.click(submitBtn);

    expect(screen.getByText(/sending verification code/i)).toBeInTheDocument();
    expect(submitBtn).toBeDisabled();
    expect(submitBtn).toHaveAttribute("aria-busy", "true");

    resolveFetch(
      new Response(JSON.stringify({ message: "Verification code sent." }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    expect(await screen.findByLabelText(/verification code/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /verify and create account/i })).toBeInTheDocument();
  });
});
