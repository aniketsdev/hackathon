# Quickstart: GitHub Webhook Operations

## Prerequisites

- Dependencies installed with `npm install` and `uv sync`.
- PostgreSQL available locally or remotely.
- A GitHub repository where a webhook can be configured.
- A webhook secret for delivery verification.
- Optional GitHub token with permission to read pull request files and write issue comments on the demo repository.
- A public URL for the local backend, such as a tunnel, when testing real GitHub deliveries.

## Environment

PowerShell example:

```powershell
$env:GITHUB_WEBHOOK_SECRET = "replace-with-demo-secret"
$env:GITHUB_POST_COMMENTS = "false"
$env:GITHUB_ALLOWED_REPOSITORIES = "owner/repo"
$env:DATABASE_URL = "<postgresql-connection-url>"
```

Expected behavior:

- `GITHUB_WEBHOOK_SECRET` is required for live webhook verification.
- `DATABASE_URL` is required for webhook operation persistence.
- `GITHUB_TOKEN` is optional; without it, scans still produce local PR comment previews.
- `GITHUB_POST_COMMENTS=false` keeps the demo in preview mode.
- `GITHUB_ALLOWED_REPOSITORIES` limits which repositories are accepted.

## Start Local PostgreSQL For Testing

```powershell
docker run --name complypatch-postgres -e POSTGRES_USER=complypatch -e POSTGRES_PASSWORD=complypatch -e POSTGRES_DB=complypatch -p 55432:5432 -d postgres:16
```

If the container already exists:

```powershell
docker start complypatch-postgres
```

## Run The Backend

```powershell
uv run uvicorn backend.main:app --reload --port 8000
```

Health check:

```powershell
Invoke-RestMethod http://localhost:8000/health
```

Expected result:

```json
{ "status": "ok" }
```

## Configure GitHub

Create a repository webhook:

- Payload URL: public backend URL ending in `/api/github/webhook`
- Content type: `application/json`
- Secret: the same value as `GITHUB_WEBHOOK_SECRET`
- Events: pull request events

For a preview-only demo, keep `GITHUB_POST_COMMENTS=false`. For live PR comments, set it to `true` and provide a token with repository comment permissions.

## Validate With Automated Tests

```powershell
uv run python -m unittest discover backend/tests
npm run build
```

Expected result:

- Backend webhook/scanner tests pass.
- Webhook tests use PostgreSQL when `DATABASE_URL` is set.
- Next.js production build passes.

## Validate With A Real Pull Request

1. Start the backend with the required environment variables.
2. Expose the backend with a tunnel or deployed URL.
3. Configure the GitHub webhook to call `/api/github/webhook`.
4. Open or update a pull request containing demo-vulnerable code.
5. Confirm GitHub reports a successful webhook delivery.
6. Call `GET /api/github/operations/{delivery_id}` locally or through the deployed backend.
7. Confirm the operation includes scan status, findings, generated comment, and outbound posting or preview status.

Expected outcomes:

- Supported PR deliveries are accepted for processing.
- Invalid signatures are rejected.
- Unsupported events are acknowledged without scanning.
- Duplicate deliveries for the same PR commit do not create duplicate active ComplyPatch comments.
- Missing GitHub posting configuration still produces a local PR comment preview.
