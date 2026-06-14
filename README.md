# ComplyPatch AI

**ComplyPatch AI** is a compliance-aware GitHub PR review agent.

It reviews code changes for security, privacy, and compliance risks such as secrets, PII logging, missing authentication, insecure cookies, unsafe SQL, and risky CORS settings.

## Hackathon Pitch

General coding agents review code.  
ComplyPatch AI reviews code like a compliance engineer.

## Demo Flow

1. Open the dashboard.
2. Click **Run Demo Scan**.
3. View the compliance score.
4. View evidence-based findings.
5. Copy the generated GitHub PR comment.
6. Optional: connect the `/api/scan` endpoint to a GitHub webhook.

## Quick Start

```bash
npm install
npm run dev
```

Open:

```text
http://localhost:3000
```

## Build Check

```bash
npm run build
```

## Environment

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

For the first demo, OpenAI and GitHub tokens are optional because the scanner works locally.

## MVP Features

- Demo vulnerable code scanner
- 6 built-in rules
- Risk score
- Findings table
- GitHub PR comment generator
- API endpoint for scanning code

## Not Legal Advice

This project is for engineering review assistance. It does not certify legal compliance with HIPAA, GDPR, SOC 2, PCI DSS, or any regulation.
