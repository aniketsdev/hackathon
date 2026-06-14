# Feature Specification: GitHub PR Webhook Comments

**Feature Branch**: `001-github-webhook`

**Created**: 2026-06-14

**Status**: Draft

**Input**: User description: "We have added GitHub webhooks setup. When a user adds a repo, connect it to GitHub. When the user creates any PR, scan the PR and add a comment showing vulnerable issues in the endpoint and code."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Connect a GitHub Repository (Priority: P1)

As a demo operator, I want to connect a GitHub repository to ComplyPatch AI so pull request activity from that repository can trigger automated compliance scans.

**Why this priority**: Repository connection is the entry point for the webhook flow and must work before PR scanning or commenting can happen.

**Independent Test**: Can be tested by adding a demo repository, confirming the connection is accepted, and confirming unsupported or untrusted repositories are rejected.

**Acceptance Scenarios**:

1. **Given** a user provides a repository that ComplyPatch AI is allowed to access, **When** they add the repository, **Then** the repository is marked connected and ready to receive pull request deliveries.
2. **Given** a repository is not allowed or cannot be reached with the configured GitHub access, **When** the user tries to add it, **Then** ComplyPatch AI shows a clear setup failure without exposing tokens or secrets.

---

### User Story 2 - Scan Pull Request Changes From GitHub (Priority: P2)

As a developer, I want ComplyPatch AI to automatically scan changed code when I open or update a pull request so security and compliance issues are found without manual copy/paste.

**Why this priority**: This is the core automation that turns the existing scanner into a GitHub-connected review assistant.

**Independent Test**: Can be tested by sending a supported pull request delivery and confirming that changed files are collected, scanned, and summarized.

**Acceptance Scenarios**:

1. **Given** a connected repository receives a pull request opened event, **When** ComplyPatch AI receives the delivery, **Then** it verifies the delivery, collects changed code, runs the scanner, and produces a scan result.
2. **Given** a pull request is updated with new commits, **When** ComplyPatch AI receives the update delivery, **Then** it scans the latest changed code for that pull request head commit.

---

### User Story 3 - Comment Vulnerabilities on the Pull Request (Priority: P3)

As a developer reviewing a pull request, I want ComplyPatch AI to comment on the PR with vulnerable endpoints, vulnerable code evidence, score, and suggested fixes so I can act inside GitHub.

**Why this priority**: Posting the result back to GitHub completes the in-and-out workflow requested for the demo.

**Independent Test**: Can be tested by processing a vulnerable PR and confirming that a ComplyPatch AI comment appears on the PR with findings and remediation guidance.

**Acceptance Scenarios**:

1. **Given** a PR scan finds vulnerable endpoints or risky code, **When** comment posting is enabled, **Then** ComplyPatch AI posts a PR comment with risk score, finding summaries, file/line evidence, and suggested fixes.
2. **Given** a PR scan finds no configured issues, **When** comment posting is enabled, **Then** ComplyPatch AI posts a passing PR comment that states no configured rules were triggered.

---

### User Story 4 - Track Webhook and Comment Status (Priority: P4)

As a demo operator, I want to see whether webhook intake, scanning, and PR commenting succeeded or failed so I can recover quickly from setup mistakes.

**Why this priority**: Webhook demos are fragile without visibility into invalid signatures, missing permissions, and outbound comment failures.

**Independent Test**: Can be tested by sending valid and invalid deliveries and confirming each operation reports intake, scan, and comment status separately.

**Acceptance Scenarios**:

1. **Given** an invalid delivery, **When** ComplyPatch AI rejects it, **Then** the operation status explains the rejection without exposing secrets or payload-sensitive values.
2. **Given** GitHub comment posting fails after a successful scan, **When** the user checks the operation, **Then** the scan result remains available and the comment failure is shown separately.

### Edge Cases

