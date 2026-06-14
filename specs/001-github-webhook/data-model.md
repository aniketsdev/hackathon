# Data Model: GitHub PR Webhook Comments

## ConnectedRepository

Represents one GitHub repository enabled for ComplyPatch AI review.

**Fields**:

- `repository_full_name`: Repository owner/name, unique within the demo.
- `repository_url`: Optional user-provided GitHub repository URL before normalization.
- `installation_id`: GitHub App installation identifier when available.
- `connection_status`: `connected`, `disabled`, or `failed`.
- `permissions_status`: `unknown`, `read_only`, or `read_write`.
- `last_error`: Sanitized setup failure, if any.
- `connected_at`: Time the repository was enabled.

**Validation rules**:

- Repository identity is required before pull request deliveries are accepted.
- Repository identity may be supplied as `owner/repo` or a GitHub URL and is normalized to `owner/repo`.
- Fixed `GITHUB_OWNER` and `GITHUB_REPO` environment values are not used for repository identity.
- Failed or disabled repositories do not trigger scans.
- Tokens, app keys, and webhook secrets are never stored in this entity.

## GitHubDelivery

Represents one inbound GitHub webhook delivery.

**Fields**:

- `delivery_id`: GitHub delivery GUID from `X-GitHub-Delivery`; unique.
- `event`: GitHub event name.
- `action`: Pull request action such as `opened`, `reopened`, `synchronize`, or `ready_for_review`.
- `repository_full_name`: Repository owner/name from the payload.
- `pull_request_number`: Pull request number when present.
- `head_sha`: Pull request head commit SHA when present.
- `received_at`: Time the delivery was received.
- `status`: `received`, `ignored`, `rejected`, `processing`, `completed`, or `failed`.
- `rejection_reason`: Sanitized reason when the delivery is rejected.
- `error_message`: Sanitized failure reason when processing fails.

**Validation rules**:

- `delivery_id` is required for all live deliveries.
- Live deliveries must pass signature verification before payload processing.
- `event`, `action`, `repository_full_name`, `pull_request_number`, and `head_sha` are required before a scan can run.
- Deliveries for repositories that are not connected are rejected or ignored without scanning.

**State transitions**:

- `received -> ignored` for ping or unsupported events/actions.
- `received -> rejected` for invalid verification, disconnected repositories, or malformed required data.
- `received -> processing -> completed` when changed-file collection, scanning, and comment handling finish.
- `received -> processing -> failed` when collection or scanning fails unexpectedly.

## PullRequestChangeSet

Represents the changed files selected for scanning from a pull request delivery.

**Fields**:

- `delivery_id`: Associated delivery.
- `repository_full_name`: Repository owner/name.
- `pull_request_number`: Pull request number.
- `head_sha`: Pull request head commit SHA.
- `files`: List of changed file entries.
- `skipped_files`: Files skipped due to size, unsupported status, unavailable content, or demo file-count limit.

**Changed file entry fields**:

- `path`: Repository-relative file path.
- `status`: File status such as added, modified, removed, renamed, or changed.
- `content_source`: `full`, `patch`, or `unavailable`.
- `content`: Text selected for scanning, bounded by scan limits.

**Validation rules**:

- At most 50 files are selected for scanning in the first demo.
- Each selected file content is bounded to 200,000 characters.
- Removed files and unavailable files are not scanned and appear in `skipped_files`.

## ScanResult

Represents the ComplyPatch result generated for a pull request change set.

**Fields**:

- `delivery_id`: Associated delivery.
- `score`: Compliance score from 0 to 100.
- `summary`: Human-readable scan summary.
- `findings`: Scanner findings with rule id, severity, file, line, evidence, impact, and fix.
- `pr_comment`: Generated GitHub-style markdown comment.
- `completed_at`: Time scan completed.

**Validation rules**:

- Score must be between 0 and 100.
- Findings use the existing rule catalog severities and categories.
- Comment body includes the demo safety disclaimer.
- Evidence is masked when it resembles secrets or unnecessary patient data.

## OutboundGitHubComment

Represents one attempt to create or update a PR comment.

**Fields**:

- `delivery_id`: Associated delivery.
- `repository_full_name`: Target repository owner/name.
- `pull_request_number`: Target PR number.
- `head_sha`: Target PR head commit SHA.
- `mode`: `post`, `update`, or `preview`.
- `status`: `not_configured`, `pending`, `posted`, `updated`, or `failed`.
- `comment_id`: GitHub comment id when a post or update succeeds.
- `comment_url`: GitHub comment URL when available.
- `failure_reason`: Sanitized failure reason when posting fails.

**Validation rules**:

- Preview mode preserves the generated comment body locally.
- Posting does not run when GitHub write authorization is missing.
- Failure reasons must not include access tokens, app keys, or webhook secrets.
- Duplicate deliveries for the same PR head commit update a marked prior comment when possible.

## Relationships

- One ConnectedRepository has many GitHubDeliveries.
- One GitHubDelivery has zero or one PullRequestChangeSet.
- One PullRequestChangeSet has zero or one ScanResult.
- One ScanResult has zero or one OutboundGitHubComment.
- `delivery_id` is the correlation key across delivery, scan, and outbound status.

## State Retention

The first demo uses bounded lightweight state for connected repositories and recent deliveries. Runtime secrets are never stored. A later persistent storage layer can reuse these entities without changing the webhook contract.
