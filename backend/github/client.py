from __future__ import annotations

import base64
import json
import os
import re
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from backend.github.operations import operation_store_from_env
from backend.models import (
    ConnectedRepositoryResponse,
    PullRequestFileRecord,
    RepositoryConnectRequest,
    SkippedFile,
    SourceFile,
)


MAX_SCAN_FILES = 50
MAX_FILE_CHARS = 200_000


class GitHubApiError(RuntimeError):
    pass


@dataclass(frozen=True)
class GitHubSettings:
    webhook_secret: str | None
    token: str | None
    post_comments: bool
    allowed_repositories: set[str]
    api_base_url: str = "https://api.github.com"

    @classmethod
    def from_env(cls) -> "GitHubSettings":
        env = load_runtime_env()
        allowed = {
            item.strip().lower()
            for item in env.get("GITHUB_ALLOWED_REPOSITORIES", "").split(",")
            if item.strip()
        }
        return cls(
            webhook_secret=env.get("GITHUB_WEBHOOK_SECRET") or None,
            token=env.get("GITHUB_TOKEN") or None,
            post_comments=env.get("GITHUB_POST_COMMENTS", "").lower() in {"1", "true", "yes", "on"},
            allowed_repositories=allowed,
            api_base_url=env.get("GITHUB_API_BASE_URL", "https://api.github.com").rstrip("/"),
        )

    def allows_repository(self, full_name: str) -> bool:
        return not self.allowed_repositories or full_name.lower() in self.allowed_repositories


