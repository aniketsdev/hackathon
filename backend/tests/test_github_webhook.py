import hmac
import json
import os
import unittest
from hashlib import sha256

from backend.github.client import GitHubSettings
from backend.github.operations import PostgresOperationStore
from backend.github.webhook import process_github_webhook
from backend.models import PullRequestFileRecord, SourceFile


DEMO_CODE = """export async function GET(req: Request) {
  const apiKey = "sk-demo-hardcoded-key";

  const patient = {
    name: "Rahul Sharma",
    phone: "9876543210",
    diagnosis: "diabetes"
  };

  console.log("Patient data:", patient);

  const query = "SELECT * FROM patients WHERE id = " + req.url;

  cookies().set("session", "abc123");

  return Response.json(patient, {
    headers: {
      "Access-Control-Allow-Origin": "*"
    }
  });
}"""


class FakeGitHubClient:
    def __init__(self, mode: str = "post", fail: bool = False) -> None:
        self.mode = mode
        self.fail = fail
        self.comment_body: str | None = None

    def collect_pull_request_files(
        self,
        owner: str,
        repo: str,
        pull_request_number: int,
        head_sha: str,
    ):
        return (
            [SourceFile(path="demo-vulnerable-repo/patient-export.ts", content=DEMO_CODE)],
            [
                PullRequestFileRecord(
                    path="demo-vulnerable-repo/patient-export.ts",
                    status="modified",
                    contentSource="full",
                    content=DEMO_CODE,
                )
            ],
            [],
        )

    def upsert_pull_request_comment(
        self,
        owner: str,
        repo: str,
        issue_number: int,
        body: str,
        marker: str,
    ):
        if self.fail:
            from backend.github.client import GitHubApiError

            raise GitHubApiError("GitHub API failed: 403 token github-token-should-not-leak")
        self.comment_body = body
        return {
            "id": 123,
            "html_url": f"https://github.com/{owner}/{repo}/issues/{issue_number}#issuecomment-123",
            "mode": self.mode,
        }


