from typing import TypedDict

from backend.models import Severity


class Rule(TypedDict):
    title: str
    severity: Severity
    impact: str
    fix: str


RULE_CATALOG: dict[str, Rule] = {
    "RULE-001": {
        "title": "Hardcoded secret detected",
        "severity": "Critical",
        "impact": "A secret appears to be committed in source code, which may expose systems or third-party accounts.",
        "fix": "Move the secret to an environment variable and rotate the exposed key.",
    },
    "RULE-002": {
        "title": "PII or patient data logging detected",
        "severity": "High",
        "impact": "Sensitive personal or health data may be exposed in application logs.",
        "fix": "Remove the log or mask sensitive fields before logging.",
    },
    "RULE-003": {
        "title": "Sensitive API route may be missing authentication",
        "severity": "High",
        "impact": "Sensitive data may be returned without verifying the user identity or authorization.",
        "fix": "Add authentication and authorization checks before returning sensitive data.",
    },
    "RULE-004": {
        "title": "Unsafe SQL query construction detected",
        "severity": "High",
        "impact": "String-concatenated SQL can create SQL injection risk.",
        "fix": "Use parameterized queries or a safe ORM query API.",
    },
    "RULE-005": {
        "title": "Wildcard CORS detected",
        "severity": "Medium",
        "impact": "Wildcard CORS may expose sensitive APIs to untrusted origins.",
        "fix": "Restrict CORS to trusted application origins.",
    },
    "RULE-006": {
        "title": "Insecure cookie settings detected",
        "severity": "Medium",
        "impact": "Cookies without httpOnly, secure, and sameSite flags increase session theft and CSRF risk.",
        "fix": "Set httpOnly, secure, and sameSite cookie options.",
    },
}
