# Demo Script

## Opening
We built **ComplyPatch AI**, a compliance-aware GitHub PR review agent.

General AI coding tools review code. Our agent reviews code against privacy, security, and compliance policies.

## Problem
Teams ship code fast, but compliance review is slow and manual. Security and compliance teams cannot deeply review every PR.

## Demo
Here is a pull request that adds a patient export API.

ComplyPatch AI scans a pasted PR diff, changed-file payload, or local demo repository path and finds:

- Patient data being logged
- API route missing authentication
- Secret key hardcoded in source code
- Unsafe SQL query construction
- Wildcard CORS
- Insecure cookie settings

It generates:

- Compliance score
- Severity and category counts
- Evidence
- Masked sensitive values
- Compliance impact
- Suggested fixes
- Optional AI compliance recommendation from redacted snippets
- GitHub-ready PR comment

For this hackathon demo, live GitHub posting is intentionally mocked. The output is a PR-ready comment that can be copied or sent to the mocked endpoint.

## Closing
This can become a production compliance gate for healthcare, fintech, and enterprise software teams.

## 30-Second Pitch
ComplyPatch AI reviews every pull request like a compliance engineer. It detects secrets, PII leakage, missing auth, unsafe SQL, wildcard CORS, and insecure cookies, then generates a risk score, masked evidence, optional AI remediation guidance, and a PR-ready comment. It helps teams catch compliance risks before they merge code.
