import type { Finding, FindingCounts } from "@/lib/scanner/types";

export function generatePrComment(
  score: number,
  findings: Finding[],
  options: { disclaimer?: string; findingCounts?: FindingCounts } = {}
) {
  const grouped = groupBySeverity(findings);
  const disclaimer = options.disclaimer ?? "This report provides compliance assistance, not legal certification.";

  let comment = `## ComplyPatch AI Review\n\n`;
  comment += `**Compliance Score:** ${score}/100\n\n`;
  comment += `_Demo note: live GitHub posting is mocked for this hackathon flow._\n\n`;

  if (findings.length === 0) {
    comment += `No major compliance risks were detected in this scan.\n`;
    comment += `\n_${disclaimer}_\n`;
    return comment;
  }

  comment += `### Summary\n`;
  comment += `ComplyPatch AI detected ${findings.length} compliance/security finding(s).\n\n`;
  if (options.findingCounts) {
    comment += `Critical: ${options.findingCounts["severity:Critical"] ?? 0}, `;
    comment += `High: ${options.findingCounts["severity:High"] ?? 0}, `;
    comment += `Medium: ${options.findingCounts["severity:Medium"] ?? 0}, `;
    comment += `Low: ${options.findingCounts["severity:Low"] ?? 0}\n\n`;
  }

  for (const severity of ["Critical", "High", "Medium", "Low"] as const) {
    const severityFindings = grouped[severity] ?? [];
    if (severityFindings.length === 0) continue;

    comment += `### ${severity} Findings\n\n`;

    severityFindings.forEach((finding, index) => {
      comment += `${index + 1}. **${finding.title}** (${finding.ruleId})\n`;
      comment += `   - File: \`${finding.file}:${finding.line}\`\n`;
      comment += `   - Category: ${finding.category}\n`;
      comment += `   - Evidence: \`${safeInline(finding.evidence)}\`\n`;
      comment += `   - Risk: ${finding.impact}\n`;
      comment += `   - Suggested fix: ${finding.fix}\n\n`;
    });
  }

  comment += `### Recommendation\n`;
  comment += `Do not merge until Critical and High findings are reviewed and fixed.\n\n`;
  comment += `_${disclaimer}_\n`;

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
