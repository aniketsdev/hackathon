@AGENTS.md

## Claude Code Notes
Use plan mode before editing backend scanner logic.
Keep all demo flows deterministic.
Do not remove seeded vulnerabilities from demo files unless asked.
When implementing a new rule, add it to:
- `SECURITY_RULES.md`
- `lib/scanner/rules.ts`
- `lib/scanner/scan.ts` if custom logic is needed
