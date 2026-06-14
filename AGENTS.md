# AGENTS.md

## Project
We are building **ComplyPatch AI** for the Codex Hackathon.

## Goal
Ship one working demo where a GitHub PR or pasted code is scanned for security and compliance risks, then a risk report and PR-style comment are generated.

## Non-negotiables
- Keep the demo stable.
- Prefer simple working code over complex architecture.
- Do not add large dependencies without approval.
- Never commit real API keys or secrets.
- Use mock/demo data when live GitHub integration is risky.
- Run `npm run build` before saying a task is complete.

## Core Demo Flow
1. Load demo PR or changed files.
2. Scan for secrets, PII logging, missing auth, insecure cookies, unsafe CORS, and unsafe SQL.
3. Generate compliance findings.
4. Show score and evidence.
5. Generate GitHub-style PR comment.
6. Optional: generate suggested code fix.

## Review Guidelines
Flag these as high priority:
- Secrets in code
- PII/patient data logging
- Missing auth on API routes
- Unsafe SQL query construction
- CORS wildcard on sensitive APIs
- Insecure cookies

## Coding Rules
- Keep TypeScript strict and readable.
- Put scanner logic in `lib/scanner`.
- Put PR comment formatting in `lib/github`.
- Keep UI simple and demo-ready.
- Do not break the sample scan button.

## Demo Safety
This is a hackathon demo. The tool gives compliance assistance, not legal certification.

<!-- SPECKIT START -->
For additional context about technologies to be used, project structure,
shell commands, and other important information, read the current plan
at specs/001-fastapi-compliance-scanner/plan.md
at specs/001-github-webhook/plan.md
<!-- SPECKIT END -->
