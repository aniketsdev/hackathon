from backend.models import Finding


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
