---
name: knowns.handoff
description: Use at the end of a session to capture current state for cross-IDE continuity. Run before closing a conversation to preserve context for the next session in any IDE (Claude Code, Cursor, Antigravity).
---

# Session Handoff

Capture the current session state so the next session — in any IDE — can resume seamlessly.

**Announce at start:** "I'm using the knowns.handoff skill to capture session state for cross-IDE continuity."

**Core principle:** WRITE STATE BEFORE LEAVING. The next agent starts blind without this.

## The Process

### Step 1: Gather Current State

Collect information about the current session:

```bash
# Git state
git branch --show-current
git status --short
git log --oneline -5

# Active tasks
knowns task list --status in-progress --plain 2>/dev/null || echo "No knowns CLI"

# Active timer
knowns time status 2>/dev/null || echo "No active timer"
```

### Step 2: Update active-context.md

Write to `.knowns/docs/active-context.md` with the following structure:

```markdown
# Active Context — Cross-IDE Session State

> Updated at the end of each working session.

## Last Updated
- **Date:** [today's date]
- **IDE:** [Claude Code / Cursor / Antigravity]
- **Branch:** [current branch]
- **Session type:** [feature / bugfix / exploration / general]

## Current Work

### What was done this session
[Numbered list of accomplishments]

### What's in progress
[Active work items not yet complete]

### What's next
[Prioritized list of next actions]

## Active Decisions
| Decision | Rationale | Date |
|----------|-----------|------|
[Key decisions made this session]

## Blocked Items
[Anything stuck and why]

## Key Context for Next Session
[Critical information the next agent needs to know]
```

### Step 3: Check for Uncommitted Work

```bash
git diff --stat
git diff --cached --stat
```

If there are uncommitted changes, note them explicitly in the handoff:
- What files were modified
- Whether they should be committed or are WIP
- Any branches that need to be created

### Step 4: Confirm Handoff

Output a summary:

```markdown
## Handoff Complete

- **State saved to:** `.knowns/docs/active-context.md`
- **Branch:** [branch name]
- **Uncommitted changes:** [yes/no — list if yes]
- **Next priority:** [single most important next action]

The next session in any IDE should start with:
1. Read `CLAUDE.md` (auto-loaded in Claude Code)
2. Read `.knowns/docs/active-context.md`
3. Run `knowns.init` if available
```

## When to Use

- **Always** before ending a session
- Before switching to a different IDE
- Before taking a break on a complex task
- When handing off to another agent or team member

## Pairs With

- `knowns.init` — reads context at session start (the other half of the handoff loop)
- `CLAUDE.md` — provides immutable project context
- `.memory/core_directives.md` — architectural constraints

## Important Notes

- Keep the active-context.md concise — it's meant to be scanned quickly
- Focus on WHAT and WHY, not HOW (the code tells the how)
- Include enough context that someone unfamiliar with the last session can pick up immediately
- Don't duplicate information already in CLAUDE.md — reference it instead
