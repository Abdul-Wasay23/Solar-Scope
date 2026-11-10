import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "./route";

describe("Google OAuth callback", () => {
  it("rejects callbacks without a matching state cookie", async () => {
    const request = new NextRequest("http://localhost:3000/api/auth/google/callback?code=abc&state=missing");
    const response = await GET(request);
    expect(response.headers.get("location")).toContain("google_error=invalid_callback");
  });

  it("reports a canceled Google sign-in", async () => {
    const request = new NextRequest("http://localhost:3000/api/auth/google/callback?error=access_denied");
    const response = await GET(request);
    expect(response.headers.get("location")).toContain("google_error=cancelled");
  });
});