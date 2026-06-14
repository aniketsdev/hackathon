# Quickstart: GitHub PR Webhook Comments

## Prerequisites

- Dependencies installed with `npm install` and `uv sync`.
- A GitHub repository where a GitHub App or repository webhook can be configured.
- A webhook secret for delivery verification.
- Optional GitHub App installation access or token with permission to read pull request files and write issue comments on the demo repository.
- A public URL for the local backend, such as a tunnel, when testing real GitHub deliveries.

Do not commit GitHub secrets, app private keys, tokens, or OpenAI keys.

## Environment

```bash
export GITHUB_WEBHOOK_SECRET="replace-with-demo-secret"
export GITHUB_POST_COMMENTS="false"
export GITHUB_ALLOWED_REPOSITORIES=""
export GITHUB_API_BASE_URL="https://api.github.com"
```

Optional for live PR comments:

```bash
export GITHUB_TOKEN="runtime-only-token-or-installation-token"
export GITHUB_POST_COMMENTS="true"
```

Expected behavior:

- `GITHUB_WEBHOOK_SECRET` is required for live webhook verification.
- `GITHUB_POST_COMMENTS=false` keeps the demo in preview mode.
- `GITHUB_ALLOWED_REPOSITORIES` is optional. Leave it empty to accept repositories connected through the backend, or set a comma-separated allowlist such as `owner/repo,another/repo`.
- `GITHUB_API_BASE_URL` is optional and only needed for GitHub Enterprise or API mocking.
- `GITHUB_TOKEN` or GitHub App installation access is optional; without it, scans still produce local PR comment previews.
- Do not use `GITHUB_OWNER` or `GITHUB_REPO`; repository identity is dynamic and comes from `POST /api/github/repositories` plus the webhook payload.

## Run The Backend

```bash
uv run uvicorn backend.main:app --reload --port 8000
```

Health check:

```bash
curl http://localhost:8000/health
```

Expected result:

```json
{ "status": "ok" }
```

## Run The Frontend

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

## Configure GitHub

Create or configure a GitHub App/repository webhook:

- Payload URL: public backend URL ending in `/api/github/webhook`
- Content type: `application/json`
- Secret: the same value as `GITHUB_WEBHOOK_SECRET`
- Events: pull request events

For a preview-only demo, keep `GITHUB_POST_COMMENTS=false`. For live PR comments, enable posting and provide runtime GitHub credentials with repository comment permission.

Connect the demo repository before accepting webhook deliveries when you are not using an allowlist:

```bash
curl -X POST http://localhost:8000/api/github/repositories \
  -H "Content-Type: application/json" \
  -d '{"repositoryFullName":"owner/repo"}'
```

Dynamic URL input should also be supported by the implementation plan:

```bash
curl -X POST http://localhost:8000/api/github/repositories \
  -H "Content-Type: application/json" \
  -d '{"repositoryUrl":"https://github.com/owner/repo"}'
```

Expected result:

```json
{
  "repositoryFullName": "owner/repo",
  "connectionStatus": "connected",
  "permissionsStatus": "read_only",
  "message": "Repository connected for PR scan previews"
}
```

## Validate With Automated Tests

```bash
uv run python -m unittest discover backend/tests
npm run build
```

Expected result:

- Backend webhook/scanner tests pass.
- Next.js production build passes.

## Validate With A Fixture Delivery

Use a saved `pull_request` fixture signed with `GITHUB_WEBHOOK_SECRET` or a test helper that computes `X-Hub-Signature-256`.

Expected outcomes:

- Invalid signatures return `401`.
- Unsupported events return `200` with ignored status.
- Supported PR deliveries for connected repositories return `202`.
- Operation status includes scan result and outbound preview/posting status.
- Restarting the backend clears in-memory delivery history, which keeps the hackathon demo simple and avoids local database setup.

## Validate With A Real Pull Request

1. Start the backend with the required environment variables.
2. Expose the backend with a tunnel or deployed URL.
3. Configure the GitHub App/webhook to call `/api/github/webhook`.
4. Connect or allow the demo repository.
5. Open or update a pull request containing demo-vulnerable code.
6. Confirm GitHub reports a successful webhook delivery.
7. Call `GET /api/github/operations/{delivery_id}` locally or through the deployed backend.
8. Confirm the operation includes scan status, findings, generated comment, and outbound posting or preview status.

Expected outcomes:

- Supported PR deliveries are accepted for processing.
- Changed files are scanned with existing ComplyPatch rules.
- Vulnerable endpoints and code findings appear in the generated PR comment.
- Duplicate deliveries for the same PR head commit do not create duplicate active comments.
- Missing GitHub posting configuration still produces a local PR comment preview.
