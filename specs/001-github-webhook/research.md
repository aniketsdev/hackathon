# Research: GitHub PR Webhook Comments

## Decision: Use GitHub App Webhooks for Repository Connection

**Decision**: Treat repository connection as a GitHub App installation or equivalent app-level setup that grants access to selected repositories and sends pull request webhook deliveries.

**Rationale**: GitHub documents GitHub Apps receiving webhook events for repositories the app can access, including pull request events, and then calling GitHub APIs in response. This fits the requested "add repo, connect GitHub, comment on PR" flow while keeping permissions scoped to selected repositories.

**Alternatives considered**:

- Personal access token only: rejected as the primary plan because repo-specific app installation is easier to reason about for webhook ownership and least privilege.
- Manual paste/local repo scan only: rejected because the requested feature is GitHub-connected automation.

**Reference**: GitHub Docs, building a GitHub App that responds to webhook events: https://docs.github.com/en/apps/creating-github-apps/writing-code-for-a-github-app/building-a-github-app-that-responds-to-webhook-events

## Decision: Keep Repository Identity Dynamic

**Decision**: Accept repository identity from the repository connection request as either `owner/repo` or a GitHub repository URL, normalize it to `owner/repo`, and verify webhook payload repository identity against connected or allowlisted repositories at runtime.

**Rationale**: The demo must work for whichever repository the user adds. Fixed `GITHUB_OWNER` and `GITHUB_REPO` environment values make the backend brittle and conflict with the add-repository flow. Environment should only hold secrets, optional posting flags, optional allowlists, and optional API base URL overrides.

**Alternatives considered**:

- Fixed owner/repo environment variables: rejected because the repository URL is dynamic and supplied by the user.
- UI-only repository selection: rejected for this planning slice because the user explicitly asked not to work on UI.
- Accept any webhook repository without connection: rejected because this weakens the safety gate for live webhook payloads.

## Decision: Verify Webhook Deliveries Before Processing

**Decision**: Require live webhook deliveries to include GitHub delivery metadata and verify the `X-Hub-Signature-256` HMAC signature against the raw request body before parsing or scanning.

**Rationale**: GitHub recommends validating webhook signatures before processing to ensure deliveries came from GitHub and were not tampered with. Invalid or missing signatures must stop processing before file collection, scanning, or outbound commenting.

**Alternatives considered**:

- Trust only repository allowlists: rejected because allowlists do not prove payload authenticity.
- Accept unsigned webhooks in demo mode: rejected for live GitHub deliveries; local fixture tests can bypass network delivery but must not represent live mode.

**Reference**: GitHub Docs, validating webhook deliveries: https://docs.github.com/en/webhooks/using-webhooks/validating-webhook-deliveries

## Decision: Process Pull Request Events Only for V1

**Decision**: Support `pull_request` deliveries for `opened`, `reopened`, `synchronize`, and `ready_for_review`, acknowledge `ping`, and ignore unsupported events without scanning.

**Rationale**: The user asked for PR comments when a PR is created or updated. These actions cover new PRs, reopened PRs, new commits, and draft-to-ready transitions without expanding into push, issue, release, or workflow events.

**Alternatives considered**:

- Support all GitHub events: rejected because it increases demo risk and does not improve the PR review workflow.
- Support only `opened`: rejected because commits pushed after PR creation should trigger a fresh scan.

**Reference**: GitHub Docs, webhook events and payloads: https://docs.github.com/en/webhooks/webhook-events-and-payloads

## Decision: Use PR File List and Repository Content/Patch Fallback

**Decision**: Fetch the changed files for the pull request, then scan full relevant file content when available; if full content is unavailable, scan patch text and mark the content source.

**Rationale**: GitHub pull request APIs expose PRs and associated file information. Full file content improves route-level and missing-auth rules, while patch fallback still catches many secrets, logging, unsafe SQL, cookie, and CORS patterns.

**Alternatives considered**:

- Clone the repository for every webhook: rejected for the demo because it adds runtime and environment complexity.
- Scan only file paths: rejected because findings require evidence.

**References**:

- GitHub Docs, REST API endpoints for pull requests: https://docs.github.com/en/rest/pulls/pulls
- GitHub Docs, REST API endpoints for repository contents: https://docs.github.com/rest/repos/contents

## Decision: Post a Single PR Timeline Comment

**Decision**: Post or update one pull request timeline comment containing the ComplyPatch AI report rather than many inline review comments.

**Rationale**: GitHub pull requests are also issues for shared comment operations, and the current ComplyPatch output is one report-style markdown body. Inline review comments require precise diff line positioning and add complexity beyond the requested first demo.

**Alternatives considered**:

- Inline pull request review comments: deferred because they require diff line mapping for each finding.
- Commit statuses/check runs: deferred because the user specifically asked for a comment and the product already formats PR-style comments.

**Reference**: GitHub Docs, REST API endpoints for issue comments: https://docs.github.com/en/rest/issues/comments

## Decision: Use a Stable Comment Marker for De-Duplication

**Decision**: Include a hidden ComplyPatch marker in the comment body and update an existing bot comment for the same PR head commit when possible.

**Rationale**: GitHub may redeliver webhooks and users may push multiple commits. Updating a marked comment prevents noisy duplicate comments while keeping the latest scan visible.

**Alternatives considered**:

- Always create a new comment: rejected because duplicate comments degrade the review experience.
- Delete old comments: rejected because update/replace is less destructive and easier to audit.

## Decision: Keep GitHub Posting Optional With Local Preview Fallback

**Decision**: If write permission or posting configuration is unavailable, complete the scan and expose the generated PR comment locally.

**Rationale**: This follows the project's demo-safety guidance: live GitHub credentials should not be required for every local validation run, and scan output remains useful without outbound posting.

**Alternatives considered**:

- Fail the scan when posting is unavailable: rejected because scan results and comment preview still satisfy the core review artifact.
- Require live GitHub for all tests: rejected because CI/local tests should not depend on external credentials.

## Decision: Use Lightweight Demo State First

**Decision**: Track connected repositories, deliveries, scan results, and outbound status in a simple demo-safe state layer first, with a clear later upgrade path to persistent storage if needed.

**Rationale**: The hackathon goal is a stable working demo and the current project does not have a database dependency. Keeping the first version lightweight avoids adding infrastructure before the GitHub loop is proven.

**Alternatives considered**:

- Add PostgreSQL immediately: deferred because it adds setup burden and is not required for the requested demo.
- Store no state at all: rejected because idempotency and operation status require at least bounded operation tracking.
