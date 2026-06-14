# Tasks: GitHub PR Webhook Comments

**Input**: Design documents from `specs/001-github-webhook/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Backend unittest coverage is included because webhook verification, GitHub posting fallback, and duplicate delivery handling are high-risk demo paths.

**Organization**: Tasks are grouped by user story so each story can be implemented and validated independently.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Prepare configuration and files for the GitHub PR webhook slice.

- [X] T001 Create backend GitHub integration files in `backend/github/webhook.py`, `backend/github/client.py`, and `backend/github/state.py`
- [X] T002 [P] Add runtime GitHub webhook environment placeholders to `.env.example`
- [X] T003 [P] Add GitHub webhook setup notes to `backend/README.md`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared data, signature, state, and safety primitives required before user stories.

- [X] T004 Define connected repository, delivery, change set, outbound comment, and operation response models in `backend/models.py`
- [X] T005 [P] Implement `X-Hub-Signature-256` verification and safe payload parsing helpers in `backend/github/webhook.py`
- [X] T006 [P] Implement bounded demo state for connected repositories, delivery IDs, scan results, and outbound status in `backend/github/state.py`
- [X] T007 [P] Implement GitHub configuration, allowed repository checks, and sanitized error helpers in `backend/github/client.py`
- [X] T008 Add foundational tests for signature verification, repository allow checks, and state idempotency in `backend/tests/test_github_webhook.py`

**Checkpoint**: Foundation ready; user story work can begin.

---

## Phase 3: User Story 1 - Connect a GitHub Repository (Priority: P1) MVP

**Goal**: A demo operator can connect or allow a GitHub repository so ComplyPatch AI accepts pull request deliveries from it.

**Independent Test**: Add a demo repository and verify connected status; attempt an untrusted repository and verify rejection without secret exposure.

- [X] T009 [P] [US1] Add repository connection success and rejection tests in `backend/tests/test_github_webhook.py`
- [X] T010 [US1] Implement repository connection service behavior in `backend/github/client.py`
- [X] T011 [US1] Add `POST /api/github/repositories` route in `backend/main.py`
- [X] T012 [US1] Store connected repository status and setup errors in `backend/github/state.py`

**Checkpoint**: Repository connection works independently of PR scanning.

---

## Phase 4: User Story 2 - Scan Pull Request Changes From GitHub (Priority: P2)

**Goal**: A verified PR webhook collects changed code and runs the existing ComplyPatch scanner.

**Independent Test**: Send signed `pull_request` payloads and verify accepted deliveries produce scan results while invalid signatures and unsupported events do not run scans.

- [X] T013 [P] [US2] Add webhook signature, unsupported event, and accepted PR delivery tests in `backend/tests/test_github_webhook.py`
- [X] T014 [US2] Implement supported pull request event/action detection and required payload extraction in `backend/github/webhook.py`
- [X] T015 [US2] Implement pull request changed-file collection and scan input conversion in `backend/github/client.py`
- [X] T016 [US2] Implement PR scan orchestration using existing scanner and comment formatter in `backend/github/webhook.py`
- [X] T017 [US2] Add `POST /api/github/webhook` route in `backend/main.py`
- [X] T018 [US2] Add skipped-file evidence handling for size/content limits in `backend/github/webhook.py`

**Checkpoint**: Signed PR webhook payloads can trigger deterministic scan output.

---

## Phase 5: User Story 3 - Comment Vulnerabilities on the Pull Request (Priority: P3)

**Goal**: ComplyPatch AI posts or updates one PR timeline comment with vulnerable endpoint/code findings and suggested fixes.

**Independent Test**: Process a vulnerable PR with posting disabled and confirm preview output; process with mocked posting enabled and confirm create/update behavior without duplicates.

- [X] T019 [P] [US3] Add outbound preview, comment creation, comment update, and de-duplication tests in `backend/tests/test_github_webhook.py`
- [X] T020 [US3] Add stable ComplyPatch comment marker support in `backend/github/pr_comment.py`
- [X] T021 [US3] Implement issue comment list/create/update operations in `backend/github/client.py`
- [X] T022 [US3] Integrate outbound post/update and preview fallback into `backend/github/webhook.py`
- [X] T023 [US3] Store outbound posting status and sanitized failure reasons in `backend/github/state.py`

**Checkpoint**: PR comments are posted/updated when configured, otherwise preview is available locally.

---

## Phase 6: User Story 4 - Track Webhook and Comment Status (Priority: P4)

**Goal**: A demo operator can inspect delivery, scan, skipped-file, and outbound comment status.

**Independent Test**: Send valid and invalid deliveries, then retrieve operation status by delivery ID and confirm scan and comment states are reported separately.

- [X] T024 [P] [US4] Add operation status success, rejected, missing, and posting-failure tests in `backend/tests/test_github_webhook.py`
- [X] T025 [US4] Implement operation status serialization for delivery, scan, outbound, and skipped files in `backend/github/state.py`
- [X] T026 [US4] Add `GET /api/github/operations/{delivery_id}` route in `backend/main.py`
- [X] T027 [US4] Ensure rejected and failed deliveries never expose secrets in `backend/github/webhook.py`

**Checkpoint**: Webhook operations are observable without exposing secrets.

---

## Phase 7: Polish & Cross-Cutting Concerns

- [X] T028 [P] Update root GitHub webhook usage notes in `README.md`
- [X] T029 [P] Update feature quickstart outcomes in `specs/001-github-webhook/quickstart.md`
- [X] T030 Run backend unittest discovery `uv run python -m unittest discover backend/tests` and fix failures in `backend/`
- [X] T031 Run required production build `npm run build` and fix build/type failures in `app/` or `lib/`

## Dependencies & Execution Order

- Phase 1 has no dependencies.
- Phase 2 depends on Phase 1 and blocks all user stories.
- US1 is the MVP and must complete before accepting live PR webhooks.
- US2 depends on US1 repository connection and Phase 2 verification/state.
- US3 depends on US2 scan orchestration and generated comment body.
- US4 depends on Phase 2 state and should reflect statuses from US1-US3.
- Polish depends on selected user stories.

## Parallel Opportunities

- T002 and T003 can run in parallel.
- T005, T006, and T007 can run in parallel after T004 model scope is known.
- T009 and T013 can be drafted in parallel because they extend different test scenarios.
- T028 and T029 can run in parallel after behavior is stable.

## MVP Scope

Complete Phase 1, Phase 2, and Phase 3 to connect a repository. Add Phase 4 to demo automatic PR scanning. Phase 5 is needed for live GitHub PR comments.
