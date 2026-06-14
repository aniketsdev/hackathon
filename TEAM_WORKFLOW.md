# Team Workflow

## Team
- Jay: project lead, demo flow, product polish, integration checks.
- Aniket: backend/scanner work, API integration, database work.

## Branch Rules
- Keep `main` demo-ready at all times.
- Do not push directly to `main`.
- Every change ships through a pull request into `main`.
- Use short feature branches:
  - `feat/fastapi-scan-api`
  - `feat/postgres-findings`
  - `feat/dashboard-polish`
  - `fix/demo-scan-button`

## Start Work
Before starting any task:

```bash
git switch main
git pull --rebase origin main
git switch -c feat/your-task-name
```

If the branch already exists:

```bash
git switch feat/your-task-name
git fetch origin
git rebase origin/main
```

## While Working
- Commit small, working changes.
- Pull/rebase from `main` before opening a PR.
- If Jay and Aniket touch the same file, coordinate in chat before pushing.
- Do not commit `.env`, API keys, database passwords, or GitHub tokens.
- Keep the sample scan button working after every UI or API change.

## Before Opening a PR
Run:

```bash
npm run build
```

When the FastAPI backend is added, also run:

```bash
pytest
```

PR checklist:

- [ ] Branch is updated with latest `main`.
- [ ] No merge conflicts.
- [ ] Demo scan still works.
- [ ] Security scanner still detects the demo vulnerable file.
- [ ] No real secrets or private data committed.
- [ ] Environment changes are documented in `.env.example`.
- [ ] Database changes include a migration plan.
- [ ] Build/test commands pass locally.

## Merge Rules
- Merge only after the PR has no conflicts.
- Prefer squash merge for clean hackathon history.
- After a PR merges, everyone should update local `main` before continuing:

```bash
git switch main
git pull --rebase origin main
```

Then update active feature branches:

```bash
git switch feat/your-task-name
git rebase main
```

## Target Stack
- Frontend: modern React framework, currently Next.js.
- Backend target: FastAPI.
- Database target: PostgreSQL.
- Scanner logic should remain deterministic and demo-safe.
- Live GitHub posting should stay optional until the local demo is stable.

## Demo Freeze
In the final 90 minutes:

- No large rewrites.
- No new dependencies unless both teammates agree.
- Only fix bugs, improve copy, polish the demo, and prepare the pitch.
