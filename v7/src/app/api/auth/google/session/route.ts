import { NextRequest, NextResponse } from "next/server";

const PROFILE_COOKIE = "ss_google_profile";
const ACCESS_COOKIE = "ss_access_token";
const ALLOWED_ROLES = new Set(["BUYER", "SELLER", "SERVICE_PROVIDER", "ADMIN"]);

function clearHandoff(response: NextResponse) {
  response.cookies.set(PROFILE_COOKIE, "", { path: "/api/auth/google/session", maxAge: 0 });
  return response;
}

export async function GET(request: NextRequest) {
  const rawProfile = request.cookies.get(PROFILE_COOKIE)?.value;
  if (!rawProfile) {
    return clearHandoff(NextResponse.json({ message: "Google sign-in session expired." }, { status: 401 }));
  }

  try {
    const user: unknown = JSON.parse(rawProfile);
    if (!user || typeof user !== "object") throw new Error("Invalid user profile");
    const profile = user as Record<string, unknown>;
    if (
      typeof profile.id !== "string" ||
      typeof profile.fullName !== "string" ||
      typeof profile.email !== "string" ||
      typeof profile.role !== "string" ||
      !ALLOWED_ROLES.has(profile.role)
    ) {
      throw new Error("Invalid user profile");
    }

    const response = NextResponse.json({
      user: {
        id: profile.id,
        fullName: profile.fullName,
        email: profile.email,
        role: profile.role,
      },
    });
    response.cookies.set(PROFILE_COOKIE, "", { path: "/api/auth/google/session", maxAge: 0 });
    return response;
  } catch {
    const response = NextResponse.json({ message: "Google sign-in session is invalid." }, { status: 401 });
    response.cookies.set(PROFILE_COOKIE, "", { path: "/api/auth/google/session", maxAge: 0 });
    response.cookies.set(ACCESS_COOKIE, "", { path: "/", maxAge: 0 });
    return response;
  }
}