from backend.models import Finding


def calculate_score(findings: list[Finding]) -> int:
    penalty = 0

    for finding in findings:
        if finding.severity == "Critical":
            penalty += 25
        elif finding.severity == "High":
            penalty += 18
        elif finding.severity == "Medium":
            penalty += 10
        else:
            penalty += 5

    return max(0, 100 - penalty)
