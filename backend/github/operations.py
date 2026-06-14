from __future__ import annotations

from typing import Any

from psycopg.rows import dict_row
from psycopg.types.json import Jsonb

from backend.db import connect, init_db
from backend.db import get_database_url
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


def operation_store_from_env():
    database_url = get_database_url(required=False)
    mode = _store_mode()
    if mode == "memory" or (mode == "auto" and not database_url):
        from backend.github.state import DemoOperationStore

        return DemoOperationStore()

    if mode not in {"auto", "postgres"}:
        raise ValueError("GITHUB_OPERATION_STORE must be auto, postgres, or memory")

    return PostgresOperationStore(database_url)


class PostgresOperationStore:
    def __init__(self, database_url: str | None = None):
        self.database_url = database_url

    def ensure_schema(self) -> None:
        init_db(self.database_url)

    def connect_repository(
        self,
        repository_full_name: str,
        *,
        permissions_status: str,
        message: str | None = None,
    ) -> ConnectedRepositoryResponse:
        with connect(self.database_url) as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO connected_repositories (
                        repository_full_name, permissions_status, message, updated_at
                    )
                    VALUES (%s, %s, %s, now())
                    ON CONFLICT (repository_full_name) DO UPDATE SET
                        permissions_status = EXCLUDED.permissions_status,
                        message = EXCLUDED.message,
                        updated_at = now()
                    """,
                    (repository_full_name.lower(), permissions_status, message),
                )
        return ConnectedRepositoryResponse(
            repositoryFullName=repository_full_name.lower(),
            connectionStatus="connected",
            permissionsStatus=permissions_status,
            message=message,
        )

    def is_repository_connected(self, repository_full_name: str) -> bool:
        with connect(self.database_url) as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT 1 FROM connected_repositories WHERE repository_full_name = %s",
                    (repository_full_name.lower(),),
                )
                return cur.fetchone() is not None

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
        with connect(self.database_url) as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO github_deliveries (
                        delivery_id, event, action, repository_full_name, pull_request_number,
                        head_sha, status, rejection_reason, error_message
                    )
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (delivery_id) DO UPDATE SET
                        event = EXCLUDED.event,
                        action = EXCLUDED.action,
                        repository_full_name = EXCLUDED.repository_full_name,
                        pull_request_number = EXCLUDED.pull_request_number,
                        head_sha = EXCLUDED.head_sha,
                        status = EXCLUDED.status,
                        rejection_reason = EXCLUDED.rejection_reason,
                        error_message = EXCLUDED.error_message,
                        updated_at = now()
                    """,
                    (
                        delivery_id,
                        event,
                        action,
                        repository_full_name,
                        pull_request_number,
                        head_sha,
                        status,
                        rejection_reason,
                        error_message,
                    ),
                )

    def update_delivery_status(
        self,
        delivery_id: str,
        status: str,
        *,
        rejection_reason: str | None = None,
        error_message: str | None = None,
    ) -> None:
        with connect(self.database_url) as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    UPDATE github_deliveries
                    SET status = %s,
                        rejection_reason = COALESCE(%s, rejection_reason),
                        error_message = COALESCE(%s, error_message),
                        updated_at = now()
                    WHERE delivery_id = %s
                    """,
                    (status, rejection_reason, error_message, delivery_id),
                )

    def save_change_set(
        self,
        delivery_id: str,
        files: list[PullRequestFileRecord],
        skipped_files: list[SkippedFile],
    ) -> None:
        with connect(self.database_url) as conn:
            with conn.cursor() as cur:
                cur.execute("DELETE FROM pull_request_files WHERE delivery_id = %s", (delivery_id,))
                cur.execute("DELETE FROM skipped_files WHERE delivery_id = %s", (delivery_id,))

                for file in files:
                    cur.execute(
                        """
                        INSERT INTO pull_request_files (delivery_id, path, status, content_source, content)
                        VALUES (%s, %s, %s, %s, %s)
                        """,
                        (delivery_id, file.path, file.status, file.contentSource, file.content),
                    )

                for skipped in skipped_files:
                    cur.execute(
                        """
                        INSERT INTO skipped_files (delivery_id, path, reason)
                        VALUES (%s, %s, %s)
                        """,
                        (delivery_id, skipped.path, skipped.reason),
                    )

    def save_scan_result(
        self,
        delivery_id: str,
        scan: ScanResponse,
    ) -> None:
        findings = []
        for finding in scan.findings:
            data = finding.model_dump(mode="json")
            data["evidence"] = redact_sensitive_value(data["evidence"])
            findings.append(data)
        with connect(self.database_url) as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO scan_results (delivery_id, score, summary, findings, ai_analysis, pr_comment, completed_at)
                    VALUES (%s, %s, %s, %s, %s, %s, now())
                    ON CONFLICT (delivery_id) DO UPDATE SET
                        score = EXCLUDED.score,
                        summary = EXCLUDED.summary,
                        findings = EXCLUDED.findings,
                        ai_analysis = EXCLUDED.ai_analysis,
                        pr_comment = EXCLUDED.pr_comment,
                        completed_at = now()
                    """,
                    (
                        delivery_id,
                        scan.score,
                        scan.summary,
                        Jsonb(findings),
                        Jsonb(scan.aiAnalysis.model_dump(mode="json")) if scan.aiAnalysis else None,
                        scan.prComment,
                    ),
                )

    def save_outbound_action(
        self,
        *,
        delivery_id: str,
        repository_full_name: str | None,
        pull_request_number: int | None,
        head_sha: str | None,
        outbound: OutboundOperation,
    ) -> None:
        with connect(self.database_url) as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO outbound_github_actions (
                        delivery_id, repository_full_name, pull_request_number, head_sha,
                        mode, status, comment_id, comment_url, failure_reason, updated_at
                    )
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, now())
                    ON CONFLICT (delivery_id) DO UPDATE SET
                        repository_full_name = EXCLUDED.repository_full_name,
                        pull_request_number = EXCLUDED.pull_request_number,
                        head_sha = EXCLUDED.head_sha,
                        mode = EXCLUDED.mode,
                        status = EXCLUDED.status,
                        comment_id = EXCLUDED.comment_id,
                        comment_url = EXCLUDED.comment_url,
                        failure_reason = EXCLUDED.failure_reason,
                        updated_at = now()
                    """,
                    (
                        delivery_id,
                        repository_full_name,
                        pull_request_number,
                        head_sha,
                        outbound.mode,
                        outbound.status,
                        outbound.commentId,
                        outbound.commentUrl,
                        outbound.failureReason,
                    ),
                )

    def get_operation(self, delivery_id: str) -> GitHubOperationResponse | None:
        with connect(self.database_url) as conn:
            with conn.cursor(row_factory=dict_row) as cur:
                cur.execute("SELECT * FROM github_deliveries WHERE delivery_id = %s", (delivery_id,))
                delivery = cur.fetchone()
                if not delivery:
                    return None

                cur.execute("SELECT * FROM scan_results WHERE delivery_id = %s", (delivery_id,))
                scan = cur.fetchone()

                cur.execute("SELECT * FROM outbound_github_actions WHERE delivery_id = %s", (delivery_id,))
                outbound = cur.fetchone()

                cur.execute("SELECT path, reason FROM skipped_files WHERE delivery_id = %s ORDER BY id", (delivery_id,))
                skipped = cur.fetchall()

        return GitHubOperationResponse(
            delivery=DeliveryOperation(
                deliveryId=delivery["delivery_id"],
                event=delivery["event"],
                action=delivery["action"],
                repository=delivery["repository_full_name"],
                pullRequestNumber=delivery["pull_request_number"],
                headSha=delivery["head_sha"],
                status=delivery["status"],
                rejectionReason=delivery["rejection_reason"],
                errorMessage=delivery["error_message"],
            ),
            scan=self._scan_response(scan) if scan else None,
            outbound=self._outbound_response(outbound) if outbound else None,
            skippedFiles=[SkippedFile(path=row["path"], reason=row["reason"]) for row in skipped],
        )

    def clear_all(self) -> None:
        with connect(self.database_url) as conn:
            with conn.cursor() as cur:
                cur.execute("DELETE FROM outbound_github_actions")
                cur.execute("DELETE FROM scan_results")
                cur.execute("DELETE FROM skipped_files")
                cur.execute("DELETE FROM pull_request_files")
                cur.execute("DELETE FROM github_deliveries")
                cur.execute("DELETE FROM connected_repositories")

    def _scan_response(self, row: dict[str, Any]) -> ScanResponse:
        return ScanResponse(
            score=row["score"],
            summary=row["summary"],
            findings=row["findings"] or [],
            prComment=row["pr_comment"],
            aiAnalysis=row.get("ai_analysis"),
        )

    def _outbound_response(self, row: dict[str, Any]) -> OutboundOperation:
        return OutboundOperation(
            mode=row["mode"],
            status=row["status"],
            commentId=row["comment_id"],
            commentUrl=row["comment_url"],
            failureReason=row["failure_reason"],
        )


def _store_mode() -> str:
    from os import environ

    return environ.get("GITHUB_OPERATION_STORE", "auto").strip().lower() or "auto"
