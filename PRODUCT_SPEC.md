# Product Spec: ComplyPatch AI

## Problem
Engineering teams ship fast, but privacy, security, and compliance review is slow and manual. Many issues are introduced in pull requests and discovered too late.

## Solution
ComplyPatch AI scans code changes and generates compliance-aware review output:

- Risk score
- Evidence-based findings
- Policy mapping
- Suggested fixes
- GitHub PR comment

## Target Users
- Engineering teams
- CTOs
- Security teams
- Healthcare SaaS teams
- Fintech teams
- Enterprise compliance teams

## MVP User Story
As a developer, I want my PR to be automatically checked for sensitive data leaks and security risks so I can fix problems before merge.

## MVP Rules
1. Hardcoded secret
2. PII/patient data logging
3. Missing authentication
4. Unsafe SQL query
5. Wildcard CORS
6. Insecure cookie flags

## Winning Hackathon Demo
A PR adds a patient export API. ComplyPatch AI finds critical issues, explains business/compliance impact, and generates a PR-ready comment with safe fixes.

## Differentiation
Normal code agents review correctness. ComplyPatch AI reviews code through a compliance lens with policy packs, risk scoring, and evidence.
