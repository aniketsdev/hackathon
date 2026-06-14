# Feature Specification: GitHub Webhook Operations

**Feature Branch**: `feat/github-webhook`

**Created**: 2026-06-14

**Status**: Draft

**Input**: User description: "Start with the webhook for GitHub with our post so we can connect to GitHub all the action of GitHub all in and out for our operation."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Scan Pull Request Changes From GitHub (Priority: P1)

As a demo operator, I want ComplyPatch AI to receive a GitHub pull request event and scan the changed files so the demo can show automated security and compliance review without pasting code manually.

**Why this priority**: This is the minimum GitHub-connected flow needed to extend the current pasted-code demo into a PR-driven demo.

**Independent Test**: Can be tested by sending a supported pull request delivery and confirming that a scan result is generated with score, findings, evidence, and a PR-ready comment.

**Acceptance Scenarios**:

1. **Given** a supported pull request delivery from a configured repository, **When** ComplyPatch AI receives the delivery, **Then** it records the delivery, collects the changed files, runs the scanner, and produces findings.
2. **Given** a supported pull request delivery with no changed files, **When** ComplyPatch AI receives the delivery, **Then** it records a completed scan with no findings and a passing score.

---

### User Story 2 - Post Review Comment Back To GitHub (Priority: P2)

As a developer reviewing a pull request, I want ComplyPatch AI to post a clear review comment on the PR so I can see the risk score, findings, evidence, and suggested next steps inside GitHub.

**Why this priority**: The PR comment completes the in-and-out GitHub loop and makes the demo feel like a real review assistant.

**Independent Test**: Can be tested by processing a supported pull request delivery and confirming that exactly one current ComplyPatch AI comment is present on the PR for the scanned commit.

**Acceptance Scenarios**:

1. **Given** a scan with one or more findings, **When** outbound GitHub posting is enabled, **Then** ComplyPatch AI posts a PR comment containing the risk score, finding summaries, evidence references, and demo safety disclaimer.
2. **Given** a scan with no findings, **When** outbound GitHub posting is enabled, **Then** ComplyPatch AI posts a passing PR comment that clearly states no configured rules were triggered.

---

### User Story 3 - Track GitHub Operations (Priority: P3)

As a demo operator, I want to see whether each GitHub delivery and outbound comment succeeded or failed so I can explain the integration during the hackathon demo and recover from setup mistakes.

**Why this priority**: Operational visibility reduces demo risk when GitHub credentials, repository permissions, or payloads are misconfigured.

**Independent Test**: Can be tested by sending valid and invalid deliveries and confirming each delivery has a visible status, failure reason when applicable, and outbound posting status.

**Acceptance Scenarios**:

1. **Given** an invalid delivery, **When** ComplyPatch AI rejects it, **Then** the operation status identifies the rejection reason without exposing secrets or sensitive payload data.
2. **Given** GitHub comment posting fails, **When** the scan completes, **Then** the operation status shows the scan result and the comment posting failure separately.

### Edge Cases

- Unsupported GitHub event types are acknowledged without running a scan or posting a comment.
- Duplicate deliveries for the same GitHub delivery identifier do not create duplicate PR comments.
- Pull requests from forks are scanned only when changed file contents are available through configured repository access.
- Large pull requests are bounded to a demo-safe file count and content size; skipped files are listed in the scan evidence.
- Deliveries with invalid source verification are rejected before any scan or outbound action.
- Missing GitHub write authorization prevents comment posting but still allows a local scan result and PR comment preview.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST accept GitHub pull request deliveries for configured repositories.
- **FR-002**: System MUST verify that each delivery came from GitHub before processing repository or pull request data.
- **FR-003**: System MUST support pull request opened, reopened, synchronized, and ready-for-review events for the first GitHub-connected demo.
- **FR-004**: System MUST ignore unsupported GitHub events without treating them as scan failures.
- **FR-005**: System MUST collect changed file paths and relevant code content for supported pull request deliveries when repository access allows it.
- **FR-006**: System MUST scan collected changes using the existing ComplyPatch AI rule categories: secrets, PII logging, missing auth, insecure cookies, unsafe CORS, and unsafe SQL.
- **FR-007**: System MUST generate a risk score, finding list, evidence references, summary, and GitHub-style PR comment for each completed scan.
- **FR-008**: System MUST post the generated PR comment back to the originating pull request when outbound GitHub posting is configured and authorized.
- **FR-009**: System MUST avoid duplicate active ComplyPatch AI comments for the same pull request commit by updating or replacing the prior bot comment when possible.
- **FR-010**: System MUST record inbound delivery status and outbound posting status separately so operators can distinguish scan success from comment posting failure.
- **FR-011**: System MUST never expose webhook secrets, access tokens, or full sensitive payload values in user-visible errors, logs, comments, or reports.
- **FR-012**: System MUST provide a demo-safe fallback that displays the generated PR comment locally when GitHub posting is not configured.

### Key Entities

- **GitHub Delivery**: Represents one inbound GitHub event, including delivery identifier, repository, event type, action, pull request reference, received time, processing status, and rejection reason when applicable.
- **Pull Request Change Set**: Represents changed files associated with a pull request delivery, including file path, change status, content availability, and skipped-file reason when applicable.
- **Scan Result**: Represents the score, findings, evidence, summary, and generated PR comment for a processed change set.
- **Outbound GitHub Action**: Represents an attempted PR comment post or update, including target pull request, target commit, status, and failure reason when applicable.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A demo operator can trigger a scan from a supported GitHub pull request event and see a completed scan result within 60 seconds for the demo repository.
- **SC-002**: Supported pull request deliveries with known vulnerable demo code produce the same six core finding categories currently shown by the sample scan flow.
- **SC-003**: At least 95% of valid supported deliveries in the demo repository produce either a posted PR comment or a local PR comment preview without manual code paste.
- **SC-004**: Duplicate deliveries for the same pull request commit create no more than one active ComplyPatch AI comment on that commit.
- **SC-005**: Invalid or unauthenticated deliveries are rejected without running a scan, posting to GitHub, or exposing sensitive values.

## Assumptions

- The first implementation focuses on GitHub pull request review events; issues, pushes, releases, workflow runs, and organization events are out of scope for this feature.
- The demo repository grants enough read access to collect changed file contents and optional write access to create or update PR comments.
- GitHub posting may be disabled in local demo mode; in that case, the generated PR comment preview is still considered a successful demo fallback.
- Existing scanner rules and PR comment formatting remain the source of truth for finding categories and comment content.
- This feature provides compliance assistance for demos and does not certify legal or regulatory compliance.
