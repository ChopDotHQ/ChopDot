# Active Context — Cross-IDE Session State

> Updated at the end of each working session. Read this at the start of every new session
> to resume where the last session left off, regardless of which IDE/tool you're using.

## Last Updated
- **Date:** 2026-03-24
- **IDE:** Claude Code (Opus 4.6)
- **Branch:** `claude/elastic-banach`
- **Session type:** Onboarding / Agent infrastructure setup

## Current Work

### What was done this session
1. Full project exploration and access audit (GitHub, Supabase, Vercel, MCPs all verified)
2. Discovered `.memory/`, `.cursorrules`, `AGENTS.md` are NOT git-tracked — only exist in main working dir
3. Created `CLAUDE.md` at project root — ports sub-conscious to Claude Code (inlines core directives)
4. Fixed browser-use CLI — reinstalled with Python 3.12 (v0.12.3), verified working
5. Created this `active-context.md` for cross-IDE handoff
6. Creating `knowns.handoff` skill for session-end state capture

### What's in progress
- Agent infrastructure buildout (skills audit, handoff protocol, browser testing)
- Launch readiness assessment (not yet started — prioritized agent infra first)

### What's next
- Create `knowns.handoff` skill (session-end capture)
- Audit all 14 `.claude/skills/` for accuracy and gaps
- Test browser surfaces: Chrome MCP vs Preview MCP vs browser-use vs Playwright
- Update AgentOps task queue priorities
- Start launch readiness: run `npm run ci:fast` and `smoke:five-flows`

## Active Decisions

| Decision | Rationale | Date |
|----------|-----------|------|
| Created CLAUDE.md with inlined directives | `.memory/` not in git, worktrees can't see it | 2026-03-24 |
| Reinstalled browser-use with Python 3.12 | Python 3.14 has asyncio breaking change | 2026-03-24 |
| Agent infrastructure before app fixes | Need tools to systematically attack quality | 2026-03-24 |

## Blocked Items
- `.memory/`, `AGENTS.md`, `.cursorrules` are untracked — need decision on whether to git-track them
- AgentOps task queue has 6 critical/high items that may be stale

## Key Context for Next Session
- User works across Cursor, Antigravity, and Claude Code — context loss between IDEs is the primary pain
- User has 700+ skills in `antigravity-awesome-skills/` (not all relevant to ChopDot)
- Loki Mode (in antigravity-awesome-skills) has a sophisticated 4-layer memory hierarchy — potential to port
- App feels unstable to user — six sigma quality bar before launch
- 62 real users, 125 pots, 38 expenses in production Supabase
- `profiles` table has RLS disabled — security issue
