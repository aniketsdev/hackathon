# ComplyPatch AI Backend

FastAPI backend for scanning changed files and returning compliance findings.

## Run

Run from the repository root, not from inside `backend/`, because the app imports the `backend` package by name:

```bash
uv sync
uv run uvicorn backend.main:app --reload --port 8000
```

GitHub webhook operation status can use Postgres for production-style persistence. Use memory mode only for isolated local tests.

```text
GITHUB_WEBHOOK_SECRET=dev-webhook-secret-change-me
GITHUB_POST_COMMENTS=false
GITHUB_ALLOWED_REPOSITORIES=
GITHUB_API_BASE_URL=https://api.github.com
GITHUB_TOKEN=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
GITHUB_SESSION_SECRET=replace-with-32-plus-character-secret
GITHUB_OAUTH_REDIRECT_URI=http://127.0.0.1:3000/api/auth/github/callback
GITHUB_OAUTH_SCOPE=read:user repo
GITHUB_OPERATION_STORE=postgres
DATABASE_URL=postgresql://user:password@localhost:5432/complypatch
```

Health check:

```text
GET http://localhost:8000/health
```

Scan:

```text
POST http://localhost:8000/api/scans
```

GitHub webhook:

```text
POST http://localhost:8000/api/github/repositories
POST http://localhost:8000/api/github/webhook
GET http://localhost:8000/api/github/operations/{delivery_id}
```

Repository connection request:

```json
{
  "repositoryFullName": "owner/repo"
}
```

Repository identity is dynamic. The connection endpoint should accept `owner/repo` or a GitHub URL and normalize it; fixed `GITHUB_OWNER` and `GITHUB_REPO` values are not required.

Request shape:

```json
{
  "files": [
    {
      "path": "demo-vulnerable-repo/patient-export.ts",
      "content": "export async function GET(req: Request) { ... }"
    }
  ]
}
```

## Test

```bash
uv run python -m unittest discover backend/tests
```

## GitHub Webhook Notes

Configure a repository webhook or GitHub App webhook to call `/api/github/webhook` with JSON payloads and the same secret as `GITHUB_WEBHOOK_SECRET`. Leave `GITHUB_POST_COMMENTS=false` for a safe preview-only demo. Set `GITHUB_POST_COMMENTS=true` and provide `GITHUB_TOKEN` only when you want the backend to create or update a real PR comment.

When `GITHUB_OPERATION_STORE=postgres`, the backend initializes the required tables on first webhook or operation-status request and stores deliveries, skipped files, scan results, outbound comment status, and connected repositories in Postgres.

PRs opened from any IDE or coding agent still enter through GitHub. After the webhook is enabled, every supported `pull_request` delivery is verified, scanned, scored, and stored. The Next.js GitHub OAuth login is for UI/private-repository scans; live webhook comment posting should use a runtime `GITHUB_TOKEN` or GitHub App installation token.
