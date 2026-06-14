import { createHash, randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import {
  GITHUB_AUTH_STATE_COOKIE,
  GITHUB_CODE_VERIFIER_COOKIE,
  githubCookieOptions
} from "@/lib/github/oauth-session";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const clientId = process.env.GITHUB_CLIENT_ID;
  if (!clientId) {
    return redirectHome(request, "github_oauth_not_configured");
  }

  const state = randomBytes(32).toString("base64url");
  const codeVerifier = randomBytes(32).toString("base64url");
  const codeChallenge = createHash("sha256").update(codeVerifier).digest("base64url");
  const redirectUri = getRedirectUri(request);
  const scope = process.env.GITHUB_OAUTH_SCOPE || "read:user repo";

  const authorizationUrl = new URL("https://github.com/login/oauth/authorize");
  authorizationUrl.searchParams.set("client_id", clientId);
  authorizationUrl.searchParams.set("redirect_uri", redirectUri);
  authorizationUrl.searchParams.set("scope", scope);
  authorizationUrl.searchParams.set("state", state);
  authorizationUrl.searchParams.set("code_challenge", codeChallenge);
  authorizationUrl.searchParams.set("code_challenge_method", "S256");
  authorizationUrl.searchParams.set("prompt", "select_account");

  const response = NextResponse.redirect(authorizationUrl);
  response.cookies.set(GITHUB_AUTH_STATE_COOKIE, state, githubCookieOptions(600));
  response.cookies.set(GITHUB_CODE_VERIFIER_COOKIE, codeVerifier, githubCookieOptions(600));
  return response;
}

function getRedirectUri(request: NextRequest) {
  return process.env.GITHUB_OAUTH_REDIRECT_URI || new URL("/api/auth/github/callback", request.nextUrl.origin).toString();
}

function redirectHome(request: NextRequest, status: string) {
  const url = new URL("/", request.nextUrl.origin);
  url.searchParams.set("github", status);
  url.hash = "connect";
  return NextResponse.redirect(url);
}
