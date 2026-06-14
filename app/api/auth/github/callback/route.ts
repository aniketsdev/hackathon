import { NextRequest, NextResponse } from "next/server";
import {
  clearGithubCookieOptions,
  encryptGitHubToken,
  GITHUB_AUTH_STATE_COOKIE,
  GITHUB_CODE_VERIFIER_COOKIE,
  GITHUB_TOKEN_COOKIE,
  GITHUB_USER_COOKIE,
  githubCookieOptions
} from "@/lib/github/oauth-session";

export const runtime = "nodejs";

type GitHubTokenResponse = {
  access_token?: string;
  error?: string;
  error_description?: string;
};

type GitHubUserResponse = {
  login?: string;
};

export async function GET(request: NextRequest) {
  const error = request.nextUrl.searchParams.get("error");
  if (error) {
    return redirectHome(request, "github_oauth_denied");
  }

  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const expectedState = request.cookies.get(GITHUB_AUTH_STATE_COOKIE)?.value;
  const codeVerifier = request.cookies.get(GITHUB_CODE_VERIFIER_COOKIE)?.value;

  if (!code || !state || !expectedState || state !== expectedState || !codeVerifier) {
    return redirectHome(request, "github_oauth_state_failed");
  }

  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return redirectHome(request, "github_oauth_not_configured");
  }

  try {
    const token = await exchangeCodeForToken({
      code,
      codeVerifier,
      clientId,
      clientSecret,
      redirectUri: getRedirectUri(request)
    });
    const user = await fetchGitHubUser(token);
    const response = redirectHome(request, "github_connected");

    response.cookies.set(GITHUB_TOKEN_COOKIE, encryptGitHubToken(token), githubCookieOptions(60 * 60 * 8));
    response.cookies.set(GITHUB_USER_COOKIE, user.login || "github", githubCookieOptions(60 * 60 * 8));
    response.cookies.set(GITHUB_AUTH_STATE_COOKIE, "", clearGithubCookieOptions());
    response.cookies.set(GITHUB_CODE_VERIFIER_COOKIE, "", clearGithubCookieOptions());
    return response;
  } catch {
    return redirectHome(request, "github_oauth_failed");
  }
}

async function exchangeCodeForToken(input: {
  code: string;
  codeVerifier: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}) {
  const response = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      client_id: input.clientId,
      client_secret: input.clientSecret,
      code: input.code,
      redirect_uri: input.redirectUri,
      code_verifier: input.codeVerifier
    })
  });

  const payload = (await response.json()) as GitHubTokenResponse;
  if (!response.ok || !payload.access_token || payload.error) {
    throw new Error(payload.error_description || payload.error || "GitHub OAuth token exchange failed");
  }

  return payload.access_token;
}

async function fetchGitHubUser(token: string) {
  const response = await fetch("https://api.github.com/user", {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "User-Agent": "ComplyPatch-AI"
    }
  });

  if (!response.ok) {
    throw new Error("GitHub user validation failed");
  }

  return (await response.json()) as GitHubUserResponse;
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
