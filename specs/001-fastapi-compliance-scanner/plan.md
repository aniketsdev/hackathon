# Implementation Plan: Compliance Repository Scanner

**Branch**: `001-fastapi-compliance-scanner` | **Date**: 2026-06-14 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/001-fastapi-compliance-scanner/spec.md`

## Summary

Build the ComplyPatch AI hackathon demo around the existing Next.js/TypeScript surface. The first demo accepts sample changed files, pasted code, or a demo local repository path, runs deterministic scanner rules for secrets, PHI/PII logging, missing auth, unsafe SQL, insecure cookies, and unsafe CORS, shows a 0-100 weighted risk report with masked evidence, and generates a GitHub-style PR comment. OpenAI-assisted analysis is optional, uses only runtime credentials, receives locally masked/redacted relevant snippets, and must never replace deterministic findings. Live GitHub PR triggers and posting are explicitly deferred.

## Technical Context

**Language/Version**: TypeScript 6 with Next.js 16 for the primary demo app; Python 3.11+ FastAPI backend exists as a secondary/API-compatible path.

**Primary Dependencies**: Existing `next`, `react`, `typescript`; existing Python `fastapi`/`uvicorn` only if backend paths are touched. Do not add the OpenAI SDK or other large dependencies without approval; use secure runtime configuration for `OPENAI_API_KEY`.

**Storage**: No database or file persistence for v1. Submitted code, findings, reports, AI context, and generated PR comments are request/session scoped.

**Testing**: `npm run build` is mandatory before completion. Use focused scanner/API tests where changed: TypeScript scanner tests if introduced, and `uv run python -m unittest backend.tests.test_scan` only when backend scanner/API code changes.

**Target Platform**: Local hackathon demo in a browser via Next.js, with optional local FastAPI service validation.

**Project Type**: Web app with API routes and deterministic scanner libraries.

**Performance Goals**: Deterministic scan of representative changed files completes and displays a report in under 10 seconds without AI analysis.

**Constraints**: Keep the demo stable; preserve the sample scan button; keep scanner logic in `lib/scanner`; keep PR comment formatting in `lib/github`; never commit real API keys or secrets; mask secrets/PHI in report output and any OpenAI context; use mock/demo data for PR workflows.

**Scale/Scope**: Demo-sized scans only: up to 50 direct file payloads and 200,000 characters per file. Local repository ingestion should scan supported text files only and reject or skip unsupported/binary/oversized content with clear messages.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

The project constitution file still contains placeholder text, so this plan applies the concrete project rules from `AGENTS.md`:

- Stable demo first: PASS. Deterministic scanning remains the baseline and AI failure is non-blocking.
- Simple working code over complex architecture: PASS. Plan uses existing Next API routes and library folders; no database, queue, auth system, or live GitHub integration.
- No large dependencies without approval: PASS. Optional OpenAI analysis must avoid new SDK dependency unless explicitly approved later.
- No committed secrets: PASS. Credentials are runtime-only environment variables.
- Mock/demo data when live GitHub is risky: PASS. Real PR triggers/comments are future work.
- Build before completion: PASS requirement for implementation and validation.

## Project Structure

### Documentation (this feature)

```text
specs/001-fastapi-compliance-scanner/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── openapi.yaml
└── tasks.md
```

### Source Code (repository root)

```text
app/
├── api/
│   ├── scan/route.ts          # Primary demo scan endpoint
│   └── pr-comment/route.ts    # Mock PR comment endpoint
└── page.tsx                   # Demo UI and sample scan button

lib/
├── scanner/
│   ├── rules.ts               # Rule catalog, categories, severity metadata
│   └── scan.ts                # Deterministic scanner and local masking
├── github/
│   └── pr-comment.ts          # GitHub-style comment formatting
└── agents/
    └── compliance-agent.ts    # Optional AI analysis boundary/summary helper

demo-vulnerable-repo/          # Demo fixtures for risky and fixed code

backend/                       # Existing optional FastAPI-compatible service path
├── main.py
├── models.py
├── scanner/
├── github/
├── agents/
└── tests/
```

**Structure Decision**: Implement the demo-critical behavior in the existing TypeScript app and library folders because `AGENTS.md` requires scanner logic in `lib/scanner`, PR formatting in `lib/github`, and the sample scan button must stay stable. Keep `backend/` compatible when touched, but do not make FastAPI a blocker for the 5-hour demo.

## Complexity Tracking

No constitution or project-rule violations require justification.

## Phase 0: Research

Completed in [research.md](./research.md). Key decisions:

- Deterministic TypeScript scanner is the source of truth for the demo.
- Optional OpenAI analysis uses runtime credentials and redacted snippets only.
- Reports and generated comments remain ephemeral.
- Risk score uses weighted severity penalties on a 0-100 scale.
- Real GitHub triggers/comments are deferred behind a mock PR workflow.

## Phase 1: Design & Contracts

Completed artifacts:

- [data-model.md](./data-model.md)
- [contracts/openapi.yaml](./contracts/openapi.yaml)
- [quickstart.md](./quickstart.md)

## Post-Design Constitution Check

- Stable demo first: PASS. Contracts target the existing `/api/scan` and mocked `/api/pr-comment` flow.
- Simple working code: PASS. No database, queue, auth system, or live GitHub integration is planned for v1.
- No large dependencies without approval: PASS. OpenAI integration is isolated behind `lib/agents` and can use runtime `fetch` or await approval for a client dependency.
- No committed secrets: PASS. Contract and quickstart require environment variables only.
- Mock/demo safety: PASS. Quickstart validates local/demo inputs and mocked PR-comment output.
- Build before completion: PASS when `npm run build` succeeds after plan generation.
