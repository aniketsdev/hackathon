import type { Finding, Severity } from "./types";

export const severityPenalty: Record<Severity, number> = {
  Critical: 25,
  High: 18,
  Medium: 10,
  Low: 5
};

export const severityRank: Record<Severity, number> = {
  Critical: 0,
  High: 1,
  Medium: 2,
  Low: 3
};

export function calculateRiskScore(findings: Pick<Finding, "severity">[]) {
  const penalty = findings.reduce((total, finding) => total + severityPenalty[finding.severity], 0);
  return Math.max(0, 100 - penalty);
}

export function sortFindingsBySeverity(findings: Finding[]) {
  return [...findings].sort((a, b) => {
    const severityDiff = severityRank[a.severity] - severityRank[b.severity];
    if (severityDiff !== 0) return severityDiff;
    const fileDiff = a.file.localeCompare(b.file);
    if (fileDiff !== 0) return fileDiff;
    return a.line - b.line;
  });
}
