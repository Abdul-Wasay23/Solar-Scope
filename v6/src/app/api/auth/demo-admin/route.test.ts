import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

function request(email: string, password: string) {
  return new Request("http://localhost/api/auth/demo-admin", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
}

describe("development Admin bootstrap", () => {
  beforeEach(() => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("DEMO_ADMIN_EMAIL", "admin@example.test");
    vi.stubEnv("DEMO_ADMIN_PASSWORD", "dev-only-password");
  });

  it("returns the Admin profile only for configured credentials", async () => {
    const response = await POST(request("admin@example.test", "dev-only-password"));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ user: { role: "ADMIN", email: "admin@example.test" } });

    const invalid = await POST(request("admin@example.test", "wrong-password"));
    expect(invalid.status).toBe(401);
  });

  it("does not expose the demo bootstrap outside development", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const response = await POST(request("admin@example.test", "dev-only-password"));
    expect(response.status).toBe(404);
  });
});