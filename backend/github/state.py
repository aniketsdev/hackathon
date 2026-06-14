from __future__ import annotations

from collections import OrderedDict
from threading import Lock

from backend.github.pr_comment import redact_sensitive_value
from backend.models import (
    ConnectedRepositoryResponse,
    DeliveryOperation,
    GitHubOperationResponse,
    OutboundOperation,
    PullRequestFileRecord,
    ScanResponse,
    SkippedFile,
)

MAX_REPOSITORIES = 100
MAX_OPERATIONS = 200

_lock = Lock()
_repositories: OrderedDict[str, ConnectedRepositoryResponse] = OrderedDict()
_operations: OrderedDict[str, GitHubOperationResponse] = OrderedDict()


def reset_state() -> None:
    with _lock:
        _repositories.clear()
        _operations.clear()


def connect_repository(
    repository_full_name: str,
    *,
    permissions_status: str,
    message: str | None = None,
) -> ConnectedRepositoryResponse:
    response = ConnectedRepositoryResponse(
        repositoryFullName=repository_full_name,
        connectionStatus="connected",
        permissionsStatus=permissions_status,
        message=message,
    )
    with _lock:
        _repositories[repository_full_name.lower()] = response
        _repositories.move_to_end(repository_full_name.lower())
        _trim(_repositories, MAX_REPOSITORIES)
    return response


def is_repository_connected(repository_full_name: str) -> bool:
    with _lock:
        return repository_full_name.lower() in _repositories


class DemoOperationStore:
    def ensure_schema(self) -> None:
        return None

    def record_delivery(
        self,
        *,
        delivery_id: str,
        event: str,
        status: str,
        action: str | None = None,
        repository_full_name: str | None = None,
        pull_request_number: int | None = None,
        head_sha: str | None = None,
        rejection_reason: str | None = None,
        error_message: str | None = None,
    ) -> None:
        delivery = DeliveryOperation(
            deliveryId=delivery_id,
            event=event,
            action=action,
            repository=repository_full_name,
            pullRequestNumber=pull_request_number,
            headSha=head_sha,
            status=status,
            rejectionReason=redact_sensitive_value(rejection_reason) if rejection_reason else None,
            errorMessage=redact_sensitive_value(error_message) if error_message else None,
        )
        with _lock:
            existing = _operations.get(delivery_id)
            _operations[delivery_id] = GitHubOperationResponse(
                delivery=delivery,
                scan=existing.scan if existing else None,
                outbound=existing.outbound if existing else None,
                skippedFiles=existing.skippedFiles if existing else [],
            )
            _operations.move_to_end(delivery_id)
            _trim(_operations, MAX_OPERATIONS)

    def update_delivery_status(
        self,
        delivery_id: str,
        status: str,
        *,
        rejection_reason: str | None = None,
        error_message: str | None = None,
    ) -> None:
        with _lock:
            operation = _operations.get(delivery_id)
            if not operation:
                return
            operation.delivery.status = status
            if rejection_reason:
                operation.delivery.rejectionReason = redact_sensitive_value(rejection_reason)
            if error_message:
                operation.delivery.errorMessage = redact_sensitive_value(error_message)

    def save_change_set(
        self,
        delivery_id: str,
        files: list[PullRequestFileRecord],
        skipped_files: list[SkippedFile],
    ) -> None:
        del files
        with _lock:
            operation = _operations.get(delivery_id)
            if operation:
                operation.skippedFiles = skipped_files

    def save_scan_result(self, delivery_id: str, scan: ScanResponse) -> None:
        findings = []
        for finding in scan.findings:
            data = finding.model_dump(mode="json")
            data["evidence"] = redact_sensitive_value(data["evidence"])
            findings.append(data)
        sanitized_scan = ScanResponse(
            score=scan.score,
            summary=scan.summary,
            findings=findings,
            prComment=scan.prComment,
        )
        with _lock:
            operation = _operations.get(delivery_id)
            if operation:
                operation.scan = sanitized_scan

    def save_outbound_action(
        self,
        *,
        delivery_id: str,
        repository_full_name: str | None,
        pull_request_number: int | None,
        head_sha: str | None,
        outbound: OutboundOperation,
    ) -> None:
        del repository_full_name, pull_request_number, head_sha
        if outbound.failureReason:
            outbound.failureReason = redact_sensitive_value(outbound.failureReason)
        with _lock:
            operation = _operations.get(delivery_id)
            if operation:
                operation.outbound = outbound

    def get_operation(self, delivery_id: str) -> GitHubOperationResponse | None:
        with _lock:
            operation = _operations.get(delivery_id)
            return operation.model_copy(deep=True) if operation else None

    def clear_all(self) -> None:
        reset_state()


def _trim(mapping: OrderedDict, limit: int) -> None:
    while len(mapping) > limit:
        mapping.popitem(last=False)
