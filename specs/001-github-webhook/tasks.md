# Tasks: GitHub PR Webhook Comments

**Input**: Design documents from `specs/001-github-webhook/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/`, `quickstart.md`

**Tests**: Backend unittest coverage is included because webhook verification, repository authorization, comment posting, idempotency, skipped-file reporting, and secret-safe failures are high-risk demo paths.

**Organization**: Tasks are grouped by user story so each story can be implemented and validated independently.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Prepare runtime configuration, source layout, and documentation for the GitHub PR webhook slice.

- [X] T001 Create GitHub integration module structure in `backend/github/__init__.py`, `backend/github/client.py`, `backend/github/webhook.py`, `backend/github/state.py`, `backend/github/operations.py`, and `backend/github/pr_comment.py`
- [X] T002 [P] Add runtime GitHub and OpenAI environment placeholders to `.env.example`
- [X] T003 [P] Document local backend, webhook, and preview-mode setup in `backend/README.md`
- [X] T004 [P] Confirm frontend demo entry points remain available in `app/page.tsx` and `app/api/scan/route.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared models, security checks, scanner bounds, and state primitives required before any user story.

**CRITICAL**: No user story work can begin until this phase is complete.

- [X] T005 Define repository, delivery, change-set, skipped-file, scan, outbound comment, and operation response models in `backend/models.py`
- [X] T006 [P] Implement HMAC SHA-256 webhook signature verification and safe header extraction in `backend/github/webhook.py`
- [X] T007 [P] Implement bounded demo operation state for repositories, delivery IDs, scan results, skipped files, and outbound status in `backend/github/state.py`
- [X] T008 [P] Implement GitHub configuration loading, allowed repository checks, token detection, and sanitized error helpers in `backend/github/client.py`
- [X] T009 [P] Keep scanner file-count and content-size limits aligned across `backend/models.py`, `backend/github/client.py`, and `lib/scanner/local-input.ts`
- [X] T010 Add foundational tests for signature verification, repository allow checks, state idempotency, and scan limits in `backend/tests/test_github_webhook.py`

**Checkpoint**: Foundation is ready; user story implementation can begin.

---

## Phase 3: User Story 1 - Connect a GitHub Repository (Priority: P1) MVP

**Goal**: A demo operator can connect or allow a GitHub repository so ComplyPatch AI accepts pull request deliveries from it.

**Independent Test**: Add a demo repository and verify connected status; attempt an untrusted repository and verify rejection without secret exposure.

### Tests for User Story 1

- [X] T011 [P] [US1] Add repository connection success, failed connection, and disallowed repository tests in `backend/tests/test_github_webhook.py`

### Implementation for User Story 1

- [X] T012 [US1] Implement repository connection and permission-status behavior in `backend/github/client.py`
- [X] T013 [US1] Persist connected repository status and sanitized setup errors in `backend/github/state.py`
- [X] T014 [US1] Add `POST /api/github/repositories` route in `backend/main.py`
- [X] T015 [US1] Update repository connection request and response schemas in `backend/models.py`

**Checkpoint**: Repository connection works independently of PR scanning.

---

## Phase 4: User Story 2 - Scan Pull Request Changes From GitHub (Priority: P2)

**Goal**: A verified PR webhook collects changed code and runs the existing ComplyPatch scanner.

**Independent Test**: Send signed `pull_request` payloads and verify accepted deliveries produce scan results while invalid signatures and unsupported events do not run scans.

### Tests for User Story 2

- [X] T016 [P] [US2] Add tests for invalid signature rejection, unsupported event acknowledgement, and supported PR delivery acceptance in `backend/tests/test_github_webhook.py`
- [X] T017 [P] [US2] Add tests for changed-file collection, removed-file skipping, large-file skipping, and unavailable-content fallback in `backend/tests/test_github_webhook.py`

### Implementation for User Story 2

- [X] T018 [US2] Implement supported `pull_request` action detection and required payload extraction in `backend/github/webhook.py`
- [X] T019 [US2] Implement PR changed-file API collection and content or patch fallback in `backend/github/client.py`
- [X] T020 [US2] Convert GitHub changed files into scanner inputs and skipped-file records in `backend/github/webhook.py`
- [X] T021 [US2] Run existing scanner and score calculation for PR change sets in `backend/github/webhook.py`
- [X] T022 [US2] Add `POST /api/github/webhook` route with signature-aware raw body handling in `backend/main.py`
- [X] T023 [US2] Ensure skipped files are bounded and returned without sensitive payload content in `backend/models.py`

**Checkpoint**: Signed PR webhook payloads can trigger deterministic scan output.

---

## Phase 5: User Story 3 - Comment Vulnerabilities on the Pull Request (Priority: P3)

**Goal**: ComplyPatch AI posts or updates one PR timeline comment with vulnerable endpoint/code findings and suggested fixes.

**Independent Test**: Process a vulnerable PR with posting disabled and confirm preview output; process with mocked posting enabled and confirm create/update behavior without duplicates.

### Tests for User Story 3

- [X] T024 [P] [US3] Add outbound preview, comment creation, comment update, and de-duplication tests in `backend/tests/test_github_webhook.py`
- [X] T025 [P] [US3] Add sanitized GitHub posting failure tests in `backend/tests/test_github_webhook.py`

### Implementation for User Story 3

- [X] T026 [US3] Add stable hidden ComplyPatch comment marker support in `backend/github/pr_comment.py`
- [X] T027 [US3] Implement issue comment list/create/update operations in `backend/github/client.py`
- [X] T028 [US3] Integrate outbound post/update and local preview fallback into `backend/github/webhook.py`
- [X] T029 [US3] Store outbound posting mode, status, comment URL, and sanitized failure reason in `backend/github/state.py`
- [X] T030 [US3] Keep generated PR comment body aligned with existing frontend formatter in `lib/github/pr-comment.ts`

**Checkpoint**: PR comments are posted or updated when configured, otherwise preview is available locally.

---

## Phase 6: User Story 4 - Track Webhook and Comment Status (Priority: P4)

**Goal**: A demo operator can inspect delivery, scan, skipped-file, AI analysis, and outbound comment status without confusing UI overlap or secret exposure.

**Independent Test**: Send valid and invalid deliveries, retrieve operation status by delivery ID, and confirm delivery, scan, skipped-file, AI-analysis, and outbound states are reported separately.

### Tests for User Story 4

- [X] T031 [P] [US4] Add operation status success, rejected delivery, missing delivery, and posting-failure tests in `backend/tests/test_github_webhook.py`
- [X] T032 [P] [US4] Add UI/API regression coverage for skipped-file summaries and OpenAI 401 failure handling in `app/api/scan/route.ts`

### Implementation for User Story 4

- [X] T033 [US4] Implement operation status serialization for delivery, scan, outbound, and skipped files in `backend/github/state.py`
- [X] T034 [US4] Add `GET /api/github/operations/{delivery_id}` route in `backend/main.py`
- [X] T035 [US4] Ensure rejected and failed webhook deliveries never expose secrets in `backend/github/webhook.py`
- [X] T036 [US4] Format skipped-file summaries compactly and avoid oversized skipped text blocks in `app/page.tsx`
- [X] T037 [US4] Style skipped-file and AI-analysis status blocks so they cannot overlap content in `app/globals.css`
- [X] T038 [US4] Convert OpenAI 401 or missing-key cases into clear non-blocking AI status messages in `lib/agents/openai-analysis.ts`
- [X] T039 [US4] Keep scan results usable when AI analysis fails by preserving score, findings, and PR comment output in `app/api/scan/route.ts`

**Checkpoint**: Webhook operations and frontend scan results are observable without exposing secrets or breaking the demo UI.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Final hardening, documentation, and verification across the GitHub webhook demo.

- [X] T040 [P] Update root GitHub webhook and repository scan usage notes in `README.md`
- [X] T041 [P] Update validation expectations and screenshot-known failure handling in `specs/001-github-webhook/quickstart.md`
- [X] T042 [P] Document OpenAI API key behavior and fallback status in `.env.example`
- [X] T043 Run backend unittest discovery and fix failures in `backend/tests/`
- [X] T044 Run required production build and fix build/type failures in `app/` and `lib/`
- [X] T045 Validate the UI no-overlap scenario for skipped files and failed AI analysis in `app/page.tsx` and `app/globals.css`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1: Setup** has no dependencies.
- **Phase 2: Foundational** depends on Phase 1 and blocks all user stories.
- **Phase 3: US1** depends on Phase 2.
- **Phase 4: US2** depends on Phase 2 and uses repository acceptance from US1.
- **Phase 5: US3** depends on US2 scan orchestration and generated comment output.
- **Phase 6: US4** depends on Phase 2 state and can be completed after or alongside US2/US3 status-producing paths.
- **Phase 7: Polish** depends on the selected user stories.

### User Story Dependencies

- **US1 (P1)**: Independent after foundation; MVP scope.
- **US2 (P2)**: Requires allowed/connected repository behavior from US1.
- **US3 (P3)**: Requires scan output from US2.
- **US4 (P4)**: Reads states from US1-US3 but UI/status tasks can be developed independently with mocked responses.

### Within Each User Story

- Tests precede implementation.
- Models and state precede service orchestration.
- GitHub client calls precede webhook orchestration.
- Core scan/comment behavior precedes UI/status polish.

---

## Parallel Opportunities

- T002, T003, and T004 can run in parallel.
- T006, T007, T008, and T009 can run in parallel after T005 model scope is known.
- T011 can run while T012-T015 are implemented sequentially.
- T016 and T017 can run in parallel because they cover different webhook scan risks.
- T024 and T025 can run in parallel because they cover different outbound comment paths.
- T031 and T032 can run in parallel because backend operation status and frontend status rendering are separate.
- T040, T041, and T042 can run in parallel after behavior is stable.

## Parallel Example: User Story 2

```bash
# Parallel test drafting
Task: "T016 [P] [US2] Add tests for invalid signature rejection, unsupported event acknowledgement, and supported PR delivery acceptance in backend/tests/test_github_webhook.py"
Task: "T017 [P] [US2] Add tests for changed-file collection, removed-file skipping, large-file skipping, and unavailable-content fallback in backend/tests/test_github_webhook.py"
```

## Parallel Example: User Story 4

```bash
# Backend and UI status work can proceed with fixtures/mocks
Task: "T031 [P] [US4] Add operation status success, rejected delivery, missing delivery, and posting-failure tests in backend/tests/test_github_webhook.py"
Task: "T032 [P] [US4] Add UI/API regression coverage for skipped-file summaries and OpenAI 401 failure handling in app/api/scan/route.ts"
```

---

## Implementation Strategy

### MVP First

1. Complete Phase 1 and Phase 2.
2. Complete US1 to connect or allow repositories.
3. Stop and validate repository acceptance/rejection independently.
4. Add US2 for webhook-triggered scans.
5. Demo local PR comment preview before enabling live posting.

### Incremental Delivery

1. Setup + foundation provide signature verification, state, and safe config.
2. US1 adds repository connection.
3. US2 adds PR scan automation.
4. US3 adds GitHub comment post/update behavior.
5. US4 adds operation visibility and robust failure display.

### Current Screenshot Follow-Up

The screenshot showing `scan limit reached after 50 GitHub files` and `OpenAI request failed with status 401` should be handled by T036-T039 and T045. These tasks keep the scan successful, summarize skipped files compactly, and present AI auth failures as non-blocking status instead of a broken-looking error area.

## Format Validation

All tasks use the required `- [X] T### [P?] [US?] Description with file path` checklist format. Setup, foundational, and polish tasks omit story labels; user-story tasks include `[US1]`, `[US2]`, `[US3]`, or `[US4]`.
