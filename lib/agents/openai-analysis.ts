import type { AiFindingContext } from "./ai-context";
import type { AIAnalysisResult } from "@/lib/scanner/types";

type OpenAIChatResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
};

export async function requestOpenAIAnalysis(context: AiFindingContext[]): Promise<AIAnalysisResult> {
  if (context.length === 0) {
    return { status: "skipped" };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        temperature: 0.2,
        messages: [
          {
            role: "system",
            content:
              "You are a compliance review assistant. Use only the supplied redacted scanner findings. Return concise JSON with summary, complianceContext, and suggestedRemediation. Do not claim legal certification."
          },
          {
            role: "user",
            content: JSON.stringify({ findings: context })
          }
        ]
      })
    });

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        return {
          status: "not_configured",
          errorMessage:
            "AI analysis is unavailable because the configured OpenAI key was rejected. Scanner findings and the PR comment are still available."
        };
      }

      return {
        status: "failed",
        errorMessage: `AI analysis is temporarily unavailable. OpenAI returned status ${response.status}. Scanner findings and the PR comment are still available.`
      };
    }

    const payload = (await response.json()) as OpenAIChatResponse;
    const content = payload.choices?.[0]?.message?.content?.trim();
    if (!content) {
      return { status: "failed", errorMessage: "OpenAI response was empty." };
    }

    return normalizeAiContent(content);
  } catch (error) {
    return {
      status: "failed",
      errorMessage:
        error instanceof Error
          ? `AI analysis is temporarily unavailable: ${error.message}`
          : "AI analysis is temporarily unavailable. Scanner findings and the PR comment are still available."
    };
  } finally {
    clearTimeout(timeout);
  }
}

function normalizeAiContent(content: string): AIAnalysisResult {
  try {
    const parsed = JSON.parse(stripJsonFence(content)) as unknown;
    const fields = isRecord(parsed) ? parsed : {};

    return {
      status: "completed",
      summary: normalizeAiText(fields.summary, "AI analysis completed."),
      complianceContext: normalizeAiText(
        fields.complianceContext,
        "Review the flagged security and privacy risks before merge."
      ),
      suggestedRemediation: normalizeAiText(
        fields.suggestedRemediation,
        "Prioritize critical and high findings first."
      )
    };
  } catch {
    return {
      status: "completed",
      summary: content.slice(0, 600),
      complianceContext: "Review the flagged security and privacy risks before merge.",
      suggestedRemediation: "Prioritize critical and high findings first."
    };
  }
}

function stripJsonFence(value: string) {
  return value.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
}

function normalizeAiText(value: unknown, fallback: string): string {
  if (typeof value === "string") {
    return value.trim() || fallback;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  if (Array.isArray(value)) {
    const text = value.map((item) => normalizeAiText(item, "")).filter(Boolean).join(" ");
    return text || fallback;
  }

  if (isRecord(value)) {
    const findingSummary = formatFindingSummary(value);
    if (findingSummary) return findingSummary;

    const text = Object.entries(value)
      .map(([key, item]) => {
        const itemText = normalizeAiText(item, "");
        return itemText ? `${formatFieldName(key)}: ${itemText}` : "";
      })
      .filter(Boolean)
      .join(". ");

    return text || fallback;
  }

  return fallback;
}

function formatFindingSummary(value: Record<string, unknown>) {
  const severity = normalizeOptionalText(value.severity);
  const category = normalizeOptionalText(value.category);
  const affectedFile = normalizeOptionalText(value.affectedFile);
  const findingsCount = normalizeOptionalText(value.findingsCount);

  if (!severity && !category && !affectedFile && !findingsCount) {
    return "";
  }

  const risk = [severity, category].filter(Boolean).join(" ");
  const location = affectedFile ? ` in ${affectedFile}` : "";
  const count = findingsCount ? ` (${findingsCount} finding${findingsCount === "1" ? "" : "s"})` : "";

  return `${risk || "Finding"}${location}${count}.`;
}

function normalizeOptionalText(value: unknown) {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return "";
}

function formatFieldName(value: string) {
  return value.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/_/g, " ").toLowerCase();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
