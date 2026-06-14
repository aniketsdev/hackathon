import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  clearGithubCookieOptions,
  GITHUB_AUTH_STATE_COOKIE,
  GITHUB_CODE_VERIFIER_COOKIE,
  GITHUB_TOKEN_COOKIE,
  GITHUB_USER_COOKIE
} from "@/lib/github/oauth-session";

export const runtime = "nodejs";

export async function POST() {
  const response = NextResponse.json({ connected: false });
  clearCookies(response);
  return response;
}

export async function GET(request: NextRequest) {
  const response = NextResponse.redirect(new URL("/", request.nextUrl.origin));
  clearCookies(response);
  return response;
}

function clearCookies(response: NextResponse) {
  response.cookies.set(GITHUB_TOKEN_COOKIE, "", clearGithubCookieOptions());
  response.cookies.set(GITHUB_USER_COOKIE, "", clearGithubCookieOptions());
  response.cookies.set(GITHUB_AUTH_STATE_COOKIE, "", clearGithubCookieOptions());
  response.cookies.set(GITHUB_CODE_VERIFIER_COOKIE, "", clearGithubCookieOptions());
}
