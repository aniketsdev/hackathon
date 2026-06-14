import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const body = await request.json();

  // Hackathon placeholder.
  // Production version would call GitHub REST API to post this comment to a PR.
  return NextResponse.json({
    ok: true,
    message: "PR comment posting is mocked in this starter.",
    received: body
  });
}
