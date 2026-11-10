import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as emailModule from "@/lib/email";
import * as passwordResetModule from "@/lib/passwordReset";
import { POST } from "./route";

function createRequest(body: unknown) {
  return new Request("http://localhost:3000/api/auth/forgot-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/auth/forgot-password", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns 400 when email is missing or empty", async () => {
    const res = await POST(createRequest({ email: "" }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.message).toBe("Email address is required.");
  });

  it("returns 400 when email format is invalid", async () => {
    const res = await POST(createRequest({ email: "not-an-email" }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.message).toBe("Please enter a valid email address.");
  });

  it("returns 404 with exact requirement message when user is not found", async () => {
    vi.spyOn(passwordResetModule, "findRegisteredAccount").mockResolvedValue(null);

    const res = await POST(createRequest({ email: "unknown@example.com" }));
    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.message).toBe(
      "Account not found. Please enter your registered email address."
    );
  });

  it("generates token and sends email to registered user", async () => {
    vi.spyOn(passwordResetModule, "findRegisteredAccount").mockResolvedValue({
      id: "1",
      email: "user@example.com",
      fullName: "Test User",
      isActive: true,
    });
    const createTokenSpy = vi
      .spyOn(passwordResetModule, "createPasswordResetToken")
      .mockResolvedValue("test-token-12345");
    const sendEmailSpy = vi
      .spyOn(emailModule, "sendPasswordResetEmail")
      .mockResolvedValue({ success: true });

    const res = await POST(createRequest({ email: "user@example.com" }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.message).toContain("Password reset instructions have been sent to user@example.com");

    expect(createTokenSpy).toHaveBeenCalledWith("1", "user@example.com");
    expect(sendEmailSpy).toHaveBeenCalledTimes(1);
    expect(sendEmailSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "user@example.com",
        fullName: "Test User",
        resetUrl: expect.stringContaining("test-token-12345"),
      })
    );
  });
});
