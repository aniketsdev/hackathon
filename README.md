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
uv run uvicorn backend.main:app --reload --port 8000
```

Set local environment values in `.env`:

```text
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4o-mini
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

For the first demo, OpenAI and GitHub tokens are optional because the scanner works locally. If AI analysis is enabled and the OpenAI key is missing or rejected, the UI shows an unavailable status while preserving score, findings, and the PR comment.

Use `GITHUB_OPERATION_STORE=postgres` with `DATABASE_URL` for production-style persistence of GitHub deliveries, skipped files, scan results, outbound comment state, and connected repositories. Use `GITHUB_OPERATION_STORE=memory` for isolated local tests.

For private repository scans from the Next.js UI, configure a GitHub OAuth app and set `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `GITHUB_SESSION_SECRET`, and `GITHUB_OAUTH_REDIRECT_URI`. The UI stores the OAuth token encrypted in an httpOnly cookie and uses it only from server routes.

Once a repository webhook is enabled, PRs opened from any IDE, Codex, Claude, or GitHub itself arrive through the same signed GitHub pull request webhook. ComplyPatch verifies the delivery, scans changed files, calculates the deterministic compliance score, optionally adds AI risk scoring, and prepares or posts the PR comment.

## MVP Features

- Demo vulnerable code scanner
- 6 built-in rules
- Risk score
- Optional AI risk score
- Findings table
- GitHub PR comment generator
- API endpoint for scanning code
- FastAPI scan API with matching response shape
- GitHub webhook receiver with signed delivery verification
- GitHub OAuth login option for private repository scans
- PR comment preview/post/update flow
- Postgres-backed operation status for production-style delivery tracking

## Not Legal Advice

This project is for engineering review assistance. It does not certify legal compliance with HIPAA, GDPR, SOC 2, PCI DSS, or any regulation.
