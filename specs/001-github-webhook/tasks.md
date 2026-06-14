# Tasks: GitHub Webhook Operations

**Input**: Design documents from `specs/001-github-webhook/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Backend unittest coverage is included because webhook signature handling, outbound posting fallback, and duplicate delivery handling are high-risk demo paths.

**Organization**: Tasks are grouped by user story so each story can be implemented and validated independently.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel because it touches different files or has no dependency on incomplete tasks.
- **[Story]**: Maps to a user story: US1, US2, or US3.
- Every task includes an exact file path.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Prepare configuration and files for the webhook slice.

- [x] T001 Create backend GitHub integration and database module files in `backend/github/webhook.py`, `backend/github/client.py`, `backend/github/operations.py`, and `backend/db.py`
- [x] T002 [P] Add webhook environment placeholders to `.env.example`
- [x] T003 [P] Add GitHub webhook quickstart references to `backend/README.md`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared data and safety primitives required before any user story can work.

- [x] T004 Define GitHub delivery, change-set, outbound action, and operation response models in `backend/models.py`
- [x] T005 [P] Implement webhook signature verification and safe payload parsing helpers in `backend/github/webhook.py`
- [x] T006 [P] Implement PostgreSQL operation store with delivery correlation in `backend/github/operations.py`
- [x] T007 [P] Implement GitHub API configuration, allowed repository checks, and sanitized error helpers in `backend/github/client.py`

**Checkpoint**: Foundation ready; user story work can begin.

---

## Phase 3: User Story 1 - Scan Pull Request Changes From GitHub (Priority: P1) MVP

**Goal**: Receive a verified GitHub PR webhook delivery, collect changed files, run the existing scanner, and produce a scan result with PR-ready comment markdown.

**Independent Test**: Send signed `pull_request` demo payloads and confirm accepted deliveries produce scan results while invalid signatures and unsupported events do not run scans.

### Tests for User Story 1

- [x] T008 [US1] Add webhook signature, unsupported event, and accepted PR delivery tests in `backend/tests/test_github_webhook.py`

### Implementation for User Story 1

- [x] T009 [US1] Implement supported event/action detection and required PR payload extraction in `backend/github/webhook.py`
- [x] T010 [US1] Implement pull request changed-file collection and scan input conversion in `backend/github/client.py`
- [x] T011 [US1] Implement PR scan orchestration using existing scanner and comment formatter in `backend/github/webhook.py`
- [x] T012 [US1] Add `POST /api/github/webhook` route in `backend/main.py`
- [x] T013 [US1] Add demo-safe skipped file evidence handling in `backend/github/webhook.py`

**Checkpoint**: User Story 1 is independently demoable with local signed webhook payloads and no GitHub write token.

---

## Phase 4: User Story 2 - Post Review Comment Back To GitHub (Priority: P2)

**Goal**: Post or update one ComplyPatch AI timeline comment on the originating pull request, with local preview fallback when posting is disabled.

**Independent Test**: Process a supported PR delivery with posting disabled and confirm preview output; process with a mocked posting client and confirm create/update behavior without duplicates.

### Tests for User Story 2

- [x] T014 [US2] Add outbound preview, comment creation, and comment update tests in `backend/tests/test_github_webhook.py`

### Implementation for User Story 2

- [x] T015 [US2] Add stable ComplyPatch comment marker support in `backend/github/pr_comment.py`
- [x] T016 [US2] Implement issue comment list, create, and update operations in `backend/github/client.py`
- [x] T017 [US2] Integrate outbound post/update and preview fallback into `backend/github/webhook.py`
- [x] T018 [US2] Store outbound posting status and sanitized failure reasons in PostgreSQL via `backend/github/operations.py`

**Checkpoint**: User Stories 1 and 2 work with either live GitHub posting or preview-only mode.

---

## Phase 5: User Story 3 - Track GitHub Operations (Priority: P3)

**Goal**: Expose inbound delivery, scan, skipped-file, and outbound posting status so the demo operator can inspect webhook operation results.

**Independent Test**: Send valid and invalid deliveries, then retrieve operation status by delivery id and confirm scan and posting states are reported separately.

### Tests for User Story 3

- [x] T019 [US3] Add operation status success, rejected, missing, and posting-failure tests in `backend/tests/test_github_webhook.py`

### Implementation for User Story 3

- [x] T020 [US3] Add operation status response models in `backend/models.py`
- [x] T021 [US3] Implement operation serialization for delivery, scan, outbound, and skipped files in `backend/github/operations.py`
- [x] T022 [US3] Add `GET /api/github/operations/{delivery_id}` route in `backend/main.py`
- [x] T023 [US3] Ensure rejected and failed deliveries never expose secrets in `backend/github/webhook.py`

**Checkpoint**: All user stories are independently functional and observable.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Documentation, demo validation, and project gates.

- [x] T024 [P] Update root GitHub webhook and PostgreSQL usage notes in `README.md`
- [x] T025 [P] Update feature quickstart outcomes if implementation details changed in `specs/001-github-webhook/quickstart.md`
- [x] T026 Run backend unittest suite for `backend/tests/test_github_webhook.py` and `backend/tests/test_scan.py`
- [x] T027 Run required production build using `package.json`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies.
- **Foundational (Phase 2)**: Depends on Setup completion and blocks all user stories.
- **User Story 1 (Phase 3)**: Depends on Foundational and is the MVP.
- **User Story 2 (Phase 4)**: Depends on US1 scan orchestration and comment body generation.
- **User Story 3 (Phase 5)**: Depends on the operation store from Foundational and can start after US1 creates records.
- **Polish (Phase 6)**: Depends on implemented stories selected for the demo.

### User Story Dependencies

- **US1 (P1)**: No dependency on other stories after Foundation.
- **US2 (P2)**: Depends on US1 because it posts the generated scan comment.
- **US3 (P3)**: Depends on Foundation and should include statuses from US1 and US2 when those stories are present.

### Within Each User Story

- Write the story's tests first.
- Implement models or helpers before orchestration.
- Wire routes after service behavior exists.
- Validate the story independently before moving to the next priority.

## Parallel Opportunities

- T002 and T003 can run in parallel with T001.
- T005, T006, and T007 can run in parallel after T001.
- T024 and T025 can run in parallel after implementation behavior is stable.
- US2 comment client work in `backend/github/client.py` can proceed while US3 response model work in `backend/models.py` proceeds, after US1 scan orchestration exists.

## Parallel Example: Foundation

```text
Task: "Implement webhook signature verification and safe payload parsing helpers in backend/github/webhook.py"
Task: "Implement PostgreSQL operation store with delivery correlation in backend/github/operations.py"
Task: "Implement GitHub API configuration, allowed repository checks, and sanitized error helpers in backend/github/client.py"
```

## Parallel Example: Polish

```text
Task: "Update root GitHub webhook usage notes in README.md"
Task: "Update feature quickstart outcomes if implementation details changed in specs/001-github-webhook/quickstart.md"
```

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 and Phase 2.
2. Complete Phase 3 only.
3. Validate signed webhook handling, PR file collection, scanner execution, and local PR comment generation.
4. Stop and demo if live GitHub posting is not ready.

### Incremental Delivery

1. Deliver US1 for verified inbound PR scans.
2. Add US2 for GitHub comment posting or preview fallback.
3. Add US3 for operation visibility and failure diagnostics.
4. Run backend tests and `npm run build` before calling the feature complete.

### Team Strategy

1. One developer owns webhook verification and orchestration in `backend/github/webhook.py`.
2. One developer owns GitHub API operations in `backend/github/client.py`.
3. One developer owns tests and operation-status coverage in `backend/tests/test_github_webhook.py`.

## Notes

- [P] tasks touch different files and can run concurrently.
- Keep runtime secrets in environment variables only.
- Do not break the existing sample scan button.
- Persist webhook operation state in PostgreSQL; do not use process-local operation state.
