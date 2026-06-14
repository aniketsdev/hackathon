import { generateSummary } from "@/lib/agents/compliance-agent";
import { generatePrComment } from "@/lib/github/pr-comment";
import { calculateRiskScore, sortFindingsBySeverity } from "./scoring";
import type { AIAnalysisResult, Finding, FindingCounts, RiskReport } from "./types";

export const COMPLIANCE_DISCLAIMER =
  "This report provides compliance assistance, not legal certification.";

export function buildFindingCounts(findings: Finding[]): FindingCounts {
  return findings.reduce<FindingCounts>((counts, finding) => {
    counts[`severity:${finding.severity}`] = (counts[`severity:${finding.severity}`] ?? 0) + 1;
    counts[`category:${finding.category}`] = (counts[`category:${finding.category}`] ?? 0) + 1;
    return counts;
  }, {});
}

export function buildRiskReport(findings: Finding[], aiAnalysis?: AIAnalysisResult): RiskReport {
  const orderedFindings = sortFindingsBySeverity(findings);
  const score = calculateRiskScore(orderedFindings);
  const summary = generateSummary(score, orderedFindings);
  const findingCounts = buildFindingCounts(orderedFindings);
  const prComment = generatePrComment(score, orderedFindings, {
    disclaimer: COMPLIANCE_DISCLAIMER,
    findingCounts
  });

  return {
    score,
    summary,
    findingCounts,
    findings: orderedFindings,
    aiAnalysis,
    prComment,
    disclaimer: COMPLIANCE_DISCLAIMER
  };
}
