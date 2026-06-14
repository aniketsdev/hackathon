import { redactSensitiveText } from "@/lib/scanner/redaction";
import type { Finding, SourceFile } from "@/lib/scanner/types";

export type AiFindingContext = {
  ruleId: string;
  title: string;
  severity: string;
  category: string;
  file: string;
  line: number;
  evidence: string;
  impact: string;
  fix: string;
  snippet: string;
};

export function buildAiContext(files: SourceFile[], findings: Finding[]): AiFindingContext[] {
  return findings.slice(0, 12).map((finding) => {
    const source = files.find((file) => file.path === finding.file);
    const snippet = source ? getSnippet(source.content, finding.line) : finding.evidence;

    return {
      ruleId: finding.ruleId,
      title: finding.title,
      severity: finding.severity,
      category: finding.category,
      file: finding.file,
      line: finding.line,
      evidence: finding.evidence,
      impact: finding.impact,
      fix: finding.fix,
      snippet: redactSensitiveText(snippet).value
    };
  });
}

function getSnippet(content: string, line: number) {
  const lines = content.split(/\r?\n/);
  const start = Math.max(0, line - 2);
  const end = Math.min(lines.length, line + 1);

  return lines
    .slice(start, end)
    .map((value, index) => `${start + index + 1}: ${value}`)
    .join("\n")
    .slice(0, 1200);
}
