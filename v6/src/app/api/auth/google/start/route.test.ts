import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "./route";

function makeRequest() {
  return new NextRequest("http://localhost:3000/api/auth/google/start");
}

vi.mock("next/server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next/server")>();
  return actual;
});

describe("Google OAuth start route", () => {
  beforeEach(() => {
    vi.stubEnv("GOOGLE_CLIENT_ID", "");
    vi.stubEnv("GOOGLE_CLIENT_SECRET", "");
    vi.stubEnv("GOOGLE_REDIRECT_URI", "");
    vi.stubEnv("GOOGLE_ACCOUNT_LOGIN_URL", "");
  });

  it("returns to login with a clear error when credentials are missing", async () => {
    const response = await GET(makeRequest());
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("google_error=not_configured");
  });

  it("starts Google OAuth using the configured callback and PKCE", async () => {
    vi.stubEnv("GOOGLE_CLIENT_ID", "123456789-test.apps.googleusercontent.com");
    vi.stubEnv("GOOGLE_REDIRECT_URI", "http://localhost:3000/api/auth/google/callback");
    vi.stubEnv("GOOGLE_ACCOUNT_LOGIN_URL", "http://localhost:8000/auth/google/login");

    const response = await GET(new NextRequest("http://localhost:3000/api/auth/google/start"));
    const location = new URL(response.headers.get("location") || "");
    expect(location.origin).toBe("https://accounts.google.com");
    expect(location.searchParams.get("redirect_uri")).toBe("http://localhost:3000/api/auth/google/callback");
    expect(location.searchParams.get("code_challenge_method")).toBe("S256");
    expect(response.cookies.get("ss_google_oauth_state")?.value).toBeTruthy();
    expect(response.cookies.get("ss_google_oauth_verifier")?.value).toBeTruthy();
    expect(location.search).not.toContain("client_secret");
  });

  it("rejects malformed Client IDs before redirecting to Google", async () => {
    vi.stubEnv("GOOGLE_CLIENT_ID", "http://not-a-client-id.apps.googleusercontent.com/");
    vi.stubEnv("GOOGLE_REDIRECT_URI", "http://localhost:3000/api/auth/google/callback");
    const response = await GET(makeRequest());
    expect(response.headers.get("location")).toContain("google_error=invalid_configuration");
  });
});