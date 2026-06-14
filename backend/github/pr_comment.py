from collections import defaultdict
import re

from backend.models import AIAnalysis, Finding

COMMENT_MARKER_PREFIX = "<!-- complypatch-ai:pr-comment:"


def build_comment_marker(head_sha: str) -> str:
    return f"{COMMENT_MARKER_PREFIX}{head_sha} -->"


def generate_pr_comment(
    score: int,
    findings: list[Finding],
    marker: str | None = None,
    ai_analysis: AIAnalysis | None = None,
) -> str:
    grouped: dict[str, list[Finding]] = defaultdict(list)
    for finding in findings:
        grouped[finding.severity].append(finding)

    comment = "## ComplyPatch AI Review\n\n"
    comment += f"**Compliance Score:** {score}/100\n\n"
    if ai_analysis and ai_analysis.status == "completed" and ai_analysis.riskScore is not None:
        comment += f"**AI Risk Score:** {ai_analysis.riskScore}/100"
        if ai_analysis.riskLevel:
            comment += f" ({ai_analysis.riskLevel})"
        comment += "\n\n"

    if not findings:
        comment += "No major compliance risks were detected in this scan.\n"
        return comment

    comment += "### Summary\n"
    comment += f"ComplyPatch AI detected {len(findings)} compliance/security finding(s).\n\n"

    for severity in ["Critical", "High", "Medium", "Low"]:
        severity_findings = grouped[severity]
        if not severity_findings:
            continue

        comment += f"### {severity} Findings\n\n"

        for index, finding in enumerate(severity_findings, start=1):
            comment += f"{index}. **{finding.title}** ({finding.ruleId})\n"
            comment += f"   - File: `{finding.file}:{finding.line}`\n"
            comment += f"   - Evidence: `{safe_inline(finding.evidence)}`\n"
            comment += f"   - Risk: {finding.impact}\n"
            comment += f"   - Suggested fix: {finding.fix}\n\n"

    comment += "### Recommendation\n"
    if ai_analysis and ai_analysis.status == "completed" and ai_analysis.suggestedRemediation:
        comment += f"{ai_analysis.suggestedRemediation}\n\n"
    comment += "Do not merge until Critical and High findings are reviewed and fixed.\n\n"
    comment += "_This is an automated compliance-readiness review, not legal certification._\n"
    if marker:
        comment += f"\n{marker}\n"

    return comment


def safe_inline(value: str) -> str:
    sanitized = redact_sensitive_value(value.replace("`", "'"))
    return sanitized[:180]


def redact_sensitive_value(value: str) -> str:
    sanitized = value
    sanitized = re.sub(r"sk-[A-Za-z0-9_-]{8,}", "sk-[redacted]", sanitized)
    sanitized = re.sub(
        r"(?i)(api[_-]?key|access[_-]?token|private[_-]?key|password)\s*=\s*['\"][^'\"]+['\"]",
        r"\1='[redacted]'",
        sanitized,
    )
    return sanitized
