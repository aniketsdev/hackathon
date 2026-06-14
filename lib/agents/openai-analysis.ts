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
      return {
        status: "failed",
        errorMessage: `OpenAI request failed with status ${response.status}.`
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
      errorMessage: error instanceof Error ? error.message : "OpenAI request failed."
    };
  } finally {
    clearTimeout(timeout);
  }
}

function normalizeAiContent(content: string): AIAnalysisResult {
  try {
    const parsed = JSON.parse(stripJsonFence(content)) as Partial<AIAnalysisResult>;
    return {
      status: "completed",
      summary: parsed.summary || "AI analysis completed.",
      complianceContext: parsed.complianceContext || "Review the flagged security and privacy risks before merge.",
      suggestedRemediation: parsed.suggestedRemediation || "Prioritize critical and high findings first."
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
