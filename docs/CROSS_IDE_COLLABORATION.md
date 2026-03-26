# Cross-IDE Collaboration

This document defines the repo-wide collaboration model for ChopDot.

It is intentionally team-facing.
It is not a personal guide for one developer's IDE setup.

## Purpose

Use this guide when:

- starting a new task
- creating a branch or worktree
- handing work to another developer
- continuing work from another IDE or model

The goal is simple:

- `main` stays clean and releasable
- active work is isolated per task
- `.knowns/tasks` is the shared execution surface
- developer-specific memory stays local

## Core Rules

1. Keep the root checkout on `main`.
2. Do active work in a dedicated worktree under `.worktrees/<branch-slug>`.
3. Use task-based branch names:
   - `feature/<slug>`
   - `fix/<slug>`
   - `chore/<slug>`
   - `docs/<slug>`
4. One task = one branch = one worktree.
5. Each developer pushes their own branch and lands via PR.
6. Do not use tool-prefixed product branches like `claude/...`, `codex/...`, or `cursor/...` as the default collaboration model.

## Shared Execution Surface

Start from:

- `AGENTS.md`
- `.knowns/tasks/`

Treat these generated docs as summaries, not as the primary execution surface:

- `docs/AGENTOPS_OPERATOR_BRIEF.md`
- `docs/AGENTOPS_TASK_QUEUE.md`

If repo state has materially changed, refresh the task surface instead of trusting stale generated output.

## Starting Work

Before creating a branch:

1. `git fetch --prune`
2. `git checkout main`
3. `git pull --ff-only origin main`
4. Review `.knowns/tasks`
5. Pick one task
6. Create one task branch and one matching worktree

Examples:

- `fix/auth-viewport`
- `feature/polkadot-dev-runtime`
- `docs/release-parity-checklist`

## Working With Another Developer

If Liam is working in the repo too:

- do not share one active branch by default
- do not both edit directly on `main`
- split work by task or subtask
- each person pushes their own branch
- merge through PRs only

If one developer needs another developer's unfinished foundation work:

- push a small preparatory branch first, or
- land the foundation in a small PR before starting dependent work

## Working Across IDEs

Cross-IDE continuity should come from repo state, not tool-specific branches.

Use:

- `.knowns/tasks` for active task state
- committed code and PRs for implementation truth
- `AGENTS.md` for operator rules

Do not rely on long-lived personal branches as the main collaboration model.

Personal memory or IDE-specific notes should remain local.

## Local-Only Files

Keep these local and untracked unless intentionally standardizing them:

- `.agents/`
- `.memory/`
- `.cursorrules`
- private notes
- tool caches

## Handoff Checklist

Before handing work to another developer:

1. push the branch
2. make sure the task file reflects current status
3. note any blockers or assumptions in the task
4. verify the branch still builds and tests as expected
5. open or update the PR

## Verification

Run these before handoff or merge:

- `npx tsc --noEmit`
- `npm run build`
- `npx playwright test`

## Default Interpretation

If there is doubt:

- `main` is the only baseline
- task files are the shared truth for active work
- personal IDE workflow stays personal
- collaboration should optimize for clarity, not branch history
