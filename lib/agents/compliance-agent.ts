import { buildAiContext } from "./ai-context";
import { requestOpenAIAnalysis } from "./openai-analysis";
import type { AIAnalysisResult, Finding, SourceFile } from "@/lib/scanner/types";

export function generateSummary(score: number, findings: Finding[]) {
  const critical = findings.filter((finding) => finding.severity === "Critical").length;
  const high = findings.filter((finding) => finding.severity === "High").length;
  const medium = findings.filter((finding) => finding.severity === "Medium").length;

  if (critical > 0) {
    return `Do not merge. Found ${critical} critical and ${high} high-risk issue(s).`;
  }

  if (high > 0) {
    return `Review required. Found ${high} high-risk issue(s).`;
  }

  if (medium > 0 || score < 90) {
    return "Review recommended. Medium-risk compliance issues were detected.";
  }

  return "No major compliance risks detected in this scan.";
}

export async function generateAiAnalysis(input: {
  enabled: boolean;
  files: SourceFile[];
  findings: Finding[];
}): Promise<AIAnalysisResult> {
  if (!input.enabled) {
    return { status: "skipped" };
  }

  if (!process.env.OPENAI_API_KEY) {
    return {
      status: "not_configured",
      errorMessage: "OPENAI_API_KEY is not configured at runtime."
    };
  }

  try {
    const context = buildAiContext(input.files, input.findings);
    return await requestOpenAIAnalysis(context);
  } catch (error) {
    return {
      status: "failed",
      errorMessage: error instanceof Error ? error.message : "AI analysis failed."
    };
  }
}
