import { createHash, randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

const OAUTH_COOKIE_PATH = "/api/auth/google";
const FLOW_LIFETIME_SECONDS = 600;

function loginError(request: NextRequest, error: string) {
  const url = new URL("/login", request.url);
  url.searchParams.set("google_error", error);
  return NextResponse.redirect(url);
}

export async function GET(request: NextRequest) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    return loginError(request, "not_configured");
  }
  if (!clientId.endsWith(".apps.googleusercontent.com") || clientId.includes("://")) {
    return loginError(request, "invalid_configuration");
  }

  let callback: URL;
  try {
    callback = new URL(redirectUri);
    if (callback.pathname !== "/api/auth/google/callback") {
      return loginError(request, "invalid_configuration");
    }
  } catch {
    return loginError(request, "invalid_configuration");
  }

  const state = randomBytes(32).toString("base64url");
  const nonce = randomBytes(32).toString("base64url");
  const verifier = randomBytes(48).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  const authorizationUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authorizationUrl.search = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    state,
    nonce,
    code_challenge: challenge,
    code_challenge_method: "S256",
    prompt: "select_account",
  }).toString();

  const response = NextResponse.redirect(authorizationUrl);
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: OAUTH_COOKIE_PATH,
    maxAge: FLOW_LIFETIME_SECONDS,
  };
  response.cookies.set("ss_google_oauth_state", state, cookieOptions);
  response.cookies.set("ss_google_oauth_nonce", nonce, cookieOptions);
  response.cookies.set("ss_google_oauth_verifier", verifier, cookieOptions);
  return response;
}