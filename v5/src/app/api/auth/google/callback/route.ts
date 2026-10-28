import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

const OAUTH_COOKIE_PATH = "/api/auth/google";
const FLOW_COOKIES = [
  "ss_google_oauth_state",
  "ss_google_oauth_nonce",
  "ss_google_oauth_verifier",
] as const;
const ALLOWED_ROLES = new Set(["BUYER", "SELLER", "SERVICE_PROVIDER", "ADMIN"]);

type GoogleClaims = {
  aud?: string;
  iss?: string;
  exp?: string;
  sub?: string;
  email?: string;
  email_verified?: string | boolean;
  nonce?: string;
};

function redirectToLogin(request: NextRequest, error: string) {
  const response = NextResponse.redirect(new URL(`/login?google_error=${encodeURIComponent(error)}`, request.url));
  for (const name of FLOW_COOKIES) {
    response.cookies.set(name, "", { path: OAUTH_COOKIE_PATH, maxAge: 0 });
  }
  return response;
}

function secureStringEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

function isValidApplicationUser(value: unknown): value is {
  id: string;
  fullName: string;
  email: string;
  role: string;
} {
  if (!value || typeof value !== "object") return false;
  const user = value as Record<string, unknown>;
  return typeof user.id === "string" && typeof user.fullName === "string" &&
    typeof user.email === "string" && typeof user.role === "string" && ALLOWED_ROLES.has(user.role);
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  if (params.get("error") === "access_denied") return redirectToLogin(request, "cancelled");
  if (params.has("error")) return redirectToLogin(request, "google_failed");

  const code = params.get("code");
  const state = params.get("state");
  const expectedState = request.cookies.get("ss_google_oauth_state")?.value;
  const nonce = request.cookies.get("ss_google_oauth_nonce")?.value;
  const verifier = request.cookies.get("ss_google_oauth_verifier")?.value;
  if (!code || !state || !expectedState || !nonce || !verifier || !secureStringEqual(state, expectedState)) {
    return redirectToLogin(request, "invalid_callback");
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;
  const accountLoginUrl = process.env.GOOGLE_ACCOUNT_LOGIN_URL;
  if (!clientId || !redirectUri) {
    return redirectToLogin(request, "not_configured");
  }
  if (!clientSecret) return redirectToLogin(request, "google_secret_missing");
  if (!accountLoginUrl) return redirectToLogin(request, "account_backend_not_configured");

  try {
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
        code_verifier: verifier,
      }),
      cache: "no-store",
    });
    if (!tokenResponse.ok) return redirectToLogin(request, "google_failed");

    const tokens = await tokenResponse.json() as { id_token?: string; access_token?: string; expires_in?: number };
    if (!tokens.id_token || !tokens.access_token) return redirectToLogin(request, "google_failed");

    const tokenInfoUrl = new URL("https://oauth2.googleapis.com/tokeninfo");
    tokenInfoUrl.searchParams.set("id_token", tokens.id_token);
    const tokenInfoResponse = await fetch(tokenInfoUrl, { cache: "no-store" });
    if (!tokenInfoResponse.ok) return redirectToLogin(request, "invalid_identity");
    const claims = await tokenInfoResponse.json() as GoogleClaims;
    const expiresAt = Number(claims.exp);
    const verifiedEmail = claims.email_verified === true || claims.email_verified === "true";
    if (
      claims.aud !== clientId ||
      !["accounts.google.com", "https://accounts.google.com"].includes(claims.iss || "") ||
      !claims.sub || !claims.email || !verifiedEmail ||
      !Number.isFinite(expiresAt) || expiresAt <= Math.floor(Date.now() / 1000) ||
      !claims.nonce || !secureStringEqual(claims.nonce, nonce)
    ) {
      return redirectToLogin(request, "invalid_identity");
    }

    const accountResponse = await fetch(accountLoginUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ provider: "google", id_token: tokens.id_token }),
      cache: "no-store",
    });
    if (accountResponse.status === 404) return redirectToLogin(request, "account_not_found");
    if (accountResponse.status === 409) return redirectToLogin(request, "account_link_conflict");
    if (!accountResponse.ok) return redirectToLogin(request, "backend_unavailable");

    const session = await accountResponse.json() as {
      access_token?: string;
      expires_in?: number;
      user?: unknown;
    };
    if (!session.access_token || !isValidApplicationUser(session.user)) {
      return redirectToLogin(request, "backend_invalid_response");
    }

    const response = NextResponse.redirect(new URL("/login?google_status=success", request.url));
    const secure = process.env.NODE_ENV === "production";
    response.cookies.set("ss_access_token", session.access_token, {
      httpOnly: true,
      secure,
      sameSite: "lax",
      path: "/",
      maxAge: Math.min(Math.max(session.expires_in || 3600, 60), 86400),
    });
    response.cookies.set("ss_google_profile", JSON.stringify(session.user), {
      httpOnly: true,
      secure,
      sameSite: "lax",
      path: "/api/auth/google/session",
      maxAge: 60,
    });
    for (const name of FLOW_COOKIES) {
      response.cookies.set(name, "", { path: OAUTH_COOKIE_PATH, maxAge: 0 });
    }
    return response;
  } catch {
    return redirectToLogin(request, "backend_unavailable");
  }
}