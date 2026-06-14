# Tasks: Compliance Repository Scanner

**Input**: Design documents from `specs/001-fastapi-compliance-scanner/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/openapi.yaml](./contracts/openapi.yaml), [quickstart.md](./quickstart.md)

**Tests**: No new test framework is required for the 5-hour demo. Use the independent validation criteria, quickstart curl checks, and required `npm run build`; add automated tests only if a test runner is approved later.

**Organization**: Tasks are grouped by user story so each story can be implemented and validated independently.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel because it touches different files and does not depend on an incomplete task
- **[Story]**: User story label for story phases only
- Every task includes at least one exact file path

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm the demo-safe implementation path and avoid dependency churn before feature work.

- [X] T001 Confirm `package.json` uses existing Next.js/TypeScript dependencies only and do not add OpenAI SDK or test dependencies without approval in `package.json`
- [X] T002 [P] Confirm the sample scan entry point remains `runDemoScan` and the primary UI remains in `app/page.tsx`
- [X] T003 [P] Confirm the active API contract targets `/api/scan` and mocked `/api/pr-comment` in `specs/001-fastapi-compliance-scanner/contracts/openapi.yaml`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared TypeScript types, redaction, scoring, and report helpers required before user story implementation.

**Critical**: No user story implementation should start until this phase is complete.

- [X] T004 Create shared scan/domain types for `SourceFile`, `Finding`, `RiskReport`, `AIAnalysisResult`, and finding categories in `lib/scanner/types.ts`
- [X] T005 Update rule metadata with category values for secrets, PHI logging, missing auth, unsafe SQL, insecure cookies, and unsafe CORS in `lib/scanner/rules.ts`
- [X] T006 [P] Implement local redaction helpers for likely secrets, patient names, phone-like values, emails, and health terms in `lib/scanner/redaction.ts`
- [X] T007 [P] Implement weighted 0-100 severity scoring and severity ordering helpers in `lib/scanner/scoring.ts`
- [X] T008 [P] Implement report assembly helpers for finding counts, prioritized findings, disclaimer text, and safe summaries in `lib/scanner/report.ts`
- [X] T009 Update scanner imports to use shared types and helper modules without changing existing rule behavior in `lib/scanner/scan.ts`

**Checkpoint**: Shared scanner primitives are ready, and existing demo scan behavior still compiles.

---

## Phase 3: User Story 1 - Scan Demo Code for Compliance Risks (Priority: P1) MVP

**Goal**: A developer or demo presenter can scan changed files, pasted code, or a demo local repository path and receive deterministic findings with severity, category, masked evidence, location, and remediation guidance.

**Independent Test**: Submit demo code containing an API key, PHI logging, unsafe SQL, insecure cookie, wildcard CORS, and missing auth; verify all configured findings are returned with masked evidence and no persistence.

### Implementation for User Story 1

- [X] T010 [US1] Add request validation for `files`, pasted-code labels, `localPath`, empty input, 50-file limit, and 200,000-character file limit in `app/api/scan/route.ts`
- [X] T011 [P] [US1] Implement demo local repository path expansion with supported text-file filtering and binary/oversized skip handling in `lib/scanner/local-input.ts`
- [X] T012 [US1] Apply category assignment, evidence redaction, and `masked` flags when creating findings in `lib/scanner/scan.ts`
- [X] T013 [US1] Ensure deterministic checks cover all six required categories and preserve deduplication in `lib/scanner/scan.ts`
- [X] T014 [P] [US1] Update the vulnerable fixture so it reliably triggers all six configured categories in `demo-vulnerable-repo/patient-export.ts`
- [X] T015 [P] [US1] Keep the fixed fixture low-risk and aligned with safe remediation guidance in `demo-vulnerable-repo/fixed-patient-export.ts`
- [X] T016 [US1] Update UI result types and finding rendering for `category`, `masked`, and validation error messages while preserving the sample scan button in `app/page.tsx`

**Checkpoint**: User Story 1 is complete when `/api/scan` returns deterministic findings for direct files and demo `localPath` input, and the sample scan button still works.

---

## Phase 4: User Story 2 - Review a Compliance Report (Priority: P2)

**Goal**: A developer can review a completed scan report with weighted score, finding counts, prioritized findings, evidence, compliance relevance, remediation, and disclaimer.

**Independent Test**: Open a completed scan response with mixed severities and verify high-priority findings appear first, score reflects severity weights, and sensitive evidence remains masked.

### Implementation for User Story 2

- [X] T017 [US2] Build `RiskReport` responses with weighted score, severity/category counts, prioritized findings, summary, and disclaimer in `lib/scanner/report.ts`
- [X] T018 [US2] Replace inline score calculation with `buildRiskReport` response assembly in `app/api/scan/route.ts`
- [X] T019 [P] [US2] Update summary wording for critical/high, medium-only, and low-risk scans in `lib/agents/compliance-agent.ts`
- [X] T020 [US2] Display finding counts, disclaimer, ordered findings, and masked evidence clearly in `app/page.tsx`

**Checkpoint**: User Story 2 is complete when a scan response and UI report are enough to review score, counts, evidence, risk, and remediation without persisted data.

---

## Phase 5: User Story 3 - Generate a PR-Style Review Comment (Priority: P3)

**Goal**: A developer can generate a GitHub-style markdown review comment that includes score, top findings, evidence references, recommendations, and the compliance assistance disclaimer.

**Independent Test**: Scan demo code and verify `prComment` contains the score, high-priority findings first, masked evidence references, remediation guidance, and no live GitHub posting requirement.

### Implementation for User Story 3

- [X] T021 [US3] Update PR comment formatting with score, top findings, severity ordering, masked evidence, remediation guidance, and disclaimer in `lib/github/pr-comment.ts`
- [X] T022 [US3] Ensure every completed scan response includes a generated `prComment` from the report data in `app/api/scan/route.ts`
- [X] T023 [P] [US3] Validate mocked PR comment payloads and keep live GitHub posting disabled in `app/api/pr-comment/route.ts`
- [X] T024 [US3] Keep the copy-comment UI working and show low-risk comment output cleanly in `app/page.tsx`

**Checkpoint**: User Story 3 is complete when the PR-style comment can be copied from the UI or response and `/api/pr-comment` remains mocked.

---

## Phase 6: User Story 4 - Add AI-Assisted Analysis (Priority: P4)

**Goal**: A developer can optionally request OpenAI-assisted analysis after deterministic scanning, using only locally masked/redacted relevant snippets, while deterministic results still work when OpenAI is unavailable.

**Independent Test**: Enable AI analysis with and without `OPENAI_API_KEY`; verify deterministic findings remain present, OpenAI context is redacted, and AI failure is non-blocking.

### Implementation for User Story 4

- [X] T025 [P] [US4] Build redacted snippet selection from deterministic findings for OpenAI context in `lib/agents/ai-context.ts`
- [X] T026 [US4] Implement optional OpenAI analysis using runtime `OPENAI_API_KEY`, `fetch`, timeout/error handling, and no new SDK dependency in `lib/agents/openai-analysis.ts`
- [X] T027 [US4] Add AI orchestration that returns `not_configured`, `skipped`, `completed`, or `failed` without changing deterministic findings in `lib/agents/compliance-agent.ts`
- [X] T028 [US4] Wire `enableAiAnalysis` request handling and `aiAnalysis` response population into `app/api/scan/route.ts`
- [X] T029 [US4] Add an optional AI analysis toggle and non-blocking AI status display while preserving the sample scan flow in `app/page.tsx`

**Checkpoint**: User Story 4 is complete when AI analysis is optional, redacted, and deterministic scan output remains available on missing keys or provider failures.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Final validation, documentation alignment, and demo safety checks across all selected user stories.

- [X] T030 [P] Update quickstart validation commands and expected outputs for `/api/scan`, `localPath`, AI analysis, and mocked PR comments in `specs/001-fastapi-compliance-scanner/quickstart.md`
- [X] T031 [P] Update the OpenAPI contract to match final response fields and mocked PR-comment behavior in `specs/001-fastapi-compliance-scanner/contracts/openapi.yaml`
- [X] T032 [P] Update demo narration for local path, masked evidence, AI recommendation, and deferred live GitHub posting in `DEMO_SCRIPT.md`
- [X] T033 Run `npm run lint` and fix lint failures in `app/`, `lib/`, or `package.json`
- [X] T034 Run `npm run build` and fix build/type failures in `app/`, `lib/`, or `package.json`
- [X] T035 Manually validate the quickstart curl scenarios and update any stale expected output in `specs/001-fastapi-compliance-scanner/quickstart.md`
- [X] T036 Search for accidental committed secrets or raw demo API keys and remove them from `app/`, `lib/`, `demo-vulnerable-repo/`, and documentation files

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 Setup**: No dependencies; can start immediately.
- **Phase 2 Foundational**: Depends on Phase 1; blocks all user stories.
- **Phase 3 US1**: Depends on Phase 2 and is the MVP scope.
- **Phase 4 US2**: Depends on Phase 2 and deterministic finding output from US1.
- **Phase 5 US3**: Depends on Phase 2 and benefits from US2 report ordering.
- **Phase 6 US4**: Depends on Phase 2 and should follow US1 redaction work.
- **Phase 7 Polish**: Depends on selected user stories being complete.

### User Story Dependencies

- **US1 (P1)**: Start after Phase 2; no dependency on other stories.
- **US2 (P2)**: Start after Phase 2; uses deterministic findings and shared report helpers.
- **US3 (P3)**: Start after Phase 2; formats findings and report data into a PR-style comment.
- **US4 (P4)**: Start after Phase 2; should follow US1 masking/redaction before any provider context is sent.

### Within Each User Story

- Shared types and helpers come before route/UI wiring.
- Scanner behavior comes before report presentation.
- Report data comes before PR comment formatting.
- Redaction comes before AI context generation.
- Each checkpoint must pass before treating the story as complete.

---

## Parallel Opportunities

- T002 and T003 can run in parallel during setup.
- T006, T007, and T008 can run in parallel after T004 defines shared types.
- T011, T014, and T015 can run in parallel during US1 because they touch different files.
- T019 can run in parallel with T020 after T017 defines report semantics.
- T023 can run in parallel with T021 during US3 because mocked posting is isolated.
- T025 can start in parallel with T029 during US4 once AI response shape is agreed.
- T030, T031, and T032 can run in parallel during polish.

## Parallel Example: User Story 1

```bash
Task: "T011 [P] [US1] Implement demo local repository path expansion with supported text-file filtering and binary/oversized skip handling in lib/scanner/local-input.ts"
Task: "T014 [P] [US1] Update the vulnerable fixture so it reliably triggers all six configured categories in demo-vulnerable-repo/patient-export.ts"
Task: "T015 [P] [US1] Keep the fixed fixture low-risk and aligned with safe remediation guidance in demo-vulnerable-repo/fixed-patient-export.ts"
```

## Parallel Example: User Story 4

```bash
Task: "T025 [P] [US4] Build redacted snippet selection from deterministic findings for OpenAI context in lib/agents/ai-context.ts"
Task: "T029 [US4] Add an optional AI analysis toggle and non-blocking AI status display while preserving the sample scan flow in app/page.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 setup checks.
2. Complete Phase 2 shared scanner primitives.
3. Complete Phase 3 User Story 1.
4. Stop and validate `/api/scan` with direct file input and `localPath`.
5. Demo deterministic findings before adding richer report UI, PR comment polish, or AI analysis.

### Incremental Delivery

1. US1: Deterministic scan for local path and pasted/changed-file input.
2. US2: Rich risk report with score, counts, ordering, masked evidence, and disclaimer.
3. US3: GitHub-style PR review comment artifact and mocked posting.
4. US4: Optional OpenAI explanation/recommendation from redacted snippets.
5. Polish: Quickstart, contract alignment, lint, build, and demo safety checks.

### Parallel Team Strategy

After Phase 2, one developer can finish US1 scanner/local-path work while another prepares US2/US3 presentation and formatting changes. US4 should wait until US1 redaction is implemented and validated.

## Notes

- Keep deterministic scanner results available even when OpenAI is disabled or fails.
- Do not persist submitted code, findings, reports, AI context, or generated comments for v1.
- Do not add large dependencies without approval.
- Never commit real API keys or secrets.
- Do not break the existing sample scan button or Next demo build.
