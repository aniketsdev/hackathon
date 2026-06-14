# ComplyPatch AI

**ComplyPatch AI** is a compliance-aware GitHub PR review agent.

It reviews code changes for security, privacy, and compliance risks such as secrets, PII logging, missing authentication, insecure cookies, unsafe SQL, and risky CORS settings.

## Hackathon Pitch

General coding agents review code.  
ComplyPatch AI reviews code like a compliance engineer.

## Demo Flow

1. Open the dashboard.
2. Click **Run Demo Scan**.
3. View the compliance score.
4. View evidence-based findings.
5. Copy the generated GitHub PR comment.
6. Optional: connect a GitHub repository and receive signed PR webhooks.

## Quick Start

Frontend:

```bash
npm install
npm run dev
```

Open:

```text
http://localhost:3000
```

FastAPI backend:

```bash
uv sync
cd /home/ttpl-lnvl15-0262/Documents/Learn/hackathon
uv run uvicorn backend.main:app --reload --port 8000
```

Set local environment values in `.env`:

```text
GITHUB_WEBHOOK_SECRET=dev-webhook-secret-change-me
GITHUB_POST_COMMENTS=false
GITHUB_ALLOWED_REPOSITORIES=
GITHUB_API_BASE_URL=https://api.github.com
GITHUB_TOKEN=
```

Open:

```text
http://localhost:8000/health
```

Scan endpoint:

```text
POST http://localhost:8000/api/scans
```

GitHub webhook endpoints:

```text
POST http://localhost:8000/api/github/repositories
POST http://localhost:8000/api/github/webhook
GET http://localhost:8000/api/github/operations/{delivery_id}
```

Repositories are dynamic: connect `owner/repo` or a GitHub repository URL through `/api/github/repositories`. Do not configure fixed `GITHUB_OWNER` or `GITHUB_REPO` values for this flow.

## Build Check

```bash
npm run build
```

Backend test check:

```bash
uv run python -m unittest discover backend/tests
```

## Environment

Copy `.env.example` to `.env` for the FastAPI backend:

```bash
cp .env.example .env
```

For the first demo, OpenAI and GitHub tokens are optional because the scanner works locally.

## MVP Features

- Demo vulnerable code scanner
- 6 built-in rules
- Risk score
- Findings table
- GitHub PR comment generator
- API endpoint for scanning code
- FastAPI scan API with matching response shape
- GitHub webhook receiver with signed delivery verification
- PR comment preview/post/update flow
- In-memory operation status for demo delivery tracking

## Not Legal Advice

This project is for engineering review assistance. It does not certify legal compliance with HIPAA, GDPR, SOC 2, PCI DSS, or any regulation.
