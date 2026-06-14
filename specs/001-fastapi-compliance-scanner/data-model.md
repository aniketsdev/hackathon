# Data Model: Compliance Repository Scanner

## ScanInput

Represents one user-submitted scan request.

**Fields**:

- `sourceType`: derived value of `files`, `pasted_code`, or `local_path`
- `files`: list of `SourceFile` objects when code is supplied directly or after local path expansion
- `localPath`: optional local repository or directory path for demo scanning
- `enableAiAnalysis`: optional boolean, defaults to `false`

**Validation rules**:

- At least one of `files` or `localPath` is required.
- Direct file payloads are limited to 50 files and 200,000 characters per file.
- Local path scanning expands only supported text files into `SourceFile` objects.
- Missing, unreadable, unsupported binary, or oversized local input returns a clear error or skip message.
- Submitted input is not persisted beyond the current request/session.

## SourceFile

Represents one scannable text file or pasted code unit.

**Fields**:

- `path`: display path, changed-file path, or pasted-code label
- `content`: text content to scan

**Validation rules**:

- `path` is required and must be non-empty.
- `content` must stay within the per-file size limit.
- Binary or unreadable content is excluded or rejected with a clear error.

## Finding

Represents one deterministic compliance/security issue.

**Fields**:

- `ruleId`: stable scanner rule identifier
- `title`: short finding title
- `severity`: `Critical`, `High`, `Medium`, or `Low`
- `category`: `secret`, `phi_logging`, `missing_auth`, `unsafe_sql`, `insecure_cookie`, or `unsafe_cors`
- `file`: source path or pasted-code label
- `line`: one-based line number
- `evidence`: masked evidence excerpt
- `impact`: compliance/security impact statement
- `fix`: remediation guidance
- `masked`: whether sensitive evidence was redacted

**Validation rules**:

- Evidence shown in reports, PR comments, and OpenAI context must not reveal full detected secret values or unnecessary full patient data values.
- Findings are deduplicated by rule, file, and line.
- High-priority findings are displayed before lower severities.

## RiskReport

Represents the complete scan result returned to the user.

**Fields**:

- `score`: integer from 0 to 100
- `summary`: short human-readable status
- `findingCounts`: counts by severity and category
- `findings`: ordered list of `Finding`
- `aiAnalysis`: optional `AIAnalysisResult`
- `prComment`: generated GitHub-style review comment
- `disclaimer`: compliance assistance notice

**Validation rules**:

- Score is calculated using weighted severity penalties where high-severity findings are weighted more than medium and low findings.
- Reports are generated in memory and not persisted for v1.
- Reports remain available without `aiAnalysis` when OpenAI is disabled or fails.

## PRReviewComment

Represents the markdown comment generated for code review workflows.

**Fields**:

- `markdown`: formatted PR-style body
- `score`: copied 0-100 score
- `topFindings`: highest-priority findings included in the comment
- `recommendation`: merge/review guidance
- `postingStatus`: `mocked`, `not_requested`, or future `posted`

**Validation rules**:

- Must include score, top findings, evidence references, remediation, and compliance assistance disclaimer.
- Must not include full secret values or unnecessary full patient data.
- Live GitHub posting is mocked/out of scope for v1.

## AIAnalysisResult

Represents optional OpenAI-generated context attached to a report.

**Fields**:

- `status`: `not_configured`, `skipped`, `completed`, or `failed`
- `summary`: AI-generated explanation when completed
- `complianceContext`: likely HIPAA/PHI relevance
- `suggestedRemediation`: safe remediation text
- `errorMessage`: non-sensitive failure message when unavailable

**Validation rules**:

- OpenAI credentials are read only from secure runtime configuration.
- Only locally masked/redacted relevant snippets may be sent to OpenAI.
- AI output must not replace deterministic findings or evidence.

## State Transitions

```text
Submitted -> Validated -> Deterministic Scan Complete -> Report Generated
                                      |
                                      v
                          Optional AI Analysis Complete/Failed
                                      |
                                      v
                            PR Comment Generated/Mocked
```

Failed validation returns a clear error without generating findings. OpenAI failure returns a deterministic report with `aiAnalysis.status = failed`, `not_configured`, or another non-blocking status.
