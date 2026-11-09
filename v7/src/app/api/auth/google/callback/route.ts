import { randomBytes, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

const OAUTH_COOKIE_PATH = "/";
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
  name?: string;
  given_name?: string;
  family_name?: string;
  email?: string;
  email_verified?: string | boolean;
  nonce?: string;
};

function redirectToLogin(request: NextRequest, error: string, detail?: string) {
  const url = new URL("/login", request.url);
  url.searchParams.set("google_error", error);
  if (detail) url.searchParams.set("google_detail", detail);
  const response = NextResponse.redirect(url);
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
  if (params.has("error")) {
    const errCode = params.get("error") || "unknown";
    const errDesc = params.get("error_description") || "";
    console.error("Google OAuth callback returned error:", errCode, errDesc);
    return redirectToLogin(request, "google_failed", `${errCode}: ${errDesc}`);
  }

  const code = params.get("code");
  const state = params.get("state");
  const expectedState = request.cookies.get("ss_google_oauth_state")?.value;
  const nonce = request.cookies.get("ss_google_oauth_nonce")?.value;
  const verifier = request.cookies.get("ss_google_oauth_verifier")?.value;
  if (!code || !state || !expectedState || !nonce || !verifier || !secureStringEqual(state, expectedState)) {
    console.error("Google OAuth callback state/verifier mismatch or missing", {
      hasCode: !!code,
      hasState: !!state,
      hasExpectedState: !!expectedState,
      hasNonce: !!nonce,
      hasVerifier: !!verifier,
    });
    return redirectToLogin(request, "invalid_callback", "State or verifier cookie missing or expired. Click Sign in with Google again from /login.");
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;
  if (!clientId || !redirectUri) {
    return redirectToLogin(request, "not_configured");
  }
  if (!clientSecret) return redirectToLogin(request, "google_secret_missing");

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

    if (!tokenResponse.ok) {
      const errText = await tokenResponse.text();
      console.error("Google token exchange failed:", tokenResponse.status, errText);
      let parsedDetail = errText;
      try {
        const j = JSON.parse(errText);
        parsedDetail = j.error_description || j.error || errText;
      } catch {}
      return redirectToLogin(request, "google_failed", parsedDetail);
    }

    const tokens = await tokenResponse.json() as { id_token?: string; access_token?: string; expires_in?: number };
    if (!tokens.id_token || !tokens.access_token) {
      console.error("Google token response missing id_token or access_token:", tokens);
      return redirectToLogin(request, "google_failed", "Missing ID token from Google");
    }

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

    // ── Direct PostgreSQL Authentication & User Provisioning ───────────────
    const userEmail = claims.email.trim().toLowerCase();
    const userName = (claims.name || claims.given_name || userEmail.split("@")[0] || "User").trim();

    // Check if user exists in database
    const userRes = await query<{
      id: string | number;
      full_name: string;
      email: string;
      is_active: boolean;
      role_name: string | null;
    }>(
      `SELECT u.id, u.full_name, u.email, u.is_active, r.name as role_name
       FROM users u
       LEFT JOIN user_roles ur ON u.id = ur.user_id
       LEFT JOIN roles r ON ur.role_id = r.id
       WHERE LOWER(u.email) = $1
       LIMIT 1`,
      [userEmail]
    );

    let applicationUser: { id: string; fullName: string; email: string; role: string };

    if (userRes.rows.length > 0) {
      const existingUser = userRes.rows[0];
      if (!existingUser.is_active) {
        return redirectToLogin(request, "account_disabled");
      }
      const dbRole = (existingUser.role_name || "").toUpperCase();
      const role = dbRole === "ADMIN" ? "ADMIN" : dbRole === "SELLER" ? "SELLER" : "BUYER";
      applicationUser = {
        id: String(existingUser.id),
        fullName: existingUser.full_name || userName,
        email: existingUser.email,
        role,
      };
    } else {
      // Auto-create user in database with verified status and BUYER role
      const insertRes = await query<{ id: string | number; full_name: string; email: string }>(
        `INSERT INTO users (full_name, email, is_active, is_email_verified)
         VALUES ($1, $2, true, true)
         RETURNING id, full_name, email`,
        [userName, userEmail]
      );
      const newUser = insertRes.rows[0];

      const roleRes = await query<{ id: number }>(
        "SELECT id FROM roles WHERE LOWER(name) = 'buyer' LIMIT 1"
      );
      if (roleRes.rows.length > 0) {
        await query(
          "INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
          [newUser.id, roleRes.rows[0].id]
        );
      }

      applicationUser = {
        id: String(newUser.id),
        fullName: newUser.full_name,
        email: newUser.email,
        role: "BUYER",
      };
    }

    if (!isValidApplicationUser(applicationUser)) {
      return redirectToLogin(request, "backend_invalid_response");
    }

    const sessionAccessToken = randomBytes(32).toString("hex");
    const response = NextResponse.redirect(new URL("/login?google_status=success", request.url));
    const secure = process.env.NODE_ENV === "production";

    response.cookies.set("ss_access_token", sessionAccessToken, {
      httpOnly: true,
      secure,
      sameSite: "lax",
      path: "/",
      maxAge: 86400,
    });
    response.cookies.set("ss_google_profile", JSON.stringify(applicationUser), {
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
  } catch (error: any) {
    console.error("Google OAuth error:", error);
    return redirectToLogin(request, "backend_unavailable", error?.message || "Internal server error");
  }
}