class GitHubClient:
    def __init__(self, settings: GitHubSettings):
        self.settings = settings

    def collect_pull_request_files(
        self,
        owner: str,
        repo: str,
        pull_request_number: int,
        head_sha: str,
    ) -> tuple[list[SourceFile], list[PullRequestFileRecord], list[SkippedFile]]:
        files = self.list_pull_request_files(owner, repo, pull_request_number)
        selected: list[SourceFile] = []
        records: list[PullRequestFileRecord] = []
        skipped: list[SkippedFile] = []

        for file_data in files[:MAX_SCAN_FILES]:
            path = file_data.get("filename") or ""
            status = file_data.get("status") or "unknown"
            patch = file_data.get("patch")
            if not path:
                skipped.append(SkippedFile(path="unknown", reason="Missing file path"))
                continue
            if status == "removed":
                skipped.append(SkippedFile(path=path, reason="Removed file"))
                continue

            content = self.get_file_content(owner, repo, path, head_sha)
            source = "full"
            if content is None:
                content = patch
                source = "patch"

            if not content:
                skipped.append(SkippedFile(path=path, reason="File content unavailable"))
                records.append(PullRequestFileRecord(path=path, status=status, contentSource="unavailable", content=None))
                continue
            if len(content) > MAX_FILE_CHARS:
                skipped.append(SkippedFile(path=path, reason="File exceeds scan size limit"))
                continue

            scan_content = content
            if isinstance(patch, str) and patch:
                scan_content = content_for_added_lines(content, patch) if source == "full" else content_from_patch(patch)
                if not scan_content.strip():
                    skipped.append(SkippedFile(path=path, reason="No added lines to scan"))
                    records.append(PullRequestFileRecord(path=path, status=status, contentSource=source, content=content))
                    continue

            selected.append(SourceFile(path=path, content=scan_content))
            records.append(PullRequestFileRecord(path=path, status=status, contentSource=source, content=content))

        for file_data in files[MAX_SCAN_FILES:]:
            skipped.append(SkippedFile(path=file_data.get("filename") or "unknown", reason="File count limit exceeded"))

        return selected, records, skipped

    def list_pull_request_files(self, owner: str, repo: str, pull_request_number: int) -> list[dict[str, Any]]:
        path = f"/repos/{owner}/{repo}/pulls/{pull_request_number}/files?per_page={MAX_SCAN_FILES}"
        data = self._request_json("GET", path)
        if not isinstance(data, list):
            raise GitHubApiError("GitHub pull request files response was not a list")
        return data

    def get_file_content(self, owner: str, repo: str, path: str, ref: str) -> str | None:
        quoted_path = urllib.parse.quote(path, safe="/")
        quoted_ref = urllib.parse.quote(ref, safe="")
        try:
            data = self._request_json("GET", f"/repos/{owner}/{repo}/contents/{quoted_path}?ref={quoted_ref}")
        except GitHubApiError:
            return None
        if not isinstance(data, dict) or data.get("type") != "file":
            return None
        if data.get("encoding") != "base64" or not isinstance(data.get("content"), str):
            return None
        try:
            raw = base64.b64decode(data["content"], validate=False)
            return raw.decode("utf-8", errors="replace")
        except (ValueError, UnicodeDecodeError):
            return None

    def upsert_pull_request_comment(
        self,
        owner: str,
        repo: str,
        issue_number: int,
        body: str,
        marker: str,
    ) -> dict[str, Any]:
        comments = self.list_issue_comments(owner, repo, issue_number)
        existing = next((comment for comment in comments if marker in str(comment.get("body", ""))), None)
        if existing:
            comment_id = existing["id"]
            result = self.update_issue_comment(owner, repo, comment_id, body)
            result["mode"] = "update"
            return result

        result = self.create_issue_comment(owner, repo, issue_number, body)
        result["mode"] = "post"
        return result

    def list_issue_comments(self, owner: str, repo: str, issue_number: int) -> list[dict[str, Any]]:
        data = self._request_json("GET", f"/repos/{owner}/{repo}/issues/{issue_number}/comments?per_page=100")
        if not isinstance(data, list):
            raise GitHubApiError("GitHub comments response was not a list")
        return data

    def create_issue_comment(self, owner: str, repo: str, issue_number: int, body: str) -> dict[str, Any]:
        data = self._request_json("POST", f"/repos/{owner}/{repo}/issues/{issue_number}/comments", {"body": body})
        if not isinstance(data, dict):
            raise GitHubApiError("GitHub create comment response was invalid")
        return data

    def update_issue_comment(self, owner: str, repo: str, comment_id: int, body: str) -> dict[str, Any]:
        data = self._request_json("PATCH", f"/repos/{owner}/{repo}/issues/comments/{comment_id}", {"body": body})
        if not isinstance(data, dict):
            raise GitHubApiError("GitHub update comment response was invalid")
        return data

    def _request_json(self, method: str, path: str, body: dict[str, Any] | None = None) -> Any:
        url = path if path.startswith("http") else f"{self.settings.api_base_url}{path}"
        headers = {
            "Accept": "application/vnd.github+json",
            "Content-Type": "application/json",
            "User-Agent": "ComplyPatch-AI",
            "X-GitHub-Api-Version": "2022-11-28",
        }
        if self.settings.token:
            headers["Authorization"] = f"Bearer {self.settings.token}"

        payload = json.dumps(body).encode("utf-8") if body is not None else None
        request = urllib.request.Request(url, data=payload, headers=headers, method=method)

        try:
            with urllib.request.urlopen(request, timeout=15) as response:
                response_body = response.read().decode("utf-8")
                return json.loads(response_body) if response_body else {}
        except urllib.error.HTTPError as exc:
            message = exc.read().decode("utf-8", errors="replace")[:500]
            raise GitHubApiError(sanitize_error(f"GitHub API failed: {exc.code} {message}")) from exc
        except urllib.error.URLError as exc:
            raise GitHubApiError(sanitize_error(f"GitHub API request failed: {exc.reason}")) from exc


def connect_repository(
    request: RepositoryConnectRequest,
    settings: GitHubSettings | None = None,
) -> ConnectedRepositoryResponse:
    settings = settings or GitHubSettings.from_env()
    source_value = request.repositoryFullName or request.repositoryUrl or ""
    repository = normalize_repository_identifier(source_value)
    if not repository:
        return ConnectedRepositoryResponse(
            repositoryFullName=source_value,
            connectionStatus="failed",
            permissionsStatus="unknown",
            message="Repository must use owner/repo format or a GitHub repository URL",
        )
    if not settings.allows_repository(repository):
        return ConnectedRepositoryResponse(
            repositoryFullName=repository,
            connectionStatus="failed",
            permissionsStatus="unknown",
            message="Repository is not allowed",
        )

    permissions = "read_write" if settings.post_comments and settings.token else "read_only"
    message = "Repository connected for PR scan previews"
    if permissions == "read_write":
        message = "Repository connected for PR scans and comments"
    store = operation_store_from_env()
    store.ensure_schema()
    return store.connect_repository(repository, permissions_status=permissions, message=message)


