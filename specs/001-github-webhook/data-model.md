# Data Model: GitHub Webhook Operations

## GitHub Delivery

Represents one inbound GitHub webhook delivery.

**Fields**:

- `delivery_id`: GitHub delivery GUID from `X-GitHub-Delivery`; unique.
- `event`: GitHub event name, expected to be `pull_request` for scans.
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
- `event`, `action`, `repository_full_name`, `pull_request_number`, and `head_sha` are required before a scan can run.
- Invalid signatures set status to `rejected` and do not create scan or outbound action records.

**State transitions**:

- `received` -> `ignored` for unsupported events or actions.
- `received` -> `rejected` for invalid verification or malformed required data.
- `received` -> `processing` -> `completed` when scan processing succeeds.
- `received` -> `processing` -> `failed` when changed-file collection or scanning fails unexpectedly.

## Pull Request Change Set

Represents the changed files selected for scanning from a pull request delivery.

**Fields**:

- `delivery_id`: Associated GitHub delivery.
- `repository_full_name`: Repository owner/name.
- `pull_request_number`: Pull request number.
- `head_sha`: Pull request head commit SHA.
- `files`: List of changed file entries.
- `skipped_files`: Files skipped due to size, unsupported status, unavailable content, or demo file-count limit.

**Changed file entry fields**:

- `path`: Repository-relative file path.
- `status`: GitHub file status such as added, modified, removed, renamed, or changed.
- `content_source`: `full`, `patch`, or `unavailable`.
- `content`: Text selected for scanning, bounded by scan limits.

**Validation rules**:

- At most 50 files are selected for scanning.
- Each selected file content is bounded to 200,000 characters.
- Removed files and unavailable files are not scanned and must appear in `skipped_files`.

## Scan Result

Represents the ComplyPatch result generated for a pull request change set.

**Fields**:

- `delivery_id`: Associated GitHub delivery.
- `score`: Compliance score from 0 to 100.
- `summary`: Human-readable scan summary.
- `findings`: Scanner findings with rule id, severity, file, line, evidence, impact, and fix.
- `pr_comment`: Generated GitHub-style markdown comment.
- `completed_at`: Time scan completed.

**Validation rules**:

- Score must be between 0 and 100.
- Findings must use the existing rule catalog severities.
- Comment body must include the demo safety disclaimer.

## Outbound GitHub Action

Represents one attempt to create or update a PR comment.

**Fields**:

- `delivery_id`: Associated GitHub delivery.
- `repository_full_name`: Target repository owner/name.
- `pull_request_number`: Target PR number.
- `head_sha`: Target PR head commit SHA.
- `mode`: `post`, `update`, or `preview`.
- `status`: `not_configured`, `pending`, `posted`, `updated`, or `failed`.
- `comment_id`: GitHub comment id when a post or update succeeds.
- `comment_url`: GitHub comment URL when available.
- `failure_reason`: Sanitized failure reason when posting fails.

**Validation rules**:

- `preview` mode must preserve the generated comment body locally.
- Posting must not run when GitHub write authorization is missing.
- Failure reasons must not include access tokens or webhook secrets.

## Relationships

- One GitHub Delivery has zero or one Pull Request Change Set.
- One Pull Request Change Set has zero or one Scan Result.
- One Scan Result has zero or one Outbound GitHub Action.
- `delivery_id` is the correlation key across all operation records.

## PostgreSQL Tables

- `github_deliveries`: Stores delivery metadata and lifecycle status keyed by `delivery_id`.
- `pull_request_files`: Stores selected changed-file metadata and bounded scanned content or patch text keyed by `delivery_id`.
- `skipped_files`: Stores skipped file path and reason keyed by `delivery_id`.
- `scan_results`: Stores score, summary, findings JSON, generated PR comment, and completion timestamp keyed by `delivery_id`.
- `outbound_github_actions`: Stores post/update/preview status and GitHub comment identifiers keyed by `delivery_id`.

**Retention and sensitivity rules**:

- Runtime secrets and webhook tokens are never stored.
- Error messages are sanitized before storage.
- Finding evidence and comments should be redacted before persistence when they resemble secrets.
- Source snippets stored for scanning are bounded by the demo file limits and may be omitted or replaced with patch text when full content is unavailable.
