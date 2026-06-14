import hmac
import json
import os
import unittest
from hashlib import sha256

from backend.github.client import GitHubApiError, GitHubSettings, connect_repository, normalize_repository_identifier
from backend.github.state import DemoOperationStore, is_repository_connected, reset_state
from backend.github.webhook import process_github_webhook, verify_signature
from backend.main import connect_github_repository, get_github_operation
from backend.models import PullRequestFileRecord, RepositoryConnectRequest, SourceFile


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
            raise GitHubApiError("GitHub API failed: 403 token github-token-should-not-leak")
        self.comment_body = body
        return {
            "id": 123,
            "html_url": f"https://github.com/{owner}/{repo}/issues/{issue_number}#issuecomment-123",
            "mode": self.mode,
        }


class GitHubWebhookTest(unittest.TestCase):
    def setUp(self) -> None:
        reset_state()
        self.previous_operation_store = os.environ.get("GITHUB_OPERATION_STORE")
        os.environ["GITHUB_OPERATION_STORE"] = "memory"
        self.store = DemoOperationStore()
        self.settings = GitHubSettings(
            webhook_secret="test-secret",
            token=None,
            post_comments=False,
            allowed_repositories={"owner/repo"},
        )

    def tearDown(self) -> None:
        self._restore_env("GITHUB_OPERATION_STORE", self.previous_operation_store)
        reset_state()

    def test_signature_verification_accepts_valid_signature(self) -> None:
        raw_body = b'{"zen":"Keep it logically awesome."}'
        signature = "sha256=" + hmac.new(b"test-secret", raw_body, sha256).hexdigest()

        self.assertTrue(verify_signature(raw_body, signature, "test-secret"))
        self.assertFalse(verify_signature(raw_body, "sha256=bad", "test-secret"))

    def test_repository_connection_success_and_rejection(self) -> None:
        connected = connect_repository(
            RepositoryConnectRequest(repositoryFullName="owner/repo"),
            settings=self.settings,
        )
        rejected = connect_repository(
            RepositoryConnectRequest(repositoryFullName="other/repo"),
            settings=self.settings,
        )

        self.assertEqual(connected.connectionStatus, "connected")
        self.assertEqual(connected.permissionsStatus, "read_only")
        self.assertTrue(is_repository_connected("owner/repo"))
        self.assertEqual(rejected.connectionStatus, "failed")
        self.assertEqual(rejected.message, "Repository is not allowed")

    def test_repository_connection_accepts_dynamic_github_url(self) -> None:
        settings = GitHubSettings(
            webhook_secret="test-secret",
            token=None,
            post_comments=False,
            allowed_repositories=set(),
        )

        connected = connect_repository(
            RepositoryConnectRequest(repositoryUrl="https://github.com/owner/repo"),
            settings=settings,
        )

        self.assertEqual(connected.connectionStatus, "connected")
        self.assertEqual(connected.repositoryFullName, "owner/repo")
        self.assertTrue(is_repository_connected("owner/repo"))

    def test_repository_identifier_normalization(self) -> None:
        self.assertEqual(normalize_repository_identifier("owner/repo"), "owner/repo")
        self.assertEqual(normalize_repository_identifier("https://github.com/owner/repo"), "owner/repo")
        self.assertEqual(normalize_repository_identifier("https://github.com/owner/repo.git"), "owner/repo")
        self.assertEqual(normalize_repository_identifier("git@github.com:owner/repo.git"), "owner/repo")
        self.assertIsNone(normalize_repository_identifier("https://example.com/owner/repo"))

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

    def test_repository_gate_rejects_unconnected_repo_without_allowlist(self) -> None:
        payload = self._pull_request_payload(repository="owner/repo")
        raw_body = json.dumps(payload).encode("utf-8")
        settings = GitHubSettings(
            webhook_secret="test-secret",
            token=None,
            post_comments=False,
            allowed_repositories=set(),
        )

        status_code, response = process_github_webhook(
            raw_body,
            self._headers("delivery-unconnected", "pull_request", raw_body),
            store=self.store,
            settings=settings,
            client=FakeGitHubClient(),
        )

        operation = self.store.get_operation("delivery-unconnected")

        self.assertEqual(status_code, 403)
        self.assertEqual(response.status, "rejected")
        self.assertEqual(operation.delivery.status, "rejected")
        self.assertEqual(operation.delivery.rejectionReason, "Repository is not connected")
        self.assertIsNone(operation.scan)

    def test_operation_status_route_returns_success_and_missing(self) -> None:
        previous_secret = os.environ.get("GITHUB_WEBHOOK_SECRET")
        previous_allowed = os.environ.get("GITHUB_ALLOWED_REPOSITORIES")
        os.environ["GITHUB_WEBHOOK_SECRET"] = "test-secret"
        os.environ["GITHUB_ALLOWED_REPOSITORIES"] = "owner/repo"
        try:
            raw_body = json.dumps({"repository": {"full_name": "owner/repo"}}).encode("utf-8")
            response_status, _ = process_github_webhook(
                raw_body,
                self._headers("delivery-route", "ping", raw_body),
            )
            status = get_github_operation("delivery-route")
            missing = get_github_operation("missing")
        finally:
            self._restore_env("GITHUB_WEBHOOK_SECRET", previous_secret)
            self._restore_env("GITHUB_ALLOWED_REPOSITORIES", previous_allowed)

        self.assertEqual(response_status, 200)
        self.assertEqual(status.delivery.status, "ignored")
        self.assertEqual(missing.status_code, 404)

    def test_repository_connection_route_connects_allowed_repo(self) -> None:
        previous_allowed = os.environ.get("GITHUB_ALLOWED_REPOSITORIES")
        os.environ["GITHUB_ALLOWED_REPOSITORIES"] = "owner/repo"
        try:
            response = connect_github_repository(
                RepositoryConnectRequest(repositoryFullName="owner/repo"),
            )
            url_response = connect_github_repository(
                RepositoryConnectRequest(repositoryUrl="https://github.com/owner/repo"),
            )
            rejected = connect_github_repository(
                RepositoryConnectRequest(repositoryFullName="other/repo"),
            )
        finally:
            self._restore_env("GITHUB_ALLOWED_REPOSITORIES", previous_allowed)

        self.assertEqual(response.connectionStatus, "connected")
        self.assertEqual(url_response.connectionStatus, "connected")
        self.assertEqual(url_response.repositoryFullName, "owner/repo")
        self.assertEqual(rejected.status_code, 400)

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

    def _restore_env(self, key: str, value: str | None) -> None:
        if value is None:
            os.environ.pop(key, None)
        else:
            os.environ[key] = value


if __name__ == "__main__":
    unittest.main()
