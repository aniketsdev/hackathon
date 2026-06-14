# ComplyPatch AI Backend

FastAPI backend for scanning changed files and returning compliance findings.

## Run

```bash
uv sync
uv run uvicorn backend.main:app --reload --port 8000
```

For GitHub webhook operation persistence, start PostgreSQL and set `DATABASE_URL`:

```bash
docker run --name complypatch-postgres -e POSTGRES_USER=complypatch -e POSTGRES_PASSWORD=complypatch -e POSTGRES_DB=complypatch -p 55432:5432 -d postgres:16
```

```text
DATABASE_URL=<postgresql-connection-url>
GITHUB_WEBHOOK_SECRET=dev-webhook-secret-change-me
GITHUB_POST_COMMENTS=false
GITHUB_ALLOWED_REPOSITORIES=owner/repo
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
POST http://localhost:8000/api/github/webhook
GET http://localhost:8000/api/github/operations/{delivery_id}
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

## Next Slice

Point the frontend at the FastAPI backend and add optional live GitHub webhook setup instructions for the demo repo.
