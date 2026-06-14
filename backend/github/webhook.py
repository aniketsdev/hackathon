from __future__ import annotations

import hmac
import json
from hashlib import sha256
from typing import Any, Mapping

from backend.agents.compliance_agent import generate_summary
from backend.github.client import GitHubApiError, GitHubClient, GitHubSettings, sanitize_error
from backend.github import state
from backend.github.state import DemoOperationStore
from backend.github.pr_comment import build_comment_marker, generate_pr_comment
from backend.models import OutboundOperation, ScanResponse, WebhookAck
from backend.scanner.scan import scan_files
from backend.scanner.scoring import calculate_score


SUPPORTED_PR_ACTIONS = {"opened", "reopened", "synchronize", "ready_for_review"}


def verify_signature(raw_body: bytes, signature_header: str | None, secret: str) -> bool:
    if not signature_header or not signature_header.startswith("sha256="):
        return False
    expected = "sha256=" + hmac.new(secret.encode("utf-8"), raw_body, sha256).hexdigest()
    return hmac.compare_digest(expected, signature_header)


def parse_payload(raw_body: bytes) -> dict[str, Any]:
    try:
        payload = json.loads(raw_body.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise ValueError("Invalid JSON payload") from exc
    if not isinstance(payload, dict):
        raise ValueError("Webhook payload must be a JSON object")
    return payload


def process_github_webhook(
    raw_body: bytes,
    headers: Mapping[str, str],
    *,
    store: DemoOperationStore | None = None,
    settings: GitHubSettings | None = None,
    client: GitHubClient | None = None,
) -> tuple[int, WebhookAck]:
    settings = settings or GitHubSettings.from_env()
    if not settings.webhook_secret:
        return 503, WebhookAck(status="rejected", message="Webhook receiver is not configured")

    store = store or DemoOperationStore()
    store.ensure_schema()

    delivery_id = _header(headers, "x-github-delivery")
    event = _header(headers, "x-github-event") or "unknown"
    signature = _header(headers, "x-hub-signature-256")

    if not delivery_id:
        return 400, WebhookAck(status="rejected", message="Missing GitHub delivery id")

    if not verify_signature(raw_body, signature, settings.webhook_secret):
        store.record_delivery(
            delivery_id=delivery_id,
            event=event,
            status="rejected",
            rejection_reason="Invalid webhook signature",
        )
        return 401, WebhookAck(deliveryId=delivery_id, status="rejected", message="Invalid webhook signature")

    try:
        payload = parse_payload(raw_body)
    except ValueError as exc:
        store.record_delivery(
            delivery_id=delivery_id,
            event=event,
            status="rejected",
            rejection_reason=str(exc),
        )
        return 400, WebhookAck(deliveryId=delivery_id, status="rejected", message=str(exc))

    if event == "ping":
        repository = _repository_full_name(payload)
        store.record_delivery(
            delivery_id=delivery_id,
            event=event,
            status="ignored",
            repository_full_name=repository,
        )
        return 200, WebhookAck(deliveryId=delivery_id, status="ignored", message="Event acknowledged without scan")

    if event != "pull_request":
        store.record_delivery(delivery_id=delivery_id, event=event, status="ignored")
        return 200, WebhookAck(deliveryId=delivery_id, status="ignored", message="Event acknowledged without scan")

    context = _extract_pull_request_context(payload)
    if context is None:
        store.record_delivery(
            delivery_id=delivery_id,
            event=event,
            status="rejected",
            rejection_reason="Missing required pull request data",
        )
        return 400, WebhookAck(deliveryId=delivery_id, status="rejected", message="Missing required pull request data")

    action = context["action"]
    repository_full_name = context["repository_full_name"]
    pull_request_number = context["pull_request_number"]
    head_sha = context["head_sha"]

    if not settings.allows_repository(repository_full_name) or (
        not settings.allowed_repositories and not state.is_repository_connected(repository_full_name)
    ):
        store.record_delivery(
            delivery_id=delivery_id,
            event=event,
            action=action,
            repository_full_name=repository_full_name,
            pull_request_number=pull_request_number,
            head_sha=head_sha,
            status="rejected",
            rejection_reason="Repository is not connected",
        )
        return 403, WebhookAck(deliveryId=delivery_id, status="rejected", message="Repository is not connected")

    if action not in SUPPORTED_PR_ACTIONS:
        store.record_delivery(
            delivery_id=delivery_id,
            event=event,
            action=action,
            repository_full_name=repository_full_name,
            pull_request_number=pull_request_number,
            head_sha=head_sha,
            status="ignored",
        )
        return 200, WebhookAck(deliveryId=delivery_id, status="ignored", message="Event acknowledged without scan")

    store.record_delivery(
        delivery_id=delivery_id,
        event=event,
        action=action,
        repository_full_name=repository_full_name,
        pull_request_number=pull_request_number,
        head_sha=head_sha,
        status="processing",
    )

    owner, repo = repository_full_name.split("/", 1)
    client = client or GitHubClient(settings)

    try:
        source_files, file_records, skipped_files = client.collect_pull_request_files(
            owner,
            repo,
            pull_request_number,
            head_sha,
        )
        store.save_change_set(delivery_id, file_records, skipped_files)

        findings = scan_files(source_files)
        score = calculate_score(findings)
        summary = generate_summary(score, findings)
        marker = build_comment_marker(head_sha)
        comment = generate_pr_comment(score, findings, marker=marker)
        scan = ScanResponse(score=score, summary=summary, findings=findings, prComment=comment)
        store.save_scan_result(delivery_id, scan)

        outbound = _handle_outbound_comment(
            settings=settings,
            client=client,
            repository_full_name=repository_full_name,
            owner=owner,
            repo=repo,
            pull_request_number=pull_request_number,
            head_sha=head_sha,
            comment=comment,
            marker=marker,
        )
        store.save_outbound_action(
            delivery_id=delivery_id,
            repository_full_name=repository_full_name,
            pull_request_number=pull_request_number,
            head_sha=head_sha,
            outbound=outbound,
        )
        store.update_delivery_status(delivery_id, "completed")
        return 202, WebhookAck(deliveryId=delivery_id, status="completed", message="Pull request scan completed")
    except Exception as exc:
        message = sanitize_error(str(exc))
        store.update_delivery_status(delivery_id, "failed", error_message=message)
        return 500, WebhookAck(deliveryId=delivery_id, status="failed", message=message)


def _handle_outbound_comment(
    *,
    settings: GitHubSettings,
    client: GitHubClient,
    repository_full_name: str,
    owner: str,
    repo: str,
    pull_request_number: int,
    head_sha: str,
    comment: str,
    marker: str,
) -> OutboundOperation:
    if not settings.post_comments or not settings.token:
        return OutboundOperation(mode="preview", status="not_configured")

    try:
        result = client.upsert_pull_request_comment(owner, repo, pull_request_number, comment, marker)
        mode = "update" if result.get("mode") == "update" else "post"
        status = "updated" if mode == "update" else "posted"
        return OutboundOperation(
            mode=mode,
            status=status,
            commentId=result.get("id"),
            commentUrl=result.get("html_url"),
        )
    except GitHubApiError as exc:
        return OutboundOperation(
            mode="post",
            status="failed",
            failureReason=sanitize_error(f"{repository_full_name} {head_sha}: {exc}"),
        )


def _extract_pull_request_context(payload: dict[str, Any]) -> dict[str, Any] | None:
    action = payload.get("action")
    repository_full_name = _repository_full_name(payload)
    pull_request = payload.get("pull_request")
    if not isinstance(action, str) or not repository_full_name or not isinstance(pull_request, dict):
        return None

    number = pull_request.get("number")
    head = pull_request.get("head")
    head_sha = head.get("sha") if isinstance(head, dict) else None
    if not isinstance(number, int) or not isinstance(head_sha, str) or not head_sha:
        return None

    return {
        "action": action,
        "repository_full_name": repository_full_name,
        "pull_request_number": number,
        "head_sha": head_sha,
    }


def _repository_full_name(payload: dict[str, Any]) -> str | None:
    repository = payload.get("repository")
    if not isinstance(repository, dict):
        return None
    full_name = repository.get("full_name")
    return full_name if isinstance(full_name, str) and "/" in full_name else None


def _header(headers: Mapping[str, str], name: str) -> str | None:
    for key, value in headers.items():
        if key.lower() == name:
            return value
    return None
