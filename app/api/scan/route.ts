import { NextRequest, NextResponse } from "next/server";
import { scanFiles } from "@/lib/scanner/scan";
import { generateSummary } from "@/lib/agents/compliance-agent";
import { generatePrComment } from "@/lib/github/pr-comment";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const files = body.files ?? [];

    if (!Array.isArray(files) || files.length === 0) {
      return NextResponse.json({ error: "files array is required" }, { status: 400 });
    }

    const findings = scanFiles(files);
    const score = calculateScore(findings);
    const summary = generateSummary(score, findings);
    const prComment = generatePrComment(score, findings);

    return NextResponse.json({ score, summary, findings, prComment });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

function calculateScore(findings: Array<{ severity: string }>) {
  const penalty = findings.reduce((total, finding) => {
    if (finding.severity === "Critical") return total + 25;
    if (finding.severity === "High") return total + 18;
    if (finding.severity === "Medium") return total + 10;
    return total + 5;
  }, 0);

  return Math.max(0, 100 - penalty);
}
