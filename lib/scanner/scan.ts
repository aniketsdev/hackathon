import { redactEvidence } from "./redaction";
import { ruleCatalog } from "./rules";
import type { Finding, SourceFile } from "./types";

export function scanFiles(files: SourceFile[]): Finding[] {
  const findings: Finding[] = [];

  for (const file of files) {
    const lines = file.content.split(/\r?\n/);

    lines.forEach((line, index) => {
      const lineNumber = index + 1;
      const trimmed = line.trim();

      if (detectHardcodedSecret(trimmed)) {
        findings.push(createFinding("RULE-001", file.path, lineNumber, trimmed));
      }

      if (detectPiiLogging(trimmed)) {
        findings.push(createFinding("RULE-002", file.path, lineNumber, trimmed));
      }

      if (detectUnsafeSql(trimmed)) {
        findings.push(createFinding("RULE-004", file.path, lineNumber, trimmed));
      }

      if (detectWildcardCors(trimmed)) {
        findings.push(createFinding("RULE-005", file.path, lineNumber, trimmed));
      }

      if (detectInsecureCookie(trimmed, file.content)) {
        findings.push(createFinding("RULE-006", file.path, lineNumber, trimmed));
      }
    });

    const missingAuthLine = detectMissingAuthRoute(file);
    if (missingAuthLine) {
      findings.push(createFinding("RULE-003", file.path, missingAuthLine.line, missingAuthLine.evidence));
    }
  }

  return dedupeFindings(findings);
}

function createFinding(ruleId: keyof typeof ruleCatalog, file: string, line: number, evidence: string): Finding {
  const rule = ruleCatalog[ruleId];
  const redacted = redactEvidence(evidence);

  return {
    ruleId,
    title: rule.title,
    severity: rule.severity,
    category: rule.category,
    file,
    line,
    evidence: redacted.value,
    impact: rule.impact,
    fix: rule.fix,
    masked: redacted.masked
  };
}

function detectHardcodedSecret(line: string) {
  return /sk-[a-zA-Z0-9_-]{8,}/.test(line)
    || /api[_-]?key\s*=\s*["'][^"']+["']/i.test(line)
    || /api[_-]?key\s*[:=]\s*["'][^"']+["']/i.test(line)
    || /access[_-]?token\s*=\s*["'][^"']+["']/i.test(line)
    || /private[_-]?key\s*=\s*["'][^"']+["']/i.test(line)
    || /password\s*=\s*["'][^"']+["']/i.test(line);
}

function detectPiiLogging(line: string) {
  const isLog = /(console\.log|logger\.(info|debug|warn|error))/.test(line);
  const sensitiveWord = /(patient|diagnosis|prescription|ssn|aadhaar|phone|email|dob|medical|health)/i.test(line);
  return isLog && sensitiveWord;
}

function detectUnsafeSql(line: string) {
  const hasSql = /(select|insert|update|delete)\s+/i.test(line);
  const hasConcatenation = /\+/.test(line);
  return hasSql && hasConcatenation;
}

function detectWildcardCors(line: string) {
  return /(Access-Control-Allow-Origin|allowOrigins?|origin)/i.test(line) && /["']\*["']/.test(line);
}

function detectInsecureCookie(line: string, content: string) {
  const setsCookie = /(cookies\(\)\.set|setCookie|Set-Cookie)/.test(line);
  if (!setsCookie) return false;

  const nearbyHasSecureFlags = /httpOnly\s*:\s*true/i.test(content)
    && /secure\s*:\s*true/i.test(content)
    && /sameSite/i.test(content);

  return !nearbyHasSecureFlags;
}

function detectMissingAuthRoute(file: SourceFile): { line: number; evidence: string } | null {
  const content = file.content;
  const looksLikeApiRoute = /export\s+async\s+function\s+(GET|POST|PUT|DELETE)/.test(content);
  const handlesSensitiveData = /(patient|diagnosis|prescription|medical|health|ssn|aadhaar)/i.test(content);
  const hasAuth = /(auth\(|getServerSession|requireAuth|verifyToken|middleware|authorize)/i.test(content);

  if (!looksLikeApiRoute || !handlesSensitiveData || hasAuth) return null;

  const lines = content.split(/\r?\n/);
  const routeLine = lines.findIndex((line) => /export\s+async\s+function\s+(GET|POST|PUT|DELETE)/.test(line));

  return {
    line: routeLine >= 0 ? routeLine + 1 : 1,
    evidence: routeLine >= 0 ? lines[routeLine].trim() : "Sensitive API route without visible auth check"
  };
}

function dedupeFindings(findings: Finding[]) {
  const seen = new Set<string>();
  return findings.filter((finding) => {
    const key = `${finding.ruleId}-${finding.file}-${finding.line}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
