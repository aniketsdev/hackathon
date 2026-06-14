# Research: Compliance Repository Scanner

## Decision: Use the existing Next.js demo as the primary implementation path

**Rationale**: The repository already has a working Next.js UI and `/api/scan` route, and `AGENTS.md` requires scanner logic in `lib/scanner`, PR comment formatting in `lib/github`, and the sample scan button to remain stable. This gives the fastest reliable 5-hour demo path.

**Alternatives considered**:

- Make FastAPI the primary demo path: deferred because it adds frontend/backend wiring risk for the hackathon, although the existing `backend/` path can remain compatible.
- Create a new service layout: rejected because it adds architecture without improving the demo.

## Decision: Keep deterministic scanning as the source of truth

**Rationale**: Rule-based findings are repeatable, testable, and can produce the report and PR comment even when AI credentials are missing or OpenAI fails. This satisfies the core demo and keeps high-risk checks stable.

**Alternatives considered**:

- AI-first scanning: rejected because model variance and provider failure would weaken the demo.
- Hybrid detection where AI creates new findings: deferred because v1 needs deterministic evidence and predictable acceptance tests.

## Decision: Support changed-file/pasted-code payloads first, with demo local path ingestion as a small extension

**Rationale**: Direct file payloads match the current API and UI. Demo local repository scanning is useful, but it should be implemented by safely expanding supported text files into the same `SourceFile` shape rather than creating a separate scan pipeline.

**Alternatives considered**:

- Built-in fixtures only: rejected because the user wants to scan a repo or pasted code.
- Live GitHub URL/PR scanning: rejected for v1 because authentication, network failures, and permissions add demo risk.

## Decision: Do not persist code, findings, reports, AI context, or comments

**Rationale**: The product handles possible PHI and secrets, so the first demo should minimize retained sensitive data. Ephemeral request/session results satisfy the workflow without storage, retention, or access-control work.

**Alternatives considered**:

- Persist masked reports: deferred because history and audit trails are outside the first demo.
- Persist submitted code: rejected due to unnecessary privacy and security burden.

## Decision: Send relevant snippets to OpenAI only after local masking/redaction

**Rationale**: AI analysis should explain deterministic findings and recommend remediation, but provider calls must receive only the smallest useful redacted context. AI output is advisory and must not replace deterministic findings or evidence.

**Alternatives considered**:

- Send only finding metadata: safer but less useful for remediation and contrary to the latest clarification.
- Send full scanned source: rejected because it increases PHI/secret exposure.

## Decision: Use a weighted 0-100 risk score

**Rationale**: The clarified spec asks for a numeric score where high-severity findings count most. A penalty model is simple, explainable, and already reflected in the current scanner route.

**Alternatives considered**:

- Categorical risk only: rejected because the demo requires a score.
- Pass/fail gate only: rejected because it gives less nuance for mixed severity reports.

## Decision: Keep live GitHub posting mocked for v1

**Rationale**: The demo needs a GitHub-style review artifact, not a live side effect. Mocking avoids token handling and aligns with the project safety guidance.

**Alternatives considered**:

- Post to GitHub PRs directly: deferred to a future extension.
- Remove PR-comment endpoint: rejected because PR-style output is a core demo requirement.
