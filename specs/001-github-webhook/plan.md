# Implementation Plan: GitHub Webhook Operations

**Branch**: `feat/github-webhook` | **Date**: 2026-06-14 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/001-github-webhook/spec.md`

## Summary

Add a GitHub-connected demo path for ComplyPatch AI. The backend will receive GitHub pull request webhook deliveries, verify the delivery signature, collect changed files for supported PR actions, run the existing scanner, generate the existing PR-style comment, and either post/update that comment in GitHub or expose a local preview when posting is not configured.

## Technical Context

**Language/Version**: Python 3.11+ for the FastAPI backend; TypeScript 6.0 for the existing Next.js frontend.

**Primary Dependencies**: Existing FastAPI backend, existing Next.js frontend, `psycopg` for PostgreSQL, and Python standard library `hmac`, `hashlib`, `json`, and `urllib` for GitHub integration. No large dependency is planned.

**Storage**: PostgreSQL for GitHub deliveries, pull request changed-file metadata, scan results, findings JSON, outbound comment actions, skipped files, and operation status. No in-memory operation store is used for accepted production flows.

**Testing**: `uv run python -m unittest discover backend/tests` for backend webhook/scanner tests; `npm run build` as the required project build gate.

**Target Platform**: Local demo web app and backend service, with GitHub webhook delivery available through a public tunnel or deployed backend URL.

**Project Type**: Web application with a Next.js frontend and FastAPI backend.

**Performance Goals**: Accepted supported PR deliveries should return an acknowledgement quickly and complete scan/comment processing within 60 seconds for the demo repository.

**Constraints**: Keep the demo stable; do not commit secrets; require webhook signature verification for live deliveries; require `DATABASE_URL` for webhook operation persistence; keep file limits aligned with the existing scan request limits; persist PR comment preview status in PostgreSQL when GitHub posting is not configured.

**Scale/Scope**: One demo repository, pull request events only, up to 50 changed files and 200,000 characters per file content item for the first implementation.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

The constitution file still contains placeholder principles and no enforceable project-specific gates. The active gates for this feature come from `AGENTS.md`:

- Keep the demo stable: pass. The plan uses the existing backend and scanner.
- Prefer simple working code: pass. PostgreSQL persistence is implemented with a small direct store layer and standard-library GitHub calls.
- Do not add large dependencies without approval: pass. `psycopg` is required for the user-requested PostgreSQL production flow and is not a large framework dependency.
- Never commit real API keys or secrets: pass. Secrets are runtime environment values only.
- Use mock/demo data when live GitHub integration is risky: pass. PostgreSQL-persisted preview mode remains available.
- Run `npm run build` before completion: pass as a required verification step.

No complexity violations are required.

## Project Structure

### Documentation (this feature)

```text
specs/001-github-webhook/
|-- plan.md
|-- research.md
|-- data-model.md
|-- quickstart.md
|-- contracts/
|   `-- github-webhook.md
|-- checklists/
|   `-- requirements.md
`-- tasks.md
```

### Source Code (repository root)

```text
backend/
|-- main.py
|-- models.py
|-- db.py
|-- github/
|   |-- __init__.py
|   |-- client.py
|   |-- pr_comment.py
|   `-- webhook.py
|-- scanner/
|   |-- rules.py
|   `-- scan.py
`-- tests/
    |-- test_scan.py
    `-- test_github_webhook.py

app/
|-- api/
|   |-- scan/
|   `-- pr-comment/
`-- page.tsx

lib/
|-- scanner/
`-- github/
```

**Structure Decision**: Implement the webhook slice in the existing `backend` service because the backend already has the Python scanner, response models, and PR comment formatter. Keep the existing Next.js sample scan button working and avoid moving scanner logic during this feature.

## Phase 0: Research

Research decisions are captured in [research.md](./research.md). All technical unknowns are resolved for planning.

## Phase 1: Design And Contracts

Design outputs:

- [data-model.md](./data-model.md)
- [contracts/github-webhook.md](./contracts/github-webhook.md)
- [quickstart.md](./quickstart.md)

## Post-Design Constitution Check

The Phase 1 design still satisfies the active gates:

- Existing backend and scanner remain the center of the implementation.
- Runtime secrets stay outside source control.
- GitHub delivery and operation state is persisted in PostgreSQL, not process memory.
- GitHub posting is optional and has a PostgreSQL-persisted preview fallback.
- Only the small PostgreSQL driver dependency is required.
- Verification includes backend tests and `npm run build`.

## Complexity Tracking

No constitution violations are present.
