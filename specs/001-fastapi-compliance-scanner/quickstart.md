# Quickstart: Compliance Repository Scanner

## Prerequisites

- Node.js/npm for the primary Next.js demo surface
- Optional: Python 3.11+ and `uv` only when validating the existing FastAPI-compatible backend path

Do not place real API keys in the repository. Optional OpenAI analysis must read credentials from runtime environment variables such as `OPENAI_API_KEY`.

## Install Dependencies

```bash
npm install
```

Optional backend dependencies:

```bash
uv sync
```

## Validate Build

```bash
npm run build
```

Expected result: Next.js build completes successfully and lists `/`, `/api/scan`, and `/api/pr-comment` routes.

## Run The Demo UI

```bash
npm run dev
```

Open `http://localhost:3000` and use the sample scan button. Expected result:

- Demo findings appear for the vulnerable fixture.
- The report shows a 0-100 score and masked evidence.
- Finding counts, skipped local files, and the compliance disclaimer are visible when applicable.
- A GitHub-style PR comment is generated.
- No real GitHub comment is posted.

## Validate Changed-File Scan API

```bash
curl -s http://127.0.0.1:3000/api/scan \
  -H 'Content-Type: application/json' \
  -d '{
    "files": [
      {
        "path": "demo-vulnerable-repo/patient-export.ts",
        "content": "export async function GET(req: Request) {\n  const password = \"demo-secret-placeholder\";\n  console.log(\"patient diagnosis\", req.url);\n  const query = \"SELECT * FROM patients WHERE id = \" + req.url;\n  cookies().set(\"session\", \"abc123\");\n  return Response.json({}, { headers: { \"Access-Control-Allow-Origin\": \"*\" } });\n}"
      }
    ],
    "enableAiAnalysis": false
  }'
```

Expected result:

- Response includes `score` from 0 to 100.
- Response includes `findingCounts`, ordered `findings`, `disclaimer`, and `aiAnalysis.status`.
- Response includes deterministic findings for configured categories present in the fixture.
- Evidence values are masked/redacted where likely secrets or patient data are detected.
- Response includes a `prComment` markdown string.
- No scan data is persisted.

## Validate Mock PR Comment Endpoint

```bash
curl -s http://127.0.0.1:3000/api/pr-comment \
  -H 'Content-Type: application/json' \
  -d '{
    "comment": "## ComplyPatch AI Review\n\n**Compliance Score:** 72/100"
  }'
```

Expected result: response confirms the PR comment posting is mocked. Empty or missing `comment` returns a `400` error.

## Validate Demo Local Path Scan

```bash
curl -s http://127.0.0.1:3000/api/scan \
  -H 'Content-Type: application/json' \
  -d '{
    "localPath": "./demo-vulnerable-repo",
    "enableAiAnalysis": false
  }'
```

Expected result:

- Supported text files under the local path are scanned.
- Unsupported/binary files are skipped or rejected with a clear message.
- Response may include a `skipped` array for unsupported files.
- Demo-size limit violations return a `400` error.

## Validate Optional OpenAI Analysis

```bash
# Set OPENAI_API_KEY in your shell at runtime before this request.
curl -s http://127.0.0.1:3000/api/scan \
  -H 'Content-Type: application/json' \
  -d '{
    "files": [
      {
        "path": "demo-vulnerable-repo/patient-export.ts",
        "content": "console.log(\"patient diagnosis\", \"Jane Doe\");"
      }
    ],
    "enableAiAnalysis": true
  }'
```

Expected result when configured:

- Deterministic findings remain present.
- `aiAnalysis.status` is `completed`.
- OpenAI receives only locally masked/redacted relevant snippets.

Expected result when OpenAI is unavailable:

- Deterministic report still completes.
- PR-style comment is still generated.
- AI status is non-blocking, such as `not_configured` or `failed`.
- The response does not require users to paste API credentials into scan input.

## Optional FastAPI-Compatible Backend Validation

Use this only if backend code is changed:

```bash
cd /home/ttpl-lnvl15-0262/Documents/Learn/hackathon
uv run python -m unittest backend.tests.test_scan
uv run uvicorn backend.main:app --reload --port 8000
curl http://127.0.0.1:8000/health
```

Expected result: tests pass and health returns `{"status":"ok"}`.

## Contract Reference

API request and response expectations are documented in [contracts/openapi.yaml](./contracts/openapi.yaml). Data shape and state transitions are documented in [data-model.md](./data-model.md).
