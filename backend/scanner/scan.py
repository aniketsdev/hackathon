import re

from backend.models import Finding, SourceFile
from backend.scanner.rules import RULE_CATALOG


def scan_files(files: list[SourceFile]) -> list[Finding]:
    findings: list[Finding] = []

    for file in files:
        lines = re.split(r"\r?\n", file.content)

        for index, line in enumerate(lines):
            line_number = index + 1
            trimmed = line.strip()

            if detect_hardcoded_secret(trimmed):
                findings.append(create_finding("RULE-001", file.path, line_number, trimmed))

            if detect_pii_logging(trimmed):
                findings.append(create_finding("RULE-002", file.path, line_number, trimmed))

            if detect_unsafe_sql(trimmed):
                findings.append(create_finding("RULE-004", file.path, line_number, trimmed))

            if detect_wildcard_cors(trimmed):
                findings.append(create_finding("RULE-005", file.path, line_number, trimmed))

            if detect_insecure_cookie(trimmed, file.content):
                findings.append(create_finding("RULE-006", file.path, line_number, trimmed))

        missing_auth = detect_missing_auth_route(file)
        if missing_auth:
            findings.append(
                create_finding(
                    "RULE-003",
                    file.path,
                    missing_auth["line"],
                    missing_auth["evidence"],
                )
            )

    return dedupe_findings(findings)


def create_finding(rule_id: str, file: str, line: int, evidence: str) -> Finding:
    rule = RULE_CATALOG[rule_id]

    return Finding(
        ruleId=rule_id,
        title=rule["title"],
        severity=rule["severity"],
        file=file,
        line=line,
        evidence=evidence,
        impact=rule["impact"],
        fix=rule["fix"],
    )


def detect_hardcoded_secret(line: str) -> bool:
    return (
        re.search(r"sk-[a-zA-Z0-9_-]{8,}", line) is not None
        or re.search(r"api[_-]?key\s*=\s*[\"'][^\"']+[\"']", line, re.IGNORECASE) is not None
        or re.search(r"access[_-]?token\s*=\s*[\"'][^\"']+[\"']", line, re.IGNORECASE) is not None
        or re.search(r"private[_-]?key\s*=\s*[\"'][^\"']+[\"']", line, re.IGNORECASE) is not None
        or re.search(r"password\s*=\s*[\"'][^\"']+[\"']", line, re.IGNORECASE) is not None
    )


def detect_pii_logging(line: str) -> bool:
    is_log = re.search(r"(console\.log|logger\.(info|debug|warn|error))", line) is not None
    sensitive_word = (
        re.search(
            r"(patient|diagnosis|prescription|ssn|aadhaar|phone|email|dob|medical|health)",
            line,
            re.IGNORECASE,
        )
        is not None
    )
    return is_log and sensitive_word


def detect_unsafe_sql(line: str) -> bool:
    has_sql = re.search(r"(select|insert|update|delete)\s+", line, re.IGNORECASE) is not None
    has_concatenation = "+" in line
    return has_sql and has_concatenation


def detect_wildcard_cors(line: str) -> bool:
    return re.search(r"Access-Control-Allow-Origin", line, re.IGNORECASE) is not None and re.search(
        r"[\"']\*[\"']", line
    ) is not None


def detect_insecure_cookie(line: str, content: str) -> bool:
    sets_cookie = re.search(r"(cookies\(\)\.set|setCookie|Set-Cookie)", line) is not None
    if not sets_cookie:
        return False

    nearby_has_secure_flags = (
        re.search(r"httpOnly\s*:\s*true", content, re.IGNORECASE) is not None
        and re.search(r"secure\s*:\s*true", content, re.IGNORECASE) is not None
        and re.search(r"sameSite", content, re.IGNORECASE) is not None
    )

    return not nearby_has_secure_flags


def detect_missing_auth_route(file: SourceFile) -> dict[str, int | str] | None:
    content = file.content
    looks_like_api_route = re.search(r"export\s+async\s+function\s+(GET|POST|PUT|DELETE)", content) is not None
    handles_sensitive_data = (
        re.search(r"(patient|diagnosis|prescription|medical|health|ssn|aadhaar)", content, re.IGNORECASE)
        is not None
    )
    has_auth = re.search(r"(auth\(|getServerSession|requireAuth|verifyToken|middleware|authorize)", content) is not None

    if not looks_like_api_route or not handles_sensitive_data or has_auth:
        return None

    lines = re.split(r"\r?\n", content)
    route_line = next(
        (
            index
            for index, line in enumerate(lines)
            if re.search(r"export\s+async\s+function\s+(GET|POST|PUT|DELETE)", line)
        ),
        -1,
    )

    return {
        "line": route_line + 1 if route_line >= 0 else 1,
        "evidence": lines[route_line].strip() if route_line >= 0 else "Sensitive API route without visible auth check",
    }


def dedupe_findings(findings: list[Finding]) -> list[Finding]:
    seen: set[str] = set()
    deduped: list[Finding] = []

    for finding in findings:
        key = f"{finding.ruleId}-{finding.file}-{finding.line}"
        if key in seen:
            continue
        seen.add(key)
        deduped.append(finding)

    return deduped
