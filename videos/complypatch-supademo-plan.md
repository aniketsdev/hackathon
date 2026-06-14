# CompliPatch Supademo Recording Plan

## Goal

Create a short Supademo product video that shows CompliPatch AI stopping risky pull requests before merge.

## Recommended Format

- **Length**: 60-90 seconds
- **Steps**: 10-12 Supademo steps
- **Style**: White/grey, crisp, product-led, no decorative motion
- **Audience**: Hackathon judges, developers, compliance reviewers
- **Primary CTA**: Open console, connect GitHub webhook, scan pull requests

## Setup

1. Record against the live deploy `https://dzsvd1mayav5x.cloudfront.net/` (preferred — it is the real published product), or the local app at `http://127.0.0.1:3000/` (`npm run dev` default port).
2. Confirm the landing page shows one CompliPatch logo and the headline `Stop risky PRs before they merge.`
3. Open the Supademo Chrome Extension and sign in.
4. Choose Interactive Demo (screenshot/click capture) for judges; optionally also record a Video export.
5. Record at desktop width if possible: `1440px` or wider.

## Recording Flow

### Step 1 - Landing Hook

**Screen**: Landing page hero.

**Action**: Start on the hero section.

**Hotspot copy**: CompliPatch blocks risky pull requests before they reach main.

### Step 2 - Problem Statement

**Screen**: Hero problem note.

**Action**: Click or hover near `Problem`.

**Hotspot copy**: AI-generated code moves fast. Compliance still needs evidence before merge.

### Step 3 - Product Evidence Preview

**Screen**: PR evidence panel in the hero.

**Action**: Click the PR preview panel.

**Hotspot copy**: Every webhook turns into a reviewable compliance result with file-level evidence.

### Step 4 - Open Console

**Screen**: Hero CTA.

**Action**: Click `Open console`.

**Hotspot copy**: The console is where teams scan demo code, local files, folders, and GitHub repos.

### Step 5 - Run Demo Scan

**Screen**: Console.

**Action**: Click `Run demo`.

**Hotspot copy**: The demo scan catches secrets, PHI logging, missing auth, unsafe SQL, insecure cookies, and unsafe CORS.

### Step 6 - Review Score

**Screen**: Score and metrics cards.

**Action**: Click or hover over the score card.

**Hotspot copy**: A low score means the pull request should not merge until the evidence is fixed.

### Step 7 - Inspect Findings

**Screen**: Findings list.

**Action**: Click the critical hardcoded-secret finding.

**Hotspot copy**: Each finding includes the rule, severity, file path, evidence, impact, and suggested fix.

### Step 8 - Show Selected Evidence

**Screen**: Input/evidence panel.

**Action**: Click selected evidence/code area.

**Hotspot copy**: Sensitive evidence is masked so the report explains risk without leaking secrets.

### Step 9 - GitHub PR Comment

**Screen**: PR comment panel.

**Action**: Click the PR comment panel.

**Hotspot copy**: CompliPatch generates a GitHub-ready review comment your team can post or preview.

### Step 10 - Repository Scan

**Screen**: GitHub repo input.

**Action**: Paste or select `https://github.com/aniketsdev/example-test.git`, then click `Scan repo`.

**Hotspot copy**: Public repositories can be scanned directly. Private repositories require GitHub connection.

### Step 11 - GitHub Login / Private Repo

**Screen**: GitHub connection controls.

**Action**: Click GitHub connect/login if configured.

**Hotspot copy**: Connect GitHub for private repo access and webhook-backed pull request review.

**Note**: GitHub OAuth login is not configured on the public deploy, so do not click `Login with GitHub` on camera — it redirects straight back. Present it as a capability, or record this step locally with `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` set.

### Step 12 - Final CTA

**Screen**: Console result or landing final CTA.

**Action**: End on the result or return to landing final CTA.

**Hotspot copy**: Connect the webhook and let every pull request prove it is safe.

## Voiceover Script

CompliPatch AI reviews pull requests before they merge.

When GitHub sends a webhook, CompliPatch scans the changed code for secrets, patient data logging, missing auth, unsafe SQL, insecure cookies, and unsafe CORS.

The result is a clear compliance score, exact evidence, and a GitHub-ready PR comment.

Start with the demo scan. Then connect GitHub and protect every pull request before it reaches main.

## Export Notes

- Export the Supademo as an interactive demo link for judges.
- Also export a video file for the landing page or pitch deck.
- Keep the final version under 90 seconds.
- Use Supademo AI voiceover only if it sounds clean and direct.
