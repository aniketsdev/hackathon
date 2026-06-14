import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const comment = typeof body.comment === "string" ? body.comment.trim() : "";

  if (!comment) {
    return NextResponse.json({ error: "comment is required" }, { status: 400 });
  }

  // Hackathon placeholder.
  // Production version would call GitHub REST API to post this comment to a PR.
  return NextResponse.json({
    ok: true,
    message: "PR comment posting is mocked for the hackathon demo.",
    received: body
  });
}
