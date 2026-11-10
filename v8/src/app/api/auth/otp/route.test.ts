import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as emailModule from "@/lib/email";
import { POST } from "./route";

function request(body: unknown) {
  return new Request("http://localhost/api/auth/otp", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("OTP route with Gmail SMTP", () => {
  let sendEmailSpy: any;

  beforeEach(() => {
    vi.stubEnv("NODE_ENV", "development");
    sendEmailSpy = vi.spyOn(emailModule, "sendOtpEmail").mockResolvedValue({ success: true });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("sends an OTP code and verifies it only once", async () => {
    const email = `otp-${Date.now()}@example.test`;
    const sendResponse = await POST(request({ action: "send", email }));
    expect(sendResponse.status).toBe(200);
    expect(await sendResponse.json()).not.toHaveProperty("code");
    expect(sendEmailSpy).toHaveBeenCalledTimes(1);

    // Grab the code sent through sendOtpEmail
    const sentCode = sendEmailSpy.mock.calls[0][1];
    expect(sentCode).toMatch(/^\d{6}$/);

    // Verify correct code
    const verifyResponse = await POST(request({ action: "verify", email, code: sentCode }));
    expect(verifyResponse.status).toBe(200);
    expect(await verifyResponse.json()).toEqual({
      verified: true,
      message: "Email verified successfully.",
    });

    // Replay attack / single-use check: second verify must fail
    const replayResponse = await POST(request({ action: "verify", email, code: sentCode }));
    expect(replayResponse.status).toBe(400);
  });

  it("enforces the resend cooldown", async () => {
    const email = `cooldown-${Date.now()}@example.test`;
    expect((await POST(request({ action: "send", email }))).status).toBe(200);
    const secondResponse = await POST(request({ action: "send", email }));
    expect(secondResponse.status).toBe(429);
    expect(await secondResponse.json()).toMatchObject({
      message: expect.stringContaining("Please wait"),
    });
  });

  it("rejects malformed email and unsupported actions", async () => {
    expect((await POST(request({ action: "send", email: "invalid" }))).status).toBe(400);
    expect((await POST(request({ action: "noop", email: "valid@example.test" }))).status).toBe(400);
  });

  it("reports SMTP provider errors with 502 status", async () => {
    sendEmailSpy.mockResolvedValueOnce({
      success: false,
      error: "Authentication failed. Invalid Gmail App Password.",
    });

    const email = `smtp-err-${Date.now()}@example.com`;
    const response = await POST(request({ action: "send", email }));
    expect(response.status).toBe(502);
    expect(await response.json()).toMatchObject({
      message: expect.stringContaining("Email delivery failed: Authentication failed"),
    });
  });
});
