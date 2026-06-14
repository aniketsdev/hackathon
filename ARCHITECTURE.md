# Architecture

```text
GitHub PR / Demo Code
        |
Manual Scan Button or Webhook
        |
Fetch changed files / diff
        |
Rule Scanner
        |
Compliance Agent Formatter
        |
Risk Score + Findings
        |
Dashboard + GitHub PR Comment
        |
Optional Fix Suggestion
```

## Current Demo Stack

- Frontend and API routes: Next.js
- Scanner: TypeScript deterministic rules in `lib/scanner`
- PR comment formatter: TypeScript markdown generator in `lib/github`
- Backend API: FastAPI in `backend`
- Backend scanner: Python deterministic rules in `backend/scanner`
- Database: none yet
- GitHub posting: mocked unless explicitly wired later

This is enough for the first working hackathon demo. Keep it stable while the FastAPI and PostgreSQL migration is added.

## Target Stack

- Frontend: modern React framework, currently Next.js
- Backend: FastAPI
- Database: PostgreSQL
- ORM/migrations: SQLAlchemy 2.x or SQLModel with Alembic
- API contract: JSON endpoints for scans, findings, reports, and PR comments
- Deployment shape: frontend and API can run separately

## Components

### Frontend
- `app/page.tsx`
- Shows dashboard, score, findings, and PR comment.

### Current Scan API
- `app/api/scan/route.ts`
- Accepts files and returns scan result.

### Target FastAPI Scan API
- `POST /api/scans`
- Accepts changed files or pasted code.
- Runs the scanner.
- Stores scan result and findings in PostgreSQL after the persistence slice is added.
- Returns score, evidence, findings, and GitHub-style PR comment.

### Current FastAPI Scan API
- `backend/main.py`
- `POST /api/scans`
- `POST /api/scan` alias for easier local migration
- `GET /health`
- Returns the same JSON shape as the current Next.js scan endpoint.

### Scanner
- `lib/scanner/rules.ts`
- `lib/scanner/scan.ts`
- Detects issues using simple deterministic rules.

When moving to FastAPI, keep the same rule behavior and port the scanner into a backend scanner module. The demo should continue detecting:

- Secrets in code
- PII or patient data logging
- Missing auth on sensitive API routes
- Unsafe SQL query construction
- Wildcard CORS
- Insecure cookies

### Agent Formatter
- `lib/agents/compliance-agent.ts`
- Converts scan output into compliance explanation.

### PR Comment Formatter
- `lib/github/pr-comment.ts`
- Generates GitHub-style markdown comment.

## Future Production Architecture

```text
GitHub App
  |
Webhook Receiver
  |
Queue
  |
Diff Fetcher
  |
Rule Scanner + AI Reasoner
  |
Findings Store
  |
GitHub Review Comments
  |
Dashboard / Audit Trail
```

## PostgreSQL Data Model

Start with a small schema:

- `scan_runs`: id, source, repo, pr_number, score, summary, created_at
- `scan_files`: id, scan_run_id, path, content_hash
- `findings`: id, scan_run_id, rule_id, severity, file_path, line, evidence, impact, fix
- `pr_comments`: id, scan_run_id, body, posted_to_github, github_comment_url

Do not store real secrets or full sensitive patient data in PostgreSQL. Store masked evidence and file references for the demo.

## Migration Order

1. Keep the current Next.js demo working.
2. Add a FastAPI app with `POST /api/scans`. Done.
3. Port scanner rules to the FastAPI backend. Done.
4. Add PostgreSQL persistence for scan runs and findings.
5. Point the frontend scan button at FastAPI.
6. Add optional GitHub webhook and PR comment posting.

## Hackathon Rule
Use local/demo scan first. Add live GitHub only after the dashboard and scanner are stable.