def normalize_repository_identifier(value: str) -> str | None:
    candidate = value.strip()
    if not candidate:
        return None

    if candidate.startswith(("http://", "https://")):
        parsed = urllib.parse.urlparse(candidate)
        if parsed.netloc.lower() not in {"github.com", "www.github.com"}:
            return None
        parts = [part for part in parsed.path.strip("/").split("/") if part]
        if len(parts) < 2:
            return None
        candidate = f"{parts[0]}/{parts[1]}"
    elif candidate.startswith("git@github.com:"):
        candidate = candidate.removeprefix("git@github.com:")

    repository = candidate.strip().strip("/")
    if repository.endswith(".git"):
        repository = repository[:-4]
    if not re.fullmatch(r"[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+", repository):
        return None
    return repository


def normalize_repository_full_name(value: str) -> str | None:
    return normalize_repository_identifier(value)


def content_for_added_lines(content: str, patch: str) -> str:
    content_lines = content.splitlines()
    added_lines = extract_added_line_numbers(patch)
    if not added_lines:
        return ""

    sparse_lines = [""] * max(added_lines)
    for line_number in added_lines:
        if line_number <= len(content_lines):
            sparse_lines[line_number - 1] = content_lines[line_number - 1]

    return "\n".join(sparse_lines)


def content_from_patch(patch: str) -> str:
    added: dict[int, str] = {}
    new_line = 0

    for line in patch.splitlines():
        match = re.match(r"@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@", line)
        if match:
            new_line = int(match.group(1))
            continue
        if line.startswith("+++") or line.startswith("\\"):
            continue
        if line.startswith("+"):
            added[new_line] = line[1:]
            new_line += 1
        elif line.startswith(" "):
            new_line += 1

    if not added:
        return ""

    sparse_lines = [""] * max(added)
    for line_number, value in added.items():
        sparse_lines[line_number - 1] = value

    return "\n".join(sparse_lines)


def extract_added_line_numbers(patch: str) -> set[int]:
    added: set[int] = set()
    new_line = 0

    for line in patch.splitlines():
        match = re.match(r"@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@", line)
        if match:
            new_line = int(match.group(1))
            continue
        if line.startswith("+++") or line.startswith("\\"):
            continue
        if line.startswith("+"):
            added.add(new_line)
            new_line += 1
        elif line.startswith(" "):
            new_line += 1

    return added


def load_runtime_env() -> dict[str, str]:
    root_env = read_dotenv(".env")
    backend_env = read_dotenv("backend/.env")
    if os.environ.get("COMPLYPATCH_ENV_OVERRIDES", "").lower() in {"1", "true", "yes", "on"}:
        values = dict(root_env)
        values.update(backend_env)
        values.update(os.environ)
        return values

    values = dict(os.environ)
    values.update(root_env)
    values.update(backend_env)
    return values


def read_dotenv(path: str | Path) -> dict[str, str]:
    env_path = Path(path)
    if not env_path.exists():
        return {}

    values: dict[str, str] = {}
    for raw_line in env_path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        if key:
            values[key] = value
    return values


def load_dotenv(path: str | Path = ".env") -> None:
    for key, value in read_dotenv(path).items():
        if key not in os.environ:
            os.environ[key] = value


def sanitize_error(value: str) -> str:
    sanitized = re.sub(r"Bearer\s+[A-Za-z0-9._\-]+", "Bearer [redacted]", value)
    sanitized = re.sub(r"(?i)token\s+[A-Za-z0-9._\-]+", "token [redacted]", sanitized)
    sanitized = re.sub(r"gh[pousr]_[A-Za-z0-9_]+", "[redacted-github-token]", sanitized)
    sanitized = re.sub(r"sk-[A-Za-z0-9_-]{8,}", "sk-[redacted]", sanitized)
    return sanitized[:500]
