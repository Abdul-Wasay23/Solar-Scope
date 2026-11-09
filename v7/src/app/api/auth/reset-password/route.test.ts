import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as passwordResetModule from "@/lib/passwordReset";
import { GET, POST } from "./route";

function createGetRequest(token: string) {
  return new Request(`http://localhost:3000/api/auth/reset-password?token=${encodeURIComponent(token)}`, {
    method: "GET",
  });
}

function createPostRequest(body: unknown) {
  return new Request("http://localhost:3000/api/auth/reset-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("GET /api/auth/reset-password", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns 400 when token is missing", async () => {
    const res = await GET(createGetRequest(""));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.valid).toBe(false);
    expect(data.message).toBe("Reset token is missing.");
  });

  it("returns 400 when token is invalid or expired", async () => {
    vi.spyOn(passwordResetModule, "verifyPasswordResetToken").mockResolvedValue({
      valid: false,
      error: "This password reset link has expired. Please request a new one.",
    });

    const res = await GET(createGetRequest("expired-token"));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.valid).toBe(false);
    expect(data.message).toContain("expired");
  });

  it("returns 200 with user email and name when token is valid", async () => {
    vi.spyOn(passwordResetModule, "verifyPasswordResetToken").mockResolvedValue({
      valid: true,
      userId: "1",
      email: "davidweb302@gmail.com",
      fullName: "David Web",
      tokenId: "10",
    });

    const res = await GET(createGetRequest("valid-token"));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.valid).toBe(true);
    expect(data.email).toBe("davidweb302@gmail.com");
    expect(data.fullName).toBe("David Web");
  });
});

describe("POST /api/auth/reset-password", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns 400 when token is missing", async () => {
    const res = await POST(
      createPostRequest({ token: "", password: "newPassword123!", confirmPassword: "newPassword123!" })
    );
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.message).toBe("Password reset token is required.");
  });

  it("returns 400 when password is shorter than 8 characters", async () => {
    const res = await POST(
      createPostRequest({ token: "some-token", password: "short", confirmPassword: "short" })
    );
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.message).toBe("Password must be at least 8 characters long.");
  });

  it("returns 400 when passwords do not match", async () => {
    const res = await POST(
      createPostRequest({
        token: "some-token",
        password: "newPassword123!",
        confirmPassword: "differentPassword123!",
      })
    );
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.message).toBe("Passwords do not match.");
  });

  it("returns 400 when token verification fails during completePasswordReset", async () => {
    vi.spyOn(passwordResetModule, "completePasswordReset").mockResolvedValue({
      success: false,
      error: "This password reset link has already been used. Please request a new one.",
      statusCode: 400,
    });

    const res = await POST(
      createPostRequest({
        token: "used-token",
        password: "newPassword123!",
        confirmPassword: "newPassword123!",
      })
    );
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.message).toContain("already been used");
  });

  it("returns 200 when password is reset successfully", async () => {
    vi.spyOn(passwordResetModule, "completePasswordReset").mockResolvedValue({
      success: true,
      message: "Password reset successful. You can now sign in with your new password.",
    });

    const res = await POST(
      createPostRequest({
        token: "valid-token",
        password: "newPassword123!",
        confirmPassword: "newPassword123!",
      })
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.message).toContain("Password reset successful");
  });
});

