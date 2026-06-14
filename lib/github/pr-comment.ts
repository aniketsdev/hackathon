import type { Finding } from "@/lib/scanner/rules";

export function generatePrComment(score: number, findings: Finding[]) {
  const grouped = groupBySeverity(findings);

  let comment = `## ComplyPatch AI Review\n\n`;
  comment += `**Compliance Score:** ${score}/100\n\n`;

  if (findings.length === 0) {
    comment += `No major compliance risks were detected in this scan.\n`;
    return comment;
  }

  comment += `### Summary\n`;
  comment += `ComplyPatch AI detected ${findings.length} compliance/security finding(s).\n\n`;

  for (const severity of ["Critical", "High", "Medium", "Low"] as const) {
    const severityFindings = grouped[severity] ?? [];
    if (severityFindings.length === 0) continue;

    comment += `### ${severity} Findings\n\n`;

    severityFindings.forEach((finding, index) => {
      comment += `${index + 1}. **${finding.title}** (${finding.ruleId})\n`;
      comment += `   - File: \`${finding.file}:${finding.line}\`\n`;
      comment += `   - Evidence: \`${safeInline(finding.evidence)}\`\n`;
      comment += `   - Risk: ${finding.impact}\n`;
      comment += `   - Suggested fix: ${finding.fix}\n\n`;
    });
  }

  comment += `### Recommendation\n`;
  comment += `Do not merge until Critical and High findings are reviewed and fixed.\n\n`;
  comment += `_This is an automated compliance-readiness review, not legal certification._\n`;

  return comment;
}

function groupBySeverity(findings: Finding[]) {
  return findings.reduce<Record<string, Finding[]>>((acc, finding) => {
    acc[finding.severity] = acc[finding.severity] ?? [];
    acc[finding.severity].push(finding);
    return acc;
  }, {});
}

function safeInline(value: string) {
  return value.replace(/`/g, "'").slice(0, 180);
}
