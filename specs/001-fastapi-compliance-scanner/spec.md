# Feature Specification: Compliance Repository Scanner

**Feature Branch**: `001-fastapi-compliance-scanner`

**Created**: 2026-06-14

**Status**: Draft

**Input**: User description: "Build a compliance AI application that scans a repository or pasted code for HIPAA and PHI leaks, exposed API keys, and other security/compliance risks. First scan manually with deterministic checks and show a report, then add AI-based analysis using provider credentials supplied securely."

## Clarifications

### Session 2026-06-14

- Q: How should submitted code and generated scan reports be retained for the first demo? → A: Do not persist submitted code or reports; keep scan data only for the current request/session.
- Q: Which AI provider should AI-assisted analysis use for the first demo? → A: Use OpenAI only for AI-assisted analysis, configured through secure runtime environment variables.
- Q: What input sources should the first demo scan support? → A: Scan a local repository path plus pasted code or changed files for the first demo.
- Q: What scan context may be sent to OpenAI for AI-assisted analysis? → A: Send full relevant source snippets to OpenAI only after local masking and redaction.
- Q: How should the report calculate and present overall risk? → A: Use a 0-100 risk score computed from weighted severities, with high findings weighted most, then medium, then low.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Scan Demo Code for Compliance Risks (Priority: P1)

A developer or demo presenter submits a local repository path, changed files, or pasted code and receives a clear report of security and compliance findings.

**Why this priority**: This is the core demo flow and proves the product can identify actionable risks without depending on live integrations.

**Independent Test**: Can be tested by submitting demo code containing known risky patterns and confirming that findings appear with severity, evidence, and affected file or snippet location.

**Acceptance Scenarios**:

1. **Given** demo code containing an API key, PHI logging, unsafe SQL construction, and an insecure cookie, **When** the user starts a scan, **Then** the report lists each issue with severity, category, evidence, and remediation guidance.
2. **Given** code with no known risky patterns, **When** the user starts a scan, **Then** the report shows a low-risk result and explains that no configured findings were detected.

---

### User Story 2 - Review a Compliance Report (Priority: P2)

A developer reviews a scan report that summarizes the overall risk score, finding counts, compliance relevance, and supporting evidence.

**Why this priority**: The report is the primary user-facing artifact and must be understandable during a hackathon demo.

**Independent Test**: Can be tested by opening a completed scan report and checking that each finding is grouped, prioritized, and tied to evidence.

**Acceptance Scenarios**:

1. **Given** a completed scan with mixed severities, **When** the user views the report, **Then** high-priority findings appear before medium and low findings and the score reflects the finding severity mix.
2. **Given** a finding involving PHI or patient data, **When** the user views details, **Then** the report identifies the compliance concern without exposing more sensitive content than needed for evidence.

---

### User Story 3 - Generate a PR-Style Review Comment (Priority: P3)

A developer generates a GitHub-style comment that summarizes scan results and highlights the most important fixes.

**Why this priority**: The PR-style comment is required for the demo and makes the output easy to understand in a code review workflow.

**Independent Test**: Can be tested by scanning demo code and verifying that the generated comment includes the score, top findings, evidence references, and suggested remediation.

**Acceptance Scenarios**:

1. **Given** a completed scan with high-risk findings, **When** the user generates the review comment, **Then** the comment includes a concise summary, high-priority findings, and next-step recommendations.
2. **Given** a completed scan with no high-risk findings, **When** the user generates the review comment, **Then** the comment states the lower risk result and lists any remaining lower-severity observations.

---

### User Story 4 - Add AI-Assisted Analysis (Priority: P4)

A developer optionally runs AI-assisted analysis after deterministic scanning to explain findings, identify likely compliance impact, and suggest safe remediation text.

**Why this priority**: AI analysis improves usefulness, but the deterministic scanner must remain the stable baseline for the demo.

**Independent Test**: Can be tested by enabling AI analysis with configured credentials and confirming that the report includes an AI-generated explanation while preserving deterministic findings.

**Acceptance Scenarios**:

1. **Given** AI analysis is configured, **When** a scan completes, **Then** the report includes AI-generated context for findings using locally masked and redacted relevant snippets without replacing deterministic evidence.
2. **Given** AI analysis is unavailable or fails, **When** a scan completes, **Then** the deterministic report and PR-style comment are still generated.

