from collections import defaultdict

from backend.models import Finding


def generate_pr_comment(score: int, findings: list[Finding]) -> str:
    grouped: dict[str, list[Finding]] = defaultdict(list)
    for finding in findings:
        grouped[finding.severity].append(finding)

    comment = "## ComplyPatch AI Review\n\n"
    comment += f"**Compliance Score:** {score}/100\n\n"

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
    comment += "Do not merge until Critical and High findings are reviewed and fixed.\n\n"
    comment += "_This is an automated compliance-readiness review, not legal certification._\n"

    return comment


def safe_inline(value: str) -> str:
    return value.replace("`", "'")[:180]
