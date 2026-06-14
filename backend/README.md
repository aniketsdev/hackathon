# ComplyPatch AI Backend

FastAPI backend for scanning changed files and returning compliance findings.

## Run

```bash
uv sync
uv run uvicorn backend.main:app --reload --port 8000
```

GitHub webhook operation status uses bounded in-memory demo state. Restarting the backend clears connected repositories and delivery history.

```text
GITHUB_WEBHOOK_SECRET=dev-webhook-secret-change-me
GITHUB_POST_COMMENTS=false
GITHUB_ALLOWED_REPOSITORIES=owner/repo
GITHUB_TOKEN=
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
