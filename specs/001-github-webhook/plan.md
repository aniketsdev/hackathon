# Implementation Plan: GitHub PR Webhook Comments

**Branch**: `001-github-webhook` | **Date**: 2026-06-14 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/001-github-webhook/spec.md`

## Summary

Add a GitHub-connected PR review path to ComplyPatch AI. Users connect a GitHub repository, GitHub sends pull request webhook deliveries, the FastAPI backend verifies each live delivery, collects changed code for supported PR events, runs the existing scanner, generates the existing PR-style risk report, and posts or updates a single ComplyPatch AI comment on the pull request. When GitHub write access is unavailable, the same generated comment is exposed as a local preview.

## Technical Context

**Language/Version**: Python 3.11+ for FastAPI backend; TypeScript 6 / Next.js 16 for existing demo UI

**Primary Dependencies**: Existing FastAPI/Pydantic/Uvicorn backend, Python standard library `hmac`/`hashlib` for webhook signature verification, existing scanner and PR comment modules; avoid new large dependencies for the first demo

**Storage**: Lightweight demo state for connected repositories, processed delivery IDs, latest scan result, and outbound comment status; persistent storage can be added after the GitHub loop is stable

**Testing**: Python `unittest` for webhook verification, PR event handling, GitHub client behavior, scan integration, and comment de-duplication; `npm run build` for the existing Next demo surface

**Target Platform**: Local demo backend exposed through a public tunnel or deployed URL for real GitHub webhook delivery

**Project Type**: Web application with FastAPI webhook backend and existing Next demo frontend

**Performance Goals**: A supported demo-sized pull request delivery is acknowledged quickly and produces scan/comment output within 60 seconds

**Constraints**: Keep demo stable; do not commit GitHub app keys, webhook secrets, access tokens, or OpenAI keys; verify live webhook signatures before processing; do not break the existing sample scan button; keep live GitHub posting optional

**Scale/Scope**: One or a small set of demo repositories, pull request events only, up to 50 changed files and 200,000 characters per file content item

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

The constitution file still contains placeholder principles, so enforce concrete project rules from `AGENTS.md`:

- Keep the demo stable: PASS. Plan layers GitHub webhook handling on the existing scanner/comment path.
- Prefer simple working code: PASS. Plan uses the existing FastAPI backend and lightweight state first.
- Do not add large dependencies without approval: PASS. No new large dependency is required for the first demo.
- Never commit real API keys or secrets: PASS. GitHub secrets and tokens are runtime configuration only.
- Use mock/demo data when live GitHub integration is risky: PASS. Local webhook fixtures and PR comment preview remain supported.
- Run `npm run build` before completion: PASS as a required verification step.

No complexity violations are required.

## Project Structure

### Documentation (this feature)

```text
specs/001-github-webhook/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── github-webhook.md
├── checklists/
│   └── requirements.md
└── tasks.md
```

### Source Code (repository root)

```text
backend/
├── main.py                         # FastAPI app and route registration
├── models.py                       # Shared scan and webhook response models
├── github/
│   ├── __init__.py
│   ├── client.py                   # GitHub REST calls for PR files/comments
│   ├── pr_comment.py               # Existing PR comment formatting
│   ├── state.py                    # Demo state for repositories/deliveries/status
│   └── webhook.py                  # Signature verification and payload parsing
├── scanner/
│   ├── rules.py
│   └── scan.py
└── tests/
    ├── test_scan.py
    └── test_github_webhook.py

app/
├── api/
│   ├── scan/route.ts
│   └── pr-comment/route.ts
└── page.tsx

lib/
├── scanner/
└── github/
```

**Structure Decision**: Implement the GitHub webhook slice in `backend/` because the backend already owns scanning and PR comment formatting. Keep the existing Next sample scan route working and treat live GitHub posting as an additive path.

## Phase 0: Research

Research decisions are captured in [research.md](./research.md). Official GitHub documentation confirms:

- Verify webhook signatures before processing.
- GitHub Apps can receive pull request webhooks and call APIs in response.
- Pull requests can use issue-comment APIs for timeline comments.
- PR file/content APIs provide the changed code source for scanning.

## Phase 1: Design And Contracts

Design outputs:

- [data-model.md](./data-model.md)
- [contracts/github-webhook.md](./contracts/github-webhook.md)
- [quickstart.md](./quickstart.md)

## Post-Design Constitution Check

- Stable demo first: PASS. Local fixture validation and preview mode work without live GitHub writes.
- Simple working code: PASS. No database, queue, or background worker is mandatory for the first demo.
- No large dependencies without approval: PASS. Standard-library signature verification and existing backend modules are sufficient.
- No committed secrets: PASS. Runtime env values only.
- Mock/demo safety: PASS. Contract includes local preview and fixture-driven webhook validation.
- Build before completion: PASS when `npm run build` succeeds after planning.

## Complexity Tracking

No constitution violations are present.
