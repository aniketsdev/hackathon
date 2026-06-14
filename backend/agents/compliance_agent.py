import json
import os
import urllib.error
import urllib.request

from backend.models import AIAnalysis, Finding


def generate_summary(score: int, findings: list[Finding]) -> str:
    critical = sum(1 for finding in findings if finding.severity == "Critical")
    high = sum(1 for finding in findings if finding.severity == "High")

    if critical > 0:
        return f"Do not merge. Found {critical} critical and {high} high-risk issue(s)."

    if high > 0:
        return f"Review required. Found {high} high-risk issue(s)."

    if score < 90:
        return "Some medium-risk compliance issues were detected."

    return "No major compliance risks detected in this scan."


def generate_ai_analysis(score: int, findings: list[Finding]) -> AIAnalysis:
    if not findings:
        return AIAnalysis(status="skipped")

    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        return AIAnalysis(
            status="not_configured",
            errorMessage="OPENAI_API_KEY is not configured at runtime.",
        )

    payload = {
        "model": os.environ.get("OPENAI_MODEL", "gpt-4o-mini"),
        "temperature": 0.2,
        "messages": [
            {
                "role": "system",
                "content": (
                    "You are a compliance review assistant. Use only the supplied redacted scanner findings. "
                    "Return concise JSON with summary, complianceContext, suggestedRemediation, riskScore, "
                    "and riskLevel. riskScore is 0-100 where 100 is highest risk. riskLevel must be low, "
                    "medium, high, or critical. Do not claim legal certification."
                ),
            },
            {
                "role": "user",
                "content": json.dumps(
                    {
                        "complianceScore": score,
                        "findings": [
                            {
                                "ruleId": finding.ruleId,
                                "title": finding.title,
                                "severity": finding.severity,
                                "file": finding.file,
                                "line": finding.line,
                                "impact": finding.impact,
                                "fix": finding.fix,
                            }
                            for finding in findings[:12]
                        ],
                    }
                ),
            },
        ],
    }

    request = urllib.request.Request(
        "https://api.openai.com/v1/chat/completions",
        data=json.dumps(payload).encode("utf-8"),
        method="POST",
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
    )

    try:
        with urllib.request.urlopen(request, timeout=8) as response:
            body = json.loads(response.read().decode("utf-8"))
        content = body.get("choices", [{}])[0].get("message", {}).get("content", "")
        return _normalize_ai_content(content)
    except urllib.error.HTTPError as exc:
        if exc.code in {401, 403}:
            return AIAnalysis(
                status="not_configured",
                errorMessage="AI analysis is unavailable because the configured OpenAI key was rejected.",
            )
        return AIAnalysis(
            status="failed",
            errorMessage=f"AI analysis is temporarily unavailable. OpenAI returned status {exc.code}.",
        )
    except Exception as exc:
        return AIAnalysis(status="failed", errorMessage=f"AI analysis is temporarily unavailable: {exc}")


def _normalize_ai_content(content: str) -> AIAnalysis:
    if not content.strip():
        return AIAnalysis(status="failed", errorMessage="OpenAI response was empty.")

    try:
        payload = json.loads(_strip_json_fence(content))
    except json.JSONDecodeError:
        return AIAnalysis(
            status="completed",
            summary=content[:600],
            complianceContext="Review the flagged security and privacy risks before merge.",
            suggestedRemediation="Prioritize critical and high findings first.",
        )

    return AIAnalysis(
        status="completed",
        riskScore=_normalize_risk_score(payload.get("riskScore")),
        riskLevel=_normalize_risk_level(payload.get("riskLevel")),
        summary=_normalize_text(payload.get("summary"), "AI analysis completed."),
        complianceContext=_normalize_text(
            payload.get("complianceContext"),
            "Review the flagged security and privacy risks before merge.",
        ),
        suggestedRemediation=_normalize_text(
            payload.get("suggestedRemediation"),
            "Prioritize critical and high findings first.",
        ),
    )


def _strip_json_fence(value: str) -> str:
    stripped = value.strip()
    if stripped.startswith("```"):
        stripped = stripped.removeprefix("```json").removeprefix("```").strip()
    if stripped.endswith("```"):
        stripped = stripped[:-3].strip()
    return stripped


def _normalize_risk_score(value: object) -> int | None:
    if isinstance(value, (int, float)):
        return max(0, min(100, round(value)))
    return None


def _normalize_risk_level(value: object) -> str | None:
    return value if value in {"low", "medium", "high", "critical"} else None


def _normalize_text(value: object, fallback: str) -> str:
    return value.strip() if isinstance(value, str) and value.strip() else fallback
