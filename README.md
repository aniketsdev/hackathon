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
6. Optional: connect the `/api/scan` endpoint to a GitHub webhook.

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
uv run uvicorn backend.main:app --reload --port 8000
```

PostgreSQL for GitHub webhook operations:

```bash
docker run --name complypatch-postgres -e POSTGRES_USER=complypatch -e POSTGRES_PASSWORD=complypatch -e POSTGRES_DB=complypatch -p 55432:5432 -d postgres:16
```

Set local environment values in `.env`:

```text
DATABASE_URL=<postgresql-connection-url>
GITHUB_WEBHOOK_SECRET=dev-webhook-secret-change-me
GITHUB_POST_COMMENTS=false
GITHUB_ALLOWED_REPOSITORIES=owner/repo
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
POST http://localhost:8000/api/github/webhook
GET http://localhost:8000/api/github/operations/{delivery_id}
```

## Build Check

```bash
npm run build
```

Backend test check:

```bash
uv run python -m unittest discover backend/tests
```

## Environment

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
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
- PostgreSQL-backed GitHub webhook receiver and operation status

## Not Legal Advice

This project is for engineering review assistance. It does not certify legal compliance with HIPAA, GDPR, SOC 2, PCI DSS, or any regulation.
