# Research: GitHub Webhook Operations

## Decision: Process Pull Request Webhook Actions Only

**Decision**: Support `pull_request` deliveries for `opened`, `reopened`, `synchronize`, and `ready_for_review`. Acknowledge `ping` and unsupported events without scanning.

**Rationale**: The feature spec is centered on PR review. These actions cover a new PR, a reopened PR, new commits on a PR, and a draft PR becoming reviewable. Keeping other GitHub events out of scope protects the hackathon demo from unnecessary branching.

**Alternatives considered**:

- Support all GitHub events: rejected because it increases scope without improving the core demo.
- Support only `opened`: rejected because new commits on an existing PR are common and should trigger a fresh scan.

## Decision: Verify Webhook Deliveries With X-Hub-Signature-256

**Decision**: Require the GitHub `X-Hub-Signature-256` header and verify the raw request body with HMAC-SHA256 before parsing or processing the payload.

**Rationale**: GitHub recommends `X-Hub-Signature-256`; verification must use the unmodified payload bytes and the configured webhook secret. Invalid or missing signatures must stop processing before any scan or outbound GitHub action.

**Alternatives considered**:

- Trust GitHub IP ranges: rejected for demo complexity and because signature verification is the direct integration control.
- Accept unsigned local deliveries in live mode: rejected because the feature requirement says deliveries must be verified.

**Reference**: GitHub Docs, validating webhook deliveries: https://docs.github.com/en/webhooks/using-webhooks/validating-webhook-deliveries

## Decision: Use Existing Scanner Limits For Changed Files

**Decision**: Keep the scan input bounded to 50 files and 200,000 characters per file. Files beyond those bounds are skipped and reported in operation evidence.

**Rationale**: The current backend model already defines these demo-safe limits. Reusing them keeps behavior predictable and avoids memory or latency surprises.

**Alternatives considered**:

- Scan the entire repository: rejected because the feature is PR-centered and would be too slow for the demo.
- Add async storage and a queue immediately: rejected because in-memory status is enough for a single hackathon demo repository.

## Decision: Use Pull Request File Metadata And Available Content

**Decision**: Fetch the PR file list from GitHub, then scan available file content for supported files. If full content is unavailable, scan the available patch text and mark the content source in evidence.

**Rationale**: The PR file list is the natural GitHub source for changed paths. Full content improves missing-auth detection; patch fallback still supports secrets, PII logging, unsafe SQL, wildcard CORS, and insecure cookie findings in many demo cases.

**Alternatives considered**:

- Require local repository checkout: rejected because it adds setup risk and dependency on git execution during webhook processing.
- Scan only patch text: rejected as the only path because some rules are better against full files.

**Reference**: GitHub Docs, REST pull request endpoints: https://docs.github.com/en/rest/pulls/pulls

## Decision: Post A Timeline Issue Comment, Not Inline Review Comments

**Decision**: Post or update a single pull request timeline comment using GitHub issue comments.

**Rationale**: GitHub pull requests are issues for shared comment operations, and the current ComplyPatch output is one report-style markdown body. Inline review comments require diff positions and would add complexity that is not needed for the demo.

**Alternatives considered**:

- Pull request review comments: rejected for this slice because they require path and diff line targeting for each finding.
- Commit statuses/check runs: rejected because the user specifically asked for "our post" and the current product already has PR-style comments.

**Reference**: GitHub Docs, issue comments on pull requests: https://docs.github.com/en/rest/issues/comments

## Decision: Use A Stable Comment Marker For De-Duplication

**Decision**: Add a hidden ComplyPatch marker to the generated comment body and update an existing bot comment for the same PR commit when possible.

**Rationale**: This keeps each commit from accumulating duplicate comments when GitHub redelivers a webhook or a user retries the demo.

**Alternatives considered**:

- Always create a new comment: rejected because duplicate comments make the demo noisy.
- Delete old comments: rejected because updating is less destructive and easier to explain.

## Decision: Optional GitHub Posting With Local Preview Fallback

**Decision**: If a GitHub write token or posting toggle is not configured, complete the scan and expose the generated PR comment locally without attempting outbound GitHub posting.

**Rationale**: This follows the project demo-safety rule: live GitHub integration should not block the demo when credentials or permissions are risky.

**Alternatives considered**:

- Fail the whole scan when posting is unavailable: rejected because scan results are still valuable.
- Require posting for all tests: rejected because CI and local development should not need live GitHub credentials.

## Decision: Persist Operation Status In PostgreSQL

**Decision**: Store inbound delivery, changed-file metadata, scan results, findings, skipped files, generated PR comment markdown, and outbound posting status in PostgreSQL for the webhook implementation.

**Rationale**: The feature must run as a production-style GitHub integration, so delivery state cannot disappear on process restart and cannot depend on local process memory. PostgreSQL also aligns with the existing target architecture for scan persistence.

**Alternatives considered**:

- Process-local memory: rejected because the user requested PostgreSQL-backed production behavior.
- Store JSON files: rejected because it is still local-only state and does not match the target production architecture.

## Decision: Use Direct PostgreSQL Driver And Idempotent Schema Creation

**Decision**: Use `psycopg` and an idempotent schema initialization function that creates the required tables and indexes if they do not exist.

**Rationale**: This keeps the implementation simple for a hackathon demo while still using real PostgreSQL. A full migration framework can be added later when the data model stabilizes.

**Alternatives considered**:

- SQLAlchemy and Alembic: deferred because they add more moving parts than needed for this slice.
- Raw `psql` scripts only: rejected because the deployed app still needs a safe way to initialize a fresh demo database.
