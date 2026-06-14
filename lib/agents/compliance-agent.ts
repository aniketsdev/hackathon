import type { Finding } from "@/lib/scanner/rules";

export function generateSummary(score: number, findings: Finding[]) {
  const critical = findings.filter((finding) => finding.severity === "Critical").length;
  const high = findings.filter((finding) => finding.severity === "High").length;

  if (critical > 0) {
    return `Do not merge. Found ${critical} critical and ${high} high-risk issue(s).`;
  }

  if (high > 0) {
    return `Review required. Found ${high} high-risk issue(s).`;
  }

  if (score < 90) {
    return "Some medium-risk compliance issues were detected.";
  }

  return "No major compliance risks detected in this scan.";
}

// Optional future upgrade:
// Use OpenAI here to create deeper explanations and fix patches.
// Keep the deterministic rule scanner as the source of truth for the demo.
