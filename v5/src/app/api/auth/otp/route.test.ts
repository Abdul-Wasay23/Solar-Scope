import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

const developmentLog = vi.spyOn(console, "info").mockImplementation(() => {});

function request(body: unknown) {
  return new Request("http://localhost/api/auth/otp", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("OTP route", () => {
  afterEach(() => vi.unstubAllGlobals());

  beforeEach(() => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("RESEND_API_KEY", "");
    vi.stubEnv("EMAIL_FROM", "");
    developmentLog.mockClear();
  });

  it("sends a development code without returning it and verifies it only once", async () => {
    const email = `otp-${Date.now()}@example.test`;
    const sendResponse = await POST(request({ action: "send", email }));
    expect(sendResponse.status).toBe(200);
    expect(await sendResponse.json()).not.toHaveProperty("code");

    const loggedMessage = String(developmentLog.mock.calls[0]?.[0]);
    const code = loggedMessage.match(/\b\d{6}\b/)?.[0];
    expect(code).toBeTruthy();

    const verifyResponse = await POST(request({ action: "verify", email, code }));
    expect(verifyResponse.status).toBe(200);
    expect(await verifyResponse.json()).toEqual({ verified: true });

    const replayResponse = await POST(request({ action: "verify", email, code }));
    expect(replayResponse.status).toBe(400);
  });

  it("enforces the resend cooldown", async () => {
    const email = `cooldown-${Date.now()}@example.test`;
    expect((await POST(request({ action: "send", email }))).status).toBe(200);
    const secondResponse = await POST(request({ action: "send", email }));
    expect(secondResponse.status).toBe(429);
    expect(await secondResponse.json()).toHaveProperty("retryAfterSeconds");
  });

  it("rejects malformed email and unsupported actions", async () => {
    expect((await POST(request({ action: "send", email: "invalid" }))).status).toBe(400);
    expect((await POST(request({ action: "noop", email: "valid@example.test" }))).status).toBe(400);
  });

  it("reports provider rejection separately from missing configuration", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("RESEND_API_KEY", "test-key");
    vi.stubEnv("EMAIL_FROM", "SolarScope <verified@example.com>");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("forbidden", { status: 403 })));

    const response = await POST(request({ action: "send", email: "other-gmail@example.com" }));
    expect(response.status).toBe(502);
    expect(await response.json()).toMatchObject({
      message: expect.stringContaining("Resend rejected this email"),
    });
  });
});