class GitHubWebhookTest(unittest.TestCase):
    def setUp(self) -> None:
        database_url = os.environ.get("TEST_DATABASE_URL") or os.environ.get("DATABASE_URL")
        if not database_url:
            self.skipTest("DATABASE_URL or TEST_DATABASE_URL is required for PostgreSQL webhook tests")

        self.store = PostgresOperationStore(database_url)
        try:
            self.store.ensure_schema()
            self.store.clear_all()
        except Exception as exc:  # pragma: no cover - environment guard
            self.skipTest(f"PostgreSQL is not available: {exc}")

        self.settings = GitHubSettings(
            webhook_secret="test-secret",
            token=None,
            post_comments=False,
            allowed_repositories={"owner/repo"},
        )

    def test_invalid_signature_is_rejected_and_persisted(self) -> None:
        raw_body = b'{"zen":"Keep it logically awesome."}'
        status_code, response = process_github_webhook(
            raw_body,
            {
                "X-GitHub-Delivery": "delivery-invalid",
                "X-GitHub-Event": "ping",
                "X-Hub-Signature-256": "sha256=bad",
            },
            store=self.store,
            settings=self.settings,
            client=FakeGitHubClient(),
        )

        operation = self.store.get_operation("delivery-invalid")

        self.assertEqual(status_code, 401)
        self.assertEqual(response.status, "rejected")
        self.assertIsNotNone(operation)
        self.assertEqual(operation.delivery.status, "rejected")
        self.assertEqual(operation.delivery.rejectionReason, "Invalid webhook signature")
        self.assertIsNone(operation.scan)

    def test_unsupported_event_is_ignored(self) -> None:
        raw_body = json.dumps({"repository": {"full_name": "owner/repo"}}).encode("utf-8")
        status_code, response = process_github_webhook(
            raw_body,
            self._headers("delivery-push", "push", raw_body),
            store=self.store,
            settings=self.settings,
            client=FakeGitHubClient(),
        )

        operation = self.store.get_operation("delivery-push")

        self.assertEqual(status_code, 200)
        self.assertEqual(response.status, "ignored")
        self.assertIsNotNone(operation)
        self.assertEqual(operation.delivery.status, "ignored")
        self.assertIsNone(operation.scan)

    def test_pull_request_delivery_scans_and_persists_preview(self) -> None:
        raw_body = json.dumps(self._pull_request_payload()).encode("utf-8")
        status_code, response = process_github_webhook(
            raw_body,
            self._headers("delivery-pr", "pull_request", raw_body),
            store=self.store,
            settings=self.settings,
            client=FakeGitHubClient(),
        )

        operation = self.store.get_operation("delivery-pr")

        self.assertEqual(status_code, 202)
        self.assertEqual(response.status, "completed")
        self.assertIsNotNone(operation)
        self.assertEqual(operation.delivery.status, "completed")
        self.assertEqual(operation.scan.score, 1)
        self.assertEqual(
            {finding.ruleId for finding in operation.scan.findings},
            {"RULE-001", "RULE-002", "RULE-003", "RULE-004", "RULE-005", "RULE-006"},
        )
        self.assertIn("<!-- complypatch-ai:pr-comment:abc123 -->", operation.scan.prComment)
        self.assertIn("[redacted]", operation.scan.prComment)
        self.assertNotIn("sk-demo-hardcoded-key", operation.scan.prComment)
        self.assertEqual(operation.outbound.mode, "preview")
        self.assertEqual(operation.outbound.status, "not_configured")

    def test_comment_update_status_is_persisted(self) -> None:
        raw_body = json.dumps(self._pull_request_payload()).encode("utf-8")
        settings = GitHubSettings(
            webhook_secret="test-secret",
            token="github-demo-token",
            post_comments=True,
            allowed_repositories={"owner/repo"},
        )

        status_code, response = process_github_webhook(
            raw_body,
            self._headers("delivery-update", "pull_request", raw_body),
            store=self.store,
            settings=settings,
            client=FakeGitHubClient(mode="update"),
        )

        operation = self.store.get_operation("delivery-update")

        self.assertEqual(status_code, 202)
        self.assertEqual(response.status, "completed")
        self.assertEqual(operation.outbound.mode, "update")
        self.assertEqual(operation.outbound.status, "updated")
        self.assertEqual(operation.outbound.commentId, 123)

    def test_posting_failure_is_sanitized_and_persisted(self) -> None:
        raw_body = json.dumps(self._pull_request_payload()).encode("utf-8")
        settings = GitHubSettings(
            webhook_secret="test-secret",
            token="github-demo-token",
            post_comments=True,
            allowed_repositories={"owner/repo"},
        )

        status_code, response = process_github_webhook(
            raw_body,
            self._headers("delivery-fail", "pull_request", raw_body),
            store=self.store,
            settings=settings,
            client=FakeGitHubClient(fail=True),
        )

        operation = self.store.get_operation("delivery-fail")

        self.assertEqual(status_code, 202)
        self.assertEqual(response.status, "completed")
        self.assertEqual(operation.outbound.status, "failed")
        self.assertNotIn("github-demo-token", operation.outbound.failureReason)
        self.assertNotIn("github-token-should-not-leak", operation.outbound.failureReason)

    def test_repository_allowlist_rejects_unapproved_repo(self) -> None:
        payload = self._pull_request_payload(repository="other/repo")
        raw_body = json.dumps(payload).encode("utf-8")

        status_code, response = process_github_webhook(
            raw_body,
            self._headers("delivery-other", "pull_request", raw_body),
            store=self.store,
            settings=self.settings,
            client=FakeGitHubClient(),
        )

        operation = self.store.get_operation("delivery-other")

        self.assertEqual(status_code, 403)
        self.assertEqual(response.status, "rejected")
        self.assertEqual(operation.delivery.status, "rejected")
        self.assertEqual(operation.delivery.rejectionReason, "Repository is not allowed")
        self.assertIsNone(operation.scan)

    def test_missing_operation_returns_none(self) -> None:
        self.assertIsNone(self.store.get_operation("missing-delivery"))

    def _headers(self, delivery_id: str, event: str, raw_body: bytes) -> dict[str, str]:
        signature = hmac.new(b"test-secret", raw_body, sha256).hexdigest()
        return {
            "X-GitHub-Delivery": delivery_id,
            "X-GitHub-Event": event,
            "X-Hub-Signature-256": f"sha256={signature}",
        }

    def _pull_request_payload(self, repository: str = "owner/repo") -> dict:
        return {
            "action": "synchronize",
            "repository": {"full_name": repository},
            "pull_request": {
                "number": 7,
                "head": {"sha": "abc123"},
            },
        }


if __name__ == "__main__":
    unittest.main()