### Edge Cases

- Submitted content is empty, unreadable, or contains only unsupported binary files.
- Submitted content is too large for a single demo scan and must be rejected with a clear size message.
- Multiple findings occur on the same line or snippet.
- A finding contains a possible secret or PHI value that should be masked in output.
- AI analysis credentials are missing, invalid, rate limited, or temporarily unavailable.
- The same code is scanned repeatedly during a demo and should produce consistent deterministic results.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST accept demo scan input from a local repository path, pasted code, or changed files selected for the demo.
- **FR-002**: System MUST perform deterministic checks for exposed secrets, PHI or PII logging, missing authentication on sensitive API routes, unsafe SQL construction, insecure cookies, and wildcard CORS on sensitive APIs.
- **FR-003**: System MUST classify each finding with a category, severity, affected file or snippet reference, evidence excerpt, compliance relevance, and remediation guidance.
- **FR-004**: System MUST mask likely secrets and sensitive patient data in reports and in any context prepared for OpenAI while retaining enough evidence for review.
- **FR-005**: System MUST calculate a 0-100 overall risk score from weighted finding severities, with high findings weighted most, then medium, then low, and display high-priority findings prominently.
- **FR-006**: System MUST generate a GitHub-style PR review comment from completed scan results.
- **FR-007**: System MUST allow OpenAI-assisted analysis to be added after deterministic scanning and MUST keep deterministic findings available when AI analysis is disabled or fails.
- **FR-008**: System MUST use OpenAI credentials only from secure runtime configuration and MUST NOT require users to paste credentials into scan input.
- **FR-009**: System MUST show clear error states for empty input, unsupported files, scan limits, and AI-analysis failures.
- **FR-010**: System MUST communicate that reports provide compliance assistance and are not legal certification.
- **FR-011**: System MUST NOT persist submitted code, findings, reports, or generated PR comments beyond the current request or session in the first demo.
- **FR-012**: System MUST scope AI-assisted analysis to OpenAI for the first demo rather than supporting multiple AI providers.
- **FR-013**: System MUST support a demo PR workflow using local repository paths, changed-file content, or pasted code, and MUST defer live GitHub PR triggers and posted comments to a future extension.
- **FR-014**: System MAY send relevant source snippets to OpenAI for AI-assisted analysis only after local masking and redaction of likely secrets and sensitive patient data.

### Key Entities *(include if feature involves data)*

- **Scan Input**: Submitted local repository path, pasted code, or changed-file content with source type, included files or snippets, and scan metadata.
- **Finding**: A detected risk with category, severity, evidence, location, compliance relevance, masking status, and remediation guidance.
- **Risk Report**: The scan summary containing score, finding counts, prioritized findings, evidence, and status messages.
- **PR Review Comment**: A formatted review artifact generated from the risk report for code review workflows.
- **AI Analysis Result**: Optional OpenAI-generated explanation, compliance context, and suggested remediation generated from locally masked and redacted relevant source snippets.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A demo scan of representative changed files completes and displays a report in under 10 seconds without AI analysis.
- **SC-002**: The deterministic scanner detects at least one configured example for each target category: secrets, PHI or PII logging, missing auth, unsafe SQL, insecure cookies, and unsafe CORS.
- **SC-003**: 100% of high-severity findings in demo fixtures include severity, evidence, location, and remediation guidance.
- **SC-004**: Generated PR-style comments include the 0-100 overall score, top findings, and recommended next steps for every completed scan.
- **SC-005**: When AI analysis is unavailable, users can still complete the deterministic scan and generate the PR-style comment.
- **SC-006**: No report output displays a full detected secret value or unnecessary full patient data value.

## Assumptions

- The first working demo uses a hybrid PR approach: scan local repository paths, pasted code, or changed-file content now; design live GitHub PR triggers and posted comments as a future extension.
- HIPAA and PHI checks focus on assistance signals and evidence, not formal legal certification.
- The deterministic scanner is the source of truth for detection in the initial demo.
- OpenAI-assisted analysis receives locally masked and redacted relevant source snippets and is optional for the initial working flow.
- Submitted code, generated findings, and generated reports are ephemeral for the first demo.
- Risk score weighting prioritizes high-severity findings over medium- and low-severity findings.
- Large-scale repository indexing, historical trend tracking, and enterprise policy configuration are out of scope for the first demo.
