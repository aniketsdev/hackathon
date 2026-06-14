import { NextRequest, NextResponse } from "next/server";
import { decryptGitHubToken, GITHUB_TOKEN_COOKIE, GITHUB_USER_COOKIE } from "@/lib/github/oauth-session";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const token = decryptGitHubToken(request.cookies.get(GITHUB_TOKEN_COOKIE)?.value);
  const user = request.cookies.get(GITHUB_USER_COOKIE)?.value || null;

  return NextResponse.json({
    connected: Boolean(token),
    user,
    configured: Boolean(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET),
    privateRepoScope: process.env.GITHUB_OAUTH_SCOPE || "read:user repo"
  });
}