- Unsupported GitHub event types are acknowledged without running a scan or posting a comment.
- Duplicate deliveries for the same pull request commit do not create duplicate active ComplyPatch AI comments.
- Pull requests from forks are scanned only when changed file contents are available through configured repository access.
- Large pull requests are bounded to demo-safe file count and content size limits; skipped files are listed in the result.
- Deliveries with invalid source verification are rejected before any scan or outbound action.
- Missing GitHub write authorization prevents live comment posting but still produces a local PR comment preview.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST let a user add or enable a GitHub repository for ComplyPatch AI review.
- **FR-002**: System MUST accept GitHub pull request deliveries only for connected or allowed repositories.
- **FR-003**: System MUST verify that each live delivery came from GitHub before processing repository or pull request data.
- **FR-004**: System MUST support pull request opened, reopened, synchronized, and ready-for-review events for the first GitHub-connected demo.
- **FR-005**: System MUST ignore unsupported GitHub events without treating them as scan failures.
- **FR-006**: System MUST collect changed file paths and relevant code content for supported pull request deliveries when repository access allows it.
- **FR-007**: System MUST scan collected changes using the existing ComplyPatch AI categories: secrets, PII or PHI logging, missing auth, insecure cookies, unsafe CORS, and unsafe SQL.
- **FR-008**: System MUST generate a risk score, finding list, evidence references, summary, and GitHub-style PR comment for each completed scan.
- **FR-009**: System MUST post the generated PR comment back to the originating pull request when outbound GitHub posting is configured and authorized.
- **FR-010**: System MUST avoid duplicate active ComplyPatch AI comments for the same pull request commit by updating or replacing the prior bot comment when possible.
- **FR-011**: System MUST record inbound delivery status, scan status, and outbound posting status separately.
- **FR-012**: System MUST never expose webhook secrets, access tokens, or full sensitive payload values in user-visible errors, logs, comments, or reports.
- **FR-013**: System MUST provide a demo-safe fallback that displays the generated PR comment locally when GitHub posting is not configured.
- **FR-014**: System MUST clearly state that generated comments provide compliance assistance and not legal certification.

### Key Entities

- **Connected Repository**: A repository enabled for ComplyPatch AI review, including repository identity, connection status, permissions status, and setup errors.
- **GitHub Delivery**: One inbound GitHub event, including delivery identifier, repository, event type, action, pull request reference, received time, processing status, and rejection reason when applicable.
- **Pull Request Change Set**: Changed files associated with a pull request delivery, including file path, change status, content availability, and skipped-file reason when applicable.
- **Scan Result**: Score, findings, evidence, summary, and generated PR comment for a processed change set.
- **Outbound GitHub Comment**: Attempted PR comment post or update, including target pull request, target commit, status, comment URL, and failure reason when applicable.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A demo operator can connect a repository and confirm readiness in under 5 minutes using documented setup steps.
- **SC-002**: A supported pull request event from a connected demo repository produces a completed scan result within 60 seconds for demo-sized PRs.
- **SC-003**: Supported pull request deliveries with known vulnerable demo code produce the same six core finding categories currently shown by the sample scan flow.
- **SC-004**: At least 95% of valid supported deliveries in the demo repository produce either a posted PR comment or a local PR comment preview without manual code paste.
- **SC-005**: Duplicate deliveries for the same pull request commit create no more than one active ComplyPatch AI comment on that commit.
- **SC-006**: Invalid or unauthenticated deliveries are rejected without running a scan, posting to GitHub, or exposing sensitive values.

## Assumptions

- The first implementation focuses on GitHub pull request review events; issues, pushes, releases, workflow runs, and organization events are out of scope.
- GitHub App installation is the preferred connection model for repository access and webhook delivery.
- The demo repository grants enough read access to collect changed file contents and optional write access to create or update PR comments.
- GitHub posting may be disabled in local demo mode; in that case, the generated PR comment preview is still a successful fallback.
- Existing scanner rules and PR comment formatting remain the source of truth for finding categories and comment content.
- This feature provides compliance assistance for demos and does not certify legal or regulatory compliance.
