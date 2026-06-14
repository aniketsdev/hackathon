# ComplyPatch AI Backend

FastAPI backend for scanning changed files and returning compliance findings.

## Run

```bash
uv sync
uv run uvicorn backend.main:app --reload --port 8000
```

Health check:

```text
GET http://localhost:8000/health
```

Scan:

```text
POST http://localhost:8000/api/scans
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

Add PostgreSQL persistence for scan runs and findings without changing the response shape.